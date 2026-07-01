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

To run the compiled API and the built frontend preview together:

```bash
bun run start
```

By default the API listens on `http://localhost:8787` and the frontend preview listens on `http://localhost:4173`.
Set `PORT` to override the API port.
