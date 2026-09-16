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

## Coffee attributes and details

`GET /api/coffees/:id` accepts a positive BIGINT string. It returns the Coffee
summary plus `description`, `originCountryCodes: string[] | null`,
`originContinents: string[] | null`, `varietyIds: string[] | null`,
`varietyDictionaryVersion: string | null`, `varietyUnresolved: string[] | null`,
`varieties: { id, label, kind: string | null }[]`, `roastFor: string[] | null`, and `decaf: boolean`.
The boolean is true only when the stored value is true. A missing coffee returns
404 `{ "error": "not_found" }`; malformed IDs return 400. Details are fetched on
opening the modal, independently of the list. Descriptions are displayed as plain
text, preserving line breaks. Source links appear in the dialog only.
The dialog combines stored countries and continents in one Origin attribute;
true decaf appears as a tag next to the title, with no separate decaf attribute.

Additional repeated coffee-only filter keys:

- `origin`: `country:ET`, `continent:africa`, or `__empty__`.
- `variety`: version/ID pairs such as `coffee_variety_dictionary_v6:bourbon-127296f3`, or `__empty__`.
- `roastFor`: `espresso`, `filter`, `omni`, or `__empty__`. Omni is independent.
- `decaf`: `yes` (stored true), `no` (stored false or null); no empty option.

Origin is one OR group across countries and continents. Continents match both
explicit `origin_continents` and countries assigned by the bundled UN M49
snapshot. North America includes Northern America, Central America and the
Caribbean. Americas includes both American continents; a record with only the
broad `americas` value does not match a narrower American continent or country.
Other groups combine with Origin through AND. Original attribute arrays in the
detail response are never replaced with inferred geography.

`__empty__` means SQL NULL, JSON null, or an empty array. For Origin both arrays
must be empty. It can be combined with ordinary values through OR. This sentinel
is not supported by the existing roaster/location filters. Variety labels and kinds come from `coffee_varieties`, matched on both
`dictionary_version` and the product's `variety_dictionary_version` plus ID.
The backend reads the required versions on each request, so newly published
versions are available without restarting or replacing a bundled file. No
latest-version substitution is performed. Missing entries are logged and shown
as “Name unavailable”, with null kind. Unresolved source names appear separately;
`variety_raw` is never appended or re-normalized. The full dictionary document
and aliases are not sent to the browser.

Variety facet values encode `version:id`; an empty version prefix represents a
product with a missing version. Filtering checks both components, and options
from different versions remain separate even when labels match. Legacy unversioned
variety URLs return 400 and must be cleared/reselected. The empty option refers
to canonical IDs only; unresolved names do not become canonical filter values.
Live product counts are used, never historical dictionary statistics.

New facets use the same response shape and exclude their whole own filter group.
Each product is counted once per option, including blends and repeated values.
Origin returns up to 300 options per batch; other new facets return 20. Search
matches display labels before pagination. Selected values are retained on the
first batch with a zero count when necessary. The label “Not specified” is displayed
in italics in filters and is retained in the first
unsearched batch even at zero count; decaf supplies both choices. The app groups
origin options under Continents and Countries without automatically selecting
countries when a continent is selected. Browser URL and local storage preserve
new filters; modal state is transient.

The schema initializer adds missing attribute columns idempotently and ensures
GIN indexes on all four JSONB columns plus the partial true-decaf index. It does
not rewrite imported attribute values. Integration tests run in an isolated
schema on a development database; do not point them at production.
