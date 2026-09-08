---
name: repo-orientation
description: Use at the start of task-focused work in this Coffee DB repository, after context compaction, or whenever ownership is unclear. Identifies the owning workspace, nearby files and tests, related contracts, and the smallest safe validation path.
---

# repo-orientation

Use this skill before changing or reviewing code in this repository.

## Workflow

1. Read the root `AGENTS.md`.
2. Read `docs/repo_map.md` for broad or cross-workspace tasks.
3. Read the nearest local `AGENTS.md` under `client/src` or `server/src`.
4. Identify the owner: client, server, root tooling, documentation, or a client/server contract.
5. Inspect the smallest relevant entrypoint, implementation module and nearest tests.
6. Check `git status --short` and preserve unrelated user changes.
7. Choose the smallest edit set and validation path before implementing.

## Ownership guide

- UI and browser state: `client/src/App.tsx` and nearby components.
- Browser API behavior: `client/src/api/` and the matching server route.
- Server/API behavior: `server/src/appFactory.ts` and nearby tests.
- Process startup and static serving: `server/src/index.ts`, root scripts and `README.md`.
- Repository tooling: root configs, `scripts/` and `.github/`.
- Data semantics: `docs/handoff.md`; database code does not exist yet.

## Validation guide

- UI-only: client coverage and typecheck.
- Server-only: server coverage and typecheck.
- Cross-workspace/config: full coverage, typecheck and relevant Playwright tests.
- Final code/config sequence: format, unused-code check, strict lint.
- Documentation-only changes do not require executable validation.
