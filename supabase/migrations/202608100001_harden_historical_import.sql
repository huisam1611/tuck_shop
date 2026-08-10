create or replace function public.import_initial_stock(
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
declare
  product_row public.products%rowtype;
  receipt_row public.stock_receipts%rowtype;
  movement_row public.stock_movements%rowtype;
  ledger_stock bigint;
  movement_inserted boolean := false;
  supplier_value text := nullif(trim(p_supplier_name), '');
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service role required';
  end if;
  if p_receipt_id is null or p_movement_id is null or p_product_id is null
     or p_receipt_date is null or p_quantity is null or p_quantity <= 0
     or p_unit_cost is null or p_unit_cost < 0 or p_created_by is null then
    raise exception using errcode = '22023', message = 'Invalid initial stock values';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = p_created_by and role = 'admin' and is_active
  ) then
    raise exception using errcode = '42501', message = 'Active Admin profile required';
  end if;

  select * into product_row
  from public.products
  where id = p_product_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Product not found';
  end if;

  select coalesce(sum(quantity_change), 0)::bigint into ledger_stock
  from public.stock_movements
  where product_id = p_product_id;
  if product_row.current_stock <> ledger_stock then
    raise exception using errcode = 'P0001', message = format(
      'Stock ledger is inconsistent for product %s; manual reconciliation required',
      product_row.product_code
    );
  end if;

  select * into receipt_row
  from public.stock_receipts
  where id = p_receipt_id
  for update;
  if found then
    if receipt_row.product_id <> p_product_id
       or receipt_row.receipt_date <> p_receipt_date
       or receipt_row.quantity <> p_quantity
       or receipt_row.unit_cost <> p_unit_cost
       or receipt_row.supplier_name is distinct from supplier_value
       or receipt_row.created_by <> p_created_by then
      raise exception using errcode = '23505', message = 'Initial stock receipt key conflicts with different data';
    end if;
  else
    insert into public.stock_receipts (
      id, receipt_date, product_id, quantity, unit_cost, supplier_name, created_by
    ) values (
      p_receipt_id, p_receipt_date, p_product_id, p_quantity, p_unit_cost, supplier_value, p_created_by
    ) returning * into receipt_row;
  end if;

  select * into movement_row
  from public.stock_movements
  where id = p_movement_id
  for update;
  if found then
    if movement_row.product_id <> p_product_id
       or movement_row.movement_type <> 'stock_in'
       or movement_row.quantity_change <> p_quantity
       or movement_row.reference_type <> 'stock_receipt'
       or movement_row.reference_id is distinct from p_receipt_id then
      raise exception using errcode = '23505', message = 'Initial stock movement key conflicts with different data';
    end if;
  else
    insert into public.stock_movements (
      id, product_id, movement_type, quantity_change, stock_before, stock_after,
      reference_type, reference_id, reason, created_by
    ) values (
      p_movement_id, p_product_id, 'stock_in', p_quantity,
      product_row.current_stock, product_row.current_stock + p_quantity,
      'stock_receipt', p_receipt_id, 'Initial inventory import', p_created_by
    ) returning * into movement_row;

    update public.products
    set current_stock = current_stock + p_quantity
    where id = p_product_id;
    movement_inserted := true;
  end if;

  return query select receipt_row.id, movement_row.id, movement_inserted;
end;
$$;

create or replace function public.reconcile_daily_order_counter(p_sale_date date)
returns public.daily_order_counters
language plpgsql
security definer
set search_path = public
as $$
declare
  counter_row public.daily_order_counters%rowtype;
  required_next integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service role required';
  end if;
  if p_sale_date is null then
    raise exception using errcode = '22023', message = 'Sale date is required';
  end if;

  select coalesce(max(daily_order_number) + 1, 1)
  into required_next
  from public.sales
  where sale_date = p_sale_date;

  insert into public.daily_order_counters (sale_date, next_order_number)
  values (p_sale_date, required_next)
  on conflict (sale_date) do update
  set next_order_number = greatest(
    public.daily_order_counters.next_order_number,
    excluded.next_order_number
  )
  returning * into counter_row;

  return counter_row;
end;
$$;

revoke all on function public.import_initial_stock(uuid, uuid, uuid, date, integer, numeric, text, uuid) from public;
revoke all on function public.import_initial_stock(uuid, uuid, uuid, date, integer, numeric, text, uuid) from anon;
revoke all on function public.import_initial_stock(uuid, uuid, uuid, date, integer, numeric, text, uuid) from authenticated;
grant execute on function public.import_initial_stock(uuid, uuid, uuid, date, integer, numeric, text, uuid) to service_role;

revoke all on function public.reconcile_daily_order_counter(date) from public;
revoke all on function public.reconcile_daily_order_counter(date) from anon;
revoke all on function public.reconcile_daily_order_counter(date) from authenticated;
grant execute on function public.reconcile_daily_order_counter(date) to service_role;
