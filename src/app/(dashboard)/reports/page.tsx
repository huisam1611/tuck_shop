import { notFound } from "next/navigation";

import { getCurrentProfile, getReportData, type ReportFilters } from "@/lib/data";

export const metadata = { title: "Reports" };

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function validPayment(value: string | undefined): ReportFilters["paymentMethod"] {
  return value === "cash" || value === "e_payment" ? value : undefined;
}

function validStatus(value: string | undefined): ReportFilters["status"] {
  return value === "completed" || value === "voided" ? value : undefined;
}

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") notFound();
  const params = await searchParams;
  const filters: ReportFilters = {
    from: valueOf(params.from),
    to: valueOf(params.to),
    month: valueOf(params.month),
    paymentMethod: validPayment(valueOf(params.paymentMethod)),
    status: validStatus(valueOf(params.status)),
    product: valueOf(params.product),
    category: valueOf(params.category),
    staff: valueOf(params.staff),
  };
  const report = await getReportData(filters);

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8"><p className="text-sm font-semibold text-blue-700">Insights</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Reports</h1><p className="mt-2 text-sm text-slate-500">The screen and Excel export use the same filtered transaction data.</p></header>
      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-950">Filters and export</h2><form method="get" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-sm font-medium text-slate-700">Month<input type="month" name="month" defaultValue={filters.month} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" /></label><label className="text-sm font-medium text-slate-700">From<input type="date" name="from" defaultValue={filters.from} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" /></label><label className="text-sm font-medium text-slate-700">To<input type="date" name="to" defaultValue={filters.to} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" /></label><label className="text-sm font-medium text-slate-700">Payment<select name="paymentMethod" defaultValue={filters.paymentMethod ?? ""} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"><option value="">All payments</option><option value="cash">Cash</option><option value="e_payment">E-payment</option></select></label><label className="text-sm font-medium text-slate-700">Status<select name="status" defaultValue={filters.status ?? ""} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"><option value="">All statuses</option><option value="completed">Completed</option><option value="voided">Voided</option></select></label><label className="text-sm font-medium text-slate-700">Product<input name="product" defaultValue={filters.product} placeholder="Code or name" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" /></label><label className="text-sm font-medium text-slate-700">Category<input name="category" defaultValue={filters.category} placeholder="Category" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" /></label><label className="text-sm font-medium text-slate-700">Staff<input name="staff" defaultValue={filters.staff} placeholder="Staff name" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" /></label><div className="flex items-end gap-3"><button type="submit" className="h-11 flex-1 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800">Apply filters</button><a href="/reports" className="inline-flex h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">Clear</a></div></form><a href={`/api/reports/export?${new URLSearchParams(Object.entries(params).flatMap(([key, raw]) => [[key, valueOf(raw) ?? ""]])).toString()}`} className="mt-4 inline-flex h-11 items-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800">Download filtered .xlsx</a></section>

      <section aria-label="Report summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Valid orders</p><p className="mt-2 text-3xl font-semibold text-slate-950">{report.summary.validOrders}</p></article><article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Revenue</p><p className="mt-2 text-3xl font-semibold text-slate-950">RM{report.summary.revenue.toFixed(2)}</p></article><article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Cost</p><p className="mt-2 text-3xl font-semibold text-slate-950">RM{report.summary.cost.toFixed(2)}</p></article><article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5"><p className="text-sm text-emerald-800">Profit</p><p className="mt-2 text-3xl font-semibold text-emerald-950">RM{report.summary.profit.toFixed(2)}</p></article></section>

      <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-1 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-slate-950">Daily sales detail</h2><p className="mt-1 text-sm text-slate-500">{report.sales.length} line items · voided rows stay visible but do not affect totals.</p></div><p className="text-sm font-semibold text-slate-600">Cash RM{report.summary.cashTotal.toFixed(2)} · E-payment RM{report.summary.ePaymentTotal.toFixed(2)}</p></div>{report.sales.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No rows match these filters.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3 font-semibold">Date / order</th><th className="px-5 py-3 font-semibold">Product</th><th className="px-5 py-3 font-semibold">Qty</th><th className="px-5 py-3 font-semibold">Payment</th><th className="px-5 py-3 font-semibold">Staff</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 text-right font-semibold">Subtotal</th></tr></thead><tbody className="divide-y divide-slate-100">{report.sales.map((row) => <tr key={`${row.saleId}-${row.productCode}`}><td className="whitespace-nowrap px-5 py-4 text-slate-500">{row.orderNumber}</td><td className="px-5 py-4"><p className="font-semibold text-slate-800">{row.product}</p><p className="mt-1 text-xs text-slate-500">{row.productCode} · {row.category}</p></td><td className="px-5 py-4 text-slate-600">{row.quantity}</td><td className="px-5 py-4 text-slate-600">{row.paymentMethod}</td><td className="px-5 py-4 text-slate-600">{row.staff}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.status === "Completed" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{row.status}</span></td><td className="px-5 py-4 text-right font-semibold text-slate-800">RM{row.subtotal.toFixed(2)}</td></tr>)}</tbody></table></div>}</section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-950">Monthly profit</h2>{report.monthlyProfit.length === 0 ? <p className="mt-4 text-sm text-slate-500">No completed sales in this range.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500"><tr><th className="pb-3 font-semibold">Month</th><th className="pb-3 text-right font-semibold">Revenue</th><th className="pb-3 text-right font-semibold">Cost</th><th className="pb-3 text-right font-semibold">Profit</th><th className="pb-3 text-right font-semibold">Margin</th></tr></thead><tbody className="divide-y divide-slate-100">{report.monthlyProfit.map((row) => <tr key={row.month}><td className="py-3 font-medium text-slate-800">{row.month}</td><td className="py-3 text-right text-slate-600">RM{row.revenue.toFixed(2)}</td><td className="py-3 text-right text-slate-600">RM{row.cost.toFixed(2)}</td><td className="py-3 text-right font-semibold text-slate-800">RM{row.profit.toFixed(2)}</td><td className="py-3 text-right text-slate-600">{(row.margin * 100).toFixed(2)}%</td></tr>)}</tbody></table></div>}</section>
    </div>
  );
}
