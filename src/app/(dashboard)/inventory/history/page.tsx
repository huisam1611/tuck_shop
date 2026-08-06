import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentProfile, listStockMovements } from "@/lib/data";
import { hasSupabaseEnv } from "@/lib/env";

const movementLabels = {
  stock_in: "Stock in",
  sale: "Sale",
  sale_void: "Sale void",
  adjustment_in: "Adjustment in",
  adjustment_out: "Adjustment out",
} as const;

export const dynamic = "force-dynamic";

export const metadata = { title: "Stock movement history" };

export default async function InventoryHistoryPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") notFound();
  const movements = await listStockMovements();

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-blue-700">Stock control</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Movement history</h1><p className="mt-2 text-sm text-slate-500">Immutable audit trail for every stock change.</p></div><Link href="/inventory" className="text-sm font-semibold text-blue-700 hover:text-blue-800">← Back to inventory</Link></header>
      {!hasSupabaseEnv() ? <p className="mb-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Demo mode: live movement history appears after Supabase is connected.</p> : null}
      {movements.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No stock movements found.</div> : (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3 font-semibold">Date</th><th className="px-5 py-3 font-semibold">Product</th><th className="px-5 py-3 font-semibold">Movement</th><th className="px-5 py-3 font-semibold">Change</th><th className="px-5 py-3 font-semibold">Stock</th><th className="px-5 py-3 font-semibold">Reason / reference</th><th className="px-5 py-3 font-semibold">Performed by</th></tr></thead><tbody className="divide-y divide-slate-100">{movements.map((movement) => <tr key={movement.id}><td className="whitespace-nowrap px-5 py-4 text-slate-500">{new Date(movement.created_at).toLocaleString("en-MY")}</td><td className="px-5 py-4"><p className="font-semibold text-slate-800">{movement.product_name}</p><p className="mt-1 text-xs text-slate-400">{movement.product_code}</p></td><td className="px-5 py-4 text-slate-600">{movementLabels[movement.movement_type]}</td><td className={`px-5 py-4 font-semibold ${movement.quantity_change > 0 ? "text-emerald-700" : "text-rose-700"}`}>{movement.quantity_change > 0 ? "+" : ""}{movement.quantity_change}</td><td className="px-5 py-4 text-slate-600">{movement.stock_before} → {movement.stock_after}</td><td className="max-w-xs px-5 py-4 text-slate-500">{movement.reason ?? movement.reference_type}</td><td className="px-5 py-4 text-slate-500">{movement.performer_name ?? "—"}</td></tr>)}</tbody></table></div>
      )}
    </div>
  );
}
