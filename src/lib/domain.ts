export type SaleStatus = "completed" | "voided";
export type PaymentMethod = "cash" | "e_payment";

export function normalizeSaleStatus(value: unknown): SaleStatus {
  return value === "voided" ? "voided" : "completed";
}

export function normalizePaymentMethod(value: unknown): PaymentMethod {
  return value === "e_payment" ? "e_payment" : "cash";
}

export function getBusinessDate(now = new Date(), timeZone = process.env.BUSINESS_TIMEZONE ?? "Asia/Hong_Kong") {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
