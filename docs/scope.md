# Salary Management — Scope

**Companion docs:** `docs/requirements.md` (what, and how it's verified) and `docs/spec.md` (how it's built). This document owns the boundary: what the MVP does, what it deliberately doesn't, and the assumptions it stands on. When someone asks "is X in scope?", the answer is here.

## Context

**Persona:** the HR manager at ACME, one trusted operator.
**Problem:** salary data for 10,000 employees across multiple countries lives in scattered Excel files. Editing is tedious and error-prone, and answering a question about company pay means building a pivot table by hand.
**Goal, in one line:** a web app that replaces the spreadsheets for reading and editing comp, and answers aggregate questions about how the org pays.

Two jobs, in priority order: **manage the data**, and **answer questions about pay**. Scope is drawn tightly around these two. Everything below is either in service of them or explicitly cut.

## The domain, and where the MVP sits in it

The domain research maps salary management into four layers. The MVP takes the first layer whole, a read-only slice of the fourth, and leaves the middle two for later.

| Layer | In MVP? | What we take |
|---|---|---|
| Core (static structure) | Yes | Employees, packages, components, jobs, locations, org units, pay ranges |
| Operational (comp events) | No | Direct edit stands in for the event model |
| Governance (rules, approval, budget) | Read-only slice | Band placement as a report. No audit log, rules engine, or approvals |
| Analytics | Subset | Company-wide, breakdown, distribution, band placement. No trends, no market comparison |

This is the research's own conclusion made concrete: initial core domain plus part of analytics.

## In scope

**Data management (the "manage" job)**
- Employee directory over 10k rows: paginated list, filter by job, location, org unit, and level, search by name.
- View an employee's compensation package broken into typed salary components.
- Edit a component amount directly.

**Analytics (the "answer" job)**
- Company-wide headcount, total annualized cost, mean, and median.
- Breakdowns of the same figures by job, level, location, and org unit.
- Distribution (min / p25 / median / p75 / max) for a chosen job and location.
- Pay-range placement: below, within, above, and no-band, for a chosen job.

**Cross-cutting**
- Multi-currency: native currency stored per package, converted to a single base currency (USD) for any cross-country aggregate.
- A deterministic seed of exactly 10,000 employees spread across countries, jobs, and levels.

## The question surface

The problem statement asks that the HR manager "answer questions about how the org pays people." Scope is defined by which questions the MVP can answer.

| Question class | In scope? | Answered by / why not |
|---|---|---|
| What do we pay for a role, location, or level? | Yes | Summary + breakdown |
| What does a country, org, or job family cost us? | Yes | Breakdown totals in USD |
| How consistent is pay within a role? | Yes | Distribution (p25–p75 spread) |
| Who is paid below or above band? | Yes | Band placement |
| How is headcount composed? | Yes | Breakdown counts |
| What is one person's package? | Yes | Directory + compensation package detail |
| What changed historically? | No | Audit and effective-dated history are deferred |
| Are we paying equally across gender or other protected classes? | No | Model carries no protected attributes, by design (data minimization) |
| How has pay moved over time? | No | Records are current-state; no effective-dated history |
| How do we compare to market? | No | No market-rate feed |
| Are we within budget? | No | No budget entity |

The four "no" rows are named on purpose. A reviewer should see the boundary was chosen, not missed.

## Out of scope (deferred features within the domain)

- **Approval workflows, audit logs, and compensation events as reviewed actions.** The operational and governance layers. They add state machines, history modeling, and multiple actors; none are needed to kill the spreadsheet or answer a pay question in this MVP.
- **Compliance and validation rules engine** (component-valid-for-location, max-increase caps, exception routing). Validation bolted onto a model nobody has exercised yet. Deferred until the model proves out under real read traffic.
- **Budgeting and cost forecasting.** Needs finance inputs and a planning cycle. Different persona, different data source.
- **Market-rate benchmarking.** Band placement delivers most of the value without an external feed, so the feed waits.
- **Role-based access control.** One persona, one trusted user. Multi-role access is the first thing added after MVP, not part of it.
- **Effective-dated history and time-travel.** Current-state records only. Full bitemporal versioning is a heavier model the two core jobs don't require.

## Non-goals (what the system is not trying to be)

These are category boundaries, not deferred features. They stay out even post-MVP unless the product's purpose changes.

- **Not a payroll engine.** It does not run payroll, compute tax, or disburse pay. It is HR's record of compensation structure.
- **Not a full HRIS.** No performance reviews, leave, headcount planning, or org design beyond the comp-relevant fields.
- **Not a multi-tenant SaaS.** One organization, one deployment. No tenancy, billing, or per-customer config.
- **Not a real-time collaborative tool.** Single operator; no presence, locking, or live co-editing.
- **Not a data warehouse.** Analytics are computed in-process over 10k rows, not served from a separate OLAP store.

## Assumptions

- The single user is authenticated and authorized upstream; the app treats the caller as a trusted HR manager.
- Input salary data is trusted and already validated at the source (the spreadsheets being replaced).
- FX rates are static and seeded; they are not time-versioned or live.
- All compensation is annualized for aggregation; a one-time bonus counts once in the yearly figure.
- Every employee has exactly one active compensation package.

## Constraints (from the assessment)

- Scale: 10,000 employees, multiple countries and currencies.
- Delivery: web-based UI plus backend, fully functional and deployed, with a demo.
- Storage: a relational database (SQLite).
- Frontend: React.
- A seed script producing the full 10,000-employee dataset.
- A meaningful, fast, deterministic test suite over core functionality.

## Deliverables

- Deployed, working web app: directory, employee detail with direct component editing, and a pay dashboard.
- Seed script for 10,000 deterministic employees.
- Test suite: domain unit tests, API tests, schema tests.
- Documents: this scope, `docs/requirements.md`, `docs/spec.md`, `docs/erd.md`, and the domain research under `docs/research/`.
- A short demo video walking the directory, a salary component edit, and the dashboard answering a pay question.
- Incremental commit history showing how the solution evolved.

## Boundary decisions on record

The ambiguous calls, resolved, so they don't get relitigated mid-build:

- **Band placement uses base salary, not total comp.** Pay ranges are base-salary ranges by convention. If HR wants total-comp banding, it is a one-line change, but base is the default.
- **A salary revision is a direct component edit, not an immutable event.** The event model is the right long-term shape and the wrong MVP shape; it forces the operational layer in before the read path exists.
- **Analytics normalize to USD.** One base currency keeps every cross-country number comparable. Native currency remains the stored truth and is never overwritten.

## Change control

Scope is fixed for the MVP. The out-of-scope and non-goal items are not a backlog promise; they are the boundary. The first additions after MVP, in likely order, are RBAC, audit/effective-dated history, and an approval workflow, each of which the current model was shaped to accept without a rewrite.
