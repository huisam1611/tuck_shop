"use client";
import { useActionState } from "react";
import { createProduct, type ProductActionState } from "./actions";
import { ProductFields } from "./product-fields";
import { PRODUCT_CATEGORIES } from "@/lib/product-categories";
const initialState: ProductActionState = {};
export function ProductForm() {
  const [state, formAction, pending] = useActionState(createProduct, initialState);
  return <form action={formAction} className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
    <label className="text-sm font-medium text-slate-700">Product code<input name="productCode" required placeholder="P011" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3" /></label>
    <ProductFields />
    <label className="text-sm font-medium text-slate-700">Category<select name="category" required className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3">{PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
    <label className="text-sm font-medium text-slate-700">Barcode<input name="barcode" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3" /></label>
    <input type="hidden" name="name" value="" />
    <label className="text-sm font-medium text-slate-700">Cost price<input name="costPrice" required type="number" min="0" step="0.01" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3" /></label><label className="text-sm font-medium text-slate-700">Selling price<input name="sellingPrice" required type="number" min="0" step="0.01" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3" /></label><label className="text-sm font-medium text-slate-700">Minimum stock<input name="minimumStock" required type="number" min="0" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3" /></label>
    {state.error ? <p role="alert" className="sm:col-span-2 text-rose-700">{state.error}</p> : null}{state.success ? <p role="status" className="sm:col-span-2 text-emerald-700">{state.success}</p> : null}<button type="submit" disabled={pending} className="h-11 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white disabled:bg-slate-300 sm:col-span-2">{pending ? "Saving…" : "Create product"}</button>
  </form>;
}
