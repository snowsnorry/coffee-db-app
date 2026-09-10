# BP-003: browser security headers

Status: resource CSP enforcement is implemented and ready for deployment. The
report-only production observation completed without CSP violations. Verify the
enforced response and UI after deployment before closing BP-003.

`server/src/appFactory.ts` sets headers before body parsing and routing:

- `X-Content-Type-Options: nosniff` preserves declared MIME types.
- `Referrer-Policy: no-referrer` extends the existing image/link privacy policy.
- `Content-Security-Policy` enforces the resource policy below and prohibits
  embedding with `frame-ancestors 'none'`. `X-Frame-Options: DENY` provides a
  compatible framing fallback. No supported embedded application flow exists.

The resource policy permits same-origin scripts, fonts and API requests; inline
styles for Emotion/MUI; and HTTP/HTTPS images from arbitrary catalogue hosts,
matching current URL validation. Scripts do not allow inline execution or eval.
Objects, child frames and base elements are disallowed; forms target self.
Fonts are bundled locally. External links are navigations, not script sources.
No image host allowlist is guessed from fixture data. HTTP image permission does
not override browsers' HTTPS mixed-content restrictions.

Inline styles are a deliberate compatibility allowance, not a strict style CSP.
Removing it requires per-response nonces on HTML and an Emotion cache nonce,
plus handling MUI style attributes. There is no nonce/HTML rendering machinery
in the current static SPA. See [MUI CSP guidance](https://mui.com/material-ui/guides/content-security-policy/).

## Deployment verification

1. Deploy the enforced version. Inspect actual GET responses at the public
   edge for `/coffee`, `/roasters`, a built JS/CSS/font asset, `/api/health`,
   `/api/missing`, and a controlled error. Inspect redirects and cached responses
   too; purge stale HTML if necessary. Compare with origin responses. Edge-added
   policies compose with application policies and may be more restrictive.
2. In browser DevTools, retain console/network logs and exercise both catalogues,
   search, sort, pagination, mobile filters, reloads and back navigation with real
   data. Check styles, fonts, external images/redirects and CSP violations. CSP
   does not fix upstream image failures. Test HTTPS on the actual deployment.
3. Confirm `Content-Security-Policy-Report-Only` is absent and the enforced
   `Content-Security-Policy` contains the resource directives. This implementation
   has no report collector and does not provide production-wide telemetry.
4. Review any needed source exceptions individually. Roll resource restrictions
   back to report-only if legitimate loads regress; retain framing, MIME and
   referrer protections. Do not mark BP-003 closed until the enforced public
   response and browser evidence has been recorded.

Express's default error handler replaces CSP with `default-src 'none'` on its
own error pages. `X-Frame-Options: DENY` still prevents framing there; the other
headers remain. Development HTML served directly by Vite is outside Express's
header boundary. No HSTS or upgrade-insecure-requests is enabled without a known
HTTPS deployment contract.

## Regression checks

- `server/src/appFactory.test.ts`: SPA, assets, health, API misses/unavailability
  and malformed JSON retain their behavior and carry the security headers.
- `tests/e2e/security-headers.spec.ts`: desktop/mobile production build under
  enforced CSP; fonts, intercepted external image, search, catalogues and mobile
  dialog without CSP violations or console errors. An injected inline script is
  blocked. External image bytes are deterministic: this does not prove
  availability of real image hosts or edge compatibility.

References: [MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP),
[frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors),
[Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy).
