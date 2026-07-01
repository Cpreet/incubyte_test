# Incubyte — Salary Management MVP

Web app to replace ACME's salary spreadsheets: browse and edit compensation for 10,000 employees across countries, and answer aggregate pay questions from a dashboard.

**Status:** API foundation and seed data are in place; analytics API and React UI are not built yet. See [`docs/spec.md`](./docs/spec.md#implementation-status).

## Documentation

| Doc | Description |
|---|---|
| [`docs/scope.md`](./docs/scope.md) | MVP boundary and assumptions |
| [`docs/requirements.md`](./docs/requirements.md) | Testable requirements (FR/NFR) |
| [`docs/spec.md`](./docs/spec.md) | Implementation spec and API |
| [`docs/erd.md`](./docs/erd.md) | Database schema |
| [`docs/testing-agent.md`](./docs/testing-agent.md) | Testing agent workflow |
| [`docs/tests/api-test-spec.md`](./docs/tests/api-test-spec.md) | API test case catalog |
| [`AGENTS.md`](./AGENTS.md) | Guide for coding agents |
| [`docs/README.md`](./docs/README.md) | Full doc index |

## Repository structure

```text
api/     Bun HTTP API, SQLite, seed script, API tests
web/     Vite + React frontend (placeholder shell)
docs/    Scope, requirements, spec, ERD, research
```

## Quick start

```bash
bun install
bun run seed    # populate api/data/dev.sqlite with 10,000 employees
bun run dev     # API :8787 + Vite dev server
```

Other commands:

```bash
bun run test    # api (bun test) + web (vitest)
bun run lint    # typecheck / eslint across workspaces
bun run build   # production builds
bun run start   # run built api + web preview
```

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_PATH` | `api/data/dev.sqlite` | SQLite database file |
| `PORT` | `8787` | API listen port |

The web dev server proxies API requests to the backend (configure in `web/vite.config.ts` when UI work begins).

## Tech stack

- **Runtime:** Bun (workspace root + `api`)
- **API:** `Bun.serve`, `bun:sqlite`, TypeScript
- **Frontend:** Vite, React 19, TypeScript, Vitest
- **Data:** SQLite with deterministic Faker seed (`20260701`)

## MVP scope (short)

**In:** employee directory, compensation view/edit, runtime salary component types, pay analytics dashboard, 10k seed.

**Out:** audit log, approvals, RBAC, compensation events, CSV I/O, live FX, payroll integration.

Details: [`docs/scope.md`](./docs/scope.md).
