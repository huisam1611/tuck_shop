import { getCurrentProfile, listProducts } from "@/lib/data";
import Link from "next/link";

import { InventoryActions } from "./inventory-actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const products = await listProducts();
  const profile = await getCurrentProfile();
  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-blue-700">Stock control</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Inventory</h1><p className="mt-2 text-sm text-slate-500">Review stock levels before recording the next order.</p></div>{profile?.role === "admin" ? <Link href="/inventory/history" className="text-sm font-semibold text-blue-700 hover:text-blue-800">View movement history →</Link> : null}</header>
      {profile?.role === "admin" ? <InventoryActions products={products.map(({ id, name, product_code }) => ({ id, name, product_code }))} /> : null}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5"><p className="font-semibold text-slate-950">Current stock</p><p className="mt-1 text-sm text-slate-500">Stock-in and adjustments will use the protected RPC layer.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3 font-semibold">Product</th><th className="px-5 py-3 font-semibold">Current stock</th><th className="px-5 py-3 font-semibold">Minimum</th><th className="px-5 py-3 font-semibold">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{products.map((product) => { const out = product.current_stock === 0; const low = !out && product.current_stock <= product.minimum_stock; return <tr key={product.id}><td className="px-5 py-4"><span className="font-semibold text-slate-800">{product.name}</span><span className="ml-2 text-xs text-slate-500">{product.product_code}</span></td><td className={`px-5 py-4 font-semibold ${out || low ? "text-amber-700" : "text-slate-700"}`}>{product.current_stock}</td><td className="px-5 py-4 text-slate-500">{product.minimum_stock}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${out ? "bg-rose-50 text-rose-700" : low ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{out ? "Out of stock" : low ? "Low stock" : "In stock"}</span></td></tr>; })}</tbody></table></div>
      </div>
    </div>
  );
}
