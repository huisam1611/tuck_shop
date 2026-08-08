"use client";

import { useActionState } from "react";

import { createUser, type ProfileActionState } from "./actions";

const initialState: ProfileActionState = {};

export function CreateUserForm({ enabled }: { enabled: boolean }) {
  const [state, formAction, pending] = useActionState(createUser, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto] sm:items-end">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Name
        <input name="name" required disabled={!enabled || pending} className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60" />
      </label>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Email
        <input name="email" type="email" required autoComplete="off" disabled={!enabled || pending} className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60" />
      </label>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Temporary password
        <input name="password" type="password" minLength={8} required autoComplete="new-password" disabled={!enabled || pending} className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60" />
      </label>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Role
        <select name="role" defaultValue="staff" disabled={!enabled || pending} className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60">
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <button type="submit" disabled={!enabled || pending} className="h-10 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300">
        {pending ? "Creating…" : "Create user"}
      </button>
      {state.error ? <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:col-span-5">{state.error}</p> : null}
      {state.success ? <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 sm:col-span-5">{state.success}</p> : null}
    </form>
  );
}
