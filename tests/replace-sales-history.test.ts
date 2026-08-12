import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { confirmationForTarget, datesBetween, generateSales, maintenanceConfirmationForTarget, parseArgs, payloadHash, summarizeGenerated, targetFromUrl, validateBackupManifest } from "../scripts/replace-sales-history.mjs";

const products = Array.from({ length: 57 }, (_, index) => ({
  id: `00000000-0000-5000-8000-${String(index + 1).padStart(12, "0")}`,
  product_code: `HK-${String(index + 1).padStart(3, "0")}`,
  name: `Product ${index + 1}`,
  selling_price: ((index % 10) + 1).toFixed(2),
  cost_price: "1.00",
  current_stock: 10,
  status: "active",
}));

describe("synthetic sales generator", () => {
  it("is deterministic and covers the inclusive date range", () => {
    const input = { products, staffId: "11111111-1111-5111-8111-111111111111", start: "2026-06-01", end: "2026-08-12", seed: "fixed" };
    const first = generateSales(input);
    expect(generateSales(input)).toEqual(first);
    expect(generateSales({ ...input, staffId: "22222222-2222-5222-8222-222222222222" })
      .map((sale) => ({ ...sale, staff_id: input.staffId }))).toEqual(first);
    expect(first[0].sale_date).toBe("2026-06-01");
    expect(first.at(-1)?.sale_date).toBe("2026-08-12");
    expect(datesBetween(input.start, input.end)).toHaveLength(73);
    expect(payloadHash(first)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("uses daily bounds, approved products, positive quantities, and money-safe totals", () => {
    const sales = generateSales({ products, staffId: "11111111-1111-5111-8111-111111111111", start: "2026-06-01", end: "2026-06-07", seed: "fixed" });
    const grouped = Map.groupBy(sales, (sale) => sale.sale_date);
    for (const [date, daily] of grouped) {
      const day = new Date(`${date}T00:00:00Z`).getUTCDay();
      expect(daily.length).toBeGreaterThanOrEqual(day === 0 || day === 6 ? 1 : 4);
      expect(daily.length).toBeLessThanOrEqual(day === 0 || day === 6 ? 2 : 6);
      expect(daily.map((sale) => sale.daily_order_number)).toEqual(Array.from({ length: daily.length }, (_, index) => index + 1));
    }
    expect(sales.flatMap((sale) => sale.items).every((item) => item.quantity >= 1 && item.quantity <= 3)).toBe(true);
    expect(sales.flatMap((sale) => sale.items).every((item) => products.some((product) => product.id === item.product_id))).toBe(true);
    expect(Number.isInteger(summarizeGenerated(sales, products).revenue * 100)).toBe(true);
    const golden = summarizeGenerated(generateSales({ products, staffId: inputStaff }), products);
    expect(golden).toMatchObject({ days: 73, orders: 295, itemLines: 573, revenue: 6220, productsUsed: 57 });
  });

  it("requires valid dates and explicit destructive confirmation", () => {
    expect(() => parseArgs(["--start", "2026-08-13", "--end", "2026-08-12"])).toThrow(/must not be after/);
    expect(() => parseArgs(["--start", "not-a-date"])).toThrow(/YYYY-MM-DD/);
    expect(() => parseArgs(["--start", "2026-02-30"])).toThrow(/YYYY-MM-DD/);
    expect(() => parseArgs(["--start", "2026-06-02"])).toThrow(/Date range/);
    expect(() => parseArgs(["--apply"])).toThrow(/target-specific/);
    expect(parseArgs(["--apply", "--confirm", "DELETE-ALL-SALES:local"]).apply).toBe(true);
    expect(parseArgs(["--status"]).mode).toBe("status");
    expect(parseArgs(["--maintenance-on", "--confirm", "ENABLE-SALES-MAINTENANCE:local"]).mode).toBe("maintenance-on");
    expect(() => parseArgs(["--status", "--apply", "--confirm", "DELETE-ALL-SALES:local"])).toThrow(/only one/);
  });

  it("binds confirmation and recent backup evidence to the target", () => {
    expect(targetFromUrl("http://127.0.0.1:54321")).toBe("local");
    expect(targetFromUrl("https://project-ref.supabase.co")).toBe("project-ref");
    expect(confirmationForTarget("project-ref")).toBe("DELETE-ALL-SALES:project-ref");
    expect(maintenanceConfirmationForTarget("project-ref", true)).toBe("ENABLE-SALES-MAINTENANCE:project-ref");
    const directory = mkdtempSync(join(tmpdir(), "sales-backup-"));
    const manifest = join(directory, "manifest.txt");
    const maintenanceAt = "2026-08-13T00:00:00.000Z";
    const digest = (value: string) => createHash("sha256").update(value).digest("hex");
    const counts = {
      sales: 2,
      items: 2,
      saleMovements: 1,
      counters: 1,
      payloadHash: digest([
        "2026-06-01|1|client-1|cash|staff-1|product-1:1",
        "2026-06-01|2|client-2|e_payment|staff-1|product-2:2",
      ].join("\n")),
      saleMovementHash: digest("movement-1|product-1|sale|-1|10|9|sale|sale-1|staff-1"),
      counterHash: digest("2026-06-01|3"),
    };
    try {
      const hashLines = ["roles.sql", "schema.sql", "data.sql"].map((name) => {
        const contents = name === "data.sql" ? [
          'COPY "public"."sales" ("id", "client_request_id", "sale_date", "daily_order_number", "payment_method", "staff_id") FROM stdin;',
          "sale-1\tclient-1\t2026-06-01\t1\tcash\tstaff-1",
          "sale-2\tclient-2\t2026-06-01\t2\te_payment\tstaff-1",
          "\\.",
          'COPY "public"."sale_items" ("id", "sale_id", "product_id", "quantity") FROM stdin;',
          "item-1\tsale-1\tproduct-1\t1",
          "item-2\tsale-2\tproduct-2\t2",
          "\\.",
          'COPY "public"."stock_movements" ("id", "product_id", "movement_type", "quantity_change", "stock_before", "stock_after", "reference_type", "reference_id", "created_by") FROM stdin;',
          "movement-1\tproduct-1\tsale\t-1\t10\t9\tsale\tsale-1\tstaff-1",
          "movement-2\tproduct-2\tadjustment_in\t1\t0\t1\tadjustment\t\\N\tstaff-1",
          "\\.",
          'COPY "public"."daily_order_counters" ("sale_date", "next_order_number") FROM stdin;',
          "2026-06-01\t3",
          "\\.",
        ].join("\n") : `backup-${name}`;
        writeFileSync(join(directory, name), contents);
        return `SHA256 ${createHash("sha256").update(contents).digest("hex")} ${name}`;
      });
      writeFileSync(manifest, [
        "Created: 2026-08-13T00:05:00.000Z",
        "Project ref: project-ref",
        `Maintenance updated at: ${maintenanceAt}`,
        "Sales count: 2",
        "Sale items count: 2",
        "Sale movements count: 1",
        "Daily counters count: 1",
        `Sales payload hash: ${counts.payloadHash}`,
        `Sale movements hash: ${counts.saleMovementHash}`,
        `Daily counters hash: ${counts.counterHash}`,
        ...hashLines,
      ].join("\n"));
      const now = Date.parse("2026-08-13T12:00:00.000Z");
      expect(() => validateBackupManifest(manifest, "project-ref", counts, maintenanceAt, now)).not.toThrow();
      expect(() => validateBackupManifest(manifest, "another-project", counts, maintenanceAt, now)).toThrow(/matching/);
      expect(() => validateBackupManifest(manifest, "project-ref", counts, maintenanceAt, Date.parse("2026-08-15T00:00:00.000Z"))).toThrow(/24 hours/);
      writeFileSync(join(directory, "data.sql"), "tampered");
      expect(() => validateBackupManifest(manifest, "project-ref", counts, maintenanceAt, now)).toThrow(/SHA256/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe("replace sales SQL policy", () => {
  it("is service-role-only, confirmed, ordered, and never updates product stock", () => {
    const sql = readFileSync("supabase/migrations/202608130001_replace_sales_history.sql", "utf8");
    expect(sql).toContain("DELETE-ALL-SALES");
    expect(sql).toContain("Service role required");
    expect(sql).toContain("p_sales is null");
    expect(sql).toContain("jsonb_typeof(sale -> 'items') is distinct from 'array'");
    expect(sql).toContain("generate_series(p_start_date, p_end_date");
    expect(sql).toContain("tuck-shop:sales-write");
    expect(sql).toContain("perform public.assert_sales_writable()");
    expect(sql).toContain("create trigger products_writes_guard");
    expect(sql).toContain("create trigger profiles_writes_guard");
    expect(sql).toContain("create trigger daily_order_counters_writes_guard");
    expect(sql).toContain("stock_in_unlocked");
    expect(sql).toContain("adjust_stock_unlocked");
    expect(sql).toContain("import_initial_stock_unlocked");
    expect(sql).toContain("set_config('app.sales_history_replacement', 'on', true)");
    expect(sql).toContain("Enable sales maintenance before replacement");
    expect(sql).toContain("revoke all on function public.replace_sales_history");
    expect(sql).toContain("grant execute on function public.replace_sales_history");
    const movements = sql.indexOf("delete from public.stock_movements");
    const items = sql.indexOf("delete from public.sale_items");
    const sales = sql.indexOf("delete from public.sales");
    expect(movements).toBeGreaterThan(-1);
    expect(movements).toBeLessThan(items);
    expect(items).toBeLessThan(sales);
    expect(sql).toContain("delete from public.daily_order_counters where sale_date is not null");
    expect(sql).not.toMatch(/update\s+public\.products/i);
    expect(sql).toContain("deleted_movement_net");
    expect(sql).toContain("history_replacement");
    expect(sql).toContain("Persisted sales payload hash mismatch");
    expect(sql).toContain("'ledgerMismatchCount'");
    expect(sql).toContain("'counterMismatchCount'");
    expect(sql).toContain("'saleMovementHash'");
    expect(sql).toContain("Product stock or ledger changed inconsistently during history replacement");
    const deterministicHashSql = readFileSync("supabase/migrations/202608130002_deterministic_sales_hash.sql", "utf8");
    expect(deterministicHashSql).toContain("order by item.product_id, item.id");
  });
});

const inputStaff = "11111111-1111-5111-8111-111111111111";
