import { getCurrentProfile, listProducts } from "@/lib/data";

import { ProductForm } from "./product-form";
import { ProductTable } from "./product-table";

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

      <ProductTable products={products} canManage={canManage} />
    </div>
  );
}
