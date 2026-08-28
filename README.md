# Tuck Shop Sales & Inventory Management System

English documentation for the Tuck Shop Keeper / POS application. 繁體中文版：[README_zh.md](./README_zh.md)

This is a Next.js 16 + Supabase application for recording tuck-shop sales, managing inventory, maintaining a structured product catalogue, and exporting reports.

## Project status

The V1 release is deployed on Vercel and uses a production Supabase project. The production historical-sales replacement was completed and verified on 2026-08-13:

- 57 active catalogue products (`HK-001` to `HK-057`)
- 295 generated sales from 2026-06-01 through 2026-08-12
- 573 sale-item lines and 1,164 units
- HK$4,470.50 total revenue using the production selling prices
- 171 cash sales and 124 e-payment sales
- Current inventory was not reduced by the historical replacement
- Production smoke check: `/login` returned 200 and unauthenticated report export returned 403

The replacement preserved the existing inventory baseline. Migration `202608180001` recorded the ten approved legacy opening balances without changing current stock; the production inventory-ledger mismatch count is now zero.

Release hardening migration `202608180002` has passed a fresh local migration reset and the full local integration gate. Its application to the production database is not yet confirmed in this document. Before marking it complete, create and verify a production backup, rehearse the migration in a separate test project, apply it, and run the production smoke check.

## Screenshots

### Admin dashboard

![Admin dashboard showing revenue, low-stock alerts, and best-selling products](./docs/screenshots/dashboard.webp)

### Mobile sales POS

<p align="center">
  <img
    src="./docs/screenshots/sales-mobile.webp"
    alt="Mobile sales POS showing product search, selected items, payment method, order total, and save action"
    width="360"
  />
</p>

## Main features

- Supabase email/password authentication with Admin and Staff roles
- Role-aware navigation and protected routes
- Structured products with SKU, Chinese/English names, brand, category, flavour, size, package type, price, cost, stock, reorder level, and barcode
- Automatic Chinese display-name generation, for example `卡樂B 薯片 25g｜燒烤味`
- Admin product CRUD, activation/deactivation, safe-delete checks, search, category filters, and stock filters
- Multi-item sales with server-side price snapshots, retry-safe client request IDs, daily order numbering, and Admin voiding
- Stock-in, stock adjustment, low-stock views, and movement history
- Dashboard, filtered reports, global search, and three-sheet ExcelJS export
- Row-level security, safe Staff views, atomic RPCs, audit movements, and release smoke checks

## Technology

- Next.js 16 App Router and React 19
- TypeScript, Tailwind CSS, shadcn/ui, React Hook Form, and Zod
- Supabase Auth, PostgreSQL, RLS, database functions, and migrations
- Vitest for unit and policy tests
- pnpm 11 and Node.js 20+

## Local setup

Prerequisites: Node.js 20 or newer, pnpm, Docker Desktop (for local Supabase), and a Supabase project for live data.

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). If the Supabase variables are empty, the app uses read-only demo data; demo data is never production data.

### Environment variables

Put real values in `.env.local` locally and in the matching Vercel environment only. Never commit `.env.local`.

```text
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
BUSINESS_TIMEZONE=Asia/Hong_Kong
```

The Admin `/users` account-creation flow additionally needs the server-only key:

```text
SUPABASE_SECRET_KEY=sb_secret_...
```

`SUPABASE_SERVICE_ROLE_KEY` remains supported as a legacy fallback. Never prefix a secret key with `NEXT_PUBLIC_`, expose it to browser code, or commit it.

## Database and migrations

The source of truth is the ordered migration set in `supabase/migrations/`. It includes the base schema, RLS and grants, catalogue data, historical-import safeguards, structured product fields, the HK catalogue mapping, safe sales-history replacement, deterministic backup hashes, inventory safeguards, and final payload-bound retry/privilege hardening in `202608180002`.

For a local database:

```powershell
pnpm dlx supabase@latest start
pnpm dlx supabase@latest db reset
```

`db reset` is destructive to the local Supabase database and applies migrations plus `supabase/seed.sql`. Do not run the seed file in production.

For a linked remote project, review the migration list first and then push only after a backup:

```powershell
pnpm dlx supabase@latest migration list
pnpm dlx supabase@latest db push
```

Use a separate remote/test project to rehearse migrations before production. Do not edit an already-applied remote migration; add a new migration instead.

### Create the first Admin

The application does not automatically create a profile when an Auth user is created. Bootstrap the first Admin once from the trusted Supabase Dashboard:

1. Open **Authentication → Users**, create the first user, confirm the email, and copy the user UUID.
2. In **SQL Editor**, confirm that the UUID and email identify the intended account:

```sql
select id, email
from auth.users
where id = '<FIRST_ADMIN_AUTH_USER_UUID>'::uuid;
```

3. Create the matching active Admin profile with the same UUID:

```sql
insert into public.profiles (id, name, role, is_active)
values ('<FIRST_ADMIN_AUTH_USER_UUID>'::uuid, 'First Admin', 'admin', true)
on conflict (id) do update
set name = excluded.name,
    role = excluded.role,
    is_active = excluded.is_active;
```

4. Sign in with that account and verify `/users`. Create all later Admin and Staff accounts through that page. Never expose a service-role or secret key in browser code.

## Structured product catalogue

Products keep their existing IDs and SKU values. The product requirements use business-friendly names; the existing project keeps its original database conventions:

| Business meaning | Database/application field |
|---|---|
| SKU | `product_code` |
| Chinese and English names | `name_zh`, `name_en` |
| Brand, category, flavour, size, package and barcode | `brand`, `category`, `flavour`, `size`, `package_type`, `barcode` |
| Selling price | `selling_price` |
| Cost | `cost_price` |
| Stock quantity | `current_stock` |
| Reorder level | `minimum_stock` |

The application generates the display name from the fields rather than duplicating a long name in every form or POS card. Search supports SKU, Chinese/English name, brand, category, flavour, and barcode. The active HK catalogue is mapped in `202608120002_catalogue_mapping.sql`.

## Historical sales import

The historical importer is dry-run by default. Keep the source TSV local and untracked, review the JSON preview, and verify totals and product mappings before applying:

```powershell
pnpm import:historical -- --input .\historical-sales-2025.tsv
$env:SUPABASE_SECRET_KEY = "sb_secret_..."
pnpm import:historical -- --input .\historical-sales-2025.tsv --apply
```

The importer uses deterministic IDs, groups rows by date and payment method, preserves unmatched products as inactive historical products, and does not deduct current inventory for historical sales. It supports `SUPABASE_SERVICE_ROLE_KEY` as a legacy fallback.

## Replacing a sales history window

`pnpm replace:sales-history` is a destructive production tool. It is intentionally fixed to 2026-06-01 through 2026-08-12 and requires a target-specific confirmation token, service-role access, a frozen backup, and an enabled maintenance window.

Always start with a dry-run:

```powershell
pnpm replace:sales-history
pnpm replace:sales-history --status
```

The production cutover sequence is:

1. Apply and verify migrations in a test project, then create a pre-migration production backup.
2. Enable the target-bound maintenance command shown by `--status`.
3. While maintenance is enabled, create `roles.sql`, `schema.sql`, and `data.sql` with the Supabase CLI.
4. Create a manifest containing the project ref, maintenance timestamp, exact sales/items/movement/counter counts, canonical hashes, and SHA256 values for all three artifacts.
5. Run the apply command with `--confirm DELETE-ALL-SALES:<project-ref> --backup-manifest <path>`.
6. Review the returned counts, payload hash, counter check, and ledger baseline.
7. Disable maintenance using the target-bound command from `--status`.

The replacement is atomic. It does not deduct current stock, blocks sales/catalogue/inventory writes during the cutover, preserves the inventory ledger total, and verifies persisted rows after insertion. If the apply command fails, leave maintenance enabled, run `--status`, investigate, and only then use the target-bound maintenance-off command.

Keep the frozen backup permanently. The replacement removes old sale movements from the live ledger and retains their net effect as a reconciliation movement; the original row-level history is recoverable from the verified backup.

## Local Supabase verification

With Docker Desktop running, start the local stack and load its generated test keys:

```powershell
pnpm dlx supabase@latest start
$status = pnpm dlx supabase@latest status -o json | ConvertFrom-Json
$env:SUPABASE_TEST_URL = $status.API_URL
$env:SUPABASE_TEST_ANON_KEY = $status.ANON_KEY
$env:SUPABASE_TEST_SERVICE_ROLE_KEY = $status.SERVICE_ROLE_KEY
pnpm verify:local
```

`verify:local` creates temporary local users and fixtures, checks RLS and RPC privileges, actor-less ledger constraints, atomicity, payload-bound retries, concurrency, oversell protection, void safety, inventory import idempotency, and Staff restrictions, then cleans up its fixtures. Never point it at a production URL.

The sales-replacement integration check resets only the local Supabase database before and after its run:

```powershell
pnpm verify:sales-replacement
```

It verifies malformed-payload rollback, maintenance locking, direct-write blocking, deterministic hashes, exact counts, and ledger reconciliation. If `pnpm dlx` cannot download the CLI, set `SUPABASE_CLI_PATH` to an existing local `supabase` executable before running the command.

## Checks and release smoke test

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

After `pnpm build` and `pnpm start`, run the public HTTP smoke check:

```powershell
pnpm smoke:app
```

Set `SMOKE_BASE_URL` when checking a Vercel Preview or production deployment. The check covers the public login page, unauthenticated report-export authorization, and required security headers.

The report page supports `month`, `from`, `to`, `paymentMethod`, `status`, `product`, `category`, and `staff` filters. Demo mode is intentionally read-only.

## Deployment, backup, and recovery

1. Push the reviewed commit to GitHub and wait for the Vercel deployment to finish.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `BUSINESS_TIMEZONE` in the required Vercel environments.
3. Set `SUPABASE_SECRET_KEY` only if the server-side Admin account-creation flow is needed.
4. Apply Supabase migrations after creating and verifying a backup. Never run `supabase/seed.sql` in production.
5. Run `SMOKE_BASE_URL` against the deployment and verify an Admin and a Staff session separately.
6. For recovery, restore the verified backup into a separate Supabase project first, apply migrations there, rotate exposed keys if necessary, update Vercel variables, and run the smoke check before switching traffic.

## Documentation

- [Traditional Chinese README](./README_zh.md)
- [Development plan](./DEVELOPMENT_PLAN.md)
- [Project specification](./project%20prompt.md)
- [Environment template](./.env.example)

## Known follow-up work

- Keep production backup manifests and restore rehearsals as release evidence.
- `pnpm audit --prod` reports no known production vulnerabilities after pinning `nanoid` to `3.3.18` and the ExcelJS `uuid` dependency to `11.1.1`; the ExcelJS workbook smoke check passes with that override.
