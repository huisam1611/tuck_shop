import Link from "next/link";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60 sm:p-10">
        <div className="mb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
            School tuck shop
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Welcome back</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Sign in to record sales and keep stock up to date.
          </p>
        </div>

        <form className="space-y-5">
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@school.edu"
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </label>
          <button
            type="button"
            disabled
            className="h-12 w-full cursor-not-allowed rounded-xl bg-blue-300 font-semibold text-white"
          >
            Sign in (coming next)
          </button>
        </form>

        <div className="mt-8 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
          <span>Foundation preview: </span>
          <Link className="font-semibold text-blue-700 hover:text-blue-800" href="/dashboard">
            open dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
