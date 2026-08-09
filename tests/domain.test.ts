import { describe, expect, it } from "vitest";

import { getBusinessDate, normalizePaymentMethod, normalizeSaleStatus } from "../src/lib/domain";

describe("business dates and status normalization", () => {
  it("uses the configured timezone at the day boundary", () => {
    const instant = new Date("2026-08-09T16:30:00.000Z");
    expect(getBusinessDate(instant, "UTC")).toBe("2026-08-09");
    expect(getBusinessDate(instant, "Asia/Kuala_Lumpur")).toBe("2026-08-10");
  });

  it("normalizes unknown database values to safe defaults", () => {
    expect(normalizeSaleStatus("voided")).toBe("voided");
    expect(normalizeSaleStatus("unexpected")).toBe("completed");
    expect(normalizePaymentMethod("e_payment")).toBe("e_payment");
    expect(normalizePaymentMethod("unexpected")).toBe("cash");
  });
});
