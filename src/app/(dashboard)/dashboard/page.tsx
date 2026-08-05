import { StatCard } from "@/components/stat-card";
import { getCurrentProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

const products = [
  { name: "Potato Chips", sold: 84, revenue: "RM168.00", colour: "bg-blue-600" },
  { name: "Coca-Cola Can", sold: 71, revenue: "RM142.00", colour: "bg-rose-500" },
  { name: "Chocolate Bar", sold: 56, revenue: "RM112.00", colour: "bg-amber-500" },
  { name: "Mineral Water", sold: 43, revenue: "RM86.00", colour: "bg-emerald-500" },
];

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const isStaff = profile?.role === "staff";

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-blue-700">Thursday, 6 August 2026</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Good morning, {profile?.name ?? "Alice"}</h1>
          <p className="mt-2 text-sm text-slate-500">Here&apos;s today&apos;s tuck shop overview.</p>
        </div>
        <a href="/sales" className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800">
          + Record sale
        </a>
      </header>

      <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isStaff ? (
          <>
            <StatCard label="My orders today" value="12" detail="Orders recorded by you" tone="blue" />
            <StatCard label="Active products" value="10" detail="Available to sell" tone="violet" />
            <StatCard label="Low-stock products" value="3" detail="Check inventory before selling" tone="amber" />
            <StatCard label="Quick action" value="+" detail="Record a sale" tone="emerald" />
          </>
        ) : (
          <>
            <StatCard label="Today&apos;s revenue" value="RM486.00" detail="Up 12.4% vs yesterday" tone="blue" />
            <StatCard label="Monthly revenue" value="RM8,942.00" detail="August 2026" tone="violet" />
            <StatCard label="Monthly profit" value="RM3,217.20" detail="36.0% margin" tone="emerald" />
            <StatCard label="Today&apos;s orders" value="42" detail="6 more than yesterday" tone="amber" />
          </>
        )}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {isStaff ? (
          <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
            <h2 className="font-semibold text-blue-950">Ready for the next order?</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-blue-800">Search active products, add quantities, and save the sale. The server checks stock before it commits.</p>
            <a href="/sales" className="mt-6 inline-flex h-11 items-center rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800">Record a sale -&gt;</a>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-950">Revenue trend</h2>
                <p className="mt-1 text-sm text-slate-500">Daily revenue for August</p>
              </div>
              <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">This month</span>
            </div>
            <div className="mt-8 flex h-52 items-end gap-2 sm:gap-3" aria-label="Revenue chart preview">
              {[38, 54, 42, 68, 61, 76, 55, 82, 72, 94, 68, 88, 79, 100].map((height, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-2">
                  <div className="w-full rounded-t-lg bg-blue-100" style={{ height: `${height}%` }}><div className="h-2/3 w-full rounded-t-lg bg-blue-600" /></div>
                  <span className="text-[10px] text-slate-400">{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-amber-950">Low stock alert</h2>
              <p className="mt-1 text-sm text-amber-800">3 products need attention.</p>
            </div>
            <span className="grid size-10 place-items-center rounded-2xl bg-white text-xl text-amber-600 shadow-sm">!</span>
          </div>
          <ul className="mt-6 divide-y divide-amber-200/70">
            {["Sandwich", "Ice Cream Cup", "Orange Juice"].map((product, index) => (
              <li key={product} className="flex items-center justify-between py-3 text-sm">
                <span className="font-medium text-amber-950">{product}</span>
                <span className="font-semibold text-amber-700">{[2, 4, 6][index]} left</span>
              </li>
            ))}
          </ul>
          <a href="/inventory" className="mt-4 inline-block text-sm font-semibold text-amber-900 underline decoration-amber-300 underline-offset-4">View inventory</a>
        </div>
      </section>

      {!isStaff ? <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-slate-950">Best-selling products</h2>
            <p className="mt-1 text-sm text-slate-500">Top products this month</p>
          </div>
          <a href="/reports" className="self-start text-sm font-semibold text-blue-700 hover:text-blue-800 sm:self-auto">View report -&gt;</a>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400"><tr><th className="pb-3 font-semibold">Product</th><th className="pb-3 font-semibold">Units sold</th><th className="pb-3 text-right font-semibold">Revenue</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{products.map((product) => <tr key={product.name}><td className="py-4 font-medium text-slate-800"><span className={`mr-3 inline-block size-2 rounded-full ${product.colour}`} />{product.name}</td><td className="py-4 text-slate-500">{product.sold}</td><td className="py-4 text-right font-semibold text-slate-800">{product.revenue}</td></tr>)}</tbody>
          </table>
        </div>
      </section> : null}
    </div>
  );
}
