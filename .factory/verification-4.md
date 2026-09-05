# Verify home maintenance records and receipts — verification 4

- **Verdict:** **FAIL**
- **Finding count:** 6
- **Untested claim count:** 18
- **Implementation reviewed:** `1965b5a1cfc84f667d42dfa4eb99f2d1f88f94cb`
- **Documentation commit:** `5ce2121d93957afecf0c0599b3db352eeeff1841`
- **Live URL:** <https://home-maintenance-receipts.sociobot.in>
- **Verified:** 2026-09-05 UTC
- **Work order:** `home-maintenance-receipts-verify-4`

The repaired checkout handling works. The deliberate billing 404 produces an
unavailable message, no price, and no purchase link; license restore remains.
The product still fails acceptance because the required demo and claim system
are absent, the clean browser suite fails a serious contrast check, and the
first screen, routing, 404, metadata, and site-wide structure do not meet the
attached contracts.

## What the first screen says before scrolling

- **Job:** log completed home maintenance with its date, provider, receipt, and
  next due date. The page implies this through “Find the work, date, provider,
  and proof behind your home,” but does not use it as the page title or h1.
- **Audience:** not stated on the page. The researched audience is households
  that need a usable history of home maintenance and supporting documents.
- **First action:** `Log completed work` or `Log your first job`.
  `Try it with sample data` is absent.

This was checked at scroll position zero in fresh 1440×1000 and 390×844
Chromium contexts. Screenshots are in `/work/.evidence/`.

## Findings

### High — the required sample demo does not exist and `/demo` uses real storage

There is no `Try it with sample data` action on the first screen. Opening
`/demo` returns the normal empty app with the normal title. It has no realistic
sample, no persistent `Demo — sample data, nothing is saved` label, no
`Reset demo`, and no `Start for real`. `.factory/demo.md` is also absent.

A live isolation probe in a fresh, disposable browser context created a record
at `/demo`, then opened `/`. The record appeared at `/`, and the only IndexedDB
database was `home-maintenance-receipts`. The route therefore uses the real
namespace instead of an isolated `demo:` namespace. No existing user profile or
real record was touched; the whole browser context was destroyed afterward.

Evidence: `/work/.evidence/verify4-demo-route.png`,
`/work/.evidence/verify4-demo-isolation.json`.

### High — 18 public claims have no declaration or required tagged test

`.factory/claims.json` is absent. No repository test contains an
`@claim:<id>` tag, and no claim command can be run from the required demo entry
point. The existing unit and browser tests incidentally cover parts of the
behavior, but they do not satisfy the contract that every public claim be
listed and have exactly one tagged observable test.

The 18 unique public claims, with duplicate wording counted once, are:

| # | Public claim |
| --- | --- |
| 1 | Records and attachments stay in browser storage and are not uploaded. |
| 2 | The product has no advertising trackers, behavioral analytics, CDN scripts, or remote fonts. |
| 3 | Normal use needs no account. |
| 4 | Saved records persist across reloads and browser sessions. |
| 5 | The complete home file works offline after the first visit. |
| 6 | The product installs as a PWA. |
| 7 | Attachments are hashed with SHA-256 and the original file remains available. |
| 8 | Search, filters, and due-state flags locate completed work. |
| 9 | PDF export creates one system sheet or page per home system. |
| 10 | CSV export contains record data and evidence hashes but not evidence files. |
| 11 | JSON backup contains every record, setting, and original evidence file. |
| 12 | Restore checks the backup before replacement and leaves current data unchanged when invalid. |
| 13 | The free tier holds 25 completed-work records. |
| 14 | The free tier allows one evidence file per record up to 5 MB. |
| 15 | House File Plus costs $29 once, with no subscription. |
| 16 | House File Plus allows unlimited records and evidence files up to 15 MB. |
| 17 | The buy link appears only when checkout is available and stays hidden on the verifier’s 404. |
| 18 | License callback, restore, local storage, and at-most-daily verification work across devices. |

Required claim result: **0 declared commands, 18 untested claims**.

### High — the clean Playwright gate fails a serious form contrast check

`npm run test:e2e` finished with 25 passed and 1 failed. Desktop Chromium found
a serious axe `color-contrast` violation in the record form. In the clean run,
small form text used `#76858d` against `#fffdf7` or `#f8f9f5`, measured at
3.60–3.74:1 instead of 4.5:1. The live form independently reproduced a serious
violation on the attachment label and help text at 4.41:1.

The empty, populated, checkout-unavailable, mobile dark, and offline states had
zero serious or critical axe findings. Lighthouse scored the empty first screen
at 100 for accessibility, but that does not cover the failing form state.

Evidence: the clean Playwright trace at
`/tmp/hmr-verify4-yoPxTg/test-results/app-passes-an-automated-ac-92180-an-in-empty-and-form-states-chromium/trace.zip`
and `/work/.evidence/verify4-live-browser.json`.

### Medium — first-screen and copy contracts are incomplete

The h1 is the product name, `Home Maintenance Receipts`, rather than a headline
that names the job. The audience is absent. The document title and main empty
state use the metaphor “paper trail.” Other interface text includes “filing
cabinet,” “More room for the life of your home,” and “A fresh blueprint is
ready,” despite the plain-words rule against metaphor and mood headings.

The first screen also lacks the required three short facts and the landing page
does not include the required `How it works`, limits/privacy, and paid-tier
sections in order. `.factory/copy-audit.md` is absent, so the required sentence
and terminology audit was not performed.

### Medium — app sections are not routes and unknown paths are not a product 404

Maintenance log, system reports, backup, and Plus are buttons that replace
markup while the URL and document title remain `/` and the root title. There is
no History API navigation, no deep link for an app section, and back/reload
cannot restore the section. The route change focuses `<main>`, but does not move
focus to a route h1 or announce a route title.

`/not-a-real-route` and `/404` both return HTTP 200 and render the normal app.
There is no designed product 404 route with a way back. The deliberate billing
API 404 is separate and expected; it is not counted as this defect.

### Medium — required discovery metadata and site-wide header/footer are absent

The root lacks a canonical link, Open Graph metadata, Twitter card metadata,
the required 1200×630 product image reference, and an Apple touch icon.
`robots.txt` and `sitemap.xml` both return 404. The root wordmark is not a home
link. Privacy and terms use a separate header with no skip link or standard
navigation. Footers do not say `Built by Param Factory` or include a build ID.

The live privacy and terms pages themselves return 200, have accurate route
titles, one h1, and a main landmark. Their `mailto:` contact links are valid
explicit mail links.

## Deployment identity

A detached clean worktree at the implementation SHA had no `node_modules` or
`dist` before installation. After a production build, all 17 publicly served
files matched the live site byte for byte. This includes HTML, hashed JS/CSS and
source map, images, icons, legal pages, manifest, offline files, and service
worker. There were zero mismatches. The live app is the implementation tested;
this is not a stale deployment result.

## Clean-checkout commands

| Command | Result | Evidence |
| --- | --- | --- |
| `npm ci --include=dev` | PASS | 137 packages; zero vulnerabilities reported |
| `npm test` | PASS | 2 files, 5/5 tests |
| `npm run lint` | PASS | no lint findings |
| `npm run check` | PASS | strict TypeScript passed |
| `npm run build` | PASS | `dist/index.html` produced |
| `npm run test:e2e` | **FAIL** | 25/26; serious desktop form contrast violation |
| `npm audit --omit=dev` | PASS | zero vulnerabilities |
| `npm audit` | PASS | zero vulnerabilities |
| Declared claim commands | **FAIL** | claims file missing; 18 public claims untested |

Production output remains within budget: JavaScript 39,412 bytes raw / 13.56
KB gzip, CSS 19,834 bytes raw / 4.92 KB gzip, hero WebP 19,528 bytes, and no
font payload.

## Live workflow and boundary evidence

- In a disposable desktop context, created a realistic `Heating & cooling` /
  `Replaced furnace filter` record with provider, cost, next-due date, notes,
  and a text receipt. The populated ledger showed all fields and a SHA-256
  prefix, and the record survived reload.
- PDF download was `%PDF-1.4`, 3,234 bytes, and contained `/Count 1`. JSON held
  one record, one evidence file, a data URL, and the full digest. CSV contained
  the documented columns and record.
- Future completion date, negative cost, and cost above `9,999,999` were
  rejected. `9,999,999` was accepted. Whitespace-only identity moved focus to
  the field and explained the correction. A 5,000,001-byte free-tier file was
  rejected with the 5 MB message.
- Invalid JSON preserved the current record. Candidate tests for incomplete,
  hash-tampered, and crafted-ID backups passed in both desktop and mobile
  projects. Valid delete, export, and restore also passed before the suite’s
  unrelated contrast failure.
- Search no-results and clear-filter recovery worked. Record 26 did not open a
  form; it opened Plus and explained the 25-record free limit.
- All contexts were new and disposable. No existing browser profile, user
  record, or real home file was read or changed.

## Accessibility, phone, keyboard, and motion

- `/opt/fleet/lib/verify-url.sh` passed: HTTP 200, title, `lang=en`, one h1,
  main landmark, image alternatives, labelled buttons, and no initial console
  or page errors. Network-idle load was 801 ms.
- Keyboard-only use exposed the skip link first, moved to main, opened the
  record form, focused the first input, and returned focus to the opener on
  Escape. There was no keyboard trap.
- At 390×844, the normal page width equaled the viewport, all measured visible
  controls met 44×44 CSS px, and the form fit without horizontal page overflow.
- At 200% root text size, all content remained readable. The page became 405 px
  wide because the local-status text extended 15 px; no content was lost, so
  this is recorded as evidence rather than a separate finding.
- Reduced-motion mode produced `0s` dialog animation and `0s` button transition.

## Offline, update, privacy, performance, and billing

- After service-worker control, a live record survived a real offline reload;
  the app showed `Working offline` and had zero serious/critical axe findings.
- A local update simulation changed only the generated `dist/sw.js` cache
  version. `A fresh blueprint is ready` and `Update now` appeared. Activation
  left only `hmr-verify4-v6-shell` and `hmr-verify4-v6-runtime`, with an active
  controller and no errors. A clean build restored the candidate artifact.
- Chromium reported zero PWA installability errors. The manifest has standalone
  display, versioned start URL, 192/512 icons, and a maskable icon.
- Normal record and export use contacted only the product origin. Opening Plus
  made the documented checkout-availability request. There are no analytics,
  remote fonts, or CDN scripts. CSP, anti-framing, permissions, no-referrer,
  nosniff, HSTS, immutable hashed assets, manifest MIME, and no-cache service
  worker headers are present.
- An invalid live license callback was removed from the URL, stored locally,
  verified once across callback plus reload, and absent from service-worker
  cache keys.
- The checkout endpoint returned the deliberate 404. The app showed
  `temporarily unavailable`, no `$29`, no buy link, and retained license
  restore in desktop and mobile tests.
- A 300-request billing verification burst returned 3 HTTP 200 and 297 HTTP
  429 responses. The follow-up 429 included `Retry-After: 4` and allowed the
  product origin through CORS.
- Lighthouse 13.4.1 mobile: Performance 100, Accessibility 100, Best Practices
  100, SEO 100; FCP 0.9 s, LCP 1.2 s, TBT 0 ms, CLS 0, interactive 1.2 s.

This is a static local-first PWA. Product-backend tenant isolation and restart
persistence, sign-in, and CLI/library consumer installation are not applicable.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| Pilot checkout host and broken visible purchase link | Fixed. Production endpoint is used, and the 404 hides price and link. |
| Incomplete backup could replace data | Fixed. Desktop and mobile rejection tests pass and preserve current data. |
| Forged evidence hash was accepted | Fixed. Digest is recomputed and mismatch is rejected. |
| Whitespace identity fields were accepted | Fixed. Live and test checks reject and focus the field. |
| Mobile legal targets were below 44 px | Fixed. Current geometry tests pass. |
| CSP, framing, permissions, referrer, and cache policies were absent | Fixed. Live headers and policy tests pass. |
| Manifest MIME and immutable asset caching were wrong | Fixed live. |
| Development dependency audit was not clean | Fixed. Both audits report zero. |
| Billing verification did not return 429/Retry-After | Fixed. Current burst reproduced both. |
| Crafted backup ID injected markup | Fixed. Desktop and mobile regression passes. |
| Fatal-storage retry was blocked by CSP | Fixed. Retry is module-bound and regression passes. |
| License callback token remained in CacheStorage | Fixed. Live callback and regression found zero token-bearing cache keys. |
| Verification 3 checkout blocker | Fixed in the UI. The external product is still unregistered, but no broken purchase is advertised. |

## Reproduce

```sh
git worktree add --detach /tmp/hmr-verify4 1965b5a1cfc84f667d42dfa4eb99f2d1f88f94cb
cd /tmp/hmr-verify4
npm ci --include=dev
npm test
npm run lint
npm run check
npm run build
npm run test:e2e
npm audit --omit=dev
npm audit
```

No product code was modified during verification.
