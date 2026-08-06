import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentProfile, listProfiles } from "@/lib/data";
import { hasSupabaseEnv } from "@/lib/env";

import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const current = await getCurrentProfile();
  if (!current || current.role !== "admin") notFound();
  const profiles = await listProfiles();

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-blue-700">Administration</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">User management</h1><p className="mt-2 text-sm text-slate-500">Keep existing profiles active and assign the correct role.</p></div><Link href="/dashboard" className="text-sm font-semibold text-blue-700 hover:text-blue-800">← Dashboard</Link></header>
      {!hasSupabaseEnv() ? <p className="mb-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Demo mode: sample profiles are read-only. Supabase Auth invitation will be added when the project is connected.</p> : null}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5"><h2 className="font-semibold text-slate-950">Existing profiles</h2><p className="mt-1 text-sm text-slate-500">Deactivated users cannot access protected pages. At least one active Admin is always required.</p></div><div className="space-y-4">{profiles.map((profile) => <ProfileForm key={profile.id} profile={profile} demo={!hasSupabaseEnv()} />)}</div></section>
    </div>
  );
}
