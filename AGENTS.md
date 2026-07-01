# Agent Guide — Incubyte Salary Management MVP

This file orients coding agents to the repo before making changes. Read it first, then the linked docs for detail.

## What this project is

ACME HR salary management MVP: replace spreadsheet-based comp data for ~10,000 employees across countries. Two jobs, in order:

1. **Manage data** — browse, search, filter, and edit compensation.
2. **Answer pay questions** — dashboard analytics (totals, breakdowns, distribution, band placement).

Single trusted HR operator. No RBAC, audit log, approvals, or payroll in MVP.

## Document hierarchy

When docs conflict, resolve in this order:

| Priority | File | Role |
|---|---|---|
| 1 | `docs/scope.md` | Boundary: in/out of MVP |
| 2 | `docs/requirements.md` | Testable FR/NFR IDs and traceability matrix |
| 3 | `docs/spec.md` | Implementation target, API shape, status table |
| 4 | `docs/erd.md` | SQLite schema and relationships |
| 5 | `docs/tests/api-test-spec.md` | API test case catalog and coverage status |
| 6 | `docs/testing-agent.md` | How testing agents write and run tests |
| 7 | `docs/research/` | Domain background (not binding for MVP cuts) |

Update `docs/spec.md` **Implementation Status** when you land or change a feature area.

## Repository layout

```text
api/                  Bun HTTP API + SQLite
  src/db.ts           Schema, migrations via CREATE IF NOT EXISTS
  src/seed.ts         Deterministic 10k employee seed
  src/server.ts       Route handlers (keep thin)
  src/domain/         (planned) Pure analytics + money helpers
web/                  Vite + React frontend (shell today)
docs/                 Scope, requirements, spec, ERD, research
```

Root workspace (`package.json`) orchestrates both packages with `bun --filter`.

## Commands

```bash
bun install           # install all workspaces
bun run dev           # api on :8787, web dev server
bun run seed          # reset + seed api/data/dev.sqlite (10k rows)
bun run test          # api: bun test; web: vitest
bun run lint          # api: tsc; web: eslint + tsc
bun run build         # compile both packages
bun run start         # production api + web preview
```

Environment:

- `DATABASE_PATH` — SQLite file (default `api/data/dev.sqlite`)
- `PORT` — API port (default `8787`)

## Implementation status (summary)

**Done (API):** schema, seed, employee directory/CRUD, compensation read, component CRUD, runtime component definitions, API integration tests.

**Not done:** analytics API + domain unit layer, web UI (directory, detail, dashboard), schema/analytics tests from NFR-1.

See the full table in `docs/spec.md`.

## Conventions agents must follow

### Runtime and tooling

- **Root and `api/`:** Bun (`bun test`, `Bun.serve`, `bun:sqlite`). Do not add Express, better-sqlite3, or dotenv.
- **`web/`:** Vite + React + Vitest. Do not migrate the frontend to Bun HTML imports unless the spec changes.
- **Package manager:** `bun install` only at repo root.

### Money and domain

- Amounts are **integer minor units** (cents). Never store floats for money.
- Native currency on packages/components is source of truth; USD conversion is analytics-only via `fx_rates`.
- Annualization: `annual` and `one_time` as-is; `monthly` × 12.
- Band placement uses **base** salary only, not total comp.
- Component `type` values come from `salary_component_definitions` (runtime extensible).

### API style

- `handleRequest(request, db)` in `server.ts` is the test seam — keep it exportable.
- Use in-memory DB (`:memory:`) in API tests; seed with `seedDatabase(db, { count: N })` for smaller fixtures.
- Return JSON via `Response.json`; use 400 for validation errors, 404 for missing resources.

### What not to add without scope change

- Audit tables or change-history endpoints
- Compensation events / approval workflows
- RBAC or auth implementation (caller is trusted upstream)
- CSV import/export
- Live FX feeds
- Effective-dated / bitemporal history

### Testing

- Test specs live in `docs/tests/`; process in `docs/testing-agent.md`.
- API case catalog: `docs/tests/api-test-spec.md` — update **Status** when adding tests.
- Add API tests in `api/src/*.test.ts` with `bun:test`; name tests with case IDs where possible.
- Add pure domain tests under `api/src/domain/*.test.ts` with no DB.
- Add UI tests in `web/src` with Vitest + Testing Library.
- Run `bun run test` and `bun run lint` before finishing.

### Frontend (when building UI)

- Proxy API in Vite dev config to `http://localhost:8787`.
- Three screens: directory, employee detail (comp edit), pay dashboard.
- Match API query param names: `page`, `pageSize`, `job`, `location`, `org_unit`, `level`, `search`.

## Typical next tasks

1. Add `api/src/domain/` (annualize, stats, percentiles, band classify, fx convert) + unit tests.
2. Implement analytics routes per `docs/spec.md`.
3. Build web directory → detail → dashboard against those endpoints.
4. Add schema tests for indexes (NFR-1).

## Pull request checklist

- [ ] Matches `docs/scope.md` boundary
- [ ] Requirements IDs covered or spec status updated
- [ ] `bun run test` passes
- [ ] `bun run lint` passes
- [ ] `docs/spec.md` status table updated if feature area changed
