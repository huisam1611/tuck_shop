import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import { getBusinessDate, normalizePaymentMethod, normalizeSaleStatus } from "@/lib/domain";
import { buildReportRows, type ReportFilters } from "@/lib/report-query";
import { summarizeReportRows, type MonthlyProfit, type ReportSaleRow, type ReportSummary } from "@/lib/reporting";

export type { MonthlyProfit, ReportSaleRow, ReportSummary } from "@/lib/reporting";

export type Product = {
  id: string;
  product_code: string;
  name: string;
  category: string;
  selling_price: number;
  cost_price?: number;
  current_stock: number;
  minimum_stock: number;
  status: "active" | "inactive";
};

export type Profile = { id: string; name: string; role: "admin" | "staff"; is_active: boolean };

export type SaleSummary = {
  id: string;
  sale_date: string;
  daily_order_number: number;
  payment_method: "cash" | "e_payment";
  grand_total: number;
  status: "completed" | "voided";
  created_at: string;
  staff_id?: string;
  staff_name?: string;
  voided_at?: string | null;
  void_reason?: string | null;
};

export type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost?: number;
  subtotal: number;
  cost_total?: number;
  profit?: number;
};

export type StockMovement = {
  id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  movement_type: "stock_in" | "sale" | "sale_void" | "adjustment_in" | "adjustment_out";
  quantity_change: number;
  stock_before: number;
  stock_after: number;
  reference_type: string;
  reference_id?: string | null;
  reason?: string | null;
  performer_name?: string;
  created_at: string;
};

export type { ReportFilters } from "@/lib/report-query";

export type ReportData = {
  sales: ReportSaleRow[];
  inventory: Product[];
  monthlyProfit: MonthlyProfit[];
  summary: ReportSummary;
};

export type DashboardSummary = {
  todayRevenue: number;
  todayOrders: number;
  monthRevenue: number;
  monthProfit: number;
  myTodayOrders: number;
  activeProductCount: number;
  lowStockProducts: { name: string; currentStock: number }[];
  bestSelling: { name: string; sold: number; revenue: number }[];
  dailyRevenue: number[];
};

export type SearchResults = {
  products: Product[];
  sales: (SaleSummary & { item_names: string[] })[];
};

export async function getCurrentProfile(): Promise<Profile | null> {
  if (!hasSupabaseEnv()) return { id: "demo-admin", name: "Alice", role: "admin", is_active: true };

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;
  const { data } = await supabase.from("profiles").select("id, name, role, is_active").eq("id", authData.user.id).maybeSingle();
  return (data as Profile | null) ?? null;
}

export const demoProducts: Product[] = [
  { id: "demo-001", product_code: "P001", name: "Potato Chips", category: "Snacks", cost_price: 1.2, selling_price: 2, current_stock: 40, minimum_stock: 10, status: "active" },
  { id: "demo-002", product_code: "P002", name: "Chocolate Bar", category: "Snacks", cost_price: 1.3, selling_price: 2, current_stock: 35, minimum_stock: 10, status: "active" },
  { id: "demo-003", product_code: "P003", name: "Coca-Cola Can", category: "Drinks", cost_price: 1.5, selling_price: 2, current_stock: 30, minimum_stock: 10, status: "active" },
  { id: "demo-004", product_code: "P004", name: "Mineral Water", category: "Drinks", cost_price: 0.6, selling_price: 1, current_stock: 50, minimum_stock: 15, status: "active" },
  { id: "demo-005", product_code: "P005", name: "Orange Juice", category: "Drinks", cost_price: 1.4, selling_price: 2.5, current_stock: 18, minimum_stock: 8, status: "active" },
  { id: "demo-006", product_code: "P006", name: "Instant Noodles", category: "Food", cost_price: 1.1, selling_price: 2, current_stock: 25, minimum_stock: 8, status: "active" },
  { id: "demo-007", product_code: "P007", name: "Biscuit Pack", category: "Snacks", cost_price: 1, selling_price: 1.8, current_stock: 32, minimum_stock: 10, status: "active" },
  { id: "demo-008", product_code: "P008", name: "Chewing Gum", category: "Snacks", cost_price: 0.4, selling_price: 0.8, current_stock: 45, minimum_stock: 12, status: "active" },
  { id: "demo-009", product_code: "P009", name: "Ice Cream Cup", category: "Frozen", cost_price: 1.5, selling_price: 2.5, current_stock: 12, minimum_stock: 6, status: "active" },
  { id: "demo-010", product_code: "P010", name: "Sandwich", category: "Food", cost_price: 2.2, selling_price: 3.5, current_stock: 10, minimum_stock: 5, status: "active" },
];

export async function listProducts(): Promise<Product[]> {
  if (!hasSupabaseEnv()) return demoProducts;

  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile) return [];

  const result = profile.role === "admin"
    ? await supabase.from("products").select("*").order("name")
    : await supabase.from("staff_products").select("*").order("name");
  const { data, error } = result;
  if (error) throw new Error("Unable to load products.");
  return (data ?? []).map((row) => ({
    ...(row as Product),
    selling_price: Number((row as Product).selling_price),
    cost_price: (row as Product).cost_price === undefined || (row as Product).cost_price === null ? undefined : Number((row as Product).cost_price),
    current_stock: Number((row as Product).current_stock),
    minimum_stock: Number((row as Product).minimum_stock),
  }));
}

const demoSales: SaleSummary[] = [
  { id: "demo-sale-001", sale_date: "2026-08-06", daily_order_number: 1, payment_method: "cash", grand_total: 4, status: "completed", created_at: "2026-08-06T09:15:00.000Z", staff_id: "demo-admin", staff_name: "Alice" },
  { id: "demo-sale-002", sale_date: "2026-08-06", daily_order_number: 2, payment_method: "e_payment", grand_total: 2, status: "completed", created_at: "2026-08-06T09:22:00.000Z", staff_id: "demo-admin", staff_name: "Alice" },
];

const demoSaleItems: SaleItem[] = [
  { id: "demo-item-001", sale_id: "demo-sale-001", product_id: "demo-001", product_code: "P001", product_name: "Potato Chips", quantity: 2, unit_price: 2, unit_cost: 1.2, subtotal: 4, cost_total: 2.4, profit: 1.6 },
  { id: "demo-item-002", sale_id: "demo-sale-002", product_id: "demo-003", product_code: "P003", product_name: "Coca-Cola Can", quantity: 1, unit_price: 2, unit_cost: 1.5, subtotal: 2, cost_total: 1.5, profit: 0.5 },
];

function toSaleSummary(row: Record<string, unknown>, staffName?: string): SaleSummary {
  return {
    id: String(row.id),
    sale_date: String(row.sale_date),
    daily_order_number: Number(row.daily_order_number),
    payment_method: normalizePaymentMethod(row.payment_method),
    grand_total: Number(row.grand_total),
    status: normalizeSaleStatus(row.status),
    created_at: String(row.created_at),
    staff_id: row.staff_id ? String(row.staff_id) : undefined,
    staff_name: staffName,
    voided_at: row.voided_at ? String(row.voided_at) : null,
    void_reason: row.void_reason ? String(row.void_reason) : null,
  };
}

export async function listSales(): Promise<SaleSummary[]> {
  if (!hasSupabaseEnv()) return demoSales;

  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile) return [];
  const result = profile.role === "admin"
    ? await supabase.from("sales").select("id,sale_date,daily_order_number,payment_method,grand_total,status,created_at,staff_id,voided_at,void_reason").order("sale_date", { ascending: false }).order("daily_order_number", { ascending: false }).limit(200)
    : await supabase.from("staff_sales").select("id,sale_date,daily_order_number,payment_method,grand_total,status,created_at").order("sale_date", { ascending: false }).order("daily_order_number", { ascending: false }).limit(200);
  const { data, error } = result;
  if (error) throw new Error("Unable to load sales history.");

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  if (profile.role !== "admin") return rows.map((row) => toSaleSummary(row));

  const staffIds = [...new Set(rows.map((row) => String(row.staff_id ?? "")).filter(Boolean))];
  const names = new Map<string, string>();
  if (staffIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id,name").in("id", staffIds);
    for (const staff of profiles ?? []) names.set(String(staff.id), String(staff.name));
  }
  return rows.map((row) => toSaleSummary(row, names.get(String(row.staff_id))));
}

export async function listSaleItems(saleIds: string[]): Promise<SaleItem[]> {
  if (saleIds.length === 0) return [];
  if (!hasSupabaseEnv()) return demoSaleItems.filter((item) => saleIds.includes(item.sale_id));

  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile) return [];
  const result = profile.role === "admin"
    ? await supabase.from("sale_items").select("id,sale_id,product_id,product_code,product_name,quantity,unit_price,unit_cost,subtotal,cost_total,profit").in("sale_id", saleIds).order("id")
    : await supabase.from("staff_sale_items").select("id,sale_id,product_code,product_name,quantity,unit_price,subtotal").in("sale_id", saleIds).order("id");
  const { data, error } = result;
  if (error) throw new Error("Unable to load sale items.");
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    sale_id: String(row.sale_id),
    product_id: row.product_id ? String(row.product_id) : "",
    product_code: String(row.product_code),
    product_name: String(row.product_name),
    quantity: Number(row.quantity),
    unit_price: Number(row.unit_price),
    unit_cost: row.unit_cost === undefined || row.unit_cost === null ? undefined : Number(row.unit_cost),
    subtotal: Number(row.subtotal),
    cost_total: row.cost_total === undefined || row.cost_total === null ? undefined : Number(row.cost_total),
    profit: row.profit === undefined || row.profit === null ? undefined : Number(row.profit),
  }));
}

export async function getProduct(productId: string): Promise<Product | null> {
  if (!hasSupabaseEnv()) return demoProducts.find((product) => product.id === productId) ?? null;
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return null;
  const { data, error } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
  if (error) throw new Error("Unable to load product.");
  if (!data) return null;
  return {
    ...(data as Product),
    selling_price: Number((data as Product).selling_price),
    cost_price: Number((data as Product).cost_price),
    current_stock: Number((data as Product).current_stock),
    minimum_stock: Number((data as Product).minimum_stock),
  };
}

const demoProfiles: Profile[] = [
  { id: "demo-admin", name: "Alice", role: "admin", is_active: true },
  { id: "demo-staff", name: "Ben", role: "staff", is_active: true },
];

export async function listProfiles(): Promise<Profile[]> {
  if (!hasSupabaseEnv()) return demoProfiles;
  const supabase = await createClient();
  const current = await getCurrentProfile();
  if (!current || current.role !== "admin") return [];
  const { data, error } = await supabase.from("profiles").select("id,name,role,is_active").order("name");
  if (error) throw new Error("Unable to load users.");
  return (data ?? []) as Profile[];
}

export async function listStockMovements(): Promise<StockMovement[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return [];
  const { data, error } = await supabase.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(250);
  if (error) throw new Error("Unable to load stock movement history.");
  const rows = (data ?? []) as Record<string, unknown>[];
  const productIds = [...new Set(rows.map((row) => String(row.product_id ?? "")).filter(Boolean))];
  const creatorIds = [...new Set(rows.map((row) => String(row.created_by ?? "")).filter(Boolean))];
  const [productsResult, profilesResult] = await Promise.all([
    productIds.length ? supabase.from("products").select("id,product_code,name").in("id", productIds) : Promise.resolve({ data: [] }),
    creatorIds.length ? supabase.from("profiles").select("id,name").in("id", creatorIds) : Promise.resolve({ data: [] }),
  ]);
  const products = new Map((productsResult.data ?? []).map((product) => [String(product.id), product]));
  const creators = new Map((profilesResult.data ?? []).map((creator) => [String(creator.id), String(creator.name)]));
  return rows.map((row) => {
    const product = products.get(String(row.product_id));
    return {
      id: String(row.id),
      product_id: String(row.product_id),
      product_code: String(product?.product_code ?? "—"),
      product_name: String(product?.name ?? "Unknown product"),
      movement_type: String(row.movement_type) as StockMovement["movement_type"],
      quantity_change: Number(row.quantity_change),
      stock_before: Number(row.stock_before),
      stock_after: Number(row.stock_after),
      reference_type: String(row.reference_type),
      reference_id: row.reference_id ? String(row.reference_id) : null,
      reason: row.reason ? String(row.reason) : null,
      performer_name: creators.get(String(row.created_by)),
      created_at: String(row.created_at),
    };
  });
}

export async function getReportData(filters: ReportFilters = {}): Promise<ReportData> {
  const [sales, inventory] = await Promise.all([listSales(), listProducts()]);
  const items = await listSaleItems(sales.map((sale) => sale.id));
  const rows = buildReportRows(sales, items, inventory, filters);
  const { monthlyProfit, summary } = summarizeReportRows(rows);
  return {
    sales: rows,
    inventory,
    monthlyProfit,
    summary,
  };
}

export async function getDashboardSummary(profile: Profile | null): Promise<DashboardSummary> {
  const [sales, products] = await Promise.all([listSales(), listProducts()]);
  const today = getBusinessDate();
  const month = today.slice(0, 7);
  const completedSales = sales.filter((sale) => sale.status === "completed");
  const todaySales = completedSales.filter((sale) => sale.sale_date === today);
  const monthSales = completedSales.filter((sale) => sale.sale_date.startsWith(month));
  const items = profile?.role === "admin" ? await listSaleItems(monthSales.map((sale) => sale.id)) : [];
  const saleById = new Map(monthSales.map((sale) => [sale.id, sale]));
  const productTotals = new Map<string, { name: string; sold: number; revenue: number }>();
  let monthProfit = 0;
  for (const item of items) {
    const sale = saleById.get(item.sale_id);
    if (!sale) continue;
    const current = productTotals.get(item.product_code) ?? { name: item.product_name, sold: 0, revenue: 0 };
    current.sold += item.quantity;
    current.revenue += item.subtotal;
    productTotals.set(item.product_code, current);
    monthProfit += item.profit ?? item.subtotal - (item.cost_total ?? 0);
  }
  const dailyRevenue = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(`${today}T00:00:00`);
    date.setDate(date.getDate() - (13 - index));
    const key = date.toISOString().slice(0, 10);
    return completedSales.filter((sale) => sale.sale_date === key).reduce((sum, sale) => sum + sale.grand_total, 0);
  });
  return {
    todayRevenue: todaySales.reduce((sum, sale) => sum + sale.grand_total, 0),
    todayOrders: todaySales.length,
    monthRevenue: monthSales.reduce((sum, sale) => sum + sale.grand_total, 0),
    monthProfit,
    myTodayOrders: todaySales.length,
    activeProductCount: products.filter((product) => product.status === "active").length,
    lowStockProducts: products.filter((product) => product.status === "active" && product.current_stock <= product.minimum_stock).sort((left, right) => left.current_stock - right.current_stock).slice(0, 5).map((product) => ({ name: product.name, currentStock: product.current_stock })),
    bestSelling: [...productTotals.values()].sort((left, right) => right.sold - left.sold).slice(0, 10),
    dailyRevenue,
  };
}

export async function searchRecords(query: string): Promise<SearchResults> {
  const search = query.trim().toLowerCase();
  if (!search) return { products: [], sales: [] };
  const [products, sales] = await Promise.all([listProducts(), listSales()]);
  const items = await listSaleItems(sales.map((sale) => sale.id));
  const itemNamesBySale = new Map<string, string[]>();
  for (const item of items) itemNamesBySale.set(item.sale_id, [...(itemNamesBySale.get(item.sale_id) ?? []), `${item.product_code} ${item.product_name}`]);
  const productMatches = products.filter((product) => [product.product_code, product.name, product.category].some((value) => value.toLowerCase().includes(search)));
  const saleMatches = sales.filter((sale) => {
    const order = `${sale.sale_date}-${String(sale.daily_order_number).padStart(3, "0")}`;
    const names = itemNamesBySale.get(sale.id) ?? [];
    return [order, sale.sale_date, sale.staff_name ?? "", ...names].some((value) => value.toLowerCase().includes(search));
  }).map((sale) => ({ ...sale, item_names: itemNamesBySale.get(sale.id) ?? [] }));
  return { products: productMatches, sales: saleMatches };
}
