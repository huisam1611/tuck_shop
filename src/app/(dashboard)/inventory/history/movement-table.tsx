"use client";

import { useMemo, useState } from "react";

import type { StockMovement } from "@/lib/data";

const PAGE_SIZE = 25;
const movementLabels: Record<StockMovement["movement_type"], string> = {
  stock_in: "Stock in",
  sale: "Sale",
  sale_void: "Sale void",
  adjustment_in: "Adjustment in",
  adjustment_out: "Adjustment out",
};

export function MovementTable({ movements }: { movements: StockMovement[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | StockMovement["movement_type"]>("all");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return movements.filter((movement) => {
      const matchesQuery = !search || [movement.product_code, movement.product_name, movement.reason ?? "", movement.reference_type].some((value) => value.toLowerCase().includes(search));
      return matchesQuery && (type === "all" || movement.movement_type === type);
    });
  }, [movements, query, type]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-semibold text-slate-950">Movement records</p><p className="mt-1 text-sm text-slate-500">Showing {filtered.length} of {movements.length} records</p></div><div className="flex flex-col gap-3 sm:flex-row"><input aria-label="Search stock movements" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search product or reason" className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" /><select aria-label="Filter movement type" value={type} onChange={(event) => { setType(event.target.value as typeof type); setPage(1); }} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"><option value="all">All movements</option>{Object.entries(movementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div>
      {visible.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No stock movements match these filters.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3 font-semibold">Date</th><th className="px-5 py-3 font-semibold">Product</th><th className="px-5 py-3 font-semibold">Movement</th><th className="px-5 py-3 font-semibold">Change</th><th className="px-5 py-3 font-semibold">Stock</th><th className="px-5 py-3 font-semibold">Reason / reference</th><th className="px-5 py-3 font-semibold">Performed by</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((movement) => <tr key={movement.id}><td className="whitespace-nowrap px-5 py-4 text-slate-500">{new Date(movement.created_at).toLocaleString("en-MY")}</td><td className="px-5 py-4"><p className="font-semibold text-slate-800">{movement.product_name}</p><p className="mt-1 text-xs text-slate-500">{movement.product_code}</p></td><td className="px-5 py-4 text-slate-600">{movementLabels[movement.movement_type]}</td><td className={`px-5 py-4 font-semibold ${movement.quantity_change > 0 ? "text-emerald-700" : "text-rose-700"}`}>{movement.quantity_change > 0 ? "+" : ""}{movement.quantity_change}</td><td className="px-5 py-4 text-slate-600">{movement.stock_before} → {movement.stock_after}</td><td className="max-w-xs px-5 py-4 text-slate-500">{movement.reason ?? movement.reference_type}</td><td className="px-5 py-4 text-slate-500">{movement.performer_name ?? "—"}</td></tr>)}</tbody></table></div>}
      {pageCount > 1 ? <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4"><p className="text-sm text-slate-500">Page {currentPage} of {pageCount}</p><div className="flex gap-2"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Previous</button><button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount} className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button></div></div> : null}
    </section>
  );
}
