# Incubyte Salary Management MVP

Incubyte is a Bun monorepo for ACME salary management. It replaces spreadsheet-based compensation tracking with a seeded SQLite backend, a React salary operations UI, and analytics over a deterministic 10,000 employee dataset.

## Live Deployment

- Frontend: <https://incubyte.charanpreet.me>
- Backend health: <https://backend.incubyte.charanpreet.me/health>
- Backend host: VPS running Caddy and `incubyte-api` under systemd
- Frontend host: Netlify site `incubyte-charanpreet`

The deployed frontend is built with `VITE_API_URL=https://backend.incubyte.charanpreet.me`. The backend allows cross-origin JSON requests for the web app and binds locally behind Caddy on the VPS.

## Repository Layout

```text
api/     Bun HTTP API, SQLite schema, deterministic seed, domain logic, tests
web/     Vite + React frontend for directory, employee detail, and analytics
docs/    Scope, requirements, spec, ERD, testing notes, and research
```

## Product Scope

The MVP supports:

- Employee directory with pagination, search, and filters.
- Employee compensation detail views.
- Runtime salary component definitions.
- Create, update, and delete salary components.
- Compensation analytics by summary, breakdown, distribution, and band placement.
- Deterministic seeded data for 10,000 employees.

Intentionally out of scope for this version: audit tables, approval workflows, RBAC, payroll integration, CSV import/export, and live FX updates.

## Data Model

SQLite is the source of truth. Employees reference normalized `jobs`, `locations`, `org_units`, and `compensation_packages`. Compensation packages are composed of runtime-defined salary components through `salary_component_definitions` and `salary_components`.

The current ERD and rationale live in [`docs/erd.md`](./docs/erd.md).

## Local Setup

Install dependencies:

```bash
bun install
```

Seed the local SQLite database:

```bash
bun run seed
```

Run both workspaces for development:

```bash
bun run dev
```

Defaults:

- API: `http://localhost:8787`
- Web: Vite dev server output
- SQLite: `api/data/dev.sqlite`

## Commands

```bash
bun run test    # API tests and web tests
bun run lint    # TypeScript / ESLint checks
bun run build   # Production builds for api and web
bun run start   # Start built outputs
bun run seed    # Seed api/data/dev.sqlite
```

## Configuration

| Variable | Default | Used by | Purpose |
|---|---:|---|---|
| `DATABASE_PATH` | `api/data/dev.sqlite` | API | SQLite database file path |
| `PORT` | `8787` | API | API listen port |
| `HOST` | unset | API | Optional bind host, used as `127.0.0.1` on the VPS |
| `CORS_ORIGIN` | `*` | API | Allowed CORS origin for JSON API responses |
| `VITE_API_URL` | empty string | Web | Backend API base URL baked into the web build |

## Deployment Notes

The backend is deployed to the VPS at `/opt/incubyte/api` and uses `/var/lib/incubyte/dev.sqlite` for persistent SQLite data. Caddy terminates HTTPS for `backend.incubyte.charanpreet.me` and proxies to `127.0.0.1:8787`.

The frontend is deployed to Netlify from `web/dist`. The file [`web/public/_redirects`](./web/public/_redirects) provides the SPA fallback so React Router routes work on refresh.

Local deployment helper scripts are intentionally ignored by git under `scripts/`; keep machine-specific deploy automation there.

## Documentation

| Doc | Description |
|---|---|
| [`docs/scope.md`](./docs/scope.md) | MVP boundary and assumptions |
| [`docs/requirements.md`](./docs/requirements.md) | Testable requirements |
| [`docs/spec.md`](./docs/spec.md) | Implementation spec and API details |
| [`docs/erd.md`](./docs/erd.md) | Database schema and design explanation |
| [`docs/testing-agent.md`](./docs/testing-agent.md) | Testing agent workflow |
| [`docs/tests/api-test-spec.md`](./docs/tests/api-test-spec.md) | API test catalog |
| [`docs/README.md`](./docs/README.md) | Full documentation index |
| [`AGENTS.md`](./AGENTS.md) | Coding-agent guidance |
