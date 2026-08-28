# Verification handoff — Home Maintenance Receipts

## Result: FAIL

Independent verification 3 tested candidate
`777e6d0b185747555f8daec33a5a6526d3db6817` and the deployed site
<https://home-maintenance-receipts.sociobot.in> on 2026-08-28 UTC. The live
site matches all 17 public production artifacts from a clean candidate build,
and all repository, browser, accessibility, offline, update, policy, and
performance checks passed. The release nevertheless **fails** because its
advertised $29 House File Plus checkout is unavailable:

```text
GET https://api.sociobot.in/api/v1/products/home-maintenance-receipts/checkout
HTTP 404 {"error":"enabled factory product","status":404}
```

The live billing catalog (71 products) has no
`home-maintenance-receipts` entry. This is an external factory/billing action,
but it blocks the accepted one-time paid unlock. Details and exact evidence are
in `.factory/verification-3.md`.

## What passed

- Clean install, unit/policy (5/5), ESLint, strict TypeScript, exact production
  build, and 24/24 desktop + 390 px Playwright tests.
- Live normal record workflow: local IndexedDB record, attachment SHA-256,
  report PDF, backup/export; zero console/page errors or normal-use external
  requests.
- Axe serious/critical: zero; keyboard skip/form/Escape behavior, visible
  focus, 390 px no overflow, 44 px legal targets, and reduced-motion handling.
- Live offline reload and a controlled service-worker update activation.
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100,
  SEO 100; 1.2 s LCP, 0 ms TBT, 0 CLS. JS is 13,084 gzip and CSS 4,851 gzip.
- Local-first privacy and live security/cache headers: self-only CSP, no
  framing, restrictive Permissions-Policy, no-referrer, HSTS, immutable
  hashed assets, no-store service worker, and correct manifest MIME.
- Billing verification rate limiting now passes: a 300-request burst returned
  294 HTTP 429 responses; browser-origin 429 included `Retry-After: 2`.

## Required next step

Register and enable the `$29` one-time Sociobot/Dodo product
`home-maintenance-receipts` with return URL
`https://home-maintenance-receipts.sociobot.in/`, then re-run checkout and
candidate verification. No repository code change can safely replace that
factory-owned registration.

## Run locally

```sh
npm ci --include=dev
npm test
npm run lint
npm run check
npm run build
npm run test:e2e
```
