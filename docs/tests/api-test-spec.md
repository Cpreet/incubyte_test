# API Test Specification

HTTP integration, schema, and seed tests for the `api` package. Each case maps to `docs/requirements.md` and is implemented in `api/src/**/*.test.ts` using `bun:test`.

**Harness:** `handleRequest(request, db)` with `openDatabase(":memory:")` unless noted.

**Last reviewed:** against `api/src/server.test.ts` (8 tests) — most FR-1–FR-6 cases remain `pending`.

---

## Summary coverage

| Requirement | Total cases | Implemented | Pending | Blocked |
|---|---|---|---|---|
| FR-1 | 6 | 1 | 5 | 0 |
| FR-2 | 8 | 1 | 7 | 0 |
| FR-3 | 4 | 1 | 3 | 0 |
| FR-4 | 5 | 2 | 3 | 0 |
| FR-5 | 4 | 2 | 2 | 0 |
| FR-6 | 5 | 1 | 4 | 0 |
| FR-7 | 4 | 0 | 0 | 4 |
| FR-8 | 4 | 0 | 0 | 4 |
| FR-9 | 3 | 0 | 0 | 3 |
| FR-10 | 3 | 0 | 0 | 3 |
| FR-11 | 2 | 0 | 0 | 2 |
| FR-12 | 5 | 0 | 5 | 0 |
| FR-13 | 4 | 0 | 4 | 0 |
| NFR-1 | 2 | 0 | 2 | 0 |
| Health | 1 | 1 | 0 | 0 |

---

## Shared fixtures

### `goldenPackageEmployee`

Hand-insert one employee with known components (FR-3 golden total). Use after `initializeSchema` / empty DB:

| Field | Value |
|---|---|
| Employee | `E-GOLD`, Berlin, Software Engineer, Engineering, L3, EUR |
| Components | `base` 12_000_000 annual; `allowance` 100_000 monthly; `bonus` 1_200_000 one_time |
| Expected `annualizedTotal` | `14_400_000` (120000 + 12000 + 12000 EUR major units × 100) |

### `minimalSeed`

`seedDatabase(db, { count: N })` — deterministic via Faker seed `20260701`. Employee IDs `E00001`…`E{N}`.

### Request helpers

```ts
function testDatabase() {
  return openDatabase(":memory:");
}

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}
```

---

## Health

| Case ID | Status | Requirement | Description |
|---|---|---|---|
| API-HEALTH-001 | implemented | — | `GET /health` → 200 `{ ok: true, service: "api" }` |

### API-HEALTH-001

- **Request:** `GET /health`
- **Assert:** status 200; body equals `{ ok: true, service: "api" }`
- **File:** `api/src/server.test.ts`

---

## Employees — list (`GET /employees`)

| Case ID | Status | Requirement | Description |
|---|---|---|---|
| API-EMP-LIST-001 | implemented | FR-1 | Pagination metadata with `total`, `page`, `pageSize`, `data` length |
| API-EMP-LIST-002 | pending | FR-1 | Default `pageSize` is 50 when omitted |
| API-EMP-LIST-003 | pending | FR-1 | `pageSize=150` clamps to 100 rows |
| API-EMP-LIST-004 | pending | FR-1 | Page 1 and page 2 employee IDs are disjoint |
| API-EMP-LIST-005 | pending | FR-1 | Results ordered by `employeeId` ascending |
| API-EMP-LIST-006 | pending | FR-1 | Full seed `count: 10000` → `total === 10000` |

### API-EMP-LIST-001 (implemented)

- **Setup:** `seedDatabase(db, { count: 25 })`
- **Request:** `GET /employees?pageSize=10`
- **Assert:** 200; `total === 25`; `pageSize === 10`; `data.length === 10`

### API-EMP-LIST-002

- **Setup:** `seedDatabase(db, { count: 60 })`
- **Request:** `GET /employees` (no pageSize)
- **Assert:** 200; `pageSize === 50`; `data.length === 50`

### API-EMP-LIST-003

- **Setup:** `seedDatabase(db, { count: 200 })`
- **Request:** `GET /employees?pageSize=150`
- **Assert:** 200; `pageSize === 100`; `data.length === 100`

### API-EMP-LIST-004

- **Setup:** `seedDatabase(db, { count: 30 })`
- **Request:** page 1 `page=1&pageSize=10`, then page 2 `page=2&pageSize=10`
- **Assert:** intersection of `employeeId` sets is empty

### API-EMP-LIST-005

- **Setup:** `seedDatabase(db, { count: 15 })`
- **Request:** `GET /employees?pageSize=15`
- **Assert:** `data` is strictly sorted by `employeeId` ascending

### API-EMP-LIST-006

- **Setup:** `seedDatabase(db, { count: 10000 })`
- **Request:** `GET /employees?pageSize=1`
- **Assert:** `total === 10000`
- **Note:** May be tagged `slow`; acceptable in CI only

---

## Employees — search and filter

| Case ID | Status | Requirement | Description |
|---|---|---|---|
| API-EMP-FILTER-001 | implemented | FR-2 | `location` + `level` AND filter |
| API-EMP-FILTER-002 | pending | FR-2 | `job` filter returns only matching job |
| API-EMP-FILTER-003 | pending | FR-2 | `org_unit` filter |
| API-EMP-FILTER-004 | pending | FR-2 | `search` case-insensitive substring on name |
| API-EMP-FILTER-005 | pending | FR-2 | `search=smi` matches seeded `Smithson` (index % 997 === 0) |
| API-EMP-FILTER-006 | pending | FR-2 | Combined `location=Berlin&level=L3` intersection |
| API-EMP-FILTER-007 | pending | FR-2 | Unknown `location=Atlantis` → 200, `data.length === 0` |
| API-EMP-FILTER-008 | pending | FR-2 | `job` + `location` + `org_unit` + `level` + `search` combined |

### API-EMP-FILTER-001 (implemented)

- **Setup:** `seedDatabase(db, { count: 50 })`
- **Request:** `GET /employees?location=Berlin&level=L1`
- **Assert:** every row has `location === "Berlin"` and `level === "L1"`

### API-EMP-FILTER-002

- **Setup:** `seedDatabase(db, { count: 100 })`
- **Request:** `GET /employees?job=Software Engineer&pageSize=100`
- **Assert:** all rows `job === "Software Engineer"`; count > 0

### API-EMP-FILTER-003

- **Setup:** `seedDatabase(db, { count: 100 })`
- **Request:** `GET /employees?org_unit=Engineering&pageSize=100`
- **Assert:** all rows `orgUnit === "Engineering"`

### API-EMP-FILTER-004

- **Setup:** create employee `firstName: "John", lastName: "Smith"`
- **Request:** `GET /employees?search=SMITH`
- **Assert:** created employee appears in results

### API-EMP-FILTER-005

- **Setup:** `seedDatabase(db, { count: 1000 })` (includes `Smithson` at index 997)
- **Request:** `GET /employees?search=smi&pageSize=100`
- **Assert:** at least one `name` contains `Smith` or `Smithson`

### API-EMP-FILTER-006

- **Setup:** `seedDatabase(db, { count: 100 })`
- **Request:** `GET /employees?location=Berlin&level=L3`
- **Assert:** all rows match both dimensions

### API-EMP-FILTER-007

- **Setup:** `seedDatabase(db, { count: 10 })`
- **Request:** `GET /employees?location=Atlantis`
- **Assert:** 200; `total === 0`; `data` empty array

---

## Employees — CRUD

| Case ID | Status | Requirement | Description |
|---|---|---|---|
| API-EMP-CRUD-001 | implemented | FR-1 | POST create → 201 with `employeeId` |
| API-EMP-CRUD-002 | implemented | FR-1 | PATCH update fields |
| API-EMP-CRUD-003 | implemented | FR-1 | DELETE → 200 `{ deleted: true }` |
| API-EMP-CRUD-004 | pending | FR-1 | GET single employee by `employeeId` |
| API-EMP-CRUD-005 | pending | FR-1 | GET unknown employee → 404 |
| API-EMP-CRUD-006 | pending | FR-1 | POST missing required field → 400 |
| API-EMP-CRUD-007 | pending | FR-1 | POST creates default `base` component when `components` omitted |
| API-EMP-CRUD-008 | pending | FR-1 | PATCH unknown employee → 404 |

### API-EMP-CRUD-001–003 (implemented)

- Covered by single test: create Ada Lovelace, patch level L5, delete.
- **Assert create:** 201; `employeeId === "E00001"` on empty DB

### API-EMP-CRUD-004

- **Setup:** `seedDatabase(db, { count: 1 })`
- **Request:** `GET /employees/E00001`
- **Assert:** 200; body includes `employeeId`, `job`, `location`, `orgUnit`, `level`

### API-EMP-CRUD-005

- **Request:** `GET /employees/E99999`
- **Assert:** 404; `{ error: "Employee not found" }`

### API-EMP-CRUD-006

- **Request:** `POST /employees` with `{}`
- **Assert:** 400

### API-EMP-CRUD-007

- **Request:** `POST /employees` with valid identity fields, no `components`
- **Request:** `GET /employees/:id/compensation`
- **Assert:** at least one component with `type === "base"`

---

## Compensation — read (`GET /employees/:id/compensation`)

| Case ID | Status | Requirement | Description |
|---|---|---|---|
| API-COMP-READ-001 | implemented | FR-3 | Returns `components` array with length > 0 |
| API-COMP-READ-002 | pending | FR-3 | Each component has `id`, `type`, `amount`, `currency`, `frequency` |
| API-COMP-READ-003 | pending | FR-3 | Golden fixture `annualizedTotal === 14_400_000` EUR |
| API-COMP-READ-004 | pending | FR-3 | Unknown employee → 404 |

### API-COMP-READ-003 (golden)

- **Setup:** insert `goldenPackageEmployee` fixture
- **Request:** `GET /employees/E-GOLD/compensation`
- **Assert:**
  - `annualizedTotal === 14_400_000`
  - three components with expected types and frequencies
  - math: `12_000_000 + (100_000 * 12) + 1_200_000`

---

## Components — update (`PATCH /components/:id`)

| Case ID | Status | Requirement | Description |
|---|---|---|---|
| API-COMP-PATCH-001 | implemented | FR-4 | Valid amount persists |
| API-COMP-PATCH-002 | implemented | FR-4 | Missing `amount` → 400 |
| API-COMP-PATCH-003 | pending | FR-4 | Negative amount → 400; DB unchanged |
| API-COMP-PATCH-004 | pending | FR-4 | Non-integer amount → 400 |
| API-COMP-PATCH-005 | pending | FR-4 | Unknown component id → 404 |

### API-COMP-PATCH-003

- **Setup:** seed 1 employee; read component id and original amount
- **Request:** `PATCH` with `{ amount: -1 }`
- **Assert:** 400; re-fetch compensation shows original amount

### API-COMP-PATCH-004

- **Request:** `PATCH` with `{ amount: 99.5 }`
- **Assert:** 400

---

## Components — create / delete

| Case ID | Status | Requirement | Description |
|---|---|---|---|
| API-COMP-WRITE-001 | implemented | FR-5 | POST component → 201 |
| API-COMP-WRITE-002 | implemented | FR-5 | DELETE component → 200 |
| API-COMP-WRITE-003 | pending | FR-5 | After delete, absent from compensation GET |
| API-COMP-WRITE-004 | pending | FR-5 | POST with unknown `type` → 400 or 404 |

### API-COMP-WRITE-003

- **Flow:** create bonus → GET compensation (contains id) → DELETE → GET compensation (id absent)

### API-COMP-WRITE-004

- **Request:** `POST /employees/E00001/components` with `type: "nonexistent_type"`
- **Assert:** error response; no row inserted

---

## Component definitions

| Case ID | Status | Requirement | Description |
|---|---|---|---|
| API-DEF-001 | implemented | FR-6 | POST `commission` → 201; usable on package |
| API-DEF-002 | pending | FR-6 | GET lists seeded `base`, `allowance`, `bonus` |
| API-DEF-003 | pending | FR-6 | POST duplicate `commission` → error |
| API-DEF-004 | pending | FR-6 | Code `Commission Payout` normalizes to `commission_payout` |
| API-DEF-005 | pending | FR-6 | Invalid code `123bad` → 400 |

### API-DEF-002

- **Setup:** fresh DB (defaults insert base types)
- **Request:** `GET /component-definitions`
- **Assert:** `data` includes codes `base`, `allowance`, `bonus`

### API-DEF-004

- **Request:** `POST` `{ code: "Commission Payout", name: "CP" }`
- **Assert:** 201; returned `code === "commission_payout"`

---

## Analytics (blocked — routes not implemented)

Implement in `api/src/server.test.ts` (or `analytics.test.ts`) when `GET /analytics/*` exists. Domain math may be covered separately in `api/src/domain/*.test.ts`.

| Case ID | Status | Requirement | Endpoint | Key assertion |
|---|---|---|---|---|
| API-ANALYTICS-001 | blocked | FR-7 | `GET /analytics/summary` | `headcount` matches active employees |
| API-ANALYTICS-002 | blocked | FR-7 | `GET /analytics/summary` | mean/median on known small seed |
| API-ANALYTICS-003 | blocked | FR-8 | `GET /analytics/breakdown?dimension=location` | groups with correct counts |
| API-ANALYTICS-004 | blocked | FR-8 | `GET /analytics/breakdown` | empty groups omitted |
| API-ANALYTICS-005 | blocked | FR-9 | `GET /analytics/distribution?job=&location=` | min/p25/median/p75/max |
| API-ANALYTICS-006 | blocked | FR-10 | `GET /analytics/band-placement?job=` | below/within/above counts |
| API-ANALYTICS-007 | blocked | FR-10 | `GET /analytics/band-placement?job=` | `no_band` bucket |
| API-ANALYTICS-008 | blocked | FR-11 | any analytics GET | native component amounts unchanged in DB after call |

### API-ANALYTICS-002 (fixture sketch)

- **Setup:** 4 employees with known annualized USD totals after FX
- **Assert:** `meanAnnualizedCompUsd` and `medianAnnualizedCompUsd` match hand-calculated values from requirements (`[100,200,300,400]` → mean 250, median 250)

---

## Seed (`seedDatabase` / `bun run seed`)

| Case ID | Status | Requirement | File | Description |
|---|---|---|---|---|
| API-SEED-001 | pending | FR-12 | `seed.test.ts` | `count: 10000` → employees table count 10000 |
| API-SEED-002 | pending | FR-12 | `seed.test.ts` | Two runs produce identical employee_id + amount hash |
| API-SEED-003 | pending | FR-12 | `seed.test.ts` | Every package has ≥1 `base` component |
| API-SEED-004 | pending | FR-12 | `seed.test.ts` | `distinct jobs > 1` and `distinct locations > 1` |
| API-SEED-005 | pending | FR-12 | `seed.test.ts` | FX rates and pay_ranges rows populated |

### API-SEED-002 (determinism hash)

```ts
function employeeCompHash(db: AppDatabase) {
  return db.query(`
    SELECT employee_id, GROUP_CONCAT(type || ':' || amount, ',') AS comps
    FROM employees e
    JOIN salary_components sc ON sc.package_id = e.compensation_package_id
    GROUP BY e.id
    ORDER BY e.employee_id
  `).all();
}
```

- Run `seedDatabase(db1)` and `seedDatabase(db2)` on separate in-memory DBs
- **Assert:** deep equality of hash query results

---

## Schema (`db.test.ts`)

| Case ID | Status | Requirement | Description |
|---|---|---|---|
| API-SCHEMA-001 | pending | FR-13 | Insert component with invalid `package_id` → FK error |
| API-SCHEMA-002 | pending | FR-13 | Insert component with unknown `type` → FK error |
| API-SCHEMA-003 | pending | FR-13 | Invalid `currency` on component → CHECK constraint fails |
| API-SCHEMA-004 | pending | FR-13 | Invalid `frequency` → CHECK constraint fails |

### API-SCHEMA-001

```ts
expect(() => {
  db.query(`INSERT INTO salary_components (...) VALUES (99999, 'base', ...)`).run();
}).toThrow();
```

---

## Indexes and performance (NFR-1)

| Case ID | Status | Requirement | Description |
|---|---|---|---|
| API-PERF-001 | pending | NFR-1 | Schema lists required indexes on `employees` and `salary_components` |
| API-PERF-002 | pending | NFR-1 | Smoke: filtered list + analytics summary on 10k seed < 2s wall clock |

### API-PERF-001 — expected indexes

Query `sqlite_master` / `PRAGMA index_list('employees')` and assert presence of:

- `idx_employees_employee_id`
- `idx_employees_job_id`
- `idx_employees_location_id`
- `idx_employees_org_unit_id`
- `idx_employees_level`
- `idx_employees_compensation_package_id`
- `idx_components_package_id`

---

## Suggested file split

| File | Cases |
|---|---|
| `api/src/server.test.ts` | Health, employees, compensation, components, definitions (HTTP) |
| `api/src/seed.test.ts` | API-SEED-* |
| `api/src/db.test.ts` | API-SCHEMA-*, API-PERF-001 |
| `api/src/analytics.test.ts` | API-ANALYTICS-* (when unblocked) |

---

## Error response contract

Unless specified otherwise:

| Situation | Status | Body shape |
|---|---|---|
| Validation error | 400 | `{ error: string }` |
| Missing resource | 404 | `{ error: string }` |
| Success create | 201 | resource JSON |
| Success read/update | 200 | resource JSON |
| Success delete | 200 | `{ deleted: true }` |
| Unknown route | 404 | `{ error: "Not found" }` |

Tests should assert status and critical body fields; exact error message strings may match `server.ts` unless requirements define them.

---

## Implementation order (recommended)

1. **FR-1 / FR-2 gaps** — pagination, filters, search (`API-EMP-LIST-002`–`006`, `API-EMP-FILTER-002`–`008`)
2. **FR-3 golden** — `API-COMP-READ-002`–`003`
3. **FR-4 / FR-5 edge cases** — negative amount, 404s
4. **FR-6** — GET definitions, duplicates, normalization
5. **FR-12 / FR-13 / NFR-1** — `seed.test.ts`, `db.test.ts`
6. **FR-7–FR-11** — unblock when analytics routes land

After each batch: run `cd api && bun test` and update the **Status** column in this file.
