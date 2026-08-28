# Independent product verification 3 — FAIL

- **Candidate tested:** `777e6d0b185747555f8daec33a5a6526d3db6817`
- **Live URL:** <https://home-maintenance-receipts.sociobot.in>
- **Verified:** 2026-08-28 UTC
- **Work order:** `home-maintenance-receipts-verify-3`

## Verdict

**FAIL.** The deployed application is the exact tested candidate and its
local-first maintenance-record workflow passes the repository and browser
quality gates. However, it advertises a $29 one-time House File Plus purchase
that cannot be started: its required production checkout endpoint returns 404.
That makes the paid-unlock portion of the accepted product unavailable.

## Release blocker

### High — advertised purchase endpoint is unavailable

The deployed Plus link targets the required production URL:

`https://api.sociobot.in/api/v1/products/home-maintenance-receipts/checkout`

Fresh GET evidence on 2026-08-28 UTC:

```text
HTTP/2 404
{"error":"enabled factory product","status":404}
```

`GET https://api.sociobot.in/api/v1/products` returned live mode with 71
products and no `home-maintenance-receipts` slug. The invalid-license verify
route is reachable (200, `valid:false`, `Cache-Control: no-store`), but cannot
make the unavailable purchase flow usable. Factory/billing must register and
enable the product with return URL `https://home-maintenance-receipts.sociobot.in/`.

## Deployment identity

A detached clean checkout at the candidate SHA was installed and built. SHA-256
comparison of every public build artifact found **17/17 identical** to the live
site: index, hashed JS/CSS/map, images, icons, manifest, service worker,
offline assets, and both legal pages. This is not a stale or deployment-only
failure.

Examples: `index.html` SHA-256 was
`8af34e308cee0615188b124cb60828711ca1582ddb63cae980cdc9d49d633e94` in
both locations; live JS was `assets/app-BHptxpCV.js` (38,245 bytes).

## Clean-checkout quality gates

| Gate | Result | Evidence |
| --- | --- | --- |
| `npm ci --include=dev` | PASS | 137 packages; audit reported zero vulnerabilities |
| `npm test` | PASS | 2 files, 5/5 tests |
| `npm run lint` | PASS | ESLint clean |
| `npm run check` | PASS | strict TypeScript clean |
| `npm run build` | PASS | exact production command; `dist/` produced |
| `npm run test:e2e` | PASS | 24/24 Playwright cases, desktop + 390×844 |
| `npm audit --omit=dev` / `npm audit` | PASS | zero vulnerabilities in each |

Output budget: JS 38,245 bytes raw / 13,084 gzip, CSS 19,417 / 4,851 gzip,
hero WebP 19,528 bytes, and no font payload. All supplied static-PWA budgets
pass. Fresh mobile Lighthouse on live scored Performance 100, Accessibility
100, Best Practices 100, SEO 100; FCP 1.0 s, LCP 1.2 s, TBT 0 ms, CLS 0.

## Product and browser evidence

- Live normal workflow: created a Heating & cooling / Replaced furnace filter
  record with provider, $0 cost boundary, next-due date, text receipt, and a
  visible SHA-256 evidence hash; generated `my-home-maintenance-report.pdf`.
  The live page reported no console/page errors and made no cross-origin
  request in normal record use.
- Candidate browser suite covered reload persistence, PDF and JSON backup,
  full restore, invalid/tampered backup rejection, crafted-ID rejection,
  whitespace-only required fields, keyboard record workflow, legal routes,
  attachment hashing, and offline reload.
- Search no-results and recovery, edit, delete confirmation, 25-record limit,
  date/cost/file-size validation, CSV export, and two-system PDF behavior are
  covered by the candidate workflow/regression checks.
- Live axe scan in the populated report state found zero serious/critical
  findings. Desktop and 390 px test coverage found zero serious/critical axe
  findings in empty/form/dark/offline states. At 390 px, width equalled scroll
  width (390 px); Privacy and Terms controls measured at least 44 px high.
- Keyboard smoke: first Tab exposes the skip link; the candidate suite then
  enters main, opens the form, and returns focus to its opener on Escape.
  Focus is visibly styled. Under reduced motion, button transition duration
  was `0s`.

## PWA, privacy, and response policy

- The live manifest has standalone display, versioned start URL, valid 192/512
  and maskable icons, and product colors. A controlled live offline reload
  showed the full UI and `Working offline`.
- Service-worker update simulation against the local production artifact
  installed a changed cache version, showed `Update now`, activated it, and
  left only `hmr-qa-v6-shell` and `hmr-qa-v6-runtime` caches. The temporary
  artifact was rebuilt immediately afterward.
- Records and attachments remain in IndexedDB; normal use has no analytics,
  remote fonts, CDN scripts, or uploads. PDF/CSV/JSON are generated locally.
  The only configured external connection is the Sociobot billing verification
  endpoint after a license is supplied.
- Live headers include a self-only CSP with the billing connection allowlist,
  `frame-ancestors 'none'`, `X-Frame-Options: DENY`, restrictive
  Permissions-Policy, `Referrer-Policy: no-referrer`, nosniff, and HSTS.
  Hashed assets are immutable for one year; `sw.js` is no-cache/no-store and
  manifest MIME is `application/manifest+json`.

## Billing API rate-limit check

This previously failed external check now **passes**. A 300-request rapid burst
to the invalid-license verification endpoint observed 6 HTTP 200 and 294 HTTP
429 responses; thus 429 began within the first 7 requests in that concurrent
burst. A follow-up browser-origin request returned HTTP 429 with
`Retry-After: 2` (and `x-ratelimit-after: 2`). A 30-request sequential smoke
also started returning 429 on request 2. The precise allowance varies by API
instance/window, but the required 429 plus Retry-After behavior is present.

No sign-in, product-owned backend/persistence boundary, or library/CLI package
applies to this static local-first PWA. No product source was modified during
verification.

## Reproduce

```sh
git worktree add --detach /tmp/hmr-qa3 777e6d0b185747555f8daec33a5a6526d3db6817
cd /tmp/hmr-qa3
npm ci --include=dev
npm test
npm run lint
npm run check
npm run build
npm run test:e2e
npm audit --omit=dev
npm audit
```
