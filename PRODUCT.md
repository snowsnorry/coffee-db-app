# Coffee DB Product

## Purpose

Coffee DB will make a prepared global dataset of coffee roasters and coffee products explorable through a web interface and API.

The source-of-truth handoff for the existing PostgreSQL tables, field semantics and data-quality constraints is [docs/handoff.md](docs/handoff.md).

## Current milestone

This milestone provides only the project foundation:

- runnable React UI and Express API;
- production static serving;
- health contract and connectivity status;
- automated quality and test infrastructure;
- repository and agent guidance.

Database connectivity, catalogue browsing, filtering, search, product detail, localization, authentication and deployment configuration are out of scope for this milestone.

## Initial domain boundaries

- A roaster is identified in the prepared dataset by an internal ID and a unique canonical domain.
- A coffee product belongs to exactly one roaster.
- External names, descriptions, URLs, images, locale and price data must be treated as imperfect source data.
- Future API work should preserve an explicit client/server contract and should not infer stronger guarantees than those documented in the handoff.
