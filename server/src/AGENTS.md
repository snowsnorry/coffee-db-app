# Server working guide

## Scope

This directory contains the Express backend. `appFactory.ts` owns HTTP behavior and production client serving; `index.ts` owns process startup only.

## Rules

- Keep route behavior testable without opening a network port.
- Keep public JSON payloads camelCase and synchronize contract changes with the client.
- Preserve `/health` for operational checks and `/api/health` for the browser client.
- API misses must remain JSON 404 responses and must not fall through to the SPA.
- Be conservative with environment variables and startup behavior.
- Do not add database wiring until a persistence task defines it.

## Validation

Run `npm run coverage:server` and `npm run typecheck:server`, then follow the root formatting, unused-code and lint sequence.

