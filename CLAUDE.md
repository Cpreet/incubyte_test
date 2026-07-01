# Incubyte — Claude / AI coding context

Salary management MVP for ACME HR. Bun monorepo: `api` (backend) + `web` (frontend).

## Read first

1. `AGENTS.md` — agent workflow, status, conventions
2. `docs/scope.md` — what is and is not in MVP
3. `docs/spec.md` — API surface and implementation status
4. `docs/tests/api-test-spec.md` — API test cases (when writing tests)
5. `docs/testing-agent.md` — testing agent workflow

## Monorepo

| Package | Stack | Test runner |
|---|---|---|
| `api` | Bun.serve, bun:sqlite, TypeScript | `bun test` |
| `web` | Vite, React 19, TypeScript | `vitest` |

Install and run from repo root:

```bash
bun install
bun run dev      # both packages
bun run seed     # 10k deterministic employees
bun run test
bun run lint
bun run build
```

## Bun rules (api package)

- Use `bun <file>` / `bun test` / `bun install` / `bun run <script>`.
- API server: `Bun.serve()` in `api/src/server.ts` — no Express.
- Database: `bun:sqlite` in `api/src/db.ts` — no better-sqlite3.
- Bun loads `.env` automatically; do not add dotenv.
- Prefer `Bun.file` over `node:fs` read/write when adding file I/O.

## Web rules (web package)

This project uses **Vite + React**, not Bun HTML imports. Keep `vite.config.ts`, Vitest, and ESLint as-is unless the spec explicitly changes the frontend stack.

## Domain rules

- Money: integer minor units only.
- Currencies allowed in schema: USD, EUR, GBP, INR, SGD.
- One compensation package per employee; many salary components per package.
- Component types are data-driven (`salary_component_definitions`); codes are lowercase snake_case.
- Analytics convert to USD via `fx_rates`; never mutate stored native amounts.
- MVP edits are direct — no audit log, no required change reason.

## API defaults

- Listens on `http://localhost:8787` (`PORT` override).
- SQLite at `api/data/dev.sqlite` (`DATABASE_PATH` override).
- Employee list: `GET /employees?page=&pageSize=&job=&location=&org_unit=&level=&search=`
- Health: `GET /health`

Full route list and planned analytics endpoints: `docs/spec.md`.

## Where to put new code

- HTTP routes and DB queries: `api/src/server.ts` (thin) or new `api/src/routes/` if it grows.
- Pure logic (stats, FX, annualization): `api/src/domain/`
- Schema changes: `api/src/db.ts` + update `docs/erd.md`
- Seed changes: `api/src/seed.ts` (keep Faker seed `20260701` for determinism)
- React UI: `web/src/`

## Testing

```ts
// api — bun:test, in-memory DB
import { test, expect } from "bun:test";
import { openDatabase } from "./db";
import { handleRequest } from "./server";
```

```ts
// web — vitest + Testing Library
import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
```

Domain unit tests must pass with no database configured (NFR-2).

## Testing

- API test catalog: `docs/tests/api-test-spec.md`
- Testing agent spec: `docs/testing-agent.md`
- Use case IDs in test names (e.g. `FR-1 API-EMP-LIST-003`)

## Do not implement without scope change

Audit trails, approval workflows, RBAC, compensation events, CSV I/O, live FX, effective-dated history, payroll integration.
