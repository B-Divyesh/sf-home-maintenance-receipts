# Verify home maintenance records and receipts — verification 5

- **Verdict:** **PASS**
- **Finding count:** 0
- **Untested claim count:** 0
- **Implementation reviewed:** `e06a2ccf83e57828131697cfa5a4ff7022aecb28`
- **Documentation commit:** `ffb8f548750df9e2bd7c473428c90be44ceb1f6c`
- **Live URL:** <https://home-maintenance-receipts.sociobot.in>
- **Verified:** 2026-09-06 UTC
- **Work order:** `home-maintenance-receipts-verify-5`

The live product, clean candidate build, and public claim registry all passed.
The deliberate billing HTTP 404 is handled as an unavailable purchase state: it
is not a broken page and is not a finding.

## First screen before scrolling

Fresh desktop (1440×1000) and phone (390×844) contexts opened the landing page
at scroll position zero. Both state:

- **Job:** Keep proof of completed home maintenance.
- **Audience:** Households that need dates, providers, and receipts ready when
  they sell, insure, or troubleshoot a home.
- **First action:** **Try it with sample data** — it opens three completed jobs
  with receipts.

The three facts are visible before scrolling on both screens: records stay on
this device, work offline after the first visit, and free use covers 25
records. The facts end at 587 px on desktop and 745 px on the 844-px phone.
Each landing page has one h1 and one main landmark.

## Clean checkout and deployment identity

A detached worktree at the implementation SHA started without dependencies or
build output. `npm ci --include=dev`, `npm test`, `npm run lint`, `npm run
check`, `npm run build`, `npm run test:e2e`, `npm audit --omit=dev`, and `npm
audit` all passed. Results were 7/7 Vitest tests, 70/70 Playwright desktop and
390×844 phone tests, zero lint/type errors, zero production and full-tree audit
vulnerabilities, and `dist/index.html` present. The build produced 49.89 kB JS
(16.37 kB gzip) and 24.08 kB CSS (5.68 kB gzip).

Twenty-one publicly served files from that build matched the live response
byte-for-byte. `staticwebapp.config.json` is the one remaining build file; it
correctly returns HTTP 404 because it is deployment configuration, not a public
asset.

## Demo, workflow, and recovery

In fresh desktop and phone browser profiles, the one-click demo loaded the
isolated `demo:home-maintenance-receipts` store with three realistic completed
jobs: furnace filter replacement, water-heater service, and gutter cleaning.
The persistent **Demo — sample data, nothing is saved** label, **Reset demo**,
and **Start for real** controls were present. A temporary fourth demo record
saved normally; Reset restored exactly three records. Start for real removed the
demo database and opened an empty real log with zero records.

The live form rejects whitespace-only identity fields and focuses the system
field with a clear correction. A future completion date is blocked by native
validation. A valid record saved, and Reset returned the demo to three records.
The clean browser suite additionally passed backup validation/recovery,
attachment hashing, export, search/filter, limits, keyboard, focus-return,
reduced-motion, 200% text, and mobile layout checks.

## Public claims

Every command declared by `.factory/claims.json` was invoked separately in the
clean checkout. Each ran on both desktop and phone and passed; no claim is
untested.

| Claim IDs with passing tagged command |
| --- |
| `demo-isolation`, `local-storage`, `no-tracking`, `no-account`, `session-persistence`, `offline-reload` |
| `pwa-install`, `sha-evidence`, `search-filters`, `pdf-pages`, `csv-export`, `json-backup` |
| `safe-restore`, `free-record-limit`, `free-file-limit`, `paid-offer`, `paid-limits`, `license-portability` |

The commands were the registry’s exact form:
`npm run test:claims -- --grep @claim:<id>`.

## Live quality checks

- `/opt/fleet/lib/verify-url.sh` passed: HTTP 200, 613 ms network-idle load,
  no console/page errors, title, `lang="en"`, one h1, main landmark, image
  alternatives, and labelled buttons.
- Playwright axe scans found zero serious or critical violations on `/`, `/log`,
  `/reports`, `/backup`, `/plus`, `/demo`, `/demo/reports`, `/privacy/`,
  `/terms/`, and a missing route. The standalone axe CLI could not locate this
  container’s Chrome binary; the allowed Playwright axe integration was used
  instead.
- The installed live manifest returned `application/manifest+json`, uses
  standalone display, has 192, 512, and maskable 512 icons, and Chromium
  reported no installability errors. A separate fresh context reloaded `/demo`
  offline with the three records, demo banner, and **Working offline** status.
- Deep routes updated their titles and h1s. An unknown route returned the
  designed HTTP 404, **Page not found**, and a Return home link.
- Normal use made requests only to the product origin. Root response policies
  include a self-only CSP (with the documented billing connection),
  `frame-ancestors 'none'`, `X-Frame-Options: DENY`, no-referrer policy,
  permissions policy, nosniff, and HSTS.
- The live Plus page made its expected checkout availability request, received
  the deliberate 404, then showed **purchases are temporarily unavailable**
  with no price and no buy link. Free records, exports, and offline use stayed
  available.

## Earlier finding disposition

All earlier Verification 1–4 findings remain fixed or are intentionally and
correctly handled: backup structural/hash checks, whitespace validation,
identifier escaping, fatal-storage retry under CSP, license-cache protection,
mobile legal targets, response policies, manifest/cache configuration, billing
verify rate limiting, isolated demo, claim registry, form contrast, first-screen
copy, real routes, metadata, standard shell, and designed 404.

This product is a static local-first PWA. It has no product backend, tenant
service, server-side persistence, or product-owned health/rate-limit endpoint;
backend tenant/restart checks do not apply.

## Evidence

Live desktop landing/demo and phone landing screenshots are in
`/work/.evidence/verify5-live-*.png`. URL-verifier output is in
`/work/.evidence/verify5-url/verify.json`.
