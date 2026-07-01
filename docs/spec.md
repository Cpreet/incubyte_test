# Salary Management — Implementation Spec

This spec describes the current MVP implementation target. It is aligned with `docs/scope.md`, `docs/requirements.md`, and `docs/erd.md`.

The MVP is deliberately not a full compensation workflow engine. It models the static salary structure, supports direct compensation data management, and leaves events, approvals, audit logs, market feeds, budgeting, RBAC, and effective-dated history out of scope.

## Implementation Status

Use this section to see what exists in the repo today versus what remains to build.

| Area | Status | Notes |
|---|---|---|
| SQLite schema + indexes | Done | `api/src/db.ts` |
| Deterministic 10k seed | Done | `api/src/seed.ts`, Faker seed `20260701` |
| Employee directory API | Done | Pagination, filters, search |
| Employee CRUD API | Done | Create, read, update, delete |
| Compensation read API | Done | Package + annualized total |
| Component CRUD API | Done | Direct amount edit, create, delete |
| Runtime component definitions | Done | `salary_component_definitions` |
| Analytics API | Not started | FR-7–FR-11 in `docs/requirements.md` |
| Domain unit layer | Not started | Pure functions for annualization, stats, FX |
| Web employee directory UI | Done | `web/src/pages/DirectoryPage.tsx`, filters/pagination in URL query string |
| Web employee detail + edit UI | Done | `web/src/pages/EmployeePage.tsx`, amount edit dialog + add component form |
| Web pay dashboard UI | Done | `web/src/pages/DashboardPage.tsx`, breakdown/distribution/band-placement panels |

When implementation and this table disagree, update this table in the same change set.

## Objective

Build a web application that replaces ACME's salary spreadsheets for 10,000 employees across multiple countries.

The system must let a trusted HR manager:

- Browse and filter employees.
- View one employee's current compensation package.
- Edit compensation component amounts directly.
- Add runtime-defined salary component types.
- Seed a deterministic 10,000-employee SQLite dataset.
- Support the later analytics work described in the requirements.

## Runtime And Repository Shape

- Runtime: Bun.
- Database: SQLite through `bun:sqlite`.
- API package: `api`.
- Frontend package: `web`.
- Root workspace scripts orchestrate both packages.

Important commands:

```bash
bun install
bun run seed
bun run test
bun run lint
bun run build
```

The API database defaults to `api/data/dev.sqlite`. `DATABASE_PATH` can override this path.

## Scope Boundary

### In MVP

- Static salary domain: employees, jobs, locations, org units, compensation packages, salary components, pay ranges, FX rates.
- Employee directory with pagination, search, and filters.
- Current compensation package retrieval.
- Direct employee CRUD.
- Direct salary component CRUD.
- Runtime salary component definitions.
- Deterministic seed data using Faker.

### Deferred

- Compensation events.
- Approval workflow.
- Audit log.
- Effective-dated compensation history.
- Market-rate feed.
- Budgeting and forecasting.
- RBAC and sensitive-field authorization.
- CSV import/export.

The API currently performs direct updates. That is intentional for the MVP and matches the current scope document.

## Current Data Model

The authoritative ERD is `docs/erd.md`. The implemented SQLite schema uses these tables:

- `employees`
- `jobs`
- `locations`
- `org_units`
- `compensation_packages`
- `salary_component_definitions`
- `salary_components`
- `pay_ranges`
- `fx_rates`

### Employee-Centric Access

Employee reads are the main access pattern. The `employees` table therefore stores direct foreign keys to its lookup and package context:

- `employees.job_id -> jobs.id`
- `employees.location_id -> locations.id`
- `employees.org_unit_id -> org_units.id`
- `employees.compensation_package_id -> compensation_packages.id`

This keeps employee directory/detail queries straightforward while still normalizing shared dimensions.

### Compensation Package

Every employee has exactly one current compensation package. The package is a container for many salary components:

- `compensation_packages.id`
- `compensation_packages.native_currency`
- `salary_components.package_id -> compensation_packages.id`

Salary component amounts are integer minor units. Floating-point money values should not be stored.

### Runtime Component Types

Salary component types are data, not schema.

`salary_component_definitions` stores allowed component type codes such as:

- `base`
- `allowance`
- `bonus`
- future runtime values such as `commission`

`salary_components.type` references `salary_component_definitions.code`.

This lets HR add a new salary component category without a migration.

### Lookup Tables

`jobs`, `locations`, and `org_units` are normalized because they are shared dimensions for filtering, grouping, and future analytics.

`locations` also carries the local payroll currency:

- `locations.name`
- `locations.country`
- `locations.currency`

Employee API responses still expose `job`, `location`, `country`, `currency`, and `orgUnit` names by joining these lookup tables.

### Pay Ranges And FX Rates

`pay_ranges` currently stores `job`, `location`, and `level` as business dimension values. This is a pragmatic MVP shape for salary-band analytics without introducing a full pay-band management workflow.

`fx_rates` stores static conversion rates to USD. Analytics should use these rates for cross-country aggregates without mutating native stored compensation.

## API Surface

### Health

```text
GET /health
```

Returns API liveness metadata.

### Employees

```text
GET    /employees
POST   /employees
GET    /employees/:employeeId
PATCH  /employees/:employeeId
DELETE /employees/:employeeId
```

`GET /employees` supports:

- `page`
- `pageSize`
- `job`
- `location`
- `org_unit`
- `level`
- `search`

Pagination defaults to 50 rows and clamps at 100 rows.

Employee create/update accepts name fields plus `job`, `location`, `country`, `currency`, `orgUnit`, and `level`. The API resolves or creates lookup table rows for job, location, and org unit.

### Compensation

```text
GET  /employees/:employeeId/compensation
POST /employees/:employeeId/components
```

Compensation response includes:

- employee id
- current package
- package components
- annualized total in native currency

Annualization rules:

- `annual`: amount as-is
- `monthly`: amount multiplied by 12
- `one_time`: amount as-is

### Components

```text
PATCH  /components/:componentId
DELETE /components/:componentId
```

`PATCH /components/:componentId` updates `amount` directly. The amount must be a non-negative integer.

No audit row is written in the current MVP.

### Component Definitions

```text
GET  /component-definitions
POST /component-definitions
```

Component definition codes are normalized to lowercase snake-style identifiers and must start with a letter.

Example:

```json
{
  "code": "commission",
  "name": "Commission",
  "description": "Sales commission payout"
}
```

After creation, `commission` can be used as a `salary_components.type`.

## Analytics API (planned)

Analytics endpoints are required by `docs/scope.md` and `docs/requirements.md` (FR-7–FR-11) but are not implemented yet. Add them in `api/src/` with pure domain helpers that unit tests can run without a database.

Suggested surface:

```text
GET /analytics/summary
GET /analytics/breakdown?dimension=job|level|location|org_unit
GET /analytics/distribution?job=&location=
GET /analytics/band-placement?job=
```

### Summary (`GET /analytics/summary`)

Returns for the active employee population:

- `headcount`
- `totalAnnualizedCompUsd`
- `meanAnnualizedCompUsd`
- `medianAnnualizedCompUsd`

Use base salary components only for band placement elsewhere; summary totals use full annualized package comp converted to USD via `fx_rates`.

### Breakdown (`GET /analytics/breakdown`)

Query param `dimension` is one of `job`, `level`, `location`, `org_unit`.

Per group return:

- `key` (dimension value)
- `count`
- `totalAnnualizedCompUsd`
- `meanAnnualizedCompUsd`
- `medianAnnualizedCompUsd`

Omit groups with zero employees.

### Distribution (`GET /analytics/distribution`)

Requires `job` and `location`. Returns `min`, `p25`, `median`, `p75`, `max` of annualized total comp in USD for matching employees. Percentiles use linear interpolation between closest ranks.

### Band placement (`GET /analytics/band-placement`)

Requires `job`. Classify each active employee's **base** component against `pay_ranges` for their job, location, and level:

- `below`, `within`, `above` (boundaries inclusive)
- `no_band` for employees whose job/location/level has no pay range row

Return counts and percentages per bucket.

### Currency rules

- Store and return native amounts unchanged.
- Convert to USD only inside analytics using `fx_rates.rate_to_usd`.
- Missing FX rate for a currency must error, not default to 1.

## Frontend (planned)

The `web` package is a Vite + React app. Target screens:

1. **Directory** — paginated employee list with job, location, org unit, level filters and name search. Default page size 50.
2. **Employee detail** — compensation package breakdown, inline component amount edit, add component, runtime type picker fed by `/component-definitions`.
3. **Pay dashboard** — summary cards plus breakdown, distribution, and band-placement views backed by the analytics API.

Configure the dev proxy so browser calls reach the API at `http://localhost:8787` (or `PORT`).

## Seed Data

The seed script must populate exactly 10,000 employees by default:

```bash
bun run seed
```

Seed properties:

- Uses `@faker-js/faker`.
- Uses fixed seed `20260701`.
- Resets existing API data before inserting.
- Inserts lookup rows for jobs, locations, and org units once.
- Creates one compensation package per employee.
- Creates at least one `base` component per package.
- Adds deterministic allowance and bonus components for subsets of employees.
- Seeds static FX rates.
- Seeds pay ranges by job, location, and level.

## Testing Expectations

Test design is specified in `docs/tests/api-test-spec.md`. Testing agent process: `docs/testing-agent.md`.

Current test layers:

- API tests use in-memory SQLite via `openDatabase(":memory:")` and `bun test` in `api/`.
- Web tests use Vitest and Testing Library in `web/`.
- Type checking: `tsc --noEmit` in `api/`, ESLint + `tsc -b` in `web/`.
- Root `bun run lint` and `bun run test` run both workspaces.

Planned additions:

- `api/src/domain/` pure functions with `bun test` and no DB dependency (NFR-2).
- Schema/index assertion tests for NFR-1.
- API tests for analytics routes once implemented.
- Component tests for directory, detail, and dashboard once UI exists.

Required verification before calling the MVP done:

```bash
bun run test
bun run lint
bun run build
```

API tests should cover:

- Health route.
- Employee pagination.
- Employee filtering by lookup dimensions.
- Employee create/update/delete.
- Compensation package retrieval.
- Component amount update.
- Component create/delete.
- Runtime component definition creation and use.
- Analytics summary, breakdown, distribution, and band placement (once implemented).

Domain unit tests should cover:

- Annualization and package totals.
- Mean, median, percentiles.
- Band classification and `no_band` handling.
- FX conversion, identity, and missing-rate errors.

## Implementation Notes

- Keep unit/domain logic in `api/src/domain/` testable without binding a server port or opening SQLite.
- Keep HTTP wiring in `api/src/server.ts` thin; call domain helpers from route handlers.
- Keep SQLite FK constraints enabled with `PRAGMA foreign_keys = ON`.
- Do not add an audit table unless scope changes in `docs/scope.md`.
- Do not add compensation events or approval states until the operational layer is explicitly brought into scope.
- Prefer explicit schema constraints for currencies, frequencies, non-negative amounts, and FK relationships.
- Preserve native component/package currency in storage; conversion belongs to analytics only.
- Use integer minor units everywhere money is stored or transmitted.

## Future Extension Points

The current model leaves room for:

- Audit/effective-dated history.
- Compensation events.
- Approval workflows.
- RBAC.
- CSV import/export.
- Market-rate feeds.
- Budgeting and forecasting.

These are not current implementation requirements.
