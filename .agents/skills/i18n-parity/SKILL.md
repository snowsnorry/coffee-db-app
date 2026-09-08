---
name: i18n-parity
description: Use once localization resources exist, whenever changing visible UI text or accessibility-only text, to keep locale keys consistent and preserve locale parity across the frontend.
---

# i18n-parity

Localization is not implemented in the skeleton. Apply this skill after locale resources are introduced.

## Checklist

- locate every supported locale resource
- update all locales in the same change
- preserve key naming and interpolation consistency
- include visible and accessibility-only copy such as labels, alt text, tooltips and live-region messages
- avoid embedding untranslated strings directly in components
- update locale parity tests

## Validation

- run client coverage and typecheck
- run any shared locale checks if a shared layer is introduced later
