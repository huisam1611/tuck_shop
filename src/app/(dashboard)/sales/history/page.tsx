import Link from "next/link";

import { hasSupabaseEnv } from "@/lib/env";
import { getCurrentProfile, listSaleItems, listSales } from "@/lib/data";

import { VoidSaleForm } from "../void-sale-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sales history" };

export default async function SalesHistoryPage() {
  const [profile, sales] = await Promise.all([getCurrentProfile(), listSales({ all: true })]);
  const businessTimezone = process.env.BUSINESS_TIMEZONE ?? "Asia/Hong_Kong";
  const items = await listSaleItems(sales.map((sale) => sale.id), { all: true });
  const itemsBySale = new Map<string, typeof items>();
  for (const item of items) itemsBySale.set(item.sale_id, [...(itemsBySale.get(item.sale_id) ?? []), item]);
  const canVoid = profile?.role === "admin" && hasSupabaseEnv();

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-semibold text-blue-700">Sales</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Sales history</h1><p className="mt-2 text-sm text-slate-500">Completed and voided orders remain visible for audit.</p></div>
        <Link href="/sales" className="text-sm font-semibold text-blue-700 hover:text-blue-800">← Record a sale</Link>
      </header>

      {!hasSupabaseEnv() ? <p className="mb-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Demo mode: history is sample data and cannot be voided.</p> : null}
      {sales.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No sales found.</div> : (
        <div className="space-y-4">
          {sales.map((sale) => {
            const saleItems = itemsBySale.get(sale.id) ?? [];
            return (
              <article key={sale.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-semibold text-slate-950">{sale.sale_date}-{String(sale.daily_order_number).padStart(3, "0")}</h2><span className={`rounded-full px-3 py-1 text-xs font-semibold ${sale.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{sale.status === "completed" ? "Completed" : "Voided"}</span></div>
                    <p className="mt-2 text-sm text-slate-500">{sale.payment_method === "cash" ? "Cash" : "E-payment"} · {sale.staff_name ?? "Current staff"} · {new Date(sale.created_at).toLocaleString("en-HK", { timeZone: businessTimezone })}</p>
                  </div>
                  <p className="text-2xl font-semibold tracking-tight text-slate-950">HK${sale.grand_total.toFixed(2)}</p>
                </div>
                <ul className="mt-5 divide-y divide-slate-100 rounded-2xl bg-slate-50 px-4">
                  {saleItems.map((item) => <li key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="text-slate-700">{item.product_code} · {item.product_name} × {item.quantity}</span><span className="font-semibold text-slate-800">HK${item.subtotal.toFixed(2)}</span></li>)}
                </ul>
                {sale.status === "voided" && sale.void_reason ? <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800"><span className="font-semibold">Void reason:</span> {sale.void_reason}</p> : null}
                {canVoid && sale.status === "completed" ? <VoidSaleForm saleId={sale.id} /> : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
