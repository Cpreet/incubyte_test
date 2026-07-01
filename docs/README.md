# Documentation index

Salary Management MVP documentation for the Incubyte assessment.

## Start here

| Document | Audience | Purpose |
|---|---|---|
| [`scope.md`](./scope.md) | Everyone | MVP boundary — in scope, out of scope, assumptions |
| [`requirements.md`](./requirements.md) | Implementers, reviewers | Functional/non-functional requirements with test IDs |
| [`spec.md`](./spec.md) | Implementers | API, schema, seed, testing, **implementation status** |
| [`erd.md`](./erd.md) | Implementers | Entity-relationship diagram and schema notes |

## Agent / AI context

| File | Location |
|---|---|
| `AGENTS.md` | Repo root — primary guide for coding agents |
| `CLAUDE.md` | Repo root — Bun + monorepo conventions for Claude |
| [`testing-agent.md`](./testing-agent.md) | Testing agent workflow and conventions |
| [`tests/api-test-spec.md`](./tests/api-test-spec.md) | API test case catalog (implement first) |

## Test specifications

| Document | Purpose |
|---|---|
| [`tests/README.md`](./tests/README.md) | Index of test specs |
| [`tests/api-test-spec.md`](./tests/api-test-spec.md) | HTTP, schema, seed tests for `api/` |

## Research (background)

| Document | Purpose |
|---|---|
| [`research/research.md`](./research/research.md) | Domain layers and assessment framing |
| [`research/HR_Salary_functions.md`](./research/HR_Salary_functions.md) | HR salary function reference |

Research informs the domain but does **not** override `scope.md` cuts for the MVP.

## Conflict resolution

1. `scope.md` wins on boundary questions.
2. `requirements.md` defines acceptance tests; update it when scope decisions change.
3. `spec.md` tracks what is built and planned API/UI shape.
4. `erd.md` reflects the actual SQLite schema.

When you change behavior, update the relevant doc in the same PR.
