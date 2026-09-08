# Coffee DB design QA

final result: passed

## Reference and verification environment

Compared `docs/coffee-catalog-mockup.png` and `docs/roasters-catalog-mockup.png` with rendered screenshots together at 1487 × 1058 CSS pixels, device scale 1. Additional captures cover 1920, 1024, 390 and 320 px and the fullscreen filter dialog. The desktop references do not specify mobile layouts.

The implementation uses the real prepared dataset from Neon development branch `dev/catalog-ui`, not the illustrative products/order in the mockups. It defaults to name sorting and 24/20 items per page as agreed; the references show different sample ordering and 8/10 items. These are intentional content/state differences, not pixel-identical screenshot targets.

The in-app browser was unavailable (`Browser is not available: iab`). Chrome preview was opened through CUA; intermittent extension CDP timeouts made repeatable capture unreliable. The requested Playwright test workflow produced the comparison screenshots and responsive checks against the same local preview at `http://localhost:3000`.

## Findings and fixes

- **P2, fixed:** at 320 px, a shared website/action row split ordinary roaster domains over multiple lines despite spare width. Website and `View coffees` now occupy separate full-width rows. The second visual capture confirms intact domains, readable actions and the full header at 320 px.
- **P2, fixed:** selecting a facet replaced its checkbox DOM while options refreshed, losing keyboard focus. Preserve the active facet component and retain loaded options during refresh. E2E verifies focus after selection.
- **P2, fixed after independent review:** a failed facet refresh discarded retained options. Keep the options on error as well, with `Retry options` alongside usable selected checkboxes; add unit and browser regressions.
- **Performance, fixed:** initial unindexed cross-document matching took ~23 seconds for `floral`. Indexed candidate selection and prioritizing short name documents brought `floral` to ~0.36 seconds and broad `coffee` to ~2.1 seconds in representative local-to-Neon measurements. These are observations, not latency guarantees.

## Required fidelity surfaces

| Surface          | Result                                                                                                                                                                                                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fonts/typography | Local Source Sans 3; compact heading hierarchy, readable body and filter labels, full long product titles. Font metrics differ slightly from the unspecified reference font.                                                                                                                             |
| Spacing/layout   | Reference header, 274 px sidebar, search row, four-column grid and table hierarchy reproduced. Two columns at medium widths; one at narrow widths. No horizontal page overflow across tested sizes. Extra filter hint/Show more controls and larger result pages intentionally increase document height. |
| Colors/tokens    | Warm off-white canvas, subdued olive branding, thin neutral borders, red actions and active tab underline.                                                                                                                                                                                               |
| Image quality    | Original shop images preserve their aspect ratios using contain; no fabricated product photos. Several remote images fail and correctly show a neutral unavailable state. This cannot reproduce the uniformly staged imagery in the mockup without changing source data.                                 |
| Copy/content     | English navigation and controls; actual names, geographic counts and prices. Prices explicitly labeled as snapshots. Country/state filters describe roaster location, and cities retain geographic disambiguation.                                                                                       |

Focused review included the header/search alignment, compact sidebar labels, narrow table columns, long mobile domains and dialog action bar. Full-view captures alone were not used to assess these details.

## Interaction and technical checks

- Page title and populated coffee/roaster catalogues verified; no framework overlay or uncaught page errors in visual/browser tests.
- Numbered pagination, search submit, sorting, URL reload/back navigation, roaster-to-coffee transitions and clear/empty/error states exercised in deterministic desktop and mobile e2e tests.
- Mobile dialog covers the viewport, scrolls independently, keeps actions available and restores focus when closed. Apply commits the draft; close discards it.
- Screenshots: `/private/tmp/coffee-db-qa/{coffee,roasters}-{1487,1920,1024,390,320}.png` and `filters-320.png`, reproducible with `npm run test:visual` while the real-data preview runs.
- Real external image HTTP failures are expected and handled; fixture-based e2e has no dependency on remote hosts. Browser verification is Chromium-only.

No remaining P0/P1/P2 visual issues were observed. Production deployment and external image mirroring are outside this implementation.
