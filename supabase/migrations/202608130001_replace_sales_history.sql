create table public.sales_maintenance (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.sales_maintenance (singleton, enabled) values (true, false);
alter table public.sales_maintenance enable row level security;

create or replace function public.assert_sales_writable()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('tuck-shop:sales-write', 0));
  if current_setting('app.sales_history_replacement', true) is distinct from 'on'
     and exists (select 1 from public.sales_maintenance where singleton and enabled) then
    raise exception using errcode = '55000', message = 'Sales are temporarily in maintenance mode';
  end if;
end;
$$;

create or replace function public.guard_sales_writes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_sales_writable();
  return null;
end;
$$;

create trigger sales_writes_guard
before insert or update or delete on public.sales
for each statement execute function public.guard_sales_writes();

create trigger sale_items_writes_guard
before insert or update or delete on public.sale_items
for each statement execute function public.guard_sales_writes();

create trigger stock_movements_writes_guard
before insert or update or delete on public.stock_movements
for each statement execute function public.guard_sales_writes();

create trigger daily_order_counters_writes_guard
before insert or update or delete on public.daily_order_counters
for each statement execute function public.guard_sales_writes();

create trigger products_writes_guard
before insert or update or delete on public.products
for each statement execute function public.guard_sales_writes();

create trigger profiles_writes_guard
before insert or update or delete on public.profiles
for each statement execute function public.guard_sales_writes();

alter function public.create_sale(uuid, date, text, jsonb) rename to create_sale_unlocked;
revoke all on function public.create_sale_unlocked(uuid, date, text, jsonb) from public, anon, authenticated, service_role;

create function public.create_sale(
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
begin
  perform public.assert_sales_writable();
  return query select * from public.create_sale_unlocked(p_client_request_id, p_sale_date, p_payment_method, p_items);
end;
$$;
grant execute on function public.create_sale(uuid, date, text, jsonb) to authenticated;

alter function public.void_sale(uuid, text) rename to void_sale_unlocked;
revoke all on function public.void_sale_unlocked(uuid, text) from public, anon, authenticated, service_role;

create function public.void_sale(p_sale_id uuid, p_reason text)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_sales_writable();
  return public.void_sale_unlocked(p_sale_id, p_reason);
end;
$$;
grant execute on function public.void_sale(uuid, text) to authenticated;

alter function public.stock_in(uuid, date, integer, numeric, text) rename to stock_in_unlocked;
revoke all on function public.stock_in_unlocked(uuid, date, integer, numeric, text) from public, anon, authenticated, service_role;

create function public.stock_in(
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
begin
  perform public.assert_sales_writable();
  return public.stock_in_unlocked(p_product_id, p_receipt_date, p_quantity, p_unit_cost, p_supplier_name);
end;
$$;
grant execute on function public.stock_in(uuid, date, integer, numeric, text) to authenticated;

alter function public.adjust_stock(uuid, text, integer, text) rename to adjust_stock_unlocked;
revoke all on function public.adjust_stock_unlocked(uuid, text, integer, text) from public, anon, authenticated, service_role;

create function public.adjust_stock(
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
begin
  perform public.assert_sales_writable();
  return public.adjust_stock_unlocked(p_product_id, p_direction, p_quantity, p_reason);
end;
$$;
grant execute on function public.adjust_stock(uuid, text, integer, text) to authenticated;

alter function public.import_initial_stock(uuid, uuid, uuid, date, integer, numeric, text, uuid) rename to import_initial_stock_unlocked;
revoke all on function public.import_initial_stock_unlocked(uuid, uuid, uuid, date, integer, numeric, text, uuid) from public, anon, authenticated, service_role;

create function public.import_initial_stock(
  p_receipt_id uuid,
  p_movement_id uuid,
  p_product_id uuid,
  p_receipt_date date,
  p_quantity integer,
  p_unit_cost numeric,
  p_supplier_name text,
  p_created_by uuid
)
returns table (receipt_id uuid, movement_id uuid, stock_applied boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_sales_writable();
  return query select * from public.import_initial_stock_unlocked(
    p_receipt_id, p_movement_id, p_product_id, p_receipt_date,
    p_quantity, p_unit_cost, p_supplier_name, p_created_by
  );
end;
$$;
grant execute on function public.import_initial_stock(uuid, uuid, uuid, date, integer, numeric, text, uuid) to service_role;

alter function public.admin_update_profile(uuid, text, text, boolean) rename to admin_update_profile_unlocked;
revoke all on function public.admin_update_profile_unlocked(uuid, text, text, boolean) from public, anon, authenticated, service_role;

create function public.admin_update_profile(
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
begin
  perform public.assert_sales_writable();
  return public.admin_update_profile_unlocked(p_user_id, p_name, p_role, p_is_active);
end;
$$;
grant execute on function public.admin_update_profile(uuid, text, text, boolean) to authenticated;

create or replace function public.set_sales_maintenance(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service role required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('tuck-shop:sales-write', 0));
  update public.sales_maintenance set enabled = p_enabled, updated_at = now() where singleton;
  return p_enabled;
end;
$$;

create or replace function public.preview_sales_history_replacement()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service role required';
  end if;
  return jsonb_build_object(
    'sales', (select count(*) from public.sales),
    'items', (select count(*) from public.sale_items),
    'saleMovements', (
      select count(*) from public.stock_movements movement
      where movement.reference_type = 'sale'
        and exists (select 1 from public.sales sale where sale.id = movement.reference_id)
    ),
    'counters', (select count(*) from public.daily_order_counters),
    'maintenanceEnabled', (select enabled from public.sales_maintenance where singleton),
    'maintenanceUpdatedAt', (select updated_at from public.sales_maintenance where singleton),
    'payloadHash', (
      select encode(extensions.digest(convert_to(coalesce(string_agg(
        concat_ws('|', sale.sale_date::text, sale.daily_order_number::text,
          sale.client_request_id::text, sale.payment_method, sale.staff_id::text,
          (select string_agg(item.product_id::text || ':' || item.quantity::text, ',' order by item.product_id)
           from public.sale_items item where item.sale_id = sale.id)
        ), E'\n' order by sale.sale_date, sale.daily_order_number), ''), 'UTF8'), 'sha256'), 'hex')
      from public.sales sale
    ),
    'saleMovementHash', (
      select encode(extensions.digest(convert_to(coalesce(string_agg(
        concat_ws('|', movement.id::text, movement.product_id::text, movement.movement_type,
          movement.quantity_change::text, movement.stock_before::text, movement.stock_after::text,
          movement.reference_type, coalesce(movement.reference_id::text, ''), movement.created_by::text
        ), E'\n' order by movement.id), ''), 'UTF8'), 'sha256'), 'hex')
      from public.stock_movements movement
      where movement.reference_type = 'sale'
        and exists (select 1 from public.sales sale where sale.id = movement.reference_id)
    ),
    'counterHash', (
      select encode(extensions.digest(convert_to(coalesce(string_agg(
        counter.sale_date::text || '|' || counter.next_order_number::text,
        E'\n' order by counter.sale_date), ''), 'UTF8'), 'sha256'), 'hex')
      from public.daily_order_counters counter
    ),
    'counterMismatchCount', (
      select count(*) from (
        select coalesce(counter.sale_date, totals.sale_date) sale_date
        from public.daily_order_counters counter
        full join (
          select sale_date, max(daily_order_number) + 1 expected_next
          from public.sales group by sale_date
        ) totals on totals.sale_date = counter.sale_date
        where counter.sale_date is null
           or totals.sale_date is null
           or counter.next_order_number is distinct from totals.expected_next
      ) mismatches
    ),
    'ledgerMismatchCount', (
      select count(*) from public.products product
      where product.current_stock <> coalesce((
        select sum(movement.quantity_change) from public.stock_movements movement where movement.product_id = product.id
      ), 0)
    )
  );
end;
$$;

create or replace function public.replace_sales_history(
  p_confirmation text,
  p_start_date date,
  p_end_date date,
  p_sales jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_sales integer := 0;
  deleted_items integer := 0;
  deleted_movements integer := 0;
  deleted_counters integer := 0;
  inserted_sales integer := 0;
  inserted_items integer := 0;
  inserted_reconciliations integer := 0;
  inserted_revenue numeric(14, 2) := 0;
  actor_id uuid;
  payload_hash text;
  persisted_hash text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service role required';
  end if;
  if p_confirmation is distinct from 'DELETE-ALL-SALES' then
    raise exception using errcode = '22023', message = 'Invalid confirmation token';
  end if;
  if p_start_date is distinct from date '2026-06-01'
     or p_end_date is distinct from date '2026-08-12' then
    raise exception using errcode = '22023', message = 'Date range must be 2026-06-01 through 2026-08-12';
  end if;
  if p_sales is null
     or jsonb_typeof(p_sales) is distinct from 'array'
     or jsonb_array_length(p_sales) = 0
     or jsonb_array_length(p_sales) > 500
     or pg_column_size(p_sales) > 2097152 then
    raise exception using errcode = '22023', message = 'Sales payload must contain 1 to 500 sales and be at most 2 MiB';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('tuck-shop:sales-write', 0));
  if not exists (select 1 from public.sales_maintenance where singleton and enabled) then
    raise exception using errcode = '55000', message = 'Enable sales maintenance before replacement';
  end if;
  perform set_config('app.sales_history_replacement', 'on', true);

  if exists (
    select 1 from jsonb_array_elements(p_sales) sale
    where jsonb_typeof(sale) is distinct from 'object'
       or jsonb_typeof(sale -> 'items') is distinct from 'array'
       or jsonb_array_length(sale -> 'items') = 0
  ) then
    raise exception using errcode = '22023', message = 'Every sale must be an object with a non-empty items array';
  end if;

  create temp table staged_sales (
    client_request_id uuid primary key,
    sale_date date not null,
    daily_order_number integer not null check (daily_order_number > 0),
    payment_method text not null check (payment_method in ('cash', 'e_payment')),
    staff_id uuid not null,
    unique (sale_date, daily_order_number)
  ) on commit drop;
  create temp table staged_items (
    sale_client_request_id uuid not null references staged_sales(client_request_id),
    product_id uuid not null,
    quantity integer not null check (quantity > 0 and quantity <= 3),
    primary key (sale_client_request_id, product_id)
  ) on commit drop;

  insert into staged_sales (client_request_id, sale_date, daily_order_number, payment_method, staff_id)
  select
    (sale ->> 'client_request_id')::uuid,
    (sale ->> 'sale_date')::date,
    (sale ->> 'daily_order_number')::integer,
    sale ->> 'payment_method',
    (sale ->> 'staff_id')::uuid
  from jsonb_array_elements(p_sales) sale;

  insert into staged_items (sale_client_request_id, product_id, quantity)
  select
    (sale ->> 'client_request_id')::uuid,
    (item ->> 'product_id')::uuid,
    (item ->> 'quantity')::integer
  from jsonb_array_elements(p_sales) sale
  cross join lateral jsonb_array_elements(sale -> 'items') item;

  if (select count(*) from staged_items) > 1500 then
    raise exception using errcode = '22023', message = 'Sales payload may contain at most 1500 item lines';
  end if;
  if exists (
    (select generated::date from generate_series(p_start_date, p_end_date, interval '1 day') generated)
    except
    (select distinct sale_date from staged_sales)
  ) then
    raise exception using errcode = '22023', message = 'Sales payload must include every date in the requested range';
  end if;
  if exists (
    select 1 from staged_sales
    where sale_date not between p_start_date and p_end_date
  ) then
    raise exception using errcode = '22023', message = 'Sale date is outside the requested range';
  end if;
  if exists (
    select 1
    from staged_sales
    group by sale_date
    having min(daily_order_number) <> 1
       or max(daily_order_number) <> count(*)
       or count(distinct daily_order_number) <> count(*)
  ) then
    raise exception using errcode = '22023', message = 'Daily order numbers must be contiguous from 1';
  end if;
  perform 1 from public.profiles profile
  where profile.id in (select distinct staged.staff_id from staged_sales staged)
  order by profile.id
  for share;

  if exists (
    select 1 from staged_sales staged
    left join public.profiles profile on profile.id = staged.staff_id
    where profile.id is null or not profile.is_active or profile.role not in ('admin', 'staff')
  ) then
    raise exception using errcode = '22023', message = 'Every sale requires an active staff profile';
  end if;

  perform 1 from public.products product
  where product.id in (select distinct item.product_id from staged_items item)
  order by product.id
  for update;

  create temp table product_snapshot on commit drop as
  select product.id, product.product_code, product.name, product.selling_price,
    product.cost_price, product.current_stock,
    coalesce(sum(movement.quantity_change), 0)::integer as ledger_stock
  from public.products product
  left join public.stock_movements movement on movement.product_id = product.id
  group by product.id;

  if exists (
    select 1 from staged_items item
    left join public.products product on product.id = item.product_id
    where product.id is null
       or product.status <> 'active'
       or product.product_code !~ '^HK-(00[1-9]|0[1-4][0-9]|05[0-7])$'
  ) or (select count(distinct item.product_id) from staged_items item) <> 57 then
    raise exception using errcode = '22023', message = 'Items must use all 57 active products HK-001 through HK-057';
  end if;
  select staff_id into actor_id from staged_sales order by sale_date, daily_order_number limit 1;
  select encode(extensions.digest(convert_to(coalesce(string_agg(
    concat_ws('|', sale.sale_date::text, sale.daily_order_number::text,
      sale.client_request_id::text, sale.payment_method, sale.staff_id::text,
      (select string_agg(item.product_id::text || ':' || item.quantity::text, ',' order by item.product_id)
       from staged_items item where item.sale_client_request_id = sale.client_request_id)
    ), E'\n' order by sale.sale_date, sale.daily_order_number), ''), 'UTF8'), 'sha256'), 'hex')
  into payload_hash from staged_sales sale;

  create temp table old_sale_ids on commit drop as select id from public.sales;
  create temp table deleted_movement_net on commit drop as
  select movement.product_id, sum(movement.quantity_change)::integer quantity_change
  from public.stock_movements movement
  where movement.reference_type = 'sale'
    and movement.reference_id in (select id from old_sale_ids)
  group by movement.product_id;

  if exists (
    select 1 from product_snapshot product
    where product.current_stock <> product.ledger_stock
      and product.id in (select product_id from deleted_movement_net)
  ) then
    raise exception using errcode = 'P0001', message = 'Affected stock ledger is inconsistent before history replacement';
  end if;

  if exists (
    select 1 from deleted_movement_net net
    join product_snapshot product on product.id = net.product_id
    where product.current_stock - net.quantity_change < 0
  ) then
    raise exception using errcode = 'P0001', message = 'Sale movement reconciliation would create negative stock history';
  end if;

  delete from public.stock_movements
  where reference_type = 'sale' and reference_id in (select id from old_sale_ids);
  get diagnostics deleted_movements = row_count;
  delete from public.sale_items where sale_id in (select id from old_sale_ids);
  get diagnostics deleted_items = row_count;
  delete from public.sales where id in (select id from old_sale_ids);
  get diagnostics deleted_sales = row_count;
  delete from public.daily_order_counters where sale_date is not null;
  get diagnostics deleted_counters = row_count;

  insert into public.stock_movements (
    product_id, movement_type, quantity_change, stock_before, stock_after,
    reference_type, reference_id, reason, created_by
  )
  select net.product_id,
    case when net.quantity_change > 0 then 'adjustment_in' else 'adjustment_out' end,
    net.quantity_change,
    product.current_stock - net.quantity_change,
    product.current_stock,
    'history_replacement', null,
    'Aggregated sales movement retained after synthetic history replacement', actor_id
  from deleted_movement_net net
  join product_snapshot product on product.id = net.product_id
  where net.quantity_change <> 0;
  get diagnostics inserted_reconciliations = row_count;

  create temp table new_sale_ids (
    id uuid primary key,
    client_request_id uuid unique not null
  ) on commit drop;
  with inserted as (
    insert into public.sales (
      client_request_id, sale_date, daily_order_number, payment_method,
      staff_id, grand_total, status, created_at
    )
    select client_request_id, sale_date, daily_order_number, payment_method,
      staff_id, 0, 'completed', (sale_date::text || 'T12:00:00+08:00')::timestamptz
    from staged_sales order by sale_date, daily_order_number
    returning id, client_request_id
  )
  insert into new_sale_ids select id, client_request_id from inserted;
  get diagnostics inserted_sales = row_count;

  insert into public.sale_items (
    sale_id, product_id, product_code, product_name, quantity,
    unit_price, unit_cost, subtotal, cost_total, profit, created_at
  )
  select sale.id, product.id, product.product_code, product.name, item.quantity,
    product.selling_price, product.cost_price,
    item.quantity * product.selling_price,
    item.quantity * product.cost_price,
    item.quantity * (product.selling_price - product.cost_price),
    (staged.sale_date::text || 'T12:00:00+08:00')::timestamptz
  from staged_items item
  join staged_sales staged on staged.client_request_id = item.sale_client_request_id
  join new_sale_ids sale on sale.client_request_id = item.sale_client_request_id
  join product_snapshot product on product.id = item.product_id;
  get diagnostics inserted_items = row_count;

  update public.sales sale
  set grand_total = total.value
  from (
    select sale_id, sum(subtotal)::numeric(12, 2) value
    from public.sale_items where sale_id in (select id from new_sale_ids)
    group by sale_id
  ) total
  where sale.id = total.sale_id;

  insert into public.daily_order_counters (sale_date, next_order_number)
  select sale_date, max(daily_order_number) + 1 from public.sales group by sale_date;

  select coalesce(sum(grand_total), 0)::numeric(14, 2) into inserted_revenue
  from public.sales where id in (select id from new_sale_ids);

  select encode(extensions.digest(convert_to(coalesce(string_agg(
    concat_ws('|', sale.sale_date::text, sale.daily_order_number::text,
      sale.client_request_id::text, sale.payment_method, sale.staff_id::text,
      (select string_agg(item.product_id::text || ':' || item.quantity::text, ',' order by item.product_id)
       from public.sale_items item where item.sale_id = sale.id)
    ), E'\n' order by sale.sale_date, sale.daily_order_number), ''), 'UTF8'), 'sha256'), 'hex')
  into persisted_hash from public.sales sale;
  if persisted_hash is distinct from payload_hash then
    raise exception 'Persisted sales payload hash mismatch';
  end if;

  if inserted_sales <> (select count(*) from staged_sales)
     or inserted_items <> (select count(*) from staged_items)
     or exists (
       select 1 from public.sales sale
       where sale.id in (select id from new_sale_ids)
         and sale.grand_total is distinct from (
           select coalesce(sum(item.subtotal), 0)::numeric(12, 2)
           from public.sale_items item where item.sale_id = sale.id
         )
     )
     or exists (
       select 1 from public.daily_order_counters counter
       where counter.next_order_number is distinct from (
         select max(sale.daily_order_number) + 1 from public.sales sale where sale.sale_date = counter.sale_date
       )
     ) then
    raise exception 'Post-insert sales verification failed';
  end if;
  if exists (
    select 1 from public.products product
    join product_snapshot before on before.id = product.id
    where product.current_stock is distinct from before.current_stock
  ) or exists (
    select 1 from public.products product
    left join (
      select product_id, coalesce(sum(quantity_change), 0)::integer ledger_stock
      from public.stock_movements group by product_id
    ) ledger on ledger.product_id = product.id
    where product.id in (select product_id from deleted_movement_net)
      and product.current_stock <> coalesce(ledger.ledger_stock, 0)
  ) then
    raise exception 'Product stock or ledger changed inconsistently during history replacement';
  end if;

  return jsonb_build_object(
    'deletedSales', deleted_sales,
    'deletedItems', deleted_items,
    'deletedSaleMovements', deleted_movements,
    'deletedCounters', deleted_counters,
    'insertedSales', inserted_sales,
    'insertedItems', inserted_items,
    'insertedReconciliations', inserted_reconciliations,
    'insertedRevenue', inserted_revenue,
    'payloadHash', payload_hash,
    'ledgerConsistent', true,
    'startDate', p_start_date,
    'endDate', p_end_date
  );
end;
$$;

revoke all on function public.guard_sales_writes() from public, anon, authenticated;
revoke all on function public.assert_sales_writable() from public, anon, authenticated;
revoke all on function public.set_sales_maintenance(boolean) from public, anon, authenticated;
revoke all on function public.preview_sales_history_replacement() from public, anon, authenticated;
revoke all on function public.replace_sales_history(text, date, date, jsonb) from public, anon, authenticated;
grant execute on function public.set_sales_maintenance(boolean) to service_role;
grant execute on function public.preview_sales_history_replacement() to service_role;
grant execute on function public.replace_sales_history(text, date, date, jsonb) to service_role;
