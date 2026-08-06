import { describe, expect, it } from "vitest";

import { summarizeReportRows, type ReportSaleRow } from "../src/lib/reporting";

const row = (overrides: Partial<ReportSaleRow>): ReportSaleRow => ({
  saleId: "sale-1",
  saleDate: "2026-08-06",
  orderNumber: "2026-08-06-001",
  productCode: "P001",
  product: "Potato Chips",
  category: "Snacks",
  quantity: 1,
  unitPrice: 4,
  unitCost: 2.4,
  subtotal: 4,
  costTotal: 2.4,
  profit: 1.6,
  paymentMethod: "Cash",
  staff: "Alice",
  status: "Completed",
  ...overrides,
});

describe("report summaries", () => {
  it("excludes voided rows and keeps historical costs in profit", () => {
    const result = summarizeReportRows([
      row({}),
      row({ subtotal: 3, costTotal: 1.5, profit: 1.5, paymentMethod: "E-payment" }),
      row({ saleId: "sale-voided", status: "Voided", subtotal: 100, costTotal: 80, profit: 20 }),
    ]);

    expect(result.summary).toEqual({ validOrders: 1, cashTotal: 4, ePaymentTotal: 3, revenue: 7, cost: 3.9, profit: 3.1 });
    expect(result.monthlyProfit[0]).toMatchObject({ month: "2026-08", revenue: 7, cost: 3.9, profit: 3.1 });
    expect(result.monthlyProfit[0].margin).toBeCloseTo(3.1 / 7);
  });
});
