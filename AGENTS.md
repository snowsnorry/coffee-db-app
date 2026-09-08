# AGENTS.md

## Repository purpose

This repository is a full-stack catalogue for coffee roasters and coffee products. The current milestone provides searchable, database-backed catalogues; consult `PRODUCT.md` and `docs/handoff.md` before introducing domain behavior.

## Architecture

- npm workspaces: `client` and `server`
- frontend: React, Vite, MUI, Tailwind CSS and TypeScript
- backend: Node.js, Express and TypeScript
- public API payloads use camelCase
- production Express serves the built SPA

Consult `docs/repo_map.md` when ownership is unclear. Read the nearest workspace `AGENTS.md` before editing files below `client/src` or `server/src`.

## Working rules

- Prefer minimal, task-focused diffs and preserve workspace boundaries.
- Inspect the nearest tests before changing implementation.
- For client/server contract changes, inspect both sides and use `full-stack-contract-check`.
- Do not add a shared layer, database abstraction or product architecture before a real use case requires it.
- Do not read, search, print, parse or use `.env` or `.env*` files unless the user explicitly asks for that action.
- Use Context7 for current library, framework, SDK, API, CLI and cloud-service documentation.
- Keep user-visible and accessibility copy aligned across locales once localization resources exist; use `i18n-parity`.
- Do not copy installed or vendored skills into this repository.

## Commands

- Development: `npm run dev:all`, `npm run dev:client`, `npm run dev:server`
- Build/start: `npm run build`, `npm start`
- Tests: `npm test`, `npm run test:client`, `npm run test:server`, `npm run test:e2e`
- Coverage: `npm run coverage`, `npm run coverage:client`, `npm run coverage:server`
- Types: `npm run typecheck`, `npm run typecheck:client`, `npm run typecheck:server`
- Quality: `npm run format`, `npm run quality:unused`, `npm run lint:strict`, `npm run quality:gate`

## Validation expectations

- Client-only code: client coverage and client typecheck.
- Server-only code: server coverage and server typecheck.
- Cross-workspace behavior or executable/config changes: full coverage, typecheck and relevant e2e tests.
- Coverage commands already execute their Vitest suites; do not duplicate the corresponding test command without a debugging reason.
- After final code/config edits, run `npm run format`, then `npm run quality:unused`, then `npm run lint:strict`.
- Documentation-only changes need no executable validation.

## Final response

After changing files, report the checks run and recommend a git commit message.
