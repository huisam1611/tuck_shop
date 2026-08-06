-- RLS decides which rows a role may use; these grants decide which operations
-- the PostgREST roles may attempt in the first place.
grant usage on schema public to anon, authenticated, service_role;

grant select on public.profiles,
  public.products,
  public.sales,
  public.sale_items,
  public.stock_receipts,
  public.stock_movements,
  public.daily_order_counters
to authenticated;

grant all on public.profiles,
  public.products,
  public.sales,
  public.sale_items,
  public.stock_receipts,
  public.stock_movements,
  public.daily_order_counters
to service_role;

grant all on all sequences in schema public to service_role;
