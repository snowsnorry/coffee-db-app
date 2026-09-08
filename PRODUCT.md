# Coffee DB Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are coffee-industry specialists and serious coffee enthusiasts. They use Coffee DB when they need to explore the market across many roasters and products rather than research individual shop sites one by one.

## Product Purpose

Coffee DB makes a prepared global dataset of coffee roasters and roasted-coffee products explorable through a web interface and read-only API. The current product supports broad discovery across the catalogue. Its planned direction adds richer records for individual coffee products, statistics across selected slices of the data and aggregate market statistics.

Success means users can efficiently find, compare and understand roasters and products across the dataset, with clear limits around the freshness and completeness of source data.

## Positioning

Coffee DB brings records from thousands of independent roaster shops into one searchable, structured catalogue. This breadth and shared data model give users a market-level view that browsing individual roaster sites cannot provide.

## Operating Context

Users move between coffee and roaster catalogues, search across names and descriptions, narrow results by roaster and location, sort and paginate results, share filtered URLs and move directly from a roaster to its coffees. Product photographs, recorded prices and source-shop links help users identify and verify items against their original listings.

The source-of-truth handoff for PostgreSQL tables, field semantics and data-quality constraints is [docs/handoff.md](docs/handoff.md).

## Capabilities and Constraints

The current milestone provides:

- English coffee and roaster catalogues backed by PostgreSQL.
- Search, faceted location and roaster filters, sorting and numbered pagination.
- Shareable URL state and direct transitions from a roaster to its coffee catalogue.
- Desktop layouts and a mobile fullscreen filter dialog with explicit Apply and Cancel behavior.
- Real product photographs, graceful unavailable-image states and historical prices linking to source shops.
- Unit and API tests, isolated PostgreSQL integration, deterministic browser tests and opt-in visual checks.

Internal detail pages, translation, accounts, purchasing, data ingestion and deployment remain outside the current milestone. Richer product records and market statistics are planned capabilities rather than current behavior. Application reads and additive indexes are verified on an isolated Neon development branch; production rollout is separate.

A roaster is identified by an internal ID and unique canonical domain. Each coffee belongs to exactly one roaster. Geography refers to roaster location. External descriptions, links, photographs and prices are imperfect source data. The interface does not guarantee product availability, translate products or compare value across currencies and package sizes.

## Brand Commitments

The product name is Coffee DB. Current catalogue copy is in English. No broader brand identity or visual direction has been confirmed.

## Evidence on Hand

The prepared dataset documented in [docs/handoff.md](docs/handoff.md) contains a snapshot dated 7 September 2026 with 8,451 roasters across 44 countries and 130,616 coffee products. The handoff records field semantics, provenance limits and known data-quality gaps that future product work must preserve rather than conceal.

The repository contains the working catalogue interface, read-only API contract and automated test coverage. It does not contain testimonials, customer claims, market benchmarks or evidence that the recorded products and prices remain currently available.

## Product Principles

- Make the breadth of the coffee market practical to explore.
- Preserve source provenance and communicate uncertainty in collected data.
- Support both focused product discovery and analysis across meaningful data slices.
- Keep catalogue state shareable and workflows efficient across desktop and mobile.
- Build future statistics from defensible data semantics rather than implied precision.

## Accessibility & Inclusion

The web interface must remain semantic, keyboard accessible and usable from 320 px viewport width upward. External product text may be long or multilingual even while the application interface remains English in the current milestone.
