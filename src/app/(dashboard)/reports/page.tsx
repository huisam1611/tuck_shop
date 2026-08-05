export const metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8"><p className="text-sm font-semibold text-blue-700">Insights</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Reports</h1><p className="mt-2 text-sm text-slate-500">Filterable sales, inventory, profit, and Excel export reports.</p></header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{["Daily sales", "Monthly sales", "Monthly profit", "Inventory", "Best-selling products", "Low-stock report"].map((report) => <article key={report} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-lg font-semibold text-slate-950">{report}</p><p className="mt-2 text-sm leading-6 text-slate-500">Report filters and Excel export will use the same server-side queries.</p><button className="mt-5 text-sm font-semibold text-blue-700">Open report →</button></article>)}</div>
    </div>
  );
}
