"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { Product } from "@/lib/data";

const PAGE_SIZE = 20;

export function ProductTable({ products, canManage }: { products: Product[]; canManage: boolean }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery = !normalized || [product.product_code, product.name, product.category].some((value) => value.toLowerCase().includes(normalized));
      return matchesQuery && (status === "all" || product.status === status);
    });
  }, [products, query, status]);
  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="font-semibold text-slate-950">All products</p><p className="mt-1 text-sm text-slate-500">Showing {filteredProducts.length} of {products.length} products</p></div>
        <div className="flex flex-col gap-3 sm:flex-row"><input aria-label="Search products" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search code, name, or category" className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" /><select aria-label="Filter product status" value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3 font-semibold">Product</th><th className="px-5 py-3 font-semibold">Category</th><th className="px-5 py-3 font-semibold">Cost</th><th className="px-5 py-3 font-semibold">Selling price</th><th className="px-5 py-3 font-semibold">Stock</th><th className="px-5 py-3 font-semibold">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleProducts.map((product) => { const lowStock = product.current_stock <= product.minimum_stock; return <tr key={product.id} className="hover:bg-slate-50/70"><td className="px-5 py-4">{canManage ? <Link href={`/products/${product.id}`} className="font-semibold text-slate-800 hover:text-blue-700">{product.name}</Link> : <p className="font-semibold text-slate-800">{product.name}</p>}<p className="mt-1 text-xs text-slate-400">{product.product_code}</p></td><td className="px-5 py-4 text-slate-500">{product.category}</td><td className="px-5 py-4 text-slate-500">{product.cost_price === undefined ? "—" : `RM${product.cost_price.toFixed(2)}`}</td><td className="px-5 py-4 font-semibold text-slate-800">RM{product.selling_price.toFixed(2)}</td><td className="px-5 py-4"><span className={lowStock ? "font-semibold text-amber-700" : "text-slate-600"}>{product.current_stock}</span><span className="ml-2 text-xs text-slate-400">min {product.minimum_stock}</span></td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${product.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{product.status === "active" ? "Active" : "Inactive"}</span></td></tr>; })}</tbody></table>
        {visibleProducts.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No products match these filters.</p> : null}
      </div>
      {pageCount > 1 ? <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4"><p className="text-sm text-slate-500">Page {currentPage} of {pageCount}</p><div className="flex gap-2"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Previous</button><button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount} className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button></div></div> : null}
    </div>
  );
}
