-- Final V1 hardening: bind retries to their original payload, narrow the only
-- actor-less ledger exception, and make SECURITY DEFINER execution explicit.

alter table public.stock_movements
  drop constraint stock_movements_created_by_reconciliation_check;

alter table public.stock_movements
  add constraint stock_movements_created_by_reconciliation_check
  check (
    created_by is not null
    or (
      movement_type = 'adjustment_in'
      and reference_type = 'opening_balance_reconciliation'
      and reference_id = '20260818-0001-5000-8000-000000000001'::uuid
      and reason = '202608180001 system migration opening balance reconciliation; current_stock retained as approved baseline'
    )
  );

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
  requested_items jsonb;
  stored_items jsonb;
begin
  perform public.assert_sales_writable();

  if p_client_request_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_client_request_id::text, 0));
    select * into existing_sale
    from public.sales
    where client_request_id = p_client_request_id;

    if found then
      if jsonb_typeof(p_items) <> 'array' then
        raise exception using errcode = '22023', message = 'Client request ID was already used for different sale data';
      end if;

      select coalesce(jsonb_object_agg(product_id::text, quantity), '{}'::jsonb)
      into requested_items
      from (
        select (item ->> 'product_id')::uuid as product_id,
          sum((item ->> 'quantity')::integer)::integer as quantity
        from jsonb_array_elements(p_items) item
        group by (item ->> 'product_id')::uuid
      ) requested;

      select coalesce(jsonb_object_agg(product_id::text, quantity), '{}'::jsonb)
      into stored_items
      from (
        select sale_item.product_id, sum(sale_item.quantity)::integer as quantity
        from public.sale_items sale_item
        where sale_item.sale_id = existing_sale.id
        group by sale_item.product_id
      ) stored;

      if existing_sale.staff_id is distinct from auth.uid()
         or existing_sale.sale_date is distinct from p_sale_date
         or existing_sale.payment_method is distinct from p_payment_method
         or requested_items is distinct from stored_items then
        raise exception using errcode = '22023', message = 'Client request ID was already used for different sale data';
      end if;
    end if;
  end if;

  return query
  select * from public.create_sale_unlocked(p_client_request_id, p_sale_date, p_payment_method, p_items);
end;
$$;

revoke all on function public.is_active_user() from public, anon;
revoke all on function public.has_role(text) from public, anon;
revoke all on function public.create_sale(uuid, date, text, jsonb) from public, anon;
revoke all on function public.stock_in(uuid, date, integer, numeric, text) from public, anon;
revoke all on function public.adjust_stock(uuid, text, integer, text) from public, anon;
revoke all on function public.void_sale(uuid, text) from public, anon;
revoke all on function public.admin_update_profile(uuid, text, text, boolean) from public, anon;
revoke all on function public.create_product(text, text, text, numeric, numeric, integer, text, text, text, text, text, text, text) from public, anon;
revoke all on function public.update_product(uuid, text, text, text, numeric, numeric, integer, text, text, text, text, text, text, text, text) from public, anon;
revoke all on function public.delete_product(uuid) from public, anon;
revoke all on function public.import_initial_stock(uuid, uuid, uuid, date, integer, numeric, text, uuid) from public, anon, authenticated;

grant execute on function public.is_active_user() to authenticated;
grant execute on function public.has_role(text) to authenticated;
grant execute on function public.create_sale(uuid, date, text, jsonb) to authenticated;
grant execute on function public.stock_in(uuid, date, integer, numeric, text) to authenticated;
grant execute on function public.adjust_stock(uuid, text, integer, text) to authenticated;
grant execute on function public.void_sale(uuid, text) to authenticated;
grant execute on function public.admin_update_profile(uuid, text, text, boolean) to authenticated;
grant execute on function public.create_product(text, text, text, numeric, numeric, integer, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.update_product(uuid, text, text, text, numeric, numeric, integer, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.delete_product(uuid) to authenticated;
grant execute on function public.import_initial_stock(uuid, uuid, uuid, date, integer, numeric, text, uuid) to service_role;
