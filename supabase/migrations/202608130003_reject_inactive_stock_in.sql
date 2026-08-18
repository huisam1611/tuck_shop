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
  product_status text;
begin
  if not public.has_role('admin') then
    raise exception using errcode = '42501', message = 'Admin role required';
  end if;
  perform public.assert_sales_writable();
  select status into product_status from public.products where id = p_product_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Product not found';
  end if;
  if product_status <> 'active' then
    raise exception using errcode = 'P0001', message = 'Inactive products cannot receive stock';
  end if;
  return public.stock_in_unlocked(p_product_id, p_receipt_date, p_quantity, p_unit_cost, p_supplier_name);
end;
$$;

revoke all on function public.stock_in(uuid, date, integer, numeric, text) from public, anon;
grant execute on function public.stock_in(uuid, date, integer, numeric, text) to authenticated;
