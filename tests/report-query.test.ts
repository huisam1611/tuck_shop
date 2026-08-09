import { describe, expect, it } from "vitest";

import { buildReportRows } from "../src/lib/report-query";

const productId = "00000000-0000-4000-8000-000000000001";
const sale = { id: "sale-1", sale_date: "2026-08-09", daily_order_number: 7, payment_method: "cash" as const, status: "completed" as const, staff_name: "Alice" };
const item = { sale_id: "sale-1", product_id: productId, product_code: "P001", product_name: "Potato Chips", quantity: 2, unit_price: 2, unit_cost: 1.2, subtotal: 4, cost_total: 2.4, profit: 1.6 };

describe("report query mapping", () => {
  it("maps rows, keeps historical cost, and applies filters", () => {
    const rows = buildReportRows([sale], [item], [{ id: productId, category: "Snacks" }], { month: "2026-08", product: "potato", staff: "alice" });

    expect(rows).toEqual([expect.objectContaining({ orderNumber: "2026-08-09-007", category: "Snacks", unitCost: 1.2, costTotal: 2.4, profit: 1.6, status: "Completed" })]);
    expect(buildReportRows([sale], [item], [{ id: productId, category: "Snacks" }], { category: "Drinks" })).toEqual([]);
    expect(buildReportRows([{ ...sale, status: "voided" }], [item], [{ id: productId, category: "Snacks" }], { status: "completed" })).toEqual([]);
  });
});
