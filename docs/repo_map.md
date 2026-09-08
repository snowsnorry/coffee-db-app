# Repository map

## Architecture

Coffee DB is an npm-workspaces monorepo with two workspaces:

- `client/` owns the React application and browser-side API calls.
- `server/` owns the Express API, process startup and production static serving.

Database connectivity lives in `server/src/database.ts`; catalogue SQL and HTTP behavior live in `server/src/catalog/`. There is no shared package. Keep client/server contracts synchronized through tests and `docs/catalog-api.md`.

## Client

- `client/src/main.tsx` mounts the React application.
- `client/src/App.tsx` composes the catalogue UI. Components, URL state, filters and formatting live in `client/src/catalog/`.
- `client/src/api/health.ts` owns the browser health contract.
- `client/vite.config.ts` owns Vite, Tailwind, Vitest and the development proxy.

## Server

- `server/src/appFactory.ts` creates the testable Express application, health routes, API 404 handling and optional client serving.
- `server/src/index.ts` owns process startup, schema initialization, `PORT`, database pool wiring and shutdown.
- `server/src/databaseSchema.ts` contains the idempotent catalogue tables and indexes applied before the server listens.
- `server/vitest.config.ts` owns server test and coverage settings.

## Cross-cutting tooling

- Root `package.json` is the canonical command surface.
- `vitest.config.mts` combines client and server test projects.
- `playwright.config.ts` starts a production-like build for desktop and mobile catalogue tests with a dedicated fixture server.
- `tests/integration/` verifies SQL in a transactional development-only schema.
- `playwright.visual.config.ts` captures real-data preview screenshots for design QA.
- `.dependency-cruiser.cjs`, `knip.json` and `scripts/check-large-files.mjs` enforce dependency, unused-code and file-size constraints.
- `docs/handoff.md` documents the prepared PostgreSQL data and its limitations.

## Validation path

Use workspace-specific tests and typechecks while iterating. For a cross-workspace change, run `npm run quality:gate`. After final edits, run formatting, unused-code and strict lint checks in that order.
