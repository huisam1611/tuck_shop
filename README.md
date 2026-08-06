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

Do not commit `.env.local`.

## Database setup

Apply the migrations in `supabase/migrations/` to a Supabase project, then run `supabase/seed.sql` in a development database. The first Admin profile must reference an existing Supabase Auth user and is created as a deployment step.

The database layer contains RLS, Staff-safe views, idempotent sale creation, stock-in, stock adjustment, sale voiding, product Admin RPCs, and audit movements. It has not yet been executed against a live Supabase project in this workspace; run the migrations in a test project before treating the app as production-ready.

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

The Reports page also accepts `month`, `paymentMethod`, `status`, `product`, `category`, and `staff` query parameters. Demo mode is intentionally read-only and uses sample data.

## Release blockers

- Generate Supabase TypeScript database types and run RLS/concurrency integration tests.
- Configure Auth invitations, Vercel environment variables, backups, and a production smoke test.
- Complete browser E2E, accessibility, and mobile-width QA.

## Development plan

See [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for stage gates, remaining work, and the V1 acceptance criteria. See [project prompt.md](./project%20prompt.md) for the product specification.
