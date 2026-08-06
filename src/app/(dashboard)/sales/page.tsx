import { listProducts } from "@/lib/data";
import Link from "next/link";

import { SaleComposer } from "./sale-composer";

export const dynamic = "force-dynamic";

export const metadata = { title: "Record sale" };

export default async function SalesPage() {
  const products = await listProducts();
  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-blue-700">Daily sales</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Record a sale</h1><p className="mt-2 text-sm text-slate-500">Create a multi-item order. Stock is deducted only after the server accepts it.</p></div><Link href="/sales/history" className="text-sm font-semibold text-blue-700 hover:text-blue-800">View sales history →</Link></header>
      <SaleComposer products={products.filter((product) => product.status === "active")} />
    </div>
  );
}
