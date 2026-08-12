import { describe, expect, it } from "vitest";
import { filterSaleProducts, effectiveSaleProductId } from "../src/app/(dashboard)/sales/sale-product-search";
const products = [{ id: "a", product_code: "A", name: "Alpha", brand: "BrandA" }, { id: "b", product_code: "B", name: "Beta", flavour: "辣" }];
describe("sale product search", () => { it("filters and falls back selection", () => { const result = filterSaleProducts(products, "Beta"); expect(result.map((p) => p.id)).toEqual(["b"]); expect(effectiveSaleProductId(result, "a")).toBe("b"); expect(effectiveSaleProductId([], "a")).toBe(""); expect(filterSaleProducts(products, "BrandA")).toHaveLength(1); }); });
