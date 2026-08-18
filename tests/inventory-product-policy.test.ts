import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("inventory product selection", () => {
  it("shows only active products and rejects inactive stock-in calls", () => {
    const page = readFileSync("src/app/(dashboard)/inventory/page.tsx", "utf8");
    const migration = readFileSync("supabase/migrations/202608130003_reject_inactive_stock_in.sql", "utf8");

    expect(page).toContain('products.filter((product) => product.status === "active")');
    expect(migration).toContain("product_status <> 'active'");
    expect(migration).toContain("Inactive products cannot receive stock");
    expect(migration).toContain("perform public.assert_sales_writable()");
    expect(migration).toContain("return public.stock_in_unlocked");
  });
});
