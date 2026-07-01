# incubyte

This repo is a Bun monorepo with two workspaces:

- `api`: Bun backend service
- `web`: Vite React frontend

To install dependencies:

```bash
bun install
```

To run both packages in development:

```bash
bun run dev
```

To compile both packages:

```bash
bun run build
```

To run both test harnesses:

```bash
bun run test
```

To seed the API database with deterministic salary data:

```bash
bun run seed
```

To run the compiled API and the built frontend preview together:

```bash
bun run start
```

By default the API listens on `http://localhost:8787` and the frontend preview listens on `http://localhost:4173`.
Set `PORT` to override the API port.

The API stores local development data in `api/data/dev.sqlite` by default.
Set `DATABASE_PATH` to point at a different SQLite file.
