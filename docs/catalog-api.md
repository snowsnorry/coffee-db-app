# Catalogue API

All endpoints use same-origin GET requests and camelCase JSON. Database BIGINT IDs and NUMERIC prices are strings. Missing optional data is `null`; external URLs are returned only for HTTP(S).

## Endpoints

- `/api/coffees`: `{ items: Coffee[], total, page, pageSize, totalPages }`
- `/api/roasters`: `{ items: Roaster[], total, page, pageSize, totalPages }`
- `/api/catalog/stats`: `{ coffees, roasters, countries, roastersWithCoffee }` (global counts)
- `/api/coffees/facets` and `/api/roasters/facets`: `{ items: [{ value, label, count }], hasMore }`

A Coffee contains `id`, `name`, `imageUrl`, `priceAmount`, `priceCurrency`, `sourceUrl`, and `roaster: { id, name, countryCode, stateCode, city }`.

A Roaster contains `id`, `name`, `countryCode`, `stateCode`, `city`, `domain`, `websiteUrl`, `roastingModel`, and `coffeeCount`. Zero-product roasters remain in the catalogue.

## Query parameters

- `q`: optional trimmed search string, maximum 200 characters. Coffee searches names, descriptions and the roaster search document; roaster documents contain name, city and canonical domain. PostgreSQL `websearch_to_tsquery('simple', ...)` supports words, quoted phrases, OR and negation. A coffee matches when either its own or its roaster's document matches; terms split across those documents do not form a combined match.
- `sort`: `nameAsc`, `nameDesc`; coffee also supports `relevance`, roasters also support `coffeeCount` (descending). Default: relevance for coffee searches, otherwise name ascending. Every ordering uses ID as a stable tie-breaker. Relevance gives product-name matches four times the weight of roaster-document matches; description-only matches follow with ID as their tie-breaker. Ranking short name documents avoids re-tokenizing all long descriptions for broad queries. Relevance without search falls back to name ascending.
- `page`: integer 1–1,000,000, default 1. Pages beyond the current end are clamped to the final page; an empty result reports page 1 and zero totalPages.
- `pageSize`: integer 1–100; defaults to 24 coffees or 20 roasters.
- Multi-select filters use repeated query keys, OR within each group and AND between groups. At most 50 distinct values per group, at most 300 characters per value.
- Coffee filters: `roaster` (positive BIGINT string), `country` (uppercase two-letter code), `state` (US state code), `city`.
- Roaster filters: `country`, `state`, `city`, `model` (`IN_HOUSE`, `SHARED_FACILITY`, `CONTRACT`, `HYBRID`, `UNKNOWN`), `hasCoffee` (`yes`, `no`). Selecting both presence values includes all roasters.
- `city` is a JSON-encoded array `[countryCode, stateCodeOrEmptyString, city]`, URL-encoded by URLSearchParams. Use returned facet values; do not reconstruct them from display labels.

Example: `/api/coffees?country=US&state=OR&state=ME&page=2&pageSize=24`.

## Facets

Supply the same search/filter parameters plus `facet`, optional `search` (literal substring, not full-text syntax), and `offset` (integer 0–1,000,000). The requested facet must be available for that catalogue.

Counts apply the search and other filter groups but exclude the requested group. Options sort by descending count, then label and value. Pages contain 20 options; the small country/state dictionaries return up to 100. Offset advances by that batch size. The first batch additionally includes selected existing options even when their count is zero or their label does not match the facet search. City values distinguish country and state. Country/state display names and their local text search are handled by the UI.

## Errors and lifecycle

Malformed known parameters: HTTP 400 `{ "error": "invalid_query" }`. Unavailable database: HTTP 503 `{ "error": "catalog_unavailable" }`. Unknown API route: HTTP 404 `{ "error": "not_found" }`. Internal database errors and connection details are never returned to the browser.

The server uses a bounded connection pool, a 10-second connection timeout and a 15-second per-statement timeout. List count and page queries are separate reads. Pagination intentionally uses OFFSET to support arbitrary numbered-page navigation; it does not promise an immutable snapshot during concurrent imports.
