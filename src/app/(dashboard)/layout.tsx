import Link from "next/link";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/sales", label: "Sales", icon: "＋" },
  { href: "/inventory", label: "Inventory", icon: "◫" },
  { href: "/products", label: "Products", icon: "◇" },
  { href: "/reports", label: "Reports", icon: "▤" },
];

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-screen bg-[#f5f7fb] lg:flex">
      <aside className="border-b border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-5 lg:block lg:px-7 lg:py-7">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-blue-700 text-lg font-bold text-white shadow-lg shadow-blue-700/20">
              T
            </span>
            <span>
              <span className="block text-sm font-bold text-slate-950">Tuck Shop</span>
              <span className="block text-xs text-slate-400">Sales & inventory</span>
            </span>
          </Link>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 lg:mt-8 lg:inline-block">
            Demo mode
          </span>
        </div>

        <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto px-4 pb-4 lg:block lg:space-y-1 lg:px-4">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-w-max items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
            >
              <span aria-hidden="true" className="grid size-5 place-items-center text-base">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden border-t border-slate-100 px-7 py-6 lg:mt-auto lg:block">
          <Link href="/login" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
            Sign out
          </Link>
        </div>
      </aside>

      <main className="w-full lg:pl-64">{children}</main>
    </div>
  );
}
