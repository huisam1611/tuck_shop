# Luna Max — V1 Release Verification Plan

## Objective

Independently verify the current local V1 hardening changes. Fix only reproducible failures with the smallest root-cause change, then rerun the affected check and the complete release gate.

## Safety boundaries

- Work only in `C:\Users\huiha\Documents\Document\tuck_shop` and the local Supabase stack.
- Never use a production Supabase URL, run `db push`, deploy Vercel, rotate keys, or modify Production.
- Preserve all existing working-tree changes. Do not reset, discard, stage, commit, or push unless the user explicitly asks.
- Never print `.env.local`, Supabase keys, or connection strings.
- Before changing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` as required by `AGENTS.md`.

## Current local baseline

The primary review already passed:

- Vitest: 14 files, 37 tests
- TypeScript and ESLint
- Next.js production build
- `pnpm audit --prod`: no known vulnerabilities
- Fresh local Supabase migration reset through `202608180002`
- Local RLS, RPC privilege, actor-less ledger, atomicity, payload-bound retry, oversell, void, and inactive-product stock-in checks
- Historical replacement rehearsal: 295 sales and 573 items

Treat this as context, not proof: rerun the checks below independently.

## Execution plan

1. **Protect the starting state — 2 minutes**
   - Run `git status --short`, `git diff --check`, and `git diff --stat`.
   - Confirm the target is local before every Supabase command.
   - Stop if unrelated or unexpected changes appear.

2. **Run the code gate — 5 minutes**
   - Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm audit --prod`.
   - Record the exact pass/fail totals.
   - If one fails, fix only its root cause and rerun that command before continuing.

3. **Verify migrations and database invariants — 3 minutes**
   - With Docker Desktop running, run `pnpm dlx supabase@latest db reset --local --no-seed`.
   - Confirm migrations `202608180001` and `202608180002` apply successfully.
   - Load only the local `API_URL`, `ANON_KEY`, and `SERVICE_ROLE_KEY` from `supabase status -o env`, then run `pnpm verify:local`.
   - Require zero ledger mismatches and rejection of anonymous privileged RPCs, invalid actor-less movements, mismatched retries, oversells, repeat voids, and inactive-product stock-in.

4. **Run the destructive-history rehearsal locally — 3 minutes**
   - Confirm `SUPABASE_TEST_URL` hostname is `127.0.0.1` or `localhost`.
   - Run `pnpm verify:sales-replacement`.
   - If `pnpm dlx` cannot download the CLI, set `SUPABASE_CLI_PATH` to an existing local Supabase executable and rerun.
   - Require 295 sales, 573 items, exact counters/hash, maintenance blocking, rollback safety, and ledger reconciliation.

5. **Report and stop — 2 minutes**
   - Report only actionable findings, ordered P0 to P3.
   - For every local fix, list the file, root cause, change, and verification result.
   - If everything passes, state that no unresolved local finding remains.
   - Do not deploy or apply `202608180002` remotely. The next human-controlled step is backup, test-project migration, then Production approval.

## Completion criteria

Complete only when every code gate and both local Supabase integration checks pass, `git diff --check` is clean, no secret appears in tracked files, and all local changes are clearly reported.
