-- One-time reconciliation of the approved legacy opening balances.
-- Supabase applies each migration transactionally; every guard below rolls back the insert.
alter table public.stock_movements alter column created_by drop not null;
alter table public.stock_movements
  add constraint stock_movements_created_by_reconciliation_check
  check (created_by is not null or reference_type = 'opening_balance_reconciliation');

create temp table opening_balance_targets (
  product_code text primary key,
  expected_stock integer not null check (expected_stock > 0)
) on commit drop;

insert into opening_balance_targets (product_code, expected_stock) values
  ('P001', 40),
  ('P002', 35),
  ('P003', 30),
  ('P004', 50),
  ('P005', 18),
  ('P006', 25),
  ('P007', 32),
  ('P008', 45),
  ('P009', 12),
  ('P010', 10);

do $$
declare
  target_count integer;
  target_total integer;
  global_mismatch_count integer;
  inserted_count integer;
  reconciliation_reference constant uuid := '20260818-0001-5000-8000-000000000001';
  reconciliation_reason constant text := '202608180001 system migration opening balance reconciliation; current_stock retained as approved baseline';
begin
  lock table public.products, public.stock_movements in share row exclusive mode;

  select count(*) into target_count from opening_balance_targets;
  if target_count <> 10 then
    raise exception using errcode = 'P0001', message = format(
      '202608180001 guard failed: expected 10 opening-balance targets, found %s', target_count
    );
  end if;

  if (select count(*)
      from public.products product
      join opening_balance_targets target on target.product_code = product.product_code) <> 10 then
    raise exception using errcode = 'P0001', message = '202608180001 guard failed: P001-P010 product set is incomplete';
  end if;

  if exists (
    select 1
    from public.products product
    join opening_balance_targets target on target.product_code = product.product_code
    where product.current_stock <> target.expected_stock
  ) then
    raise exception using errcode = 'P0001', message = '202608180001 guard failed: P001-P010 current_stock changed';
  end if;

  select coalesce(sum(product.current_stock), 0)
  into target_total
  from public.products product
  join opening_balance_targets target on target.product_code = product.product_code;
  if target_total <> 297 then
    raise exception using errcode = 'P0001', message = format(
      '202608180001 guard failed: expected P001-P010 current_stock total 297, found %s', target_total
    );
  end if;

  if exists (
    select 1
    from opening_balance_targets target
    join public.products product on product.product_code = target.product_code
    left join public.stock_movements movement on movement.product_id = product.id
    group by product.id
    having count(movement.id) <> 0
       or coalesce(sum(movement.quantity_change), 0) <> 0
  ) then
    raise exception using errcode = 'P0001', message = '202608180001 guard failed: P001-P010 already have stock movements';
  end if;

  select count(*)
  into global_mismatch_count
  from public.products product
  where product.current_stock <> coalesce((
    select sum(movement.quantity_change)
    from public.stock_movements movement
    where movement.product_id = product.id
  ), 0);
  if global_mismatch_count <> 10 then
    raise exception using errcode = 'P0001', message = format(
      '202608180001 guard failed: expected 10 global ledger mismatches before reconciliation, found %s',
      global_mismatch_count
    );
  end if;

  if exists (select 1 from public.stock_movements where reference_id = reconciliation_reference) then
    raise exception using errcode = 'P0001', message = '202608180001 guard failed: reconciliation reference already exists';
  end if;

  -- The migration is the reviewed reconciliation operation; table locks above prevent concurrent inventory writes.
  perform set_config('app.sales_history_replacement', 'on', true);

  insert into public.stock_movements (
    id,
    product_id,
    movement_type,
    quantity_change,
    stock_before,
    stock_after,
    reference_type,
    reference_id,
    reason,
    created_by
  )
  select
    gen_random_uuid(),
    product.id,
    'adjustment_in',
    product.current_stock,
    0,
    product.current_stock,
    'opening_balance_reconciliation',
    reconciliation_reference,
    reconciliation_reason,
    null
  from public.products product
  join opening_balance_targets target on target.product_code = product.product_code
  order by product.product_code;

  get diagnostics inserted_count = row_count;
  if inserted_count <> target_count then
    raise exception using errcode = 'P0001', message = format(
      '202608180001 post-condition failed: inserted %s movements, expected %s', inserted_count, target_count
    );
  end if;

  if exists (
    select 1
    from public.products product
    join opening_balance_targets target on target.product_code = product.product_code
    where product.current_stock <> target.expected_stock
       or product.current_stock <> coalesce((
         select sum(movement.quantity_change)
         from public.stock_movements movement
         where movement.product_id = product.id
       ), 0)
  ) then
    raise exception using errcode = 'P0001', message = '202608180001 post-condition failed: opening balances do not reconcile';
  end if;

  if (select count(*) from public.stock_movements where reference_id = reconciliation_reference) <> target_count
     or exists (
       select 1
       from public.stock_movements movement
       join public.products product on product.id = movement.product_id
       join opening_balance_targets target on target.product_code = product.product_code
       where movement.reference_id = reconciliation_reference
         and (movement.movement_type <> 'adjustment_in'
           or movement.quantity_change <> product.current_stock
           or movement.stock_before <> 0
           or movement.stock_after <> product.current_stock
           or movement.reference_type <> 'opening_balance_reconciliation'
           or movement.reason <> reconciliation_reason
           or movement.created_by is not null)
     ) then
    raise exception using errcode = 'P0001', message = '202608180001 post-condition failed: movement audit fields are inconsistent';
  end if;

  select count(*)
  into global_mismatch_count
  from public.products product
  where product.current_stock <> coalesce((
    select sum(movement.quantity_change)
    from public.stock_movements movement
    where movement.product_id = product.id
  ), 0);
  if global_mismatch_count <> 0 then
    raise exception using errcode = 'P0001', message = format(
      '202608180001 post-condition failed: global ledger mismatch count is %s', global_mismatch_count
    );
  end if;
end;
$$;
