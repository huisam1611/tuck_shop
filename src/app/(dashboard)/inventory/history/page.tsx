import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentProfile, listStockMovements } from "@/lib/data";
import { hasSupabaseEnv } from "@/lib/env";
import { MovementTable } from "./movement-table";

export const dynamic = "force-dynamic";

export const metadata = { title: "Stock movement history" };

export default async function InventoryHistoryPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") notFound();
  const movements = await listStockMovements();
  const businessTimezone = process.env.BUSINESS_TIMEZONE ?? "Asia/Hong_Kong";

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-blue-700">Stock control</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Movement history</h1><p className="mt-2 text-sm text-slate-500">Immutable audit trail for every stock change.</p></div><Link href="/inventory" className="text-sm font-semibold text-blue-700 hover:text-blue-800">← Back to inventory</Link></header>
      {!hasSupabaseEnv() ? <p className="mb-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Demo mode: live movement history appears after Supabase is connected.</p> : null}
      <MovementTable movements={movements} timeZone={businessTimezone} />
    </div>
  );
}
