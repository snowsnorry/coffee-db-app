# Coffee DB Product

Coffee DB makes a prepared global dataset of coffee roasters and coffee products explorable through a web interface and read-only API.

The source-of-truth handoff for PostgreSQL tables, field semantics and data-quality constraints is [docs/handoff.md](docs/handoff.md).

## Current milestone

- English coffee and roaster catalogues following the supplied reference mockups.
- Search, faceted location and roaster filters, sorting and numbered pagination backed by PostgreSQL.
- Shareable URL state and direct transitions from a roaster to its coffee catalogue.
- Desktop layouts and a mobile fullscreen filter dialog with explicit Apply/Cancel behavior.
- Real product photographs, graceful unavailable-image states and historical prices linking to source shops.
- Unit/API, isolated PostgreSQL integration, deterministic browser and opt-in visual checks.

Internal detail pages, translation, accounts, purchasing, data ingestion and deployment remain outside this milestone. Application reads and additive indexes are verified on an isolated Neon development branch; production rollout is separate.

## Domain boundaries

A roaster is identified by an internal ID and unique canonical domain. Each coffee belongs to exactly one roaster. Geography refers to roaster location. External descriptions, links, photographs and prices are imperfect source data; the UI does not guarantee availability, translate products or compare value across currencies and package sizes.
