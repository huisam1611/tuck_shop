import Link from "next/link";
import { getCurrentProfile, searchRecords } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Search" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await getCurrentProfile();
  const query = valueOf((await searchParams).q);
  const results = query.trim() ? await searchRecords(query) : { products: [], sales: [] };

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8"><p className="text-sm font-semibold text-blue-700">Find records</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Global search</h1><p className="mt-2 text-sm text-slate-500">Search product code, product name, category, order reference, sale date, or Staff name.</p></header>
      <form method="get" className="mb-6 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row"><label className="sr-only" htmlFor="global-search">Search records</label><input id="global-search" name="q" defaultValue={query} autoFocus placeholder="Try P001, Potato, or 2026-08-06" className="h-12 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" /><button type="submit" className="h-12 rounded-xl bg-blue-700 px-6 text-sm font-semibold text-white hover:bg-blue-800">Search</button></form>
      {!query.trim() ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Enter a search term to see grouped Product and Sale results.</div> : <div className="grid gap-6 xl:grid-cols-2"><section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-950">Products</h2><span className="text-sm text-slate-500">{results.products.length}</span></div>{results.products.length === 0 ? <p className="mt-6 text-sm text-slate-500">No products found.</p> : <ul className="mt-4 divide-y divide-slate-100">{results.products.map((product) => <li key={product.id} className="py-4"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-slate-800">{profile?.role === "admin" ? <Link href={`/products/${product.id}`} className="hover:text-blue-700">{product.name}</Link> : product.name}</p><p className="mt-1 text-xs text-slate-500">{product.product_code} · {product.category}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${product.current_stock === 0 ? "bg-rose-50 text-rose-700" : product.current_stock <= product.minimum_stock ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{product.current_stock} in stock</span></div></li>)}</ul>}</section><section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-950">Sales</h2><span className="text-sm text-slate-500">{results.sales.length}</span></div>{results.sales.length === 0 ? <p className="mt-6 text-sm text-slate-500">No sales found.</p> : <ul className="mt-4 divide-y divide-slate-100">{results.sales.map((sale) => <li key={sale.id} className="py-4"><Link href="/sales/history" className="flex items-start justify-between gap-4 hover:text-blue-700"><div><p className="font-semibold">{sale.sale_date}-{String(sale.daily_order_number).padStart(3, "0")}</p><p className="mt-1 text-xs text-slate-500">{sale.item_names.join(" · ") || "Sale items"} · {sale.staff_name ?? "Current staff"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${sale.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{sale.status === "completed" ? "Completed" : "Voided"}</span></Link></li>)}</ul>}</section></div>}
    </div>
  );
}
