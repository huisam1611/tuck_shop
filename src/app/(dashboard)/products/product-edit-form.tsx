"use client";

import { useActionState } from "react";
import type { Product } from "@/lib/data";
import { PRODUCT_CATEGORIES } from "@/lib/product-categories";
import { deleteProduct, updateProduct, type ProductActionState } from "./actions";
import { ProductFields } from "./product-fields";

const initialState: ProductActionState = {};

export function ProductEditForm({ product, demo }: { product: Product; demo: boolean }) {
  const [state, formAction, pending] = useActionState(updateProduct, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteProduct, initialState);
  const disabled = demo || product.cost_price === undefined;
  const categories = PRODUCT_CATEGORIES.includes(product.category as (typeof PRODUCT_CATEGORIES)[number])
    ? PRODUCT_CATEGORIES
    : [product.category, ...PRODUCT_CATEGORIES.filter((category) => category !== product.category)];
  return <div className="space-y-4">
    <form action={formAction} className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
      <input type="hidden" name="productId" value={product.id} />
      <ProductFields disabled={disabled} legacyName={product.name} initial={{ brand: product.brand, nameZh: product.name_zh, nameEn: product.name_en, size: product.size, packageType: product.package_type, flavour: product.flavour }} />
      <label className="text-sm font-medium text-slate-700">Product code<input name="productCode" required defaultValue={product.product_code} disabled={disabled} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60" /></label>
      <label className="text-sm font-medium text-slate-700">Category<select name="category" defaultValue={product.category} disabled={disabled} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-60">{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
      <label className="text-sm font-medium text-slate-700">Barcode<input name="barcode" defaultValue={product.barcode ?? ""} disabled={disabled} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-60" /></label>
      <input type="hidden" name="name" value={product.name} />
      <label className="text-sm font-medium text-slate-700">Cost price<input name="costPrice" required min="0" type="number" step="0.01" defaultValue={product.cost_price ?? 0} disabled={disabled} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-60" /></label>
      <label className="text-sm font-medium text-slate-700">Selling price<input name="sellingPrice" required min="0" type="number" step="0.01" defaultValue={product.selling_price} disabled={disabled} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-60" /></label>
      <label className="text-sm font-medium text-slate-700">Minimum stock<input name="minimumStock" required min="0" type="number" step="1" defaultValue={product.minimum_stock} disabled={disabled} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-60" /></label>
      <label className="text-sm font-medium text-slate-700">Status<select name="status" defaultValue={product.status} disabled={disabled} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-60"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      <p className="text-sm text-slate-500 sm:col-span-2">Current stock: <strong>{product.current_stock}</strong>（請透過庫存流水帳調整）</p>
      {demo ? <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:col-span-2">Demo products are read-only. Connect Supabase to edit catalogue data.</p> : null}
      {state.error ? <p role="alert" className="text-sm font-medium text-rose-700 sm:col-span-2">{state.error}</p> : null}
      {state.success ? <p role="status" className="text-sm font-medium text-emerald-700 sm:col-span-2">{state.success}</p> : null}
      <button type="submit" disabled={pending || disabled} className="h-11 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:col-span-2">{pending ? "Saving…" : "Save changes"}</button>
    </form>
    <form action={deleteAction} onSubmit={(event) => { if (!window.confirm("Delete this product? Products with sales or stock history must be deactivated instead.")) event.preventDefault(); }} className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
      <input type="hidden" name="productId" value={product.id} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-rose-950">Delete product</h2><p className="mt-1 text-sm text-rose-800">Only products with no related history can be permanently deleted.</p></div><button type="submit" disabled={deletePending || disabled} className="h-11 rounded-xl border border-rose-300 px-5 text-sm font-semibold text-rose-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">{deletePending ? "Deleting…" : "Delete permanently"}</button></div>
      {deleteState.error ? <p role="alert" className="mt-4 rounded-xl bg-white px-4 py-3 text-sm font-medium text-rose-700">{deleteState.error}</p> : null}{deleteState.success ? <p role="status" className="mt-4 rounded-xl bg-white px-4 py-3 text-sm font-medium text-emerald-700">{deleteState.success}</p> : null}
    </form>
  </div>;
}
