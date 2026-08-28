# Repair handoff — Home Maintenance Receipts

## Result

Repository-controlled release findings from independent verification report 2
(`b336188352d71ab563edc513881087a0036c28f4`, candidate
`20ef0cd9ee45b9c4ccb6c8181c03374e4408b1fd`) are repaired and covered by
regression tests. The product remains a Vite + TypeScript, static-deployed,
local-first PWA; no user records or evidence leave IndexedDB.

Two reported High findings remain factory-owned external dependencies, not
application defects: the production Sociobot catalog still lacks the registered
one-time product, and the public Sociobot verification endpoint still has no
observed rate limit. They are release blockers until the billing service owner
fixes them; this repository must not modify billing infrastructure or embed a
payment provider.

## Repairs

- Backup restore accepts only canonical version-4 UUIDs, the format generated
  by `crypto.randomUUID()` for both records and evidence. Identifiers are also
  HTML-escaped anywhere they are rendered into DOM attributes. A crafted
  identifier is now rejected before a restore confirmation can appear.
- The fatal IndexedDB screen now binds `Try again` with a module event listener
  after rendering, rather than an inline `onclick` blocked by the deployed
  `script-src 'self'` CSP.
- The service worker moved to `hmr-v5`. It never runtime-caches a navigation
  that carries `license`, removes any legacy query-bearing runtime keys on
  activation, and preserves normal offline navigation caching. The deployment
  now sends `Referrer-Policy: no-referrer`, so callback URLs are not disclosed
  in same-origin asset referrers during the initial load.

## Exact regression coverage

`tests/app.spec.ts` now proves, in desktop Chromium and a 390×844 mobile
viewport, that:

- a crafted restore identifier is rejected, presents no replacement action,
  adds no markup, and retains the pre-existing record after reload;
- the fatal storage recovery button has no inline handler and causes a document
  reload while `script-src 'self'` is enforced;
- a license callback is captured/stripped without any cache key containing the
  token; and
- the skip link, primary log control, dialog focus, Escape, and focus return
  all work by keyboard.

`src/deployment.test.ts` locks the stricter `no-referrer` policy alongside the
existing CSP, framing, permissions, manifest, update, and immutable-cache
policies.

## Verification performed

Run from the repository root:

```sh
npm ci --include=dev
npm test
npm run lint
npm run check
npm run build
npm run test:e2e
npm audit --omit=dev
npm audit
```

Observed on 2026-08-28 UTC:

- Clean install: 137 packages; both production and full audits reported zero
  vulnerabilities.
- Unit/policy: 2 files, 5/5 tests passed.
- ESLint and strict TypeScript: passed with no findings.
- Production build: passed and generated `dist/index.html`; initial JS is
  38.24 KB raw / 13.24 KB gzip and CSS is 19.41 KB raw / 4.84 KB gzip.
- Playwright 1.58.2: 24/24 passed (12 desktop Chromium and 12 at 390×844),
  including axe serious/critical checks, keyboard operation, offline reload,
  record persistence, backup/export, legal pages, privacy callback handling,
  mobile sizing, and the new exact regressions.
- Live Lighthouse 13.4.1 mobile: Performance 100, Accessibility 100, Best
  Practices 100; FCP 1.0 s, LCP 1.2 s, TBT 0 ms, CLS 0.
- Static policy source check confirms CSP remains self-only with only the
  Sociobot billing connection allowlist, `frame-ancestors 'none'`,
  `X-Frame-Options: DENY`, no-referrer, no-store service worker caching, and
  immutable hashed asset caching.

## External billing recheck (read-only)

On 2026-08-28 UTC:

- `GET https://api.sociobot.in/api/v1/products` returned 200 and contained no
  `home-maintenance-receipts` entry.
- The required checkout route
  `https://api.sociobot.in/api/v1/products/home-maintenance-receipts/checkout`
  returned 404 with `{"error":"enabled factory product","status":404}`.
- The invalid-license verification route returned 200 with `Cache-Control:
  no-store`; a 40-request concurrent verification smoke observed 40 HTTP 200
  responses and no `Retry-After`/429.

Required factory actions: register/enable the $29 one-time Sociobot/Dodo
product with return URL `https://home-maintenance-receipts.sociobot.in/`, and
apply API-side verification rate limiting that returns 429 with `Retry-After`.
No safe application-only substitute exists for either external service
responsibility.

## Deployment and live evidence

The repair commit was pushed to `main` as `8efef2a8bf3f7fea9a9688e2aba1146acbf0f94a`
and deployed as Static Web Apps deployment
`960a617d-34cf-4bfd-913d-3360eeade81c`.

- `verify-url.sh` returned HTTP 200 in 641 ms with the correct title,
  `lang="en"`, one h1, main landmark, image alt text, button labels, and zero
  console/page errors.
- All 17 publicly served files from the deployed build match local `dist/`
  byte-for-byte by SHA-256. `staticwebapp.config.json` is intentionally not a
  publicly served artifact.
- Live responses confirm `Referrer-Policy: no-referrer`, the self-only CSP,
  `frame-ancestors 'none'`, `X-Frame-Options: DENY`, and the restrictive
  permissions policy. `sw.js` is no-cache/no-store, the manifest is
  `application/manifest+json`, and hashed JavaScript is immutable cached.
- A live Chromium smoke found zero console/page errors and zero axe
  serious/critical findings in desktop and 390 px layouts. The skip link and
  main focus worked by keyboard; a controlled offline reload rendered the full
  app and the mobile document width equalled the 390 px viewport.

## Known gaps / next steps

- Billing catalog registration and verification rate limiting remain external
  release blockers as described above.
- No backend, sign-in flow, package/consumer artifact, analytics, remote font,
  or third-party storage applies to this local-first static PWA.
