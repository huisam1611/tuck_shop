import { execFileSync } from "node:child_process";
import path from "node:path";

import { describe, expect, it } from "vitest";

const script = path.resolve("scripts/import-historical-sales.mjs");
const fixture = path.resolve("tests/fixtures/historical-sales-sample.tsv");

describe("historical sales import dry-run", () => {
  it("applies the known correction and groups rows by date and payment", () => {
    const output = execFileSync(process.execPath, [script, "--input", fixture], { encoding: "utf8" });
    const result = JSON.parse(output) as {
      rows: number;
      correctedRows: Array<unknown>;
      sourceTotal: number;
      dailyPaymentGroups: Array<unknown>;
      historicalOnlyProducts: Array<unknown>;
      mappedQuantity: number;
    };

    expect(result.rows).toBe(3);
    expect(result.correctedRows).toHaveLength(1);
    expect(result.sourceTotal).toBe(12);
    expect(result.dailyPaymentGroups).toHaveLength(3);
    expect(result.historicalOnlyProducts).toHaveLength(1);
    expect(result.mappedQuantity).toBe(5);
  });
});
