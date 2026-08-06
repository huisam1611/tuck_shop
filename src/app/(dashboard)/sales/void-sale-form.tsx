"use client";

import { useActionState } from "react";

import { voidSale, type SaleActionState } from "./actions";

const initialState: SaleActionState = {};

export function VoidSaleForm({ saleId }: { saleId: string }) {
  const [state, formAction, pending] = useActionState(voidSale, initialState);
  return (
    <form action={formAction} className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
      <input type="hidden" name="saleId" value={saleId} />
      <label className="block text-xs font-semibold uppercase tracking-wide text-rose-800">Void reason
        <input name="reason" required maxLength={240} placeholder="e.g. wrong item recorded" className="mt-2 h-10 w-full rounded-xl border border-rose-200 bg-white px-3 text-sm outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100" />
      </label>
      {state.error ? <p role="alert" className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-medium text-rose-700">{state.error}</p> : null}
      {state.success ? <p role="status" className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-medium text-emerald-700">{state.success}</p> : null}
      <button type="submit" disabled={pending} className="mt-3 h-10 w-full rounded-xl bg-rose-700 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-300">{pending ? "Voiding…" : "Void sale"}</button>
    </form>
  );
}
