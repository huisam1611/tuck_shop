create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  role text not null check (role in ('admin', 'staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  product_code text not null check (char_length(trim(product_code)) between 1 and 40),
  name text not null check (char_length(trim(name)) between 1 and 120),
  category text not null check (char_length(trim(category)) between 1 and 80),
  cost_price numeric(12, 2) not null check (cost_price >= 0),
  selling_price numeric(12, 2) not null check (selling_price >= 0),
  current_stock integer not null default 0 check (current_stock >= 0),
  minimum_stock integer not null default 0 check (minimum_stock >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index products_product_code_lower_idx on public.products (lower(product_code));
create index products_name_lower_idx on public.products (lower(name));
create index products_status_idx on public.products (status);

create table public.daily_order_counters (
  sale_date date primary key,
  next_order_number integer not null check (next_order_number > 0)
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  client_request_id uuid not null unique,
  sale_date date not null,
  daily_order_number integer not null check (daily_order_number > 0),
  payment_method text not null check (payment_method in ('cash', 'e_payment')),
  staff_id uuid not null references public.profiles(id) on delete restrict,
  grand_total numeric(12, 2) not null default 0 check (grand_total >= 0),
  status text not null default 'completed' check (status in ('completed', 'voided')),
  voided_at timestamptz,
  voided_by uuid references public.profiles(id) on delete restrict,
  void_reason text,
  created_at timestamptz not null default now(),
  unique (sale_date, daily_order_number),
  check (
    (status = 'completed' and voided_at is null and voided_by is null and void_reason is null)
    or (status = 'voided' and voided_at is not null and voided_by is not null and char_length(trim(void_reason)) > 0)
  )
);

create index sales_sale_date_idx on public.sales (sale_date);
create index sales_staff_id_idx on public.sales (staff_id);
create index sales_status_idx on public.sales (status);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  product_code text not null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  unit_cost numeric(12, 2) not null check (unit_cost >= 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  cost_total numeric(12, 2) not null check (cost_total >= 0),
  profit numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create index sale_items_sale_id_idx on public.sale_items (sale_id);
create index sale_items_product_id_idx on public.sale_items (product_id);

create table public.stock_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_date date not null,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12, 2) not null check (unit_cost >= 0),
  supplier_name text check (supplier_name is null or char_length(trim(supplier_name)) <= 160),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index stock_receipts_date_idx on public.stock_receipts (receipt_date);
create index stock_receipts_product_id_idx on public.stock_receipts (product_id);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  movement_type text not null check (movement_type in ('stock_in', 'sale', 'sale_void', 'adjustment_in', 'adjustment_out')),
  quantity_change integer not null check (quantity_change <> 0),
  stock_before integer not null check (stock_before >= 0),
  stock_after integer not null check (stock_after >= 0),
  reference_type text not null,
  reference_id uuid,
  reason text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (stock_after = stock_before + quantity_change)
);

create index stock_movements_product_date_idx on public.stock_movements (product_id, created_at desc);
create index stock_movements_reference_idx on public.stock_movements (reference_type, reference_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active
  );
$$;

create or replace function public.has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active and role = required_role
  );
$$;

grant execute on function public.is_active_user() to authenticated;
grant execute on function public.has_role(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_receipts enable row level security;
alter table public.stock_movements enable row level security;
alter table public.daily_order_counters enable row level security;

create policy profiles_select on public.profiles
for select to authenticated
using (id = auth.uid() or public.has_role('admin'));

create policy products_admin_select on public.products
for select to authenticated using (public.has_role('admin'));

create policy sales_admin_select on public.sales
for select to authenticated using (public.has_role('admin'));

create policy sales_staff_select on public.sales
for select to authenticated using (public.is_active_user() and staff_id = auth.uid());

create policy sale_items_admin_select on public.sale_items
for select to authenticated using (public.has_role('admin'));

create policy stock_receipts_admin_select on public.stock_receipts
for select to authenticated using (public.has_role('admin'));

create policy stock_movements_admin_select on public.stock_movements
for select to authenticated using (public.has_role('admin'));

create view public.staff_products as
select id, product_code, name, category, selling_price, current_stock, minimum_stock, status
from public.products
where status = 'active' and public.is_active_user();

create view public.staff_inventory as
select id, product_code, name, category, current_stock, minimum_stock, status
from public.products
where public.is_active_user();

create view public.staff_sales as
select id, sale_date, daily_order_number, payment_method, grand_total, status, created_at
from public.sales
where public.is_active_user() and staff_id = auth.uid();

create view public.staff_sale_items as
select
  si.id,
  si.sale_id,
  si.product_code,
  si.product_name,
  si.quantity,
  si.unit_price,
  si.subtotal
from public.sale_items si
join public.sales s on s.id = si.sale_id
where public.is_active_user() and s.staff_id = auth.uid();

grant select on public.staff_products, public.staff_inventory, public.staff_sales, public.staff_sale_items to authenticated;

create or replace function public.create_sale(
  p_client_request_id uuid,
  p_sale_date date,
  p_payment_method text,
  p_items jsonb
)
returns table (sale_id uuid, sale_date date, daily_order_number integer, grand_total numeric, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_sale public.sales%rowtype;
  item jsonb;
  item_product public.products%rowtype;
  item_product_id uuid;
  item_quantity integer;
  requested_quantity integer;
  new_sale_id uuid;
  order_number integer;
  total numeric(12, 2) := 0;
  subtotal numeric(12, 2);
begin
  if not public.is_active_user() or (not public.has_role('admin') and not public.has_role('staff')) then
    raise exception using errcode = '42501', message = 'Active user required';
  end if;

  if p_client_request_id is null then
    raise exception using errcode = '22023', message = 'Client request ID is required';
  end if;

  -- ponytail: lock only this request key; upgrade to a dedicated request table if retries become high-volume.
  perform pg_advisory_xact_lock(hashtextextended(p_client_request_id::text, 0));
  select * into existing_sale from public.sales where client_request_id = p_client_request_id;
  if found then
    return query select existing_sale.id, existing_sale.sale_date, existing_sale.daily_order_number, existing_sale.grand_total, existing_sale.status;
    return;
  end if;

  if p_payment_method not in ('cash', 'e_payment') then
    raise exception using errcode = '22023', message = 'Invalid payment method';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception using errcode = '22023', message = 'At least one sale item is required';
  end if;

  -- Lock every product in stable order before changing any stock.
  for item_product_id, requested_quantity in
    select (value ->> 'product_id')::uuid, sum((value ->> 'quantity')::integer)::integer
    from jsonb_array_elements(p_items)
    group by (value ->> 'product_id')::uuid
    order by (value ->> 'product_id')::uuid
  loop
    if requested_quantity is null or requested_quantity <= 0 then
      raise exception using errcode = '22023', message = 'Quantity must be a positive whole number';
    end if;

    select * into item_product from public.products where id = item_product_id for update;
    if not found or item_product.status <> 'active' then
      raise exception using errcode = 'P0002', message = 'Product is not available';
    end if;
    if item_product.current_stock < requested_quantity then
      raise exception using errcode = 'P0001', message = format('Insufficient stock for %s', item_product.name);
    end if;
  end loop;

  insert into public.daily_order_counters (sale_date, next_order_number)
  values (p_sale_date, 2)
  on conflict (sale_date) do update
    set next_order_number = public.daily_order_counters.next_order_number + 1
  returning next_order_number - 1 into order_number;

  insert into public.sales (client_request_id, sale_date, daily_order_number, payment_method, staff_id)
  values (p_client_request_id, p_sale_date, order_number, p_payment_method, auth.uid())
  returning id into new_sale_id;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_product_id := (item ->> 'product_id')::uuid;
    item_quantity := (item ->> 'quantity')::integer;
    select * into item_product from public.products where id = item_product_id for update;
    subtotal := item_quantity * item_product.selling_price;
    total := total + subtotal;

    insert into public.sale_items (
      sale_id, product_id, product_code, product_name, quantity,
      unit_price, unit_cost, subtotal, cost_total, profit
    ) values (
      new_sale_id, item_product.id, item_product.product_code, item_product.name, item_quantity,
      item_product.selling_price, item_product.cost_price, subtotal,
      item_quantity * item_product.cost_price, subtotal - (item_quantity * item_product.cost_price)
    );

    insert into public.stock_movements (
      product_id, movement_type, quantity_change, stock_before, stock_after,
      reference_type, reference_id, created_by
    ) values (
      item_product.id, 'sale', -item_quantity, item_product.current_stock,
      item_product.current_stock - item_quantity, 'sale', new_sale_id, auth.uid()
    );

    update public.products
    set current_stock = current_stock - item_quantity
    where id = item_product.id;
  end loop;

  update public.sales set grand_total = total where id = new_sale_id;
  return query select new_sale_id, p_sale_date, order_number, total, 'completed'::text;
end;
$$;

create or replace function public.stock_in(
  p_product_id uuid,
  p_receipt_date date,
  p_quantity integer,
  p_unit_cost numeric,
  p_supplier_name text default null
)
returns public.stock_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  product_row public.products%rowtype;
  receipt_row public.stock_receipts%rowtype;
begin
  if not public.has_role('admin') then
    raise exception using errcode = '42501', message = 'Admin role required';
  end if;
  if p_quantity is null or p_quantity <= 0 or p_unit_cost is null or p_unit_cost < 0 then
    raise exception using errcode = '22023', message = 'Invalid stock-in values';
  end if;

  select * into product_row from public.products where id = p_product_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Product not found'; end if;

  insert into public.stock_receipts (receipt_date, product_id, quantity, unit_cost, supplier_name, created_by)
  values (p_receipt_date, p_product_id, p_quantity, p_unit_cost, nullif(trim(p_supplier_name), ''), auth.uid())
  returning * into receipt_row;

  insert into public.stock_movements (
    product_id, movement_type, quantity_change, stock_before, stock_after,
    reference_type, reference_id, created_by
  ) values (
    p_product_id, 'stock_in', p_quantity, product_row.current_stock,
    product_row.current_stock + p_quantity, 'stock_receipt', receipt_row.id, auth.uid()
  );

  update public.products
  set current_stock = current_stock + p_quantity, cost_price = p_unit_cost
  where id = p_product_id;
  return receipt_row;
end;
$$;

create or replace function public.adjust_stock(
  p_product_id uuid,
  p_direction text,
  p_quantity integer,
  p_reason text
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  product_row public.products%rowtype;
  movement_row public.stock_movements%rowtype;
  signed_quantity integer;
begin
  if not public.has_role('admin') then
    raise exception using errcode = '42501', message = 'Admin role required';
  end if;
  if p_direction not in ('increase', 'decrease') or p_quantity is null or p_quantity <= 0 or char_length(trim(p_reason)) = 0 then
    raise exception using errcode = '22023', message = 'Invalid adjustment values';
  end if;
  signed_quantity := case when p_direction = 'increase' then p_quantity else -p_quantity end;

  select * into product_row from public.products where id = p_product_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Product not found'; end if;
  if product_row.current_stock + signed_quantity < 0 then
    raise exception using errcode = 'P0001', message = 'Adjustment cannot create negative stock';
  end if;

  update public.products
  set current_stock = current_stock + signed_quantity
  where id = p_product_id;

  insert into public.stock_movements (
    product_id, movement_type, quantity_change, stock_before, stock_after,
    reference_type, reason, created_by
  ) values (
    p_product_id,
    case when signed_quantity > 0 then 'adjustment_in' else 'adjustment_out' end,
    signed_quantity, product_row.current_stock, product_row.current_stock + signed_quantity,
    'adjustment', trim(p_reason), auth.uid()
  ) returning * into movement_row;
  return movement_row;
end;
$$;

create or replace function public.void_sale(p_sale_id uuid, p_reason text)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  sale_row public.sales%rowtype;
  item_row public.sale_items%rowtype;
  product_row public.products%rowtype;
begin
  if not public.has_role('admin') then
    raise exception using errcode = '42501', message = 'Admin role required';
  end if;
  if p_reason is null or char_length(trim(p_reason)) = 0 then
    raise exception using errcode = '22023', message = 'Void reason is required';
  end if;

  select * into sale_row from public.sales where id = p_sale_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Sale not found'; end if;
  if sale_row.status = 'voided' then
    raise exception using errcode = 'P0001', message = 'Sale is already voided';
  end if;

  for item_row in select * from public.sale_items where sale_id = p_sale_id order by product_id
  loop
    select * into product_row from public.products where id = item_row.product_id for update;
    insert into public.stock_movements (
      product_id, movement_type, quantity_change, stock_before, stock_after,
      reference_type, reference_id, reason, created_by
    ) values (
      product_row.id, 'sale_void', item_row.quantity, product_row.current_stock,
      product_row.current_stock + item_row.quantity, 'sale', p_sale_id, trim(p_reason), auth.uid()
    );
    update public.products set current_stock = current_stock + item_row.quantity where id = product_row.id;
  end loop;

  update public.sales
  set status = 'voided', voided_at = now(), voided_by = auth.uid(), void_reason = trim(p_reason)
  where id = p_sale_id
  returning * into sale_row;
  return sale_row;
end;
$$;

grant execute on function public.create_sale(uuid, date, text, jsonb) to authenticated;
grant execute on function public.stock_in(uuid, date, integer, numeric, text) to authenticated;
grant execute on function public.adjust_stock(uuid, text, integer, text) to authenticated;
grant execute on function public.void_sale(uuid, text) to authenticated;

create or replace function public.admin_update_profile(
  p_user_id uuid,
  p_name text,
  p_role text,
  p_is_active boolean
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile public.profiles%rowtype;
  active_admins integer;
begin
  if not public.has_role('admin') then
    raise exception using errcode = '42501', message = 'Admin role required';
  end if;
  if p_role not in ('admin', 'staff') or p_name is null or char_length(trim(p_name)) = 0 then
    raise exception using errcode = '22023', message = 'Invalid profile values';
  end if;

  select * into target_profile from public.profiles where id = p_user_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Profile not found'; end if;

  if target_profile.id = auth.uid() and (not p_is_active or p_role <> 'admin') then
    raise exception using errcode = 'P0001', message = 'The current Admin account must remain active';
  end if;

  if target_profile.role = 'admin' and target_profile.is_active and (not p_is_active or p_role <> 'admin') then
    select count(*) into active_admins from public.profiles where role = 'admin' and is_active;
    if active_admins <= 1 then
      raise exception using errcode = 'P0001', message = 'At least one active Admin is required';
    end if;
  end if;

  update public.profiles
  set name = trim(p_name), role = p_role, is_active = p_is_active
  where id = p_user_id
  returning * into target_profile;
  return target_profile;
end;
$$;

grant execute on function public.admin_update_profile(uuid, text, text, boolean) to authenticated;
