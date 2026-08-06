import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
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

export type ReportFilters = {
  from?: string;
  to?: string;
  paymentMethod?: "cash" | "e_payment";
  status?: "completed" | "voided";
  product?: string;
  category?: string;
  staff?: string;
};

export type ReportData = {
  sales: ReportSaleRow[];
  inventory: Product[];
  monthlyProfit: MonthlyProfit[];
  summary: ReportSummary;
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

  const source = profile.role === "admin" ? "products" : "staff_products";
  const { data, error } = await supabase.from(source).select("*").order("name");
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
    payment_method: row.payment_method === "e_payment" ? "e_payment" : "cash",
    grand_total: Number(row.grand_total),
    status: row.status === "voided" ? "voided" : "completed",
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
  const source = profile.role === "admin" ? "sales" : "staff_sales";
  const columns = profile.role === "admin"
    ? "id,sale_date,daily_order_number,payment_method,grand_total,status,created_at,staff_id,voided_at,void_reason"
    : "id,sale_date,daily_order_number,payment_method,grand_total,status,created_at";
  const { data, error } = await supabase.from(source).select(columns).order("sale_date", { ascending: false }).order("daily_order_number", { ascending: false }).limit(200);
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
  const source = profile.role === "admin" ? "sale_items" : "staff_sale_items";
  const columns = profile.role === "admin"
    ? "id,sale_id,product_id,product_code,product_name,quantity,unit_price,unit_cost,subtotal,cost_total,profit"
    : "id,sale_id,product_code,product_name,quantity,unit_price,subtotal";
  const { data, error } = await supabase.from(source).select(columns).in("sale_id", saleIds).order("id");
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

function matchesText(value: string, filter?: string) {
  return !filter || value.toLowerCase().includes(filter.trim().toLowerCase());
}

export async function getReportData(filters: ReportFilters = {}): Promise<ReportData> {
  const [sales, inventory] = await Promise.all([listSales(), listProducts()]);
  const items = await listSaleItems(sales.map((sale) => sale.id));
  const productsById = new Map(inventory.map((product) => [product.id, product]));
  const filteredSales = sales.filter((sale) => (
    (!filters.from || sale.sale_date >= filters.from)
    && (!filters.to || sale.sale_date <= filters.to)
    && (!filters.paymentMethod || sale.payment_method === filters.paymentMethod)
    && (!filters.status || sale.status === filters.status)
    && matchesText(sale.staff_name ?? "", filters.staff)
  ));
  const rows = items.flatMap((item) => {
    const sale = filteredSales.find((entry) => entry.id === item.sale_id);
    if (!sale) return [];
    const product = productsById.get(item.product_id);
    const category = product?.category ?? "Unknown";
    if (!matchesText(item.product_code, filters.product) && !matchesText(item.product_name, filters.product)) return [];
    if (!matchesText(category, filters.category)) return [];
    return [{
      saleId: sale.id,
      saleDate: sale.sale_date,
      orderNumber: `${sale.sale_date}-${String(sale.daily_order_number).padStart(3, "0")}`,
      productCode: item.product_code,
      product: item.product_name,
      category,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      unitCost: item.unit_cost ?? 0,
      subtotal: item.subtotal,
      costTotal: item.cost_total ?? 0,
      profit: item.profit ?? item.subtotal - (item.cost_total ?? 0),
      paymentMethod: sale.payment_method === "cash" ? "Cash" : "E-payment",
      staff: sale.staff_name ?? "Current staff",
      status: sale.status === "completed" ? "Completed" : "Voided",
    } satisfies ReportSaleRow];
  });
  const { monthlyProfit, summary } = summarizeReportRows(rows);
  return {
    sales: rows,
    inventory,
    monthlyProfit,
    summary,
  };
}
