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
          (select string_agg(item.product_id::text || ':' || item.quantity::text, ',' order by item.product_id, item.id)
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

revoke all on function public.preview_sales_history_replacement() from public, anon, authenticated;
grant execute on function public.preview_sales_history_replacement() to service_role;
