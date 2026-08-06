"use client";

import { useActionState, useMemo, useRef, useState } from "react";

import { createSale, type SaleActionState } from "./actions";

type SaleProduct = { id: string; name: string; product_code: string; selling_price: number; current_stock: number };
type CartItem = SaleProduct & { quantity: number };

const initialState: SaleActionState = {};

export function SaleComposer({ products }: { products: SaleProduct[] }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const requestIdInput = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(createSale, initialState);
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.quantity * item.selling_price, 0), [cart]);

  function ensureRequestId() {
    if (requestIdInput.current && !requestIdInput.current.value) requestIdInput.current.value = crypto.randomUUID();
  }

  function addItem() {
    const product = products.find((item) => item.id === selectedId);
    if (!product || quantity < 1) return;
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item));
      return [...current, { ...product, quantity }];
    });
    setQuantity(1);
  }

  return (
    <form action={formAction} onSubmit={ensureRequestId} className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <input type="hidden" name="items" value={JSON.stringify(cart.map(({ id, quantity }) => ({ product_id: id, quantity })))} />
      <input ref={requestIdInput} type="hidden" name="clientRequestId" defaultValue="" />
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-medium text-slate-700">
            Product
            <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100">
              {products.map((product) => <option key={product.id} value={product.id}>{product.product_code} · {product.name} · RM{product.selling_price.toFixed(2)}</option>)}
            </select>
          </label>
          <label className="w-full text-sm font-medium text-slate-700 sm:w-28">
            Quantity
            <input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" />
          </label>
          <button type="button" onClick={addItem} className="h-11 rounded-xl border border-blue-200 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50">Add</button>
        </div>

        <div className="mt-7 divide-y divide-slate-100">
          {cart.length === 0 ? <p className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Add products to start this order.</p> : cart.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 py-4">
              <div><p className="font-semibold text-slate-800">{item.name}</p><p className="mt-1 text-xs text-slate-400">{item.quantity} × RM{item.selling_price.toFixed(2)}</p></div>
              <div className="flex items-center gap-4"><span className="font-semibold text-slate-800">RM{(item.quantity * item.selling_price).toFixed(2)}</span><button type="button" onClick={() => setCart((current) => current.filter((entry) => entry.id !== item.id))} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Remove</button></div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">Order summary</p>
        <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">RM{total.toFixed(2)}</p>
        <label className="mt-7 block text-sm font-medium text-slate-700">Sale date<input type="date" name="saleDate" defaultValue={new Date().toISOString().slice(0, 10)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" /></label>
        <label className="mt-4 block text-sm font-medium text-slate-700">Payment method<select name="paymentMethod" defaultValue="cash" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"><option value="cash">Cash</option><option value="e_payment">E-payment</option></select></label>
        {state.error ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{state.error}</p> : null}
        {state.success ? <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{state.success}</p> : null}
        <button type="submit" disabled={pending || cart.length === 0} className="mt-6 h-12 w-full rounded-xl bg-blue-700 font-semibold text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300">{pending ? "Saving…" : "Save order"}</button>
      </div>
    </form>
  );
}
