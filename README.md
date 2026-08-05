# Tuck Shop Sales & Inventory Management System

Next.js 16 + Supabase application for recording school tuck shop sales, controlling stock, and exporting reports.

## Current implementation

- Foundation: Next.js App Router, Tailwind CSS, shadcn/ui, responsive shell
- Auth: Supabase email/password action, protected Next.js 16 proxy, logout
- Sales: multi-item sale composer with server-side validation and `create_sale` RPC
- Products: Admin product creation RPC and responsive product list
- Inventory: stock-in and adjustment RPC actions with low-stock list
- Reports: three-sheet ExcelJS export with demo filters and table formatting

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

The database layer contains RLS, Staff-safe views, idempotent sale creation, stock-in, stock adjustment, sale voiding, product Admin RPCs, and audit movements. It has not yet been executed against a live Supabase project in this workspace.

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

## Development plan

See [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for stage gates, remaining work, and the V1 acceptance criteria. See [project prompt.md](./project%20prompt.md) for the product specification.
