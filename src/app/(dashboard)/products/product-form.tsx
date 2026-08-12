"use client";

import { useActionState, useState } from "react";

import { createProduct, type ProductActionState } from "./actions";

const initialState: ProductActionState = {};

export function ProductForm() {
  const [state, formAction, pending] = useActionState(createProduct, initialState);
  const [preview, setPreview] = useState("");
  return (
    <form action={formAction} className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
      <label className="text-sm font-medium text-slate-700">Product code<input name="productCode" required placeholder="P011" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" /></label>
      <label className="text-sm font-medium text-slate-700">Chinese name<input name="nameZh" placeholder="薯片" onChange={(e) => setPreview(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">English name<input name="nameEn" placeholder="Chips" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">Brand<input name="brand" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">Category<select name="category" required className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3"><option>飲品</option><option>餅乾</option><option>薯片／脆片</option><option>糖果</option><option>其他</option></select></label>
      <label className="text-sm font-medium text-slate-700">Flavour<input name="flavour" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3" /></label><label className="text-sm font-medium text-slate-700">Size<input name="size" placeholder="250ml" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3" /></label><label className="text-sm font-medium text-slate-700">Package type<input name="packageType" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3" /></label><label className="text-sm font-medium text-slate-700">Barcode<input name="barcode" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3" /></label>
      <input type="hidden" name="name" value="" />
      <p className="text-sm text-slate-500 sm:col-span-2">Display preview: <strong>{preview || "Enter a Chinese or English name"}</strong></p>
      <label className="text-sm font-medium text-slate-700">Cost price<input name="costPrice" required type="number" min="0" step="0.01" placeholder="1.50" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" /></label>
      <label className="text-sm font-medium text-slate-700">Selling price<input name="sellingPrice" required type="number" min="0" step="0.01" placeholder="2.50" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" /></label>
      <label className="text-sm font-medium text-slate-700">Minimum stock<input name="minimumStock" required type="number" min="0" step="1" placeholder="5" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" /></label>
      {state.error ? <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 sm:col-span-2">{state.error}</p> : null}
      {state.success ? <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 sm:col-span-2">{state.success}</p> : null}
      <button type="submit" disabled={pending} className="h-11 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300 sm:col-span-2">{pending ? "Saving…" : "Create product"}</button>
    </form>
  );
}
