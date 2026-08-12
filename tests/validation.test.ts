import { describe, expect, it } from "vitest";

import { adjustmentSchema, productSchema, saleSchema, stockInSchema, voidSaleSchema } from "../src/lib/validation";

const productId = "00000000-0000-4000-8000-000000000001";

describe("validation schemas", () => {
  it("accepts Historical but rejects arbitrary categories", () => {
    const base = { productCode: "X", name: "X", category: "Historical", costPrice: 1, sellingPrice: 2, minimumStock: 0 };
    expect(productSchema.safeParse(base).success).toBe(true);
    expect(productSchema.safeParse({ ...base, category: "Not a category" }).success).toBe(false);
  });
  it("accepts a valid product and rejects negative prices", () => {
    const valid = { productCode: "P011", name: "Fruit Cup", category: "Food", costPrice: "1.50", sellingPrice: "2.50", minimumStock: "5" };
    expect(productSchema.safeParse(valid).success).toBe(true);
    expect(productSchema.safeParse({ ...valid, sellingPrice: "-1" }).success).toBe(false);
  });

  it("requires valid sale dates, UUIDs, and at least one item", () => {
    const valid = { saleDate: "2026-08-09", paymentMethod: "cash", items: [{ product_id: productId, quantity: 1 }] };
    expect(saleSchema.safeParse(valid).success).toBe(true);
    expect(saleSchema.safeParse({ ...valid, saleDate: "2026-8-9" }).success).toBe(false);
    expect(saleSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
    expect(voidSaleSchema.safeParse({ saleId: productId, reason: "wrong item" }).success).toBe(true);
    expect(voidSaleSchema.safeParse({ saleId: productId, reason: "" }).success).toBe(false);
  });

  it("requires positive inventory quantities and an adjustment reason", () => {
    const stockIn = { productId, receiptDate: "2026-08-09", quantity: "2", unitCost: "1.20", supplierName: "Supplier" };
    expect(stockInSchema.safeParse(stockIn).success).toBe(true);
    expect(stockInSchema.safeParse({ ...stockIn, quantity: "0" }).success).toBe(false);
    expect(adjustmentSchema.safeParse({ productId, direction: "increase", quantity: 1, reason: "TEST QA" }).success).toBe(true);
    expect(adjustmentSchema.safeParse({ productId, direction: "increase", quantity: 1, reason: "" }).success).toBe(false);
  });
});
