import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/202608180001_reconcile_legacy_opening_balances.sql", "utf8");

describe("opening balance reconciliation migration policy", () => {
  it("targets only the approved opening balances and guards the full post-condition", () => {
    const targetSection = migration.slice(migration.indexOf("insert into opening_balance_targets"), migration.indexOf(";", migration.indexOf("insert into opening_balance_targets")));
    const targets = Object.fromEntries([...targetSection.matchAll(/\('(P\d{3})',\s*(\d+)\)/g)].map(([, code, quantity]) => [code, Number(quantity)]));
    expect(targets).toEqual({ P001: 40, P002: 35, P003: 30, P004: 50, P005: 18, P006: 25, P007: 32, P008: 45, P009: 12, P010: 10 });
    expect(Object.values(targets).reduce((sum, quantity) => sum + quantity, 0)).toBe(297);
    expect(migration).toContain("product.current_stock <> target.expected_stock");
    expect(migration).toContain("P001-P010 current_stock changed");
    expect(migration).not.toMatch(/product\.status|inactive/i);
    expect(migration).toContain("having count(movement.id) <> 0");
    expect(migration).toContain("global ledger mismatches before reconciliation");
    expect(migration).toContain("alter column created_by drop not null");
    expect(migration).toContain("stock_movements_created_by_reconciliation_check");
    expect(migration).toContain("check (created_by is not null or reference_type = 'opening_balance_reconciliation')");
    expect(migration).toContain("'opening_balance_reconciliation'");
    expect(migration).toContain("'adjustment_in'");
    expect(migration).toContain("'20260818-0001-5000-8000-000000000001'");
    expect(migration).toContain("movement.stock_before <> 0");
    expect(migration).toContain("get diagnostics inserted_count = row_count");
    expect(migration).toContain("inserted_count <> target_count");
    expect(migration).toContain("system migration opening balance reconciliation");
    expect(migration).toContain("or movement.created_by is not null");
    expect(migration).toContain("reconciliation_reason,\n    null");
    expect(migration).not.toContain("public.profiles");
    expect(migration).not.toContain("role = 'admin'");
    expect(migration).toContain("global ledger mismatch count is %s");
    expect(migration).not.toMatch(/update\s+public\.products/i);
  });
});
