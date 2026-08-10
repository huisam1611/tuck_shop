# Tuck Shop Sales & Inventory Management System

Next.js 16 + Supabase application for recording school tuck shop sales, controlling stock, and exporting reports.

## Current implementation

- Foundation: Next.js App Router, Tailwind CSS, shadcn/ui, responsive shell
- Auth: Supabase email/password action, protected Next.js 16 proxy, logout
- Sales: multi-item sale composer with server-side validation, retry-safe client request IDs, history, and Admin voiding
- Products: Admin create/edit/status/safe-delete flows plus searchable, filterable, paginated catalogue
- Inventory: stock-in and adjustment RPC actions, low-stock list, and searchable movement history
- Reports: shared live query model for dashboard, month/date/filter reports, and three-sheet ExcelJS export
- Search: grouped Product and Sale search for permitted records

The app runs in demo mode when Supabase variables are empty. Demo data is not production data.

## Local setup

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

For real authentication and data, fill `.env.local` with:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
BUSINESS_TIMEZONE=Asia/Kuala_Lumpur
```

To let an Admin create Staff or Admin accounts from `/users`, also set this server-only value:

```text
SUPABASE_SECRET_KEY=...
```

Use the Supabase Project Settings API Secret key. The legacy `SUPABASE_SERVICE_ROLE_KEY` is also supported. Never prefix it with `NEXT_PUBLIC_`, expose it to browser code, or commit it.

Do not commit `.env.local`.

## Database setup

Apply the migrations in `supabase/migrations/` to a Supabase project, then run `supabase/seed.sql` in a development database. The first Admin profile must reference an existing Supabase Auth user and is created as a deployment step.

The database layer contains RLS, Staff-safe views, idempotent sale creation, stock-in, stock adjustment, sale voiding, product Admin RPCs, and audit movements. The local Supabase stack has been reset from all migrations and seed data, and the local integration gate passes. Use a remote/test project for future migration rehearsals before production changes.

### Historical sales import

`pnpm import:historical` defaults to a dry-run. Keep the source TSV local and untracked, review the JSON preview, then apply it only after confirming the totals and mappings:

```powershell
pnpm import:historical -- --input .\historical-sales-2025.tsv
$env:SUPABASE_SECRET_KEY = "sb_secret_..."
pnpm import:historical -- --input .\historical-sales-2025.tsv --apply
```

The importer uses deterministic IDs, groups rows by date and payment method, preserves unmatched products as inactive historical products, and does not deduct current stock for historical sales. `SUPABASE_SERVICE_ROLE_KEY` remains supported as a legacy fallback. Never paste keys or commit the source TSV.

### Local Supabase verification

The repository includes `supabase/config.toml`, generated database types, and a repeatable integration check. With Docker Desktop running:

```powershell
pnpm dlx supabase start
$status = pnpm dlx supabase status -o json | ConvertFrom-Json
$env:SUPABASE_TEST_URL = $status.API_URL
$env:SUPABASE_TEST_ANON_KEY = $status.ANON_KEY
$env:SUPABASE_TEST_SERVICE_ROLE_KEY = $status.SERVICE_ROLE_KEY
pnpm verify:local
```

The check creates temporary local Auth users and records, verifies RLS, concurrency, failed-transaction rollback, retry idempotency, oversell protection, and void safety, then removes its test data. Never place the service-role key in `.env.local` or commit it.

## Checks

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The report endpoint smoke test can be run after `pnpm build` and `pnpm start`:

```text
GET /api/reports/export?from=2026-08-06&to=2026-08-06
```

The minimal release smoke check verifies the public login page, the unauthenticated export boundary, and required security headers:

```powershell
pnpm build
pnpm start
pnpm smoke:app
```

Set `SMOKE_BASE_URL` when checking a Preview deployment.

The Reports page also accepts `month`, `paymentMethod`, `status`, `product`, `category`, and `staff` query parameters. Demo mode is intentionally read-only and uses sample data.

## Operational follow-ups

- Keep a Supabase backup/export record before future schema changes or bulk imports.
- Rehearse future migrations in a separate remote/test project before applying them to production.
- `pnpm audit --prod` currently reports one documented moderate transitive `uuid` advisory through `exceljs`; no critical/high issue is open.

## Deployment, backup, and recovery runbook

1. Apply every file in `supabase/migrations/` to the target Supabase project. Do not run `supabase/seed.sql` in production.
2. In Vercel, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `BUSINESS_TIMEZONE` for the deployment environments. Set `SUPABASE_SECRET_KEY` only when the `/users` Admin account-creation flow is needed; keep it server-only. The legacy `SUPABASE_SERVICE_ROLE_KEY` remains supported.
3. Before a schema change or bulk data operation, create a Supabase backup/export using the controls available for the project plan and record the migration commit SHA.
4. For recovery, restore into a separate Supabase project first, apply the migrations, rotate exposed keys if necessary, update Vercel variables, and run `pnpm smoke:app` against the deployment before switching traffic.

## Development plan

See [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for stage gates, remaining work, and the V1 acceptance criteria. See [project prompt.md](./project%20prompt.md) for the product specification.
