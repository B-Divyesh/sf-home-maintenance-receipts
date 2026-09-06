# Review 1 — Home Maintenance Receipts

- **Verdict:** **PASS**
- **Finding count:** 0
- **Untested claim count:** 0
- **Implementation reviewed:** `e06a2ccf83e57828131697cfa5a4ff7022aecb28`
- **Documentation reviewed:** `ffb8f548750df9e2bd7c473428c90be44ceb1f6c`
- **Report commit at review start:** `78b41071283df92b15289468b02186fbc079a8c6`
- **Live URL:** <https://home-maintenance-receipts.sociobot.in>
- **Reviewed:** 2026-09-06 UTC
- **Work order:** `home-maintenance-receipts-review-1`

The product passes this strict review. It is a static, local-first PWA; it has
no product backend, tenant service, server-side product state, health endpoint,
or product-owned request allowance to test. Tenant isolation, restart
persistence, and health checks therefore do not apply.

## First screen before scrolling

Fresh browser contexts opened the live landing page at scroll position zero on
desktop (1440×1000) and phone (390×844). Both said:

- **Job:** Keep proof of completed home maintenance.
- **Audience:** Households that need dates, providers, and receipts ready when
  they sell, insure, or troubleshoot a home.
- **First action:** **Try it with sample data**. It opens three completed jobs
  with receipts.

Both screens had one `h1` and one `main`. The three plain facts were visible
before scrolling: records stay on this device, work offline after the first
visit, and free use covers 25 records. Their lower edge was 587 px on desktop
and 745 px on the 844-px phone. No console or page errors occurred on either
landing load.

## Clean candidate and public claims

A detached clean worktree at the implementation SHA had no dependencies or
build output before installation. These commands passed:

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

Results were 7/7 Vitest tests, no lint or TypeScript errors, a production
`dist/index.html`, 70/70 Playwright desktop and 390×844-phone tests, and zero
production or full-tree audit vulnerabilities. Build output was 49.89 kB JS
(16.37 kB gzip) and 24.08 kB CSS (5.68 kB gzip).

The first combined browser-suite attempt recorded one non-reproducing mobile
axe-test failure. Its isolated retry passed, and a complete immediate rerun
passed 70/70. The test's error context contained no product console error or
accessibility violation; this was not reproducible and is not a product
finding.

All 18 exact commands declared by `.factory/claims.json` were then run
individually from that clean worktree. Each passed in both desktop and phone
projects (two tests per command):

`demo-isolation`, `local-storage`, `no-tracking`, `no-account`,
`session-persistence`, `offline-reload`, `pwa-install`, `sha-evidence`,
`search-filters`, `pdf-pages`, `csv-export`, `json-backup`, `safe-restore`,
`free-record-limit`, `free-file-limit`, `paid-offer`, `paid-limits`, and
`license-portability`.

The registry IDs and tagged tests match exactly. The landing page and README
were also cross-checked against the registry; no additional public product
claim was found without a declared observable test.

## Live product checks

- A byte comparison covered all 22 public files in a clean candidate build.
  All matched the live responses. `staticwebapp.config.json` is deployment
  configuration and was correctly excluded from public files.
- A fresh `/demo` profile contained furnace-filter, water-heater, and gutter
  sample work in `demo:home-maintenance-receipts`. The persistent demo label,
  **Reset demo**, and **Start for real** were present. A temporary dryer record
  was added, Reset removed it and restored exactly the three samples, and Start
  for real removed the demo label and opened an empty real `/log` database.
  This disposable browser profile did not read or change any existing real
  user record.
- A fresh phone profile waited for service-worker control, went offline, and
  reloaded `/demo`. It retained the sample record, the demo label, and
  **Working offline**, with no console or page errors.
- `/opt/fleet/lib/verify-url.sh` passed on the live root: HTTP 200, 581 ms
  network-idle load, title, `lang="en"`, one `h1`, `main`, image alternatives,
  labelled buttons, and no errors.
- Playwright axe scans found zero serious or critical issues on `/`, `/log`,
  `/reports`, `/backup`, `/plus`, `/demo`, `/demo/reports`, `/privacy/`,
  `/terms/`, and a missing route. The deliberate API 404 on Plus and the
  deliberate document 404 can each appear as a browser failed-resource message;
  neither is an unexpected application error.
- Live routes had their named titles and a single `h1`. `/not-a-real-route`
  returned HTTP 404 with the designed **Page not found** recovery page.
  Privacy and terms returned 200 with route-specific titles and structure.
- Keyboard testing reached the skip link first, Enter focused `main`, form
  opening focused the system field, Escape returned focus to its opener, and
  reduced-motion dialog duration was `0s`.
- Normal demo use made three requests, all to the product origin. There were no
  trackers, remote fonts, scripts, or CDN requests. The root response has the
  self-only CSP with the documented billing connection, anti-framing, no-referrer,
  nosniff, permissions, and HSTS policies.
- Chromium reported zero PWA installability errors. The live manifest uses
  standalone display, the versioned start URL, 192/512/maskable icons, and a
  controlling service worker.
- The live Plus page made its expected checkout-availability request to the
  Sociobot endpoint and received its deliberate HTTP 404. It showed the
  unavailable-purchase message, no `$29` price, and no checkout link. Free
  record use, exports, and offline use remained available.

## Earlier finding disposition

All findings in verification reports 1–4 remain resolved or deliberately
handled:

| Earlier area | Current disposition |
| --- | --- |
| Broken visible checkout, checkout host, and external billing availability | The production endpoint is used. Its current 404 is handled as unavailable purchases, without a price or buy link. |
| Backup shape validation and forged evidence hashes | Clean regression coverage rejects both without replacing the current record. |
| Whitespace identities, crafted record IDs, and fatal-storage retry | Validation, escaping, and module-bound recovery all pass in the 70-case suite. |
| Mobile legal target size and form contrast | Desktop and mobile axe checks pass; mobile target regression remains in the suite. |
| CSP, framing, referrer, permissions, cache rules, and manifest MIME | Live headers and manifest are present; asset comparison and PWA checks pass. |
| Dependency vulnerabilities | Both clean-checkout audit commands report zero vulnerabilities. |
| License callback cache protection and billing verification allowance | Candidate regression coverage passes; the previous verification observed the external API's 429 and `Retry-After`. There is no product backend endpoint to retest. |
| Missing demo, claims, first-screen copy, routes, metadata, shell, and 404 | The live demo, 18-claim registry, first screen, deep routes, legal pages, metadata, standard shell, and designed 404 all pass this review. |

## Evidence note

The requested path `factory-evidence/home-maintenance-receipts-verify-5/qa-report.md`
was not present in this checkout or under `/work`. The complete committed QA
report `.factory/verification-5.md` was available and reviewed in full, along
with all earlier verification reports. This is an evidence-location note, not a
product finding.

## Evidence locations

- `/work/.evidence/review-1-live-desktop.png`
- `/work/.evidence/review-1-live-phone.png`
- `/work/.evidence/review-1-live-demo-reset.png`
- `/work/.evidence/review-1-live-offline-phone.png`
- `/work/.evidence/review-1-url/verify.json`
- `/tmp/hmr-review-1-claims.log` (clean-worktree claim-command output)
