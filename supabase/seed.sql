insert into public.products (
  product_code, name, category, cost_price, selling_price, current_stock, minimum_stock
)
select * from (values
  ('P001', 'Potato Chips', 'Snacks', 1.20::numeric, 2.00::numeric, 40, 10),
  ('P002', 'Chocolate Bar', 'Snacks', 1.30::numeric, 2.00::numeric, 35, 10),
  ('P003', 'Coca-Cola Can', 'Drinks', 1.50::numeric, 2.00::numeric, 30, 10),
  ('P004', 'Mineral Water', 'Drinks', 0.60::numeric, 1.00::numeric, 50, 15),
  ('P005', 'Orange Juice', 'Drinks', 1.40::numeric, 2.50::numeric, 18, 8),
  ('P006', 'Instant Noodles', 'Food', 1.10::numeric, 2.00::numeric, 25, 8),
  ('P007', 'Biscuit Pack', 'Snacks', 1.00::numeric, 1.80::numeric, 32, 10),
  ('P008', 'Chewing Gum', 'Snacks', 0.40::numeric, 0.80::numeric, 45, 12),
  ('P009', 'Ice Cream Cup', 'Frozen', 1.50::numeric, 2.50::numeric, 12, 6),
  ('P010', 'Sandwich', 'Food', 2.20::numeric, 3.50::numeric, 10, 5)) as sample(product_code, name, category, cost_price, selling_price, current_stock, minimum_stock)
where not exists (
  select 1 from public.products p where lower(p.product_code) = lower(sample.product_code)
);
