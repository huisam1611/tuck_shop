import type { ReportSaleRow } from "./reporting";

export type ReportFilters = {
  from?: string;
  to?: string;
  month?: string;
  paymentMethod?: "cash" | "e_payment";
  status?: "completed" | "voided";
  product?: string;
  category?: string;
  staff?: string;
};

type QuerySale = {
  id: string;
  sale_date: string;
  daily_order_number: number;
  payment_method: "cash" | "e_payment";
  status: "completed" | "voided";
  staff_name?: string;
};

type QueryItem = {
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

type QueryProduct = { id: string; category: string };

function matchesText(value: string, filter?: string) {
  return !filter || value.toLowerCase().includes(filter.trim().toLowerCase());
}

export function buildReportRows(sales: QuerySale[], items: QueryItem[], inventory: QueryProduct[], filters: ReportFilters = {}): ReportSaleRow[] {
  const filteredSales = sales.filter((sale) => (
    (!filters.from || sale.sale_date >= filters.from)
    && (!filters.to || sale.sale_date <= filters.to)
    && (!filters.month || sale.sale_date.startsWith(filters.month))
    && (!filters.paymentMethod || sale.payment_method === filters.paymentMethod)
    && (!filters.status || sale.status === filters.status)
    && matchesText(sale.staff_name ?? "", filters.staff)
  ));
  const productsById = new Map(inventory.map((product) => [product.id, product]));
  return items.flatMap((item) => {
    const sale = filteredSales.find((entry) => entry.id === item.sale_id);
    if (!sale) return [];
    const category = productsById.get(item.product_id)?.category ?? "Unknown";
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
}
