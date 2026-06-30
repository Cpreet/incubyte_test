# Salary Management — MVP Requirements

**One line:** Replace ACME's salary spreadsheets with a web app where one HR manager can read and edit compensation for 10,000 employees across countries, and answer aggregate questions about how the org pays.

This version is written to be testable. Every functional requirement carries an ID, explicit acceptance criteria phrased as assertions, and a mapped test type. The traceability matrix at the end is the contract: if a row has no test, the requirement is not done.

## Goal

Two jobs, in priority order:

1. **Manage the data.** Browse, search, and edit salary records that today live in scattered Excel files. The spreadsheet is the thing we're killing.
2. **Answer questions about pay.** "What do we pay engineers in Berlin?" "Who's below band?" "What's our total comp cost by org unit?" The HR manager gets these from a screen, not a pivot table.

Everything else in the domain research is real but not load-bearing for these two. This is the research's own conclusion — initial core domain plus a slice of analytics — made concrete.

## Conventions

- **Test types:** `unit` (pure domain logic, no DB or network), `api` (HTTP endpoint against a seeded test DB), `schema` (migration/index assertions on the DB).
- **Money:** all amounts are integer minor units (cents) in their currency to avoid float drift. "Annualized" means a component normalized to a yearly figure by its frequency.
- **Base currency:** USD, for analytics only. Native currency is never converted in storage.
- **Golden fixtures:** acceptance criteria that need numbers cite a small fixed dataset so the expected value is exact and the test is deterministic.

---

## Functional Requirements — Data Management

### FR-1 — Employee directory listing
The system returns a paginated list of employees.
- Default page size 50, maximum 100; requesting more clamps to 100.
- Response includes total count and the current page slice.
- Ordering is stable (by `employee_id` ascending) so pages never overlap or repeat.

**Acceptance:** on the full 10k seed, total count is exactly 10000; page 1 and page 2 share zero IDs; page size > 100 returns 100 rows.
**Tests:** `api`

### FR-2 — Search and filter
The system filters employees by `job`, `location`, `org_unit`, and `level`, and searches by name.
- Filters combine with AND.
- Name search is a case-insensitive substring match.
- An unknown filter value returns an empty page, not an error.

**Acceptance:** `location=Berlin` returns only Berlin employees; `location=Berlin & level=L3` returns the intersection; search `smi` matches `Smith` and `Smithson`; `location=Atlantis` returns 0 rows with HTTP 200.
**Tests:** `api`

### FR-3 — View compensation package
The system returns one employee's package as a list of typed salary components.
- Each component has `type` (base | allowance | bonus), `amount` (minor units), `currency`, and `frequency` (annual | monthly | one_time).
- Package total is the sum of annualized components in the package's native currency.

**Acceptance:** for a fixture package `[base 120000/yr, allowance 1000/mo, bonus 12000/one_time]` in EUR, annualized total is `120000 + 12000 + 12000 = 144000` EUR.
**Tests:** `unit` (annualization + sum), `api` (component shape)

### FR-4 — Edit a component (salary revision)
The system updates a single component's amount and records the change.
- Update writes the new amount to the component.
- An audit row is created with `actor`, `timestamp`, `component_id`, `old_amount`, `new_amount`, and `reason`.
- `reason` is required; an update with an empty or missing reason is rejected with HTTP 400 and writes nothing.

**Acceptance:** a valid update increments the audit row count by exactly 1 and persists the new amount; a reasonless update returns 400 and leaves both the amount and audit count unchanged.
**Tests:** `api` (happy path, 400 path), `unit` (audit record construction)

### FR-5 — Audit trail retrieval
The system returns the change history for an employee.
- Entries are ordered newest-first.
- Each entry exposes the same fields written in FR-4.

**Acceptance:** after two sequential edits, the trail returns 2 entries with the most recent first and correct old/new pairs.
**Tests:** `api`

---

## Functional Requirements — Analytics

All analytics figures are computed in base currency (USD) per FR-10.

### FR-6 — Org dashboard totals
The system returns headcount, total annualized comp cost, mean, and median for the active population.
- Headcount counts active employees only.
- Median uses the standard convention: middle value for odd counts, mean of the two middle values for even counts.

**Acceptance:** for annualized totals `[100, 200, 300, 400]` (base units), mean is `250` and median is `250`; for `[100, 200, 300]`, median is `200`.
**Tests:** `unit` (mean, median odd/even), `api` (totals on seeded DB)

### FR-7 — Breakdowns by dimension
The system groups the population by `job`, `level`, `location`, or `org_unit` and returns per-group count, mean, median, and total.
- A group with no employees is omitted, not returned as a zero row.

**Acceptance:** on a fixture with 3 Berlin and 2 London employees, grouping by location returns two groups with counts 3 and 2 and per-group means matching the fixture.
**Tests:** `unit` (grouping + per-group aggregation), `api`

### FR-8 — Distribution for a job + location
The system returns the spread for a selected `job` + `location` as min, p25, median, p75, and max.
- Percentiles use linear interpolation between closest ranks.

**Acceptance:** for sorted values `[100, 200, 300, 400, 500]`, min 100, median 300, max 500, p25 200, p75 400.
**Tests:** `unit` (percentile math), `api`

### FR-9 — Pay-range (band) placement
For a job that carries a pay range, the system classifies each employee as below, within, or above the range and returns counts and percentages.
- Boundaries are inclusive: an amount equal to `min` or `max` is `within`.
- Jobs without a defined band are excluded from the result and flagged as `no_band`.

**Acceptance:** band `[min 100, max 200]` with employees `[90, 100, 150, 200, 210]` yields below 1, within 3, above 1; a job with no band appears under `no_band` and not in the counts.
**Tests:** `unit` (boundary classification, no-band handling), `api`

### FR-10 — Currency normalization
The system converts native amounts to base currency for analytics using a static FX table.
- Same-currency conversion is the identity.
- Conversion never mutates the stored native amount.
- A missing FX rate fails loudly (error), it does not silently treat the rate as 1.

**Acceptance:** `1000 EUR` at rate `1.10` converts to `1100 USD`; `1000 USD` converts to `1000 USD`; after any analytics call the stored component amount and currency are byte-for-byte unchanged; an amount in a currency absent from the FX table raises rather than returning a wrong number.
**Tests:** `unit` (conversion, identity, missing-rate raise), `api` (storage unchanged after aggregation)

---

## Functional Requirements — Data and Seeding

### FR-11 — Seed dataset
A seed script populates exactly 10,000 employees.
- Generation is deterministic from a fixed seed value: two runs produce identical data.
- Every employee has a job, a location, an org unit, a level, and a package with at least one `base` component.
- The population spans multiple countries, jobs, and levels (not a single value collapsed).

**Acceptance:** post-seed count is exactly 10000; re-running the seed yields an identical row hash; zero employees have an empty package; distinct location count > 1 and distinct job count > 1.
**Tests:** `api`/`schema` (count, completeness), `unit` (determinism of the generator given a fixed seed)

### FR-12 — Schema integrity
The schema enforces the core relationships.
- A component cannot exist without a package; a package cannot exist without an employee (FK constraints).
- `currency` and component `type` are constrained to their allowed sets.

**Acceptance:** inserting a component with a non-existent package id is rejected by the DB; inserting an unknown component `type` is rejected.
**Tests:** `schema`

---

## Non-Functional Requirements

### NFR-1 — Query performance at 10k
Filtered list and dashboard queries do not full-scan.
- Indexes exist on every column used for filtering or grouping: `location`, `job`, `org_unit`, `level`, and the package foreign key.

**Acceptance:** a schema test asserts the named indexes are present; a smoke benchmark runs the filtered list and the dashboard query under a generous wall-clock ceiling on the 10k seed.
**Tests:** `schema` (index presence), `api` (benchmark smoke, generous threshold so it is not flaky)

### NFR-2 — Unit layer isolation
Domain logic is testable without infrastructure.
- Annualization, mean/median, percentiles, band classification, and currency conversion run as pure functions with no DB or network in the unit test layer.

**Acceptance:** the unit suite executes with no DB connection configured and still passes.
**Tests:** `unit` (suite runs against an unconfigured DB env)

### NFR-3 — Determinism
The full test suite is deterministic.
- No test depends on wall-clock time, random seeds outside FR-11's fixed value, or external network.

**Acceptance:** the suite produces identical pass/fail across three consecutive runs with no code change.
**Tests:** CI convention, enforced by NFR-2 and FR-11 design.

---

## Out of scope (and why)

- **Approval workflows / compensation events as reviewed actions.** The research's operational and governance layers. They add state machines and multiple actors, and neither is needed to kill the spreadsheet or answer pay questions. MVP edits are direct, with the FR-4 audit row standing in for the approval trail.
- **Compliance / rules engine** (component-valid-for-location, max-increase caps, exception routing). Governance layer. Pure validation bolted onto a model nobody has used yet — defer until the model is proven against real read traffic.
- **Budgeting and cost forecasting.** Needs finance inputs and a planning cycle. Different persona, different data source.
- **Market-rate benchmarking.** Requires an external data feed. FR-9 band placement delivers most of the value without the integration, so the feed waits.
- **RBAC and fine-grained access control.** One persona, one trusted user, assumed authenticated upstream. Multi-role access is the first thing to add after MVP, not part of it.
- **Effective-dated history / time-travel.** Records are current-state. The FR-5 audit log captures what changed and when; full bitemporal versioning is a heavier model the two core jobs don't require.
- **Payroll export / integration.** This is HR's system of record. A payroll engine is a separate build.

## Core data model

Employee → Job, Location, Org Unit. Employee → one Compensation Package → many Salary Components. Job (+ Location) → optional Pay Range. That's the static spine from the research, minus Market Rate.

## Key decisions and tradeoffs

- **Currency.** Native currency is the source of truth; a static FX table converts to base for analytics only (FR-10). Live FX is a data-freshness problem, not an MVP problem. The missing-rate-raises rule means a stale or absent rate never silently corrupts a number.
- **Revision as edit, not event.** Modeling every change as an immutable event is the right long-term shape and the wrong MVP shape: it forces the operational layer in before anyone has touched the read path. Direct edit plus an append-only audit log (FR-4, FR-5) buys traceability now and leaves the event model as a clean later migration.
- **Generic components over bespoke engines.** Base, allowance, and bonus are typed line items on one package (FR-3). A single shape covers the function list's variable pay, allowances, and CTC without standing up four subsystems.
- **Integer minor units.** Money as cents, not floats. Removes a whole class of rounding-drift test failures from the analytics layer before they start.
- **SQLite + relational.** 10k employees is small. The hard part is query clarity, not scale; a relational store with the NFR-1 indexes serves every breakdown the dashboard needs.

## Traceability Matrix

| ID | Requirement | Layer | Test type | Key assertion |
|----|-------------|-------|-----------|---------------|
| FR-1 | Directory listing | Data | api | count=10000; page 1∩page 2 empty; clamp to 100 |
| FR-2 | Search and filter | Data | api | AND-combined filters; case-insensitive substring; unknown→0 rows/200 |
| FR-3 | View package | Data | unit, api | annualized total 144000 EUR on fixture |
| FR-4 | Edit component | Data | unit, api | audit +1, amount persisted; reasonless→400, no write |
| FR-5 | Audit trail | Data | api | newest-first; correct old/new pairs |
| FR-6 | Dashboard totals | Analytics | unit, api | mean/median 250 on [100,200,300,400]; median 200 on [100,200,300] |
| FR-7 | Breakdowns | Analytics | unit, api | location groups counts 3 and 2; empty groups omitted |
| FR-8 | Distribution | Analytics | unit, api | p25=200, median=300, p75=400 on [100..500] |
| FR-9 | Band placement | Analytics | unit, api | [90,100,150,200,210] vs [100,200] → 1/3/1; no_band excluded |
| FR-10 | Currency normalization | Analytics | unit, api | 1000 EUR @1.10 → 1100 USD; native unchanged; missing rate raises |
| FR-11 | Seed dataset | Data | unit, api, schema | count=10000; identical hash on re-run; no empty package |
| FR-12 | Schema integrity | Data | schema | FK + enum constraints reject bad inserts |
| NFR-1 | Query performance | Cross | schema, api | indexes present; benchmark under ceiling |
| NFR-2 | Unit layer isolation | Cross | unit | suite passes with no DB configured |
| NFR-3 | Determinism | Cross | convention | identical results across 3 runs |

## Success criteria

The HR manager opens the app, finds any employee in a few keystrokes, changes a salary and sees it logged, and answers "how do we pay X" from the dashboard without exporting anything. Every one of those four maps to rows above. If the matrix is green, the spreadsheet is dead and the MVP is done.
