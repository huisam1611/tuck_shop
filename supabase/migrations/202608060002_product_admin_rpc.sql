create or replace function public.create_product(
  p_product_code text,
  p_name text,
  p_category text,
  p_cost_price numeric,
  p_selling_price numeric,
  p_minimum_stock integer
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  product_row public.products%rowtype;
begin
  if not public.has_role('admin') then
    raise exception using errcode = '42501', message = 'Admin role required';
  end if;
  if p_product_code is null or char_length(trim(p_product_code)) = 0 or p_name is null or char_length(trim(p_name)) = 0 or p_category is null or char_length(trim(p_category)) = 0 then
    raise exception using errcode = '22023', message = 'Product code, name, and category are required';
  end if;
  if p_cost_price is null or p_cost_price < 0 or p_selling_price is null or p_selling_price < 0 or p_minimum_stock is null or p_minimum_stock < 0 then
    raise exception using errcode = '22023', message = 'Product prices and minimum stock must be valid';
  end if;

  insert into public.products (product_code, name, category, cost_price, selling_price, minimum_stock)
  values (trim(p_product_code), trim(p_name), trim(p_category), p_cost_price, p_selling_price, p_minimum_stock)
  returning * into product_row;
  return product_row;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'Product code already exists';
end;
$$;

create or replace function public.update_product(
  p_product_id uuid,
  p_product_code text,
  p_name text,
  p_category text,
  p_cost_price numeric,
  p_selling_price numeric,
  p_minimum_stock integer,
  p_status text
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  product_row public.products%rowtype;
begin
  if not public.has_role('admin') then
    raise exception using errcode = '42501', message = 'Admin role required';
  end if;
  if p_status not in ('active', 'inactive') or p_product_code is null or char_length(trim(p_product_code)) = 0 or p_name is null or char_length(trim(p_name)) = 0 or p_category is null or char_length(trim(p_category)) = 0 or p_cost_price is null or p_cost_price < 0 or p_selling_price is null or p_selling_price < 0 or p_minimum_stock is null or p_minimum_stock < 0 then
    raise exception using errcode = '22023', message = 'Invalid product values';
  end if;

  update public.products
  set product_code = trim(p_product_code), name = trim(p_name), category = trim(p_category),
      cost_price = p_cost_price, selling_price = p_selling_price,
      minimum_stock = p_minimum_stock, status = p_status
  where id = p_product_id
  returning * into product_row;
  if not found then raise exception using errcode = 'P0002', message = 'Product not found'; end if;
  return product_row;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'Product code already exists';
end;
$$;

create or replace function public.delete_product(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role('admin') then
    raise exception using errcode = '42501', message = 'Admin role required';
  end if;
  if exists (select 1 from public.sale_items where product_id = p_product_id)
     or exists (select 1 from public.stock_receipts where product_id = p_product_id)
     or exists (select 1 from public.stock_movements where product_id = p_product_id) then
    raise exception using errcode = '23503', message = 'Products with history must be deactivated';
  end if;
  delete from public.products where id = p_product_id;
  if not found then raise exception using errcode = 'P0002', message = 'Product not found'; end if;
end;
$$;

grant execute on function public.create_product(text, text, text, numeric, numeric, integer) to authenticated;
grant execute on function public.update_product(uuid, text, text, text, numeric, numeric, integer, text) to authenticated;
grant execute on function public.delete_product(uuid) to authenticated;
