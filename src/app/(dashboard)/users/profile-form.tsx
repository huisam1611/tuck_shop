"use client";

import { useActionState } from "react";

import type { Profile } from "@/lib/data";

import { updateProfile, type ProfileActionState } from "./actions";

const initialState: ProfileActionState = {};

export function ProfileForm({ profile, demo }: { profile: Profile; demo: boolean }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  return (
    <form action={formAction} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-end">
      <input type="hidden" name="userId" value={profile.id} />
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name<input name="name" required defaultValue={profile.name} disabled={demo} className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60" /></label>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role<select name="role" defaultValue={profile.role} disabled={demo} className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"><option value="admin">Admin</option><option value="staff">Staff</option></select></label>
      <label className="flex h-10 items-center gap-2 text-sm font-medium text-slate-700 sm:mb-0"><input type="checkbox" name="isActive" defaultChecked={profile.is_active} disabled={demo} className="size-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500 disabled:opacity-60" /> Active</label>
      <button type="submit" disabled={pending || demo} className="h-10 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300">{pending ? "Saving…" : "Save"}</button>
      {state.error ? <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:col-span-4">{state.error}</p> : null}
      {state.success ? <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 sm:col-span-4">{state.success}</p> : null}
    </form>
  );
}
