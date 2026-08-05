export const metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8"><p className="text-sm font-semibold text-blue-700">Insights</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Reports</h1><p className="mt-2 text-sm text-slate-500">Filterable sales, inventory, profit, and Excel export reports.</p></header>
      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-950">Export workbook</h2><p className="mt-2 text-sm leading-6 text-slate-500">Download Sales Report, Inventory Report, and Monthly Profit Report in one Excel file.</p><form action="/api/reports/export" method="get" className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"><label className="text-sm font-medium text-slate-700">From<input type="date" name="from" className="mt-2 h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" /></label><label className="text-sm font-medium text-slate-700">To<input type="date" name="to" className="mt-2 h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" /></label><button type="submit" className="h-11 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800">Download .xlsx</button></form></section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{["Daily sales", "Monthly sales", "Monthly profit", "Inventory", "Best-selling products", "Low-stock report"].map((report) => <article key={report} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-lg font-semibold text-slate-950">{report}</p><p className="mt-2 text-sm leading-6 text-slate-500">Report queries will share the same date filters and exclude voided sales.</p></article>)}</div>
    </div>
  );
}
