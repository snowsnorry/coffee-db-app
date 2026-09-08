# Client working guide

## Scope

This directory contains the React frontend. Start with `App.tsx`, then inspect `api/` and the closest tests.

## Rules

- Keep `App.tsx` focused on composition and move API behavior into `api/`.
- Use semantic HTML and accessible MUI primitives.
- Keep responsive support down to 320 px unless a future requirement says otherwise.
- Do not hardcode backend origins; use the Vite proxy and same-origin `/api` paths.
- When an API contract changes, inspect and test the matching Express route.
- Do not turn the skeleton styling into a permanent design system without an approved design task.

## Validation

Run `npm run coverage:client` and `npm run typecheck:client`, then follow the root formatting, unused-code and lint sequence.

