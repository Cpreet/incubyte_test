# @incubyte/web

Vite + React frontend for the Salary Management MVP.

## Status

Placeholder shell only (`App.tsx` renders a heading). Planned screens per `docs/spec.md`:

1. **Directory** — paginated employee list with filters and search
2. **Employee detail** — compensation package, inline component edits
3. **Pay dashboard** — summary, breakdowns, distribution, band placement

## Commands

```bash
bun run dev       # Vite dev server
bun run test      # Vitest + Testing Library
bun run lint      # ESLint + TypeScript
bun run build     # production bundle to dist/
bun run start     # preview built app on :4173
```

Run from repo root with `bun run dev` to start API and web together.

## Conventions

- React 19 functional components; React Compiler Babel plugin is enabled.
- Tests colocated as `*.test.tsx` next to components.
- Call the API at `http://localhost:8787` (use a Vite dev proxy — add when building UI).
- Match API query params: `page`, `pageSize`, `job`, `location`, `org_unit`, `level`, `search`.
- Money displays: format integer minor units per currency; do not use floats for calculations.

## API dependency

The web app depends on endpoints documented in `docs/spec.md`. Analytics routes (`/analytics/*`) are not implemented on the API yet; build the dashboard after those land or mock them in tests only.
