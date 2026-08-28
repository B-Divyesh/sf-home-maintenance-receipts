# Independent product verification 2 — FAIL

- **Verdict:** FAIL
- **Candidate:** `20ef0cd9ee45b9c4ccb6c8181c03374e4408b1fd`
- **Live URL:** <https://home-maintenance-receipts.sociobot.in>
- **Verified:** 2026-08-28 UTC
- **Work order:** `home-maintenance-receipts-verify-2`

The application build is deployed correctly and the normal free, local-first
workflow is polished and functional. It nevertheless fails the acceptance
contract: the advertised purchase cannot begin, the billing verification API
does not rate-limit a sustained burst, restored identifiers can inject markup
into the ledger, and the CSP disables the only recovery control in the local
storage fatal state.

## Deployment identity

Candidate `20ef0cd9ee45b9c4ccb6c8181c03374e4408b1fd` was checked out detached into a
fresh `/tmp/hmr-verify2-*` worktree. Dependencies and build artifacts were not
present before `npm ci` and `npm run build`.

All 17 publicly served files in the clean `dist/` matched the live files
byte-for-byte, including HTML, hashed JS/CSS/source map, images, icons, legal
pages, manifest, offline page, and service worker. For example:

- `index.html`: SHA-256
  `222786393d0da2a5b29f6188b74ba2160ce1837d1063afb3402229e8e6fdcfdb`
- `assets/app-6tGx_W49.js`: SHA-256
  `87dc4c87cdb43028f9085da58571d960196c4719fca8d14a8d6885c71d994e69`
- `assets/app-D2cBAXbr.css`: SHA-256
  `e854cc3030d2da5651c7807096e136ce73f285d9f3c94103ff965566f4afca45`
- `sw.js`: SHA-256
  `2a463c0cc72c4263d9d3b175743471c41c01f12a93d5e4d8026b6d9c45e22d1c`

This is not a stale- or failed-deployment result.

## Release-blocking defects

### High — the advertised $29 one-time purchase cannot begin

- The rendered buy link correctly targets the required production route:
  `https://api.sociobot.in/api/v1/products/home-maintenance-receipts/checkout`.
- A fresh GET returned HTTP 404 and
  `{"error":"enabled factory product","status":404}`.
- `GET /api/v1/products` returned 48 products and no
  `home-maintenance-receipts` entry.
- The verify route itself is reachable and an invalid token correctly returned
  HTTP 200 with `{"expires_at":null,"reason":"invalid","valid":false}`.

House File Plus is advertised and the free record limit routes users to this
purchase, so the unavailable checkout is a release blocker. Registration is a
factory/billing dependency, but the observed product remains incomplete.

### High — the product-unlock verification endpoint has no observed rate limit

The work order explicitly requires a rapid API burst to begin returning 429
with `Retry-After`. Two immediate bursts totaling 1,200 GET requests were sent
to the public invalid-token verify route. All 1,200 returned HTTP 200; none
returned 429 and no `Retry-After` threshold was observed. The normal response
does correctly use `Cache-Control: no-store` and allows the live product origin
through CORS.

This is factory API behavior rather than static-app code, but it is part of the
required paid-unlock surface and fails the release contract.

## Other defects

### Medium — a crafted backup identifier injects arbitrary ledger markup

Restore validates record IDs only as non-empty strings up to 200 characters.
The ID is then interpolated without HTML attribute escaping into
`data-record-id`, `data-edit`, and `data-delete` in `src/main.ts`.

A valid version-1 backup used this record ID:

```text
qa"><p id="injected-marker">Injected backup markup</p><span data-qa="
```

The live app reported the backup as checked, offered `Replace and restore`, and
after restore rendered three `#injected-marker` elements; the injected text was
visible in the page. The production CSP prevents the simplest inline-script
payloads, but it does not prevent arbitrary DOM/content alteration. Restrict
restored IDs to the app's UUID format and escape every identifier used in an
HTML attribute.

### Medium — CSP blocks the only fatal-storage recovery button

With IndexedDB deliberately made unavailable before startup, the live app
correctly rendered `Your home file could not open.` and a `Try again` button.
That button uses the inline handler `onclick="location.reload()"`. The shipped
`script-src 'self'` CSP blocked it:

```text
Executing inline event handler violates ... Content Security Policy ...
The action has been blocked.
```

Clicking did not issue another document request (one before and one after) and
the fatal screen remained. Bind the action from the module rather than with an
inline event handler.

### Low — a callback license remains in cache metadata after URL stripping

A controlled live callback with `?license=qa-secret-verification-token` stored
the token in the required localStorage key, stripped it from the visible URL,
verified once, and reused the daily cached verdict after reload. However:

- the initial hashed JS and CSS requests carried the full callback URL in their
  same-origin `Referer` header; and
- `hmr-v4-runtime` retained
  `https://home-maintenance-receipts.sociobot.in/?license=qa-secret-verification-token`
  as a cache key after the address bar was clean.

No third-party origin received the token in this test, and the token is already
intentionally stored in localStorage, so this is low severity. Avoid caching
navigation URLs containing `license` and use a stricter referrer policy on the
callback document.

## Clean-checkout quality gates

Environment: Node 22.23.2, npm 10.9.8, Playwright 1.58.2 with the supplied
Chromium.

| Gate | Result | Fresh evidence |
| --- | --- | --- |
| `npm ci --include=dev` | PASS | 137 packages installed; zero vulnerabilities |
| `npm test` | PASS | 2 files, 5/5 Vitest tests |
| `npm run lint` | PASS | ESLint completed with no findings |
| `npm run check` | PASS | strict TypeScript completed with no diagnostics |
| `npm run build` | PASS | exact `tsc -b && vite build`; `dist/index.html` produced |
| `npm run test:e2e` | PASS | 16/16 across desktop Chromium and 390×844 Chromium |
| `npm audit --omit=dev` | PASS | zero production vulnerabilities |
| `npm audit` | PASS | zero full-tree vulnerabilities |

The generated service-worker test mutation was removed by a final clean
`npm run build`; the detached worktree was clean afterward.

## End-to-end and boundary evidence

- Created a complete heating/cooling record with provider, `$0.00` lower-bound
  cost, far-future next-due date, notes, and text evidence. The saved SHA-256
  prefix and downloaded bytes matched
  `331e302ae1b7616dab16606caa084852f285cc996e484ea60d7266455affa326`.
- Reload persistence, provider search, no-results recovery, edit-with-evidence
  retention, and the 25-record free boundary all worked. Record 26 routed to
  the Plus explanation rather than opening the form.
- Future completion dates, negative cost, cost above `9,999,999`, whitespace-
  only required identity, and a 5,000,001-byte free-tier file were rejected.
  Cost `9,999,999` remained valid.
- PDF export produced `%PDF-1.4` with `/Count 1` for one system. JSON included
  the original base64 evidence and digest; CSV included provider and digest.
  Invalid JSON reported `No data was changed` and preserved the record.
- Repository regression tests independently covered valid full restore,
  incomplete-backup rejection, forged-hash rejection, deletion, and desktop/
  mobile behavior.

## Accessibility, responsive behavior, and visual review

- Factory `verify-url.sh`: HTTP 200; title, `lang="en"`, one h1, main landmark,
  image alt, and button labels passed; zero console/page errors.
- Independent axe scans found zero serious/critical violations in desktop
  empty, form, populated ledger, reports, backup, mobile empty/form, mobile
  dark, and populated-offline states.
- Keyboard-only: first Tab exposed the skip link with a 3 px focus outline;
  Enter focused `main`; the next Tab reached `Log completed work`; Enter opened
  the dialog with the system field focused; Escape returned focus to the opener.
- At 390×844, document and viewport widths were both 390 px. Every visible
  link, button, input, select, textarea, and summary tested at least 44×44 CSS
  px. Desktop and mobile screenshot review found no clipped primary content.
- Under reduced motion, both dialog animation and button transition durations
  computed to `0s`. Light and dark treatments remained axe-clean.

## PWA, privacy, response policy, and performance

- Fresh normal use made no cross-origin requests. Source/build audit found no
  analytics, tracking, CDN scripts, or remote fonts. Records, hashes, backups,
  CSV, and PDF stay local; only license verification targets the Sociobot API.
- Manifest identity, standalone display, versioned start URL, 192/512/maskable
  icons, theme/background colors, and scope are present. Chromium reported zero
  installability errors locally and live.
- A live controlled offline reload rendered the full app and `Working offline`;
  a live record survived another offline reload, and `/terms/` loaded offline.
- Update simulation changed only the generated test `sw.js` cache version. The
  in-app `A fresh blueprint is ready` / `Update now` flow activated the new
  worker, left only `hmr-qa-v5-shell` and `hmr-qa-v5-runtime`, retained an
  activated controller, and logged no errors.
- Live responses include the self-only CSP, `frame-ancestors 'none'`,
  `X-Frame-Options: DENY`, restrictive Permissions Policy, referrer policy,
  nosniff, and HSTS. The manifest is `application/manifest+json`; hashed assets
  are `max-age=31536000, immutable`; `sw.js` is no-cache/no-store.
- Production bundle: JS 38,043 bytes raw / 13.18 KB gzip; CSS 19,417 bytes raw /
  4.84 KB gzip; hero WebP 19,528 bytes; no font payload. All supplied budgets
  pass.
- Lighthouse 13.4.1 mobile live: Performance 99, Accessibility 100, Best
  Practices 100; FCP 1,052 ms, LCP 1,285 ms, TBT 100 ms, CLS 0, Speed Index
  1,067 ms, interactive 1,292 ms, no run warnings.

Sign-in, a product-owned backend, and library/CLI consumer packaging are not
applicable to this static local-first PWA. No product source was modified during
verification.

## Reproduction commands

```sh
git worktree add --detach /tmp/hmr-verify2 20ef0cd9ee45b9c4ccb6c8181c03374e4408b1fd
cd /tmp/hmr-verify2
npm ci --include=dev
npm test
npm run lint
npm run check
npm run build
npm run test:e2e
npm audit --omit=dev
npm audit
```
