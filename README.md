# Coffee DB App

A working catalogue of coffee products and roasters, with PostgreSQL-backed search, faceted filters and numbered pagination. The English UI follows the reference mockups and supports desktop and mobile screens from 320 px.

## Stack

- Frontend: React 19, Vite 8, MUI, Tailwind CSS, Source Sans 3, TypeScript
- Backend: Node.js 24, Express 5, PostgreSQL via `pg`
- Tests: Vitest, Testing Library, PostgreSQL integration tests, Playwright
- Quality: ESLint, Prettier, dependency-cruiser, Knip, coverage and source-size gates

See [docs/handoff.md](docs/handoff.md) for source-data semantics and [docs/catalog-api.md](docs/catalog-api.md) for the API contract.

## Setup and development

Use Node.js 24 and npm:

```bash
npm install
npm run playwright:install
```

Copy the documented local configuration template, then replace the placeholder connection details:

```bash
cp .env.example .env
```

The development server, production-like start and opt-in integration/visual checks load the root `.env` when it exists. Variables already supplied by the shell, CI or a secret manager take precedence over values in the file. Prefer an explicitly verified TLS connection (`sslmode=verify-full`) for Neon. Never expose database variables to the client or commit `.env` or credentials.

The implementation was verified against Neon project `coffee-db`, database `neondb`, isolated branch `dev/catalog-ui` (`br-jolly-poetry-axsub7gf`).

Start development:

```bash
npm run dev:all
```

When `DATABASE_URL` is set, the server creates missing catalogue tables and indexes before it starts listening. Table creation runs in a transaction; indexes are built concurrently so existing tables remain writable. A bounded advisory lock serializes concurrent application starts, and invalid indexes left by an interrupted concurrent build are rebuilt. The startup role must have `CREATE` permission on the schema and own existing `roasters` and `coffee_products` tables. If initialization fails, the server exits instead of serving a catalogue with an incomplete schema.

Set `DATABASE_SCHEMA_URL` to a direct connection using the same database, schema and role when `DATABASE_URL` uses a transaction-mode pooler, including a pooled Neon endpoint. Using the same role ensures the API can access the objects it creates during startup. Schema initialization requires a stable PostgreSQL session; after initialization, the direct pool is closed and normal API traffic continues through `DATABASE_URL`. If `DATABASE_SCHEMA_URL` is absent, initialization uses `DATABASE_URL`.

`IF NOT EXISTS` does not reshape an existing table or replace an existing index with the same name. Existing objects must already match the schema documented in [docs/handoff.md](docs/handoff.md).

- UI: `http://localhost:5173/coffee` and `/roasters`
- API: `http://localhost:3000/api`; Vite proxies same-origin `/api` requests.
- Health: `/health` and `/api/health` report process health, independently of the database.
- Without `DATABASE_URL`, the UI and health endpoints still run; catalogue endpoints return JSON 503.

## Production-like preview

```bash
npm run build
npm start
```

With `DATABASE_URL` available through `.env` or the process environment, Express serves the built client and API at `http://localhost:3000`. Override the port with `PORT`. `npm start` sets `NODE_ENV=production`; an explicit shell/CI value still has normal process-environment precedence over `.env`. Database connections close on SIGINT/SIGTERM. Deployment is not included in this change.

## Validation

```bash
npm run coverage
npm run typecheck
npm run build
npm run quality:deps
npm run quality:large-files:strict
npm run format
npm run quality:unused
npm run lint:strict
npm run test:e2e
```

`npm run quality:gate` combines the standard checks. Coverage already executes unit tests.

E2E tests start a separate production-like server with deterministic fixture data. They require no database or external image hosts. The fixture repository is reachable only through the test entrypoint, never through the production server.

For SQL integration, set `TEST_DATABASE_URL` in `.env` or the process environment to a direct connection to a development database, then run `npm run test:integration`. The test creates a uniquely named schema, initializes it twice, installs fixtures, verifies real SQL, and removes the schema afterward. Never point it at production. Missing credentials cause a clear failure rather than a silently skipped check.

With the real-data preview running, `npm run test:visual` captures both catalogues at 1487, 1920, 1024, 390 and 320 px plus the mobile filter dialog. `CATALOG_PREVIEW_URL` can override the default `http://localhost:3000`. This opt-in check expects the handoff dataset counts and saves screenshots under `/private/tmp/coffee-db-qa`.

## Data limitations

Photographs and destination pages are hosted by external shops and may fail; the UI provides an image fallback. Prices are historical snapshots in their original currencies, with no weight normalization or cross-currency ranking. Geography describes the roaster, not the origin of the beans. Search uses PostgreSQL `simple` word tokenization, without translation, stemming or typo correction. Totals and numbered pages are live reads; concurrent imports can change page boundaries.
