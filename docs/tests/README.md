# Test specifications

Executable tests live in `api/src/` and `web/src/`. These documents define **what** to test before implementation agents fill gaps.

| Spec | Layer | Status |
|---|---|---|
| [`api-test-spec.md`](./api-test-spec.md) | API HTTP + schema + seed integration | Active — first priority |
| `domain-test-spec.md` | Pure domain (`api/src/domain/`) | Planned |
| `web-test-spec.md` | React UI (Vitest) | Planned |

Process and agent rules: [`../testing-agent.md`](../testing-agent.md).

Traceability source of truth for requirement IDs: [`../requirements.md`](../requirements.md).
