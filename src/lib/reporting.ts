export type ReportSaleRow = {
  saleId: string;
  saleDate: string;
  orderNumber: string;
  productCode: string;
  product: string;
  category: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
  costTotal: number;
  profit: number;
  paymentMethod: "Cash" | "E-payment";
  staff: string;
  status: "Completed" | "Voided";
};

export type MonthlyProfit = { month: string; revenue: number; cost: number; profit: number; margin: number };

export type ReportSummary = { validOrders: number; cashTotal: number; ePaymentTotal: number; revenue: number; cost: number; profit: number };

export function summarizeReportRows(rows: ReportSaleRow[]): { monthlyProfit: MonthlyProfit[]; summary: ReportSummary } {
  const validRows = rows.filter((row) => row.status === "Completed");
  const validSaleIds = new Set(validRows.map((row) => row.saleId));
  const cashTotal = validRows.filter((row) => row.paymentMethod === "Cash").reduce((sum, row) => sum + row.subtotal, 0);
  const ePaymentTotal = validRows.filter((row) => row.paymentMethod === "E-payment").reduce((sum, row) => sum + row.subtotal, 0);
  const revenue = validRows.reduce((sum, row) => sum + row.subtotal, 0);
  const cost = validRows.reduce((sum, row) => sum + row.costTotal, 0);
  const profit = validRows.reduce((sum, row) => sum + row.profit, 0);
  const monthly = new Map<string, { revenue: number; cost: number; profit: number }>();
  for (const row of validRows) {
    const current = monthly.get(row.saleDate.slice(0, 7)) ?? { revenue: 0, cost: 0, profit: 0 };
    current.revenue += row.subtotal;
    current.cost += row.costTotal;
    current.profit += row.profit;
    monthly.set(row.saleDate.slice(0, 7), current);
  }
  const monthlyProfit = [...monthly.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([month, values]) => ({ ...values, month, margin: values.revenue === 0 ? 0 : values.profit / values.revenue }));
  return { monthlyProfit, summary: { validOrders: validSaleIds.size, cashTotal, ePaymentTotal, revenue, cost, profit } };
}
