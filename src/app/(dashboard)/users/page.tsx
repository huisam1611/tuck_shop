import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentProfile, listProfiles } from "@/lib/data";
import { hasSupabaseEnv } from "@/lib/env";

import { CreateUserForm } from "./create-user-form";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const current = await getCurrentProfile();
  if (!current || current.role !== "admin") notFound();
  const profiles = await listProfiles();
  const liveMode = hasSupabaseEnv();
  const adminApiReady = Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">Administration</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">User management</h1>
          <p className="mt-2 text-sm text-slate-500">Create users and keep existing profiles active with the correct role.</p>
        </div>
        <Link href="/dashboard" className="text-sm font-semibold text-blue-700 hover:text-blue-800">← Dashboard</Link>
      </header>

      {!liveMode ? <p className="mb-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Demo mode: sample profiles are read-only. Connect Supabase to create real users.</p> : null}
      {liveMode && !adminApiReady ? <p className="mb-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Add the server-only SUPABASE_SECRET_KEY to .env.local to create users. The legacy SUPABASE_SERVICE_ROLE_KEY is also supported. Never prefix it with NEXT_PUBLIC_.</p> : null}

      {liveMode ? <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5"><h2 className="font-semibold text-slate-950">Create user</h2><p className="mt-1 text-sm text-slate-500">Create an email/password account and its application profile. Share the temporary password securely.</p></div>
        <CreateUserForm enabled={adminApiReady} />
      </section> : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5"><h2 className="font-semibold text-slate-950">Existing profiles</h2><p className="mt-1 text-sm text-slate-500">Deactivated users cannot access protected pages. At least one active Admin is always required.</p></div>
        <div className="space-y-4">{profiles.map((profile) => <ProfileForm key={profile.id} profile={profile} demo={!liveMode} />)}</div>
      </section>
    </div>
  );
}
