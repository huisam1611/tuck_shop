import { getCurrentProfile, listProducts } from "@/lib/data";

import { ProductForm } from "./product-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Products" };

export default async function ProductsPage() {
  const products = await listProducts();
  const profile = await getCurrentProfile();
  const canManage = profile?.role === "admin";

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-blue-700">Catalogue</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Products</h1>
          <p className="mt-2 text-sm text-slate-500">Manage prices, stock thresholds, and product status.</p>
        </div>
        {canManage ? <a href="#new-product" className="h-11 rounded-xl bg-blue-700 px-5 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800">+ Add product</a> : null}
      </header>

      {canManage ? <section id="new-product" className="mb-6"><h2 className="mb-3 text-lg font-semibold text-slate-950">Add product</h2><ProductForm /></section> : null}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-slate-950">All products</p>
            <p className="mt-1 text-sm text-slate-500">{products.length} active products in the catalogue</p>
          </div>
          <input
            aria-label="Search products"
            placeholder="Search products…"
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Product</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Cost</th>
                <th className="px-5 py-3 font-semibold">Selling price</th>
                <th className="px-5 py-3 font-semibold">Stock</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => {
                const lowStock = product.current_stock <= product.minimum_stock;
                return (
                  <tr key={product.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">{product.name}</p>
                      <p className="mt-1 text-xs text-slate-400">{product.product_code}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{product.category}</td>
                    <td className="px-5 py-4 text-slate-500">{product.cost_price === undefined ? "—" : `RM${product.cost_price.toFixed(2)}`}</td>
                    <td className="px-5 py-4 font-semibold text-slate-800">RM{product.selling_price.toFixed(2)}</td>
                    <td className="px-5 py-4">
                      <span className={lowStock ? "font-semibold text-amber-700" : "text-slate-600"}>{product.current_stock}</span>
                      <span className="ml-2 text-xs text-slate-400">min {product.minimum_stock}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Active</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
