import { describe, expect, it } from "vitest";

import {
  CATALOGUE,
  LEGACY_CODES,
  mergeExistingProduct,
} from "../scripts/import-historical-sales.mjs";

describe("historical import catalogue policy", () => {
  const categoryByName = new Map(CATALOGUE.map((product) => [product.name, product.category]));

  it.each([
    ["250地道菊花烏龍", "Drinks"],
    ["250麥精", "Drinks"],
    ["奶片", "Snacks"],
    ["可樂橡皮糖", "Snacks"],
    ["維達抽紙（綠茶）", "Household"],
  ])("assigns %s to %s", (name, category) => {
    expect(categoryByName.get(name)).toBe(category);
  });

  it("keeps the legacy and test product deactivation set", () => {
    expect(LEGACY_CODES).toEqual(new Set([
      "P001",
      "P002",
      "P003",
      "P004",
      "P005",
      "P006",
      "P007",
      "P008",
      "P009",
      "P010",
      "TEST-E2E-01",
    ]));
  });
});

describe("historical import existing-product policy", () => {
  const existing = {
    id: "product-id",
    product_code: "HK-001",
    name: "750 cool 礦泉水",
    category: "Drinks",
    status: "inactive",
    current_stock: 7,
    cost_price: 3.25,
    selling_price: 9.5,
    minimum_stock: 4,
  };

  it("reuses live fields and never reactivates an inactive product", () => {
    expect(mergeExistingProduct(existing, {
      code: "HK-001",
      name: existing.name,
      stock: 96,
      costPrice: 2.17,
      sellingPrice: 2.5,
      minimumStock: 20,
      category: "Drinks",
    })).toMatchObject({
      id: "product-id",
      costPrice: 3.25,
      sellingPrice: 9.5,
      minimumStock: 4,
      seedCostPrice: 2.17,
      category: "Drinks",
      current_stock: 7,
      status: "inactive",
    });
  });

  it("allows historical mapping to remain inactive without changing prices", () => {
    expect(mergeExistingProduct({ ...existing, status: "active" }, {
      code: "HK-001",
      name: existing.name,
      stock: 96,
      costPrice: 2.17,
      sellingPrice: 2.5,
      minimumStock: 20,
      category: "Drinks",
    }, { historical: true })).toMatchObject({
      costPrice: 3.25,
      sellingPrice: 9.5,
      status: "inactive",
    });
  });

  it("allows an approved HK SKU to use its canonical display name on retry", () => {
    expect(mergeExistingProduct({ ...existing, name: "Cool 礦泉水 750ml" }, {
      code: "HK-001",
      name: "750 cool 礦泉水",
      stock: 96,
      costPrice: 2.17,
      sellingPrice: 2.5,
      minimumStock: 20,
      category: "Drinks",
    })).toMatchObject({ id: "product-id", name: "Cool 礦泉水 750ml" });
  });

  it("stops when a non-catalogue product code has a different name", () => {
    expect(() => mergeExistingProduct({ ...existing, product_code: "LEGACY-001" }, {
      code: "LEGACY-001",
      name: "另一個產品",
      stock: 1,
      costPrice: 1,
      sellingPrice: 1,
      minimumStock: 1,
      category: "Snacks",
    })).toThrow(/名稱不一致/);
  });
});
