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
- [ ] P2.7 Generate TypeScript database types from the final schema.

### Required Database Tests

- [ ] Two simultaneous orders cannot get the same daily order number.
- [ ] Two simultaneous sales cannot oversell the last stock item.
- [ ] A failed multi-item sale changes neither orders nor stock.
- [ ] Retrying the same client request ID returns the original sale without deducting stock again.
- [ ] Voiding restores stock once and cannot be repeated.
- [ ] Staff cannot read cost/profit or execute Admin operations.

### Exit Check

Pending: reset a local/test Supabase database from migrations, run the seed once, generate database types, and pass all database/RLS integration tests. No Supabase project credentials are present in this workspace, so this check is not claimed complete.

---

## Phase 3 — Core User Workflows

**Goal:** Complete the workflows Staff and Admin use every day.

**Progress:** Login action, logout, Next.js 16 session proxy, Admin/Staff dashboard split, product read/create view, inventory read view with stock actions, reports shell, and a validated sale composer are implemented. Product edit/delete, user management, stock history, and live Supabase verification remain pending.

### 3A. Authentication and Navigation — 0.5–1 day

- [ ] P3.1 Build email/password login and logout. (Implemented.)
- [ ] P3.2 Add server-side session refresh, protected route handling, inactive-user rejection, and role-aware navigation. (Proxy, inactive-user redirect, and role-aware navigation are implemented; live-session verification is pending.)
- [ ] P3.3 Add Admin user list, invitation/creation flow, activation, deactivation, and role changes.

**Check:** Staff cannot open Admin URLs even by typing the address directly.

### 3B. Product Management — 1 day

- [ ] P3.4 Build paginated product list with search, category/status filters, and low-stock badges. (Initial responsive read-only list is implemented.)
- [ ] P3.5 Build Admin create/edit forms with shared Zod validation. (Create is implemented; edit is pending.)
- [ ] P3.6 Implement activate/deactivate and safe-delete confirmation flows.

**Check:** Products with history cannot be deleted, and inactive products cannot be sold.

### 3C. Sales Recording — 1.5–2 days

- [ ] P3.7 Build a touch-friendly order form with product selection, quantity controls, live subtotals, payment selection, and order total. (Initial composer is implemented.)
- [ ] P3.8 Save through `create_sale`; prevent repeat submissions and show the generated order reference. (Initial action is implemented; live RPC verification is pending.)
- [ ] P3.9 Build recent-sales and sale-detail screens.
- [ ] P3.10 Build the Admin void dialog with mandatory reason.

**Check:** A multi-item sale deducts each stock quantity exactly once; retrying after a timeout cannot create an accidental duplicate.

### 3D. Inventory — 1–2 days

- [ ] P3.11 Build inventory list and low/out-of-stock views. (Initial responsive read-only list is implemented.)
- [ ] P3.12 Build stock-in and stock-adjustment forms. (Initial actions/forms are implemented; live RPC verification is pending.)
- [ ] P3.13 Build paginated, filterable, read-only stock movement history.

**Check:** Every stock change has matching before/after values and an audit reference.

---

## Phase 4 — Dashboard, Reports, Search, and Excel

**Goal:** Turn transaction data into trustworthy operational information.

**Progress:** ExcelJS export route and Reports download form are implemented. The workbook returns three styled worksheets, applies demo `from/to` filters, adds Excel table objects, and was verified through the production server; live report queries and summary tests remain pending.

### Tasks

- [ ] P4.1 Build permission-aware Admin and Staff dashboards.
- [ ] P4.2 Add monthly revenue trend and top-10 product charts with accessible table alternatives.
- [ ] P4.3 Build daily sales, monthly sales/profit, inventory, best-selling, and low-stock reports.
- [ ] P4.4 Add date range, month/year, product, category, payment, Staff, and status filters using URL query parameters.
- [ ] P4.5 Build global search grouped into Product and Sale results.
- [ ] P4.6 Generate the three-worksheet Excel workbook using the active report filters. (Demo `from/to` filtering is implemented; live data is pending.)
- [ ] P4.7 Apply required Excel styles, number/date formats, filters, frozen headers, tables, summaries, and safe column widths. (Implemented for the demo workbook.)

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

**Progress:** README, a currency smoke test, and the full local typecheck/lint/test/build gate are implemented. Database integration tests, browser end-to-end tests, accessibility review, and deployment remain pending.

### Tasks

- [ ] P5.1 Add unit tests for money calculations, dates, status derivation, and Zod schemas. (Foundation currency smoke test exists; domain tests are pending.)
- [ ] P5.2 Add integration tests for RPC transactions, concurrency, RLS, and report queries.
- [ ] P5.3 Add end-to-end tests for login, product creation, sale, stock-in, adjustment, void, report, and export workflows.
- [ ] P5.4 Verify keyboard access, focus states, labels, contrast, loading states, empty states, and error recovery.
- [ ] P5.5 Test common desktop widths and iPhone widths at 375 px and 430 px.
- [ ] P5.6 Review security headers, secrets, service-role usage, server authorization, and dependency audit results.
- [ ] P5.7 Write README instructions for setup, migrations, seed, tests, first Admin, deployment, backup, and recovery. (Setup, migrations, seed, tests, and first Admin notes are documented; deployment/backup/recovery are pending.)
- [ ] P5.8 Configure Supabase production migrations and Vercel environment variables, then perform a deployment smoke test.

### Release Gate

- [ ] All ten V1 acceptance criteria in `project prompt.md` pass.
- [ ] Type-check, lint, tests, and production build pass.
- [ ] No critical/high security issue remains open.
- [ ] A fresh environment can be set up using only the README.
- [ ] Production smoke test completes without using seed data.

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

## First Development Action

Start **P1.1** only: scaffold the Next.js application in the current project directory, then verify the default application builds successfully before installing additional libraries.
