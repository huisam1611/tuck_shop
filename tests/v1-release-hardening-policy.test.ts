import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/202608180002_v1_release_hardening.sql", "utf8");

describe("V1 release hardening migration", () => {
  it("binds a retry ID to the original sale payload", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("existing_sale.staff_id is distinct from auth.uid()");
    expect(migration).toContain("requested_items is distinct from stored_items");
    expect(migration).toContain("Client request ID was already used for different sale data");
  });

  it("limits actor-less movements to the approved reconciliation", () => {
    expect(migration).toContain("created_by is not null");
    expect(migration).toContain("movement_type = 'adjustment_in'");
    expect(migration).toContain("reference_id = '20260818-0001-5000-8000-000000000001'::uuid");
    expect(migration).toContain("202608180001 system migration opening balance reconciliation");
  });

  it("removes PUBLIC execution from privileged RPCs", () => {
    expect(migration).toContain("revoke all on function public.create_sale(uuid, date, text, jsonb) from public, anon");
    expect(migration).toContain("revoke all on function public.delete_product(uuid) from public, anon");
    expect(migration).toContain("revoke all on function public.import_initial_stock(uuid, uuid, uuid, date, integer, numeric, text, uuid) from public, anon, authenticated");
  });
});
