# Coffee DB App

Full-stack TypeScript monorepo for a future catalogue of coffee roasters and coffee products. The current repository is an executable skeleton: the React UI renders a placeholder and verifies connectivity to the Express API.

## Stack

- Frontend: React 19, Vite 8, MUI, Tailwind CSS, TypeScript
- Backend: Node.js 24, Express 5, TypeScript
- Tests: Vitest, Testing Library, Playwright
- Quality: ESLint, Prettier, dependency-cruiser, Knip, coverage and source-size gates

PostgreSQL integration and product features are intentionally deferred. The prepared data model is documented in [docs/handoff.md](docs/handoff.md).

## Repository layout

```text
client/     React frontend
server/     Express API and production static server
tests/e2e/  Browser smoke tests
docs/       Product data and repository documentation
```

## Requirements

- Node.js 24.18.0
- npm

## Setup

```bash
npm install
npm run playwright:install
```

No environment file or external service is required for the skeleton.

## Development

Run the UI and API together:

```bash
npm run dev:all
```

Or run them independently:

```bash
npm run dev:client
npm run dev:server
```

- UI: `http://localhost:5173`
- API: `http://localhost:3000`
- Health endpoints: `GET /health` and `GET /api/health`

The Vite development server proxies `/api` to Express.

## Production-like start

```bash
npm run build
NODE_ENV=production npm start
```

Express serves the built client and API from `http://localhost:3000` by default. Override the server port with `PORT`.

## Validation

```bash
npm test
npm run typecheck
npm run coverage
npm run lint:strict
npm run format:check
npm run quality:deps
npm run quality:unused
npm run quality:large-files:strict
npm run test:e2e
npm run security:audit
```

Run the complete sequential gate with `npm run quality:gate`.
