---
name: full-stack-contract-check
description: Use when changing API behavior or any feature that touches both the Coffee DB client and server, to verify request and response contracts and avoid one-sided changes.
---

# full-stack-contract-check

Use this skill for API behavior and other cross-workspace features.

## Checklist

- identify the owning Express route
- identify the caller under `client/src/api/`
- verify request method, path and shape
- verify response and error shapes
- preserve camelCase public payloads
- verify user-visible failure behavior
- update client and server tests together
- run the narrowest affected client and server checks

## Avoid

- one-sided contract changes
- hardcoded backend origins
- silent environment-variable renames
- allowing unknown API routes to fall through to the SPA
