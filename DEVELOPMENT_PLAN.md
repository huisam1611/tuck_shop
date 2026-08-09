# Tuck Shop Development Plan

## Current State

- [x] Product requirements clarified
- [x] V1 scope and acceptance criteria defined
- [x] Core database and permission model designed
- [x] Application implementation started

Primary specification: [`project prompt.md`](./project%20prompt.md)

## Delivery Estimate

Estimated solo-development time: **12–18 working days**, excluding delays for Supabase/Vercel account access and stakeholder feedback.

| Phase | Estimated time | Main outcome |
|---|---:|---|
| 1. Foundation | 1–2 days | Running Next.js app with quality checks |
| 2. Database and security | 2–3 days | Migrations, RLS, seed, atomic RPC functions |
| 3. Core workflows | 4–6 days | Auth, products, sales, inventory |
| 4. Insights and export | 2–3 days | Dashboard, reports, Excel export |
| 5. Verification and release | 3–4 days | Tests, responsive QA, deployment docs |

Do not begin a later phase until the current phase's exit check passes.

---

## Phase 1 — Project Foundation ✅ Complete

**Goal:** Create a stable application skeleton that runs locally.

### Tasks

- [x] P1.1 Scaffold a Next.js App Router project with TypeScript, Tailwind CSS, ESLint, and a `src/` directory.
- [x] P1.2 Enable strict TypeScript settings and add consistent formatting scripts.
- [x] P1.3 Install and configure shadcn/ui, Supabase clients, Zod, React Hook Form, ExcelJS, and test tooling.
- [x] P1.4 Create the public login layout and Admin/Staff application shell preview.
- [x] P1.5 Add `.env.example` without secrets and keep real environment files ignored.
- [x] P1.6 Add CI scripts for type-checking, linting, unit tests, and production build.

### Recommended Structure

```text
src/
  app/
    (auth)/login/
    (dashboard)/dashboard/
    (dashboard)/products/
    (dashboard)/sales/
    (dashboard)/inventory/
    (dashboard)/reports/
  components/
    ui/
    layout/
  features/
    auth/
    products/
    sales/
    inventory/
    reports/
  lib/
    supabase/
    validation/
    permissions/
    money/
    dates/
  types/
supabase/
  migrations/
  seed.sql
tests/
```

### Exit Check

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

All four commands pass from the current checkout. The login action remains intentionally disabled until Supabase Auth is implemented in Phase 3.

---

## Phase 2 — Database, Transactions, and Security

**Goal:** Make PostgreSQL the trusted source of truth before building business screens.

**Progress:** Local migration, RLS, safe Staff views, seed data, and atomic RPCs are implemented. The Supabase integration exit check remains pending until a local/test Supabase database is available.

### Tasks

- [x] P2.1 Create enum/check constraints, tables, foreign keys, indexes, timestamp triggers, and uniqueness rules from the specification.
- [x] P2.2 Create safe database views for Staff that exclude cost and profit fields.
- [x] P2.3 Implement RLS policies for `profiles`, `products`, `sales`, `sale_items`, `stock_receipts`, and `stock_movements`.
- [x] P2.4 Implement the idempotent atomic `create_sale` RPC with a unique client request ID, row locks, server-side price snapshots, daily numbering, stock deduction, and movement history.
- [x] P2.5 Implement Admin-only `void_sale`, `stock_in`, and `adjust_stock` RPC functions.
- [x] P2.6 Create development seed data for the ten sample products. First Admin creation remains an authenticated deployment step.
- [x] P2.7 Generate TypeScript database types from the final schema. (`src/types/database.ts` is generated from the local schema.)

### Required Database Tests

- [x] Two simultaneous orders cannot get the same daily order number.
- [x] Two simultaneous sales cannot oversell the last stock item.
- [x] A failed multi-item sale changes neither orders nor stock.
- [x] Retrying the same client request ID returns the original sale without deducting stock again.
- [x] Voiding restores stock once and cannot be repeated.
- [x] Staff cannot read cost/profit or execute Admin operations.

### Exit Check

Complete locally: `supabase db reset` applies all three migrations and the seed, `src/types/database.ts` is generated, and `pnpm verify:local` passes RLS, atomicity, concurrency, retry idempotency, oversell protection, and void-safety checks. A remote Supabase project still needs its own migration smoke test before release.

---

## Phase 3 — Core User Workflows

**Goal:** Complete the workflows Staff and Admin use every day.

**Progress:** Login action, logout, Next.js 16 session proxy, Admin/Staff dashboard split, product CRUD view, Admin user creation/profile management, inventory actions/history, sales history/void UI, reports, and a validated sale composer are implemented. Local Supabase Auth/RPC/RLS verification is complete; production Admin browser verification is complete for the main workflows. A separate Staff-account session is still optional follow-up coverage.

### 3A. Authentication and Navigation — 0.5–1 day

- [ ] P3.1 Build email/password login and logout. (Implemented.)
- [ ] P3.2 Add server-side session refresh, protected route handling, inactive-user rejection, and role-aware navigation. (Proxy, inactive-user redirect, and role-aware navigation are implemented; live-session verification is pending.)
- [x] P3.3 Add Admin user list, account creation, activation, deactivation, and role changes. (Email invitation remains deferred; the Admin can create confirmed email/password accounts through the server-only Supabase Admin API.)

**Check:** Staff cannot open Admin URLs even by typing the address directly.

### 3B. Product Management — 1 day

- [ ] P3.4 Build paginated product list with search, category/status filters, and low-stock badges. (Search, status filtering, pagination, and low-stock badges are implemented.)
- [ ] P3.5 Build Admin create/edit forms with shared Zod validation. (Create and edit are implemented.)
- [ ] P3.6 Implement activate/deactivate and safe-delete confirmation flows. (Status changes and safe-delete confirmation are implemented.)

**Check:** Products with history cannot be deleted, and inactive products cannot be sold.

### 3C. Sales Recording — 1.5–2 days

- [ ] P3.7 Build a touch-friendly order form with product selection, quantity controls, live subtotals, payment selection, and order total. (Initial composer is implemented.)
- [ ] P3.8 Save through `create_sale`; prevent repeat submissions and show the generated order reference. (Stable client request ID and repeat-safe server action are implemented; live RPC verification is pending.)
- [ ] P3.9 Build recent-sales and sale-detail screens. (Sales history with line items is implemented.)
- [ ] P3.10 Build the Admin void dialog with mandatory reason. (Admin void form and protected RPC are implemented.)

**Check:** A multi-item sale deducts each stock quantity exactly once; retrying after a timeout cannot create an accidental duplicate.

### 3D. Inventory — 1–2 days

- [ ] P3.11 Build inventory list and low/out-of-stock views. (Initial responsive read-only list is implemented.)
- [ ] P3.12 Build stock-in and stock-adjustment forms. (Initial actions/forms are implemented; live RPC verification is pending.)
- [ ] P3.13 Build paginated, filterable, read-only stock movement history. (Read-only Admin history table, search, type filtering, and pagination are implemented.)

**Check:** Every stock change has matching before/after values and an audit reference.

---

## Phase 4 — Dashboard, Reports, Search, and Excel

**Goal:** Turn transaction data into trustworthy operational information.

**Progress:** ExcelJS export route and Reports page are connected to shared report queries. The screen and workbook use month, date, payment, status, product, category, and Staff filters; summaries exclude voided sales, monthly profit is calculated from historical cost snapshots, the Dashboard uses live summary queries, and the workbook returns three styled worksheets with Excel tables. Search is grouped by Products and Sales; debounce and dedicated report-query integration coverage remain pending.

### Tasks

- [ ] P4.1 Build permission-aware Admin and Staff dashboards. (Role-aware live summary cards, revenue trend, low-stock list, and best-selling table are implemented.)
- [ ] P4.2 Add monthly revenue trend and top-10 product charts with accessible table alternatives. (Revenue trend and accessible best-selling table are implemented; a dedicated product chart remains.)
- [ ] P4.3 Build daily sales, monthly sales/profit, inventory, best-selling, and low-stock reports. (Daily detail, monthly profit, and inventory export data are implemented; best-selling/low-stock report cards remain.)
- [ ] P4.4 Add date range, month/year, product, category, payment, Staff, and status filters using URL query parameters. (Month, date range, product, category, payment, Staff, and status filters are implemented.)
- [ ] P4.5 Build global search grouped into Product and Sale results. (Grouped search page is implemented; debounce remains.)
- [ ] P4.6 Generate the three-worksheet Excel workbook using the active report filters. (Live shared report data and all current URL filters are implemented.)
  - [ ] P4.7 Apply required Excel styles, number/date formats, filters, frozen headers, tables, summaries, and safe column widths. (Implemented and smoke-tested with filtered data.)

### Required Calculation Tests

- [ ] Voided sales do not affect totals.
- [ ] Historical profit does not change when a product's current cost changes.
- [ ] Cash plus E-payment totals equal revenue.
- [ ] Monthly totals equal the sum of included daily totals.
- [ ] Excel summaries match the same filtered report shown on screen.

### Exit Check

Use a fixed dataset to compare on-screen values, direct SQL results, and workbook summary values. Every value must match to two decimal places.

---

## Phase 5 — Quality, Security, and Release

**Goal:** Prove the V1 acceptance criteria and deploy safely.

**Progress:** README, currency/report calculation tests, filtered Excel smoke test, local Supabase RPC/concurrency/RLS integration tests, report-query mapping tests, a production HTTP smoke script, and the full local typecheck/lint/test/build gate are implemented. The production Vercel deployment smoke, Admin browser E2E workflow, accessibility checks, and responsive checks now pass. Remaining work is final V1 acceptance sign-off.

### Tasks

- [x] P5.1 Add unit tests for money calculations, dates, status derivation, and Zod schemas. (Currency/report summaries, timezone-aware business dates, status/payment normalization, product/sale/inventory/void schemas are covered.)
- [x] P5.2 Add integration tests for RPC transactions, concurrency, RLS, and report queries. (`pnpm verify:local` passed for RPC transactions, concurrency, RLS, retry idempotency, oversell protection, void safety, and Staff restrictions; the shared report-query mapping/filter path also has automated coverage.)
- [x] P5.3 Add end-to-end tests for login, product creation, sale, stock-in, adjustment, void, report, and export workflows. (Production Admin session verified on 2026-08-09 with TEST-E2E-01 / TEST E2E Snack: stock-in +2, sale 1, adjustment in +1, void restore +1, immutable history, void-excluded report totals, and `.xlsx` download. The authenticated session was already supplied, so the password-entry step was not replayed.)
- [x] P5.4 Verify keyboard access, focus states, labels, contrast, loading states, empty states, and error recovery. (Latest production deployment confirms visible mobile sign-out, no remaining `text-slate-400` metadata classes, focus rings, native invalid-field recovery, status/empty states, and no unnamed visible controls or missing image alt text across nine Admin routes.)
- [x] P5.5 Test common desktop widths and iPhone widths at 375 px and 430 px. (Production Dashboard, Sales, Inventory, Products, and Reports were checked at 375px, 430px, and 1280px with no document-level horizontal overflow.)
- [x] P5.6 Review security headers, secrets, service-role usage, server authorization, and dependency audit results. (Headers, server-only guard, build secret scan, authenticated/unauthenticated export boundaries, and production smoke pass. `pnpm audit --prod` reports one documented moderate transitive `uuid` advisory through ExcelJS; no critical/high issue was found.)
- [x] P5.7 Write README instructions for setup, migrations, seed, tests, first Admin, deployment, backup, and recovery. (Runbook and release smoke command are documented; project-specific backup-plan selection remains an operator task.)
- [x] P5.8 Configure Supabase production migrations and Vercel environment variables, then perform a deployment smoke test. (Production `/login` returns 200, unauthenticated export returns 403, and required security headers are present.)

### Release Gate

- [ ] All ten V1 acceptance criteria in `project prompt.md` pass.
- [x] Type-check, lint, tests, and production build pass.
- [x] No critical/high security issue remains open. (One moderate transitive `uuid` advisory remains documented.)
- [ ] A fresh environment can be set up using only the README.
- [x] Production smoke test completes without using seed data. (Production Admin TEST audit records were used for browser verification.)

---

## Work Order and Dependencies

```text
P1 Foundation
  -> P2 Schema + RLS + RPC
    -> P3 Auth / Products / Sales / Inventory
      -> P4 Dashboard / Reports / Excel
        -> P5 Full QA / Deployment
```

Never build direct browser-side stock updates as a temporary shortcut. Sales and inventory screens depend on the Phase 2 RPC functions.

## Decision Log

These decisions are fixed for V1 unless the product owner changes them before implementation:

| Decision | V1 choice |
|---|---|
| Currency | MYR (`RM`) |
| Business timezone | `Asia/Kuala_Lumpur`, configurable by environment |
| Inventory costing | Latest unit cost |
| Negative stock | Prohibited |
| Sale correction | Void entire order and re-enter |
| Staff report access | No financial reports or cost/profit data |
| Product deletion | Only when no related history exists |
| Deployment | Vercel + Supabase |

## Next Development Action

Next: push and deploy the latest commits through `e7e8c8f`, then run the final V1 acceptance checklist and record any remaining operator-only steps. Keep `pnpm verify:local`, `pnpm smoke:app`, and the production TEST audit records as evidence.
