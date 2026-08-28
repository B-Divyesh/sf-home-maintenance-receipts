# Independent product verification — FAIL

- **Verdict:** FAIL
- **Candidate:** `5e4451f37bd39cfc93e1fd2efe5401a9bf8279e0`
- **Live URL:** `https://home-maintenance-receipts.sociobot.in`
- **Verified:** 2026-08-28 UTC
- **Work order:** `home-maintenance-receipts-verify-1`

The candidate is deployed: SHA-256 comparison found every one of the 16 files
in a fresh `dist/` byte-for-byte identical to the corresponding live file,
including `index.html`, app JS/CSS/source map, images, icons, manifest, service
worker, offline page, and legal pages. This is not a deployment-mismatch
failure. The deployed product fails acceptance because checkout is unavailable
and restore does not preserve the integrity and recoverability of the local
home file.

## Release-blocking defects

### High — the advertised $29 purchase cannot start

- The live `Buy House File Plus — $29` link is
  `https://pilot-api.sociobot.in/api/v1/products/home-maintenance-receipts/checkout`,
  not the required release host at `api.sociobot.in`.
- A fresh GET to that exact pilot URL returned HTTP 404 and
  `{"error":"enabled factory product","status":404}`.
- The equivalent production URL also returned HTTP 404, confirming that merely
  switching the hostname is not yet sufficient; product registration/enabling
  is also incomplete.
- License callback handling itself worked in an intercepted browser check: the
  token was stored, removed from the visible URL, and verified once rather than
  again on reload within the daily cache window.

### High — a structurally incomplete backup can make the local file unable to open

- Imported a JSON document with the expected product marker/version, valid
  settings, `records: [{"id":"incomplete-record"}]`, and no attachments.
- The UI called it “Restore checked” and offered `Replace and restore`.
- After confirmation and reload, the live app displayed the fatal state
  `Your home file could not open.`. Restore clears/replaces the local stores
  before later code encounters the incomplete record, so existing records can
  become inaccessible.
- Plain invalid JSON is handled safely and left the existing record intact;
  the defect is the lack of field/type validation for nominal version-1 files.

### High — restored evidence bytes are not checked against their displayed SHA-256

- Restored an otherwise well-formed version-1 backup whose record and attachment
  claimed SHA-256 was 64 zeroes while its attached bytes hashed to
  `f0d59586529506efb2372a4f1203738a89de8e67b9b636bbb35194ede8c550c5`.
- The restore succeeded. The ledger displayed `SHA-256 0000000000…`, while the
  downloaded evidence retained the different bytes and hash above.
- Because completed-work evidence is the core product promise, restore must
  recompute and compare each attachment hash before replacement.

## Other defects

### Medium — required identity fields accept whitespace-only values

Three spaces in both `Appliance or system` and `Completed task` satisfied native
`required` validation. Saving trimmed both values to empty strings and created a
row identified only by `Aug 28, 2026`, with no system or task. Negative cost,
cost over `9,999,999`, future completion date, and a 5,000,001-byte free-tier
file were correctly rejected.

### Medium — two mobile legal links miss the 44 px target baseline

At the 390×844 viewport, the footer `Privacy` target measured 45×19 CSS px and
`Terms` measured 37×19 CSS px. All other visible buttons, links, inputs, selects,
and summaries on the empty screen met 44×44. Axe does not detect this geometry
failure.

### Medium — browser isolation policies are incomplete

Live responses include HSTS, `Referrer-Policy: strict-origin-when-cross-origin`,
and `X-Content-Type-Options: nosniff`, but do not include a Content Security
Policy or either `frame-ancestors`/`X-Frame-Options`. `Permissions-Policy` is
also absent. This local-data product stores a paid-license token in localStorage,
so explicit script/source and framing restrictions should be set at the host.

### Low — caching and manifest response metadata need release tuning

All inspected HTML, JS, CSS, image, manifest, and service-worker responses use
`Cache-Control: public, must-revalidate, max-age=30`; static assets are not
long-lived/immutable. `manifest.webmanifest` is served as
`application/octet-stream` instead of `application/manifest+json`. Chromium
still parsed the manifest and reported zero installability errors.

### Low — development dependency audit is not clean

`npm audit` reports 5 development-only advisories (3 moderate, 1 high, 1
critical), including direct `vite` and `vitest` advisories. `npm audit
--omit=dev` reports zero production vulnerabilities; the shipped app has no
runtime npm dependencies.

## Clean-checkout gates

The candidate was checked out detached into `/tmp/hmr-qa-DBgcR1`; there were no
pre-existing dependencies or build artifacts. Environment: Node 22.23.2, npm
10.9.8, Playwright 1.58.2 with the supplied Chromium.

| Gate | Result | Evidence |
| --- | --- | --- |
| `npm ci --include=dev` | PASS | 62 packages installed from lockfile |
| `npm test` | PASS | 1 file, 3/3 Vitest tests |
| `npm run check` | PASS | strict TypeScript build completed with no diagnostics |
| Lint | N/A | no lint script or lint configuration exists |
| `npm run build` | PASS | exact `tsc -b && vite build`; produced `dist/` |
| `npm run test:e2e` | PASS | 10/10 across desktop Chromium and 390×844 mobile |
| `npm audit --omit=dev` | PASS | 0 production vulnerabilities |
| Full `npm audit` | WARN | 3 moderate, 1 high, 1 critical; development only |

Production output: JS 33,837 bytes raw / 12.02 KB gzip, CSS 19,325 bytes raw /
4.77 KB gzip, hero WebP 19,528 bytes, no font payload. These meet the 200 KB JS,
50 KB CSS, 300 KB hero, and 120 KB font budgets.

## End-to-end and boundary coverage

- Created a representative heating record with provider, zero-dollar boundary,
  next-due date, notes, and a text receipt. Its SHA-256 was
  `15184660d8db9ff58ad9a67adb6862d1c7436851d1e2ce5db79eba63dc180586`;
  the displayed prefix and downloaded bytes matched after reload.
- Exercised search by provider, no-result recovery, edit with evidence retained,
  delete cancellation and confirmed deletion, settings/backup view, CSV export,
  complete JSON export including attachment bytes, and invalid-JSON recovery.
- Generated a valid `%PDF-1.4` report. A two-system case contained `/Count 2`
  and both system names, confirming one page per system.
- Restored 25 valid records and confirmed that opening record 26 routes to the
  Plus screen instead of opening the form.
- Fresh normal use made no cross-origin requests. There are no external fonts,
  scripts, analytics, or record uploads. The only configured third-party origin
  in the bundle is the pilot billing API, used after a license is supplied or
  checkout is selected.
- Privacy and terms routes returned 200 and accurately describe local IndexedDB,
  exports, billing verification, and the non-certification limitation.

## Accessibility, responsive behavior, and errors

- Factory `verify-url.sh`: HTTP 200, 651 ms network-idle load, title/lang/one
  `h1`/`main`/alt/button labels passed, zero console or page errors.
- Independent axe scans found zero serious/critical violations in empty light,
  empty dark, record dialog, populated ledger, backup/settings, system report,
  and 390 px reduced-motion states.
- Keyboard-only flow reached the skip link and primary action, completed and
  submitted a record form, reached the row edit action, and returned focus to
  the opener after Escape. The focus ring measured 3 px and was visible.
- At 390 px, document width equaled viewport width (390 px). No horizontal page
  overflow occurred. Desktop and mobile visual inspection found no clipped or
  unreadable primary content.
- Under `prefers-reduced-motion: reduce`, dialog animation and transition
  durations were `0s`.
- Normal desktop/mobile, offline, and export flows produced zero console or
  uncaught page errors. The malformed restore failure above is the exception.

## PWA, offline, performance, and deployment policies

- Manifest has name/short name, versioned start URL, standalone display,
  product colors, 192×192 and 512×512 icons, plus a 512×512 maskable icon.
  Chrome `Page.getInstallabilityErrors` returned an empty list.
- After service-worker control, a real offline reload showed the full app and
  `Working offline`; a record created offline survived another offline reload;
  `/privacy/` also loaded offline from precache.
- Update simulation served a changed SW version without altering candidate
  code. The in-app `Update now` toast appeared; selecting it activated the
  waiting worker, removed `hmr-v3-*`, left `hmr-qa-v4-shell/runtime`, and kept a
  controlling activated worker.
- Lighthouse 13.4.1 mobile on the live URL: Performance 100, Accessibility 100,
  Best Practices 100; FCP 1.0 s, LCP 1.1 s, TBT 50 ms, CLS 0, Speed Index 1.0 s,
  interactive 1.2 s; no run warnings.
- HTTPS uses HTTP/2 and Brotli where applicable. HSTS is
  `max-age=10886400; includeSubDomains; preload`.

## Reproduction commands

```sh
git worktree add --detach /tmp/hmr-qa 5e4451f37bd39cfc93e1fd2efe5401a9bf8279e0
cd /tmp/hmr-qa
npm ci --include=dev
npm test
npm run check
npm run build
npm run test:e2e
npm audit --omit=dev
```

No product source was modified during verification.
