import { describe, expect, it } from "vitest";

describe("foundation", () => {
  it("keeps the core currency convention explicit", () => {
    expect(new Intl.NumberFormat("en-HK", { style: "currency", currency: "HKD" }).format(12.5)).toBe("HK$12.50");
  });
});
