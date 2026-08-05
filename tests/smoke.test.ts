import { describe, expect, it } from "vitest";

describe("foundation", () => {
  it("keeps the core currency convention explicit", () => {
    expect(new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(12.5)).toContain("12.50");
  });
});
