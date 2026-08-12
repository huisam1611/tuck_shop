-- Structured product catalogue fields. Existing name/product_code/price/stock remain compatibility columns.
alter table public.products
  add column if not exists name_zh text,
  add column if not exists name_en text,
  add column if not exists brand text,
  add column if not exists flavour text,
  add column if not exists size text,
  add column if not exists package_type text,
  add column if not exists barcode text;

alter table public.products
  add constraint products_name_zh_length check (name_zh is null or char_length(trim(name_zh)) <= 120),
  add constraint products_name_en_length check (name_en is null or char_length(trim(name_en)) <= 120),
  add constraint products_brand_length check (brand is null or char_length(trim(brand)) <= 80),
  add constraint products_flavour_length check (flavour is null or char_length(trim(flavour)) <= 80),
  add constraint products_size_length check (size is null or char_length(trim(size)) <= 40),
  add constraint products_package_type_length check (package_type is null or char_length(trim(package_type)) <= 40),
  add constraint products_barcode_length check (barcode is null or char_length(trim(barcode)) <= 80);

alter table public.products
  add constraint products_category_allowed check (trim(category) in ('飲品','薯片／脆片','糖果','餅乾','紫菜','肉類零食','堅果／豆類','即食麵','乳製品','啫喱','調味／食品配料','紙品／日用品','其他','Snacks','Drinks','Food','Frozen','Household','Test'));

create unique index if not exists products_barcode_lower_idx on public.products (lower(barcode)) where nullif(trim(barcode), '') is not null;
create index if not exists products_brand_lower_idx on public.products (lower(brand));
create index if not exists products_category_lower_idx on public.products (lower(category));

create or replace function public.build_product_display_name(
  p_brand text, p_name_zh text, p_name_en text, p_flavour text, p_size text, p_package_type text
) returns text
language sql immutable
as $$
  with values as (
    select nullif(trim(p_brand), '') as brand,
      coalesce(nullif(trim(p_name_zh), ''), nullif(trim(p_name_en), '')) as core,
      nullif(trim(p_flavour), '') as flavour,
      nullif(trim(p_size), '') as size,
      nullif(trim(p_package_type), '') as package_type
  )
  select concat_ws('｜',
    nullif(concat_ws(' ', brand, core, size), ''),
    package_type,
    case when flavour is null then null
         when right(flavour, 1) in ('味', '香') then flavour
         else flavour || '味' end
  ) from values;
$$;

create or replace function public.products_set_display_name()
returns trigger language plpgsql set search_path = public as $$
begin
  if nullif(trim(coalesce(new.brand, '') || coalesce(new.name_zh, '') || coalesce(new.name_en, '') || coalesce(new.flavour, '') || coalesce(new.size, '') || coalesce(new.package_type, '')), '') is not null then
    new.name := public.build_product_display_name(new.brand, new.name_zh, new.name_en, new.flavour, new.size, new.package_type);
  end if;
  return new;
end;
$$;
drop trigger if exists products_set_display_name on public.products;
create trigger products_set_display_name before insert or update of brand, name_zh, name_en, flavour, size, package_type on public.products
for each row execute function public.products_set_display_name();

drop view if exists public.staff_products;
create view public.staff_products as
select id, product_code, name, name_zh, name_en, brand, flavour, size, package_type, barcode, category, selling_price, current_stock, minimum_stock, status
from public.products where status = 'active' and public.is_active_user();
grant select on public.staff_products to authenticated;

drop view if exists public.staff_inventory;
create view public.staff_inventory as
select id, product_code, name, name_zh, name_en, brand, flavour, size, package_type, barcode, category, current_stock, minimum_stock, status
from public.products where public.is_active_user();
grant select on public.staff_inventory to authenticated;

drop function if exists public.create_product(text, text, text, numeric, numeric, integer);
create or replace function public.create_product(
  p_product_code text, p_name text, p_category text, p_cost_price numeric, p_selling_price numeric,
  p_minimum_stock integer, p_name_zh text default null, p_name_en text default null, p_brand text default null,
  p_flavour text default null, p_size text default null, p_package_type text default null, p_barcode text default null
) returns public.products language plpgsql security definer set search_path = public as $$
declare product_row public.products%rowtype;
begin
  if not public.has_role('admin') then raise exception using errcode = '42501', message = 'Admin role required'; end if;
  if nullif(trim(p_product_code), '') is null or nullif(trim(p_category), '') is null
     or (nullif(trim(p_name), '') is null and nullif(trim(p_name_zh), '') is null and nullif(trim(p_name_en), '') is null and nullif(trim(p_brand), '') is null)
     or p_cost_price is null or p_cost_price < 0 or p_selling_price is null or p_selling_price < 0 or p_minimum_stock is null or p_minimum_stock < 0 then
    raise exception using errcode = '22023', message = 'Invalid product values';
  end if;
  insert into public.products (product_code, name, category, cost_price, selling_price, minimum_stock, name_zh, name_en, brand, flavour, size, package_type, barcode)
  values (trim(p_product_code), coalesce(nullif(trim(p_name), ''), trim(coalesce(p_name_zh, p_name_en, p_brand))), trim(p_category), p_cost_price, p_selling_price, p_minimum_stock, nullif(trim(p_name_zh), ''), nullif(trim(p_name_en), ''), nullif(trim(p_brand), ''), nullif(trim(p_flavour), ''), nullif(trim(p_size), ''), nullif(trim(p_package_type), ''), nullif(trim(p_barcode), '')) returning * into product_row;
  return product_row;
exception when unique_violation then raise exception using errcode = '23505', message = 'Product code or barcode already exists';
end;
$$;

drop function if exists public.update_product(uuid, text, text, text, numeric, numeric, integer, text);
create or replace function public.update_product(
  p_product_id uuid, p_product_code text, p_name text, p_category text, p_cost_price numeric, p_selling_price numeric,
  p_minimum_stock integer, p_status text, p_name_zh text default null, p_name_en text default null, p_brand text default null,
  p_flavour text default null, p_size text default null, p_package_type text default null, p_barcode text default null
) returns public.products language plpgsql security definer set search_path = public as $$
declare product_row public.products%rowtype;
begin
  if not public.has_role('admin') then raise exception using errcode = '42501', message = 'Admin role required'; end if;
  if p_status not in ('active', 'inactive') or nullif(trim(p_product_code), '') is null or nullif(trim(p_category), '') is null
     or (nullif(trim(p_name), '') is null and nullif(trim(p_name_zh), '') is null and nullif(trim(p_name_en), '') is null and nullif(trim(p_brand), '') is null)
     or p_cost_price is null or p_cost_price < 0 or p_selling_price is null or p_selling_price < 0 or p_minimum_stock is null or p_minimum_stock < 0 then
    raise exception using errcode = '22023', message = 'Invalid product values';
  end if;
  update public.products set product_code = trim(p_product_code), name = coalesce(nullif(trim(p_name), ''), trim(coalesce(p_name_zh, p_name_en, p_brand))), category = trim(p_category), cost_price = p_cost_price, selling_price = p_selling_price, minimum_stock = p_minimum_stock, status = p_status,
    name_zh = nullif(trim(p_name_zh), ''), name_en = nullif(trim(p_name_en), ''), brand = nullif(trim(p_brand), ''), flavour = nullif(trim(p_flavour), ''), size = nullif(trim(p_size), ''), package_type = nullif(trim(p_package_type), ''), barcode = nullif(trim(p_barcode), '')
  where id = p_product_id returning * into product_row;
  if not found then raise exception using errcode = 'P0002', message = 'Product not found'; end if;
  return product_row;
exception when unique_violation then raise exception using errcode = '23505', message = 'Product code or barcode already exists';
end;
$$;

grant execute on function public.create_product(text, text, text, numeric, numeric, integer, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.update_product(uuid, text, text, text, numeric, numeric, integer, text, text, text, text, text, text, text, text) to authenticated;
