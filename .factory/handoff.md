# Repair 4 handoff — Home Maintenance Receipts

## Result

**PASS.** Repair implementation `e06a2ccf83e57828131697cfa5a4ff7022aecb28`
was built from a clean worktree, pushed to `main`, deployed, and checked at
<https://home-maintenance-receipts.sociobot.in> on 2026-09-06 UTC.

Deployment ID: `2dad5b55-80cc-4b98-8127-2c9b9fb0ecee`.

The product now gives households a local record of completed maintenance,
dates, providers, costs, due dates, and evidence files. The first action is
**Try it with sample data**.

## What changed

- Added an isolated `/demo` backed by the separate IndexedDB database
  `demo:home-maintenance-receipts`. It starts with three realistic records and
  evidence files. The persistent demo banner has Reset demo and Start for real
  actions. Leaving the demo deletes its database and does not copy records into
  the real home file.
- Added `.factory/claims.json` with 18 public claims and exactly one observable
  Playwright test tagged `@claim:<id>` for each claim.
- Repaired the form contrast failure and checked empty, populated, form, dark,
  legal, and missing-page states with axe.
- Rebuilt the first screen around the actual job, audience, sample action, and
  three short facts. Added the required preview, three-step explanation,
  privacy and limits section, and paid-tier section.
- Added real History API routes for `/log`, `/reports`, `/backup`, `/plus`, and
  demo counterparts. Routes update the title, canonical URL, description,
  Open Graph title, focused `h1`, and polite route announcement.
- Added a designed HTTP 404, route-specific legal pages, `robots.txt`,
  `sitemap.xml`, social image, favicon, Apple icon, standard header/footer, and
  security headers.
- Updated the service worker and manifest. The app shell, legal pages, sample
  assets, and offline fallback are precached; update availability is announced
  in the app.
- Rewrote `README.md`, `.factory/design.md`, `.factory/demo.md`, and
  `.factory/copy-audit.md`. The catalog description is verb-first and 101
  characters. Its required evidence copy is at
  `/work/.evidence/catalog-description.txt`.
- Preserved the one-time $29 House File Plus terms, license callback, daily
  verdict cache, paste-to-restore path, free limits, and paid limits. Public
  offer metadata is at `/work/.evidence/billing-offer.json`.

## Current finding disposition

| Verification finding | Disposition and evidence |
| --- | --- |
| No isolated sample demo | Fixed. Live add/reset/exit test returned to three samples, then opened an empty real database. |
| No claims registry or tagged tests | Fixed. All 18 registry commands pass separately from a clean checkout. |
| Serious form contrast failure | Fixed. Full Playwright suite passes 70/70; axe reports zero serious or critical issues in both themes and all required states. |
| First screen and copy incomplete | Fixed. Desktop and 390×844 phone both show the job, audience, first action, outcome, and three facts before scrolling. Copy audit has no flagged sentence. |
| Routes and 404 incomplete | Fixed. Every public deep link returns its named page. History restores URL and heading focus. Unknown paths return a designed HTTP 404 with a home link. |
| Metadata and shared structure incomplete | Fixed. Titles, descriptions, canonicals, social tags, 1200×630 social image, icons, sitemap, robots, header, and footer are present. |

Earlier backup-shape validation, attachment-hash validation, whitespace
validation, identifier escaping, storage-recovery CSP behavior, license callback
cache invalidation, mobile legal targets, response policies, dependency audit,
and missing-checkout fallback remain covered and passing.

## Clean-checkout verification

Run from a detached clean worktree at the implementation SHA:

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

Results:

- Vitest: 3 files, 7/7 tests passed.
- ESLint and strict TypeScript: passed with no findings.
- Production build: passed and produced `dist/index.html`.
- Playwright: 70/70 desktop and 390×844 phone cases passed.
- Claims: all 18 commands in `.factory/claims.json` passed individually.
- Audits: zero production and zero full-tree vulnerabilities.
- Initial application assets: 49.89 kB JavaScript (16.37 kB gzip) and
  24.08 kB CSS (5.68 kB gzip).

## Live verification

- The factory URL verifier returned HTTP 200, one `h1`, `lang="en"`, a main
  landmark, no missing image alternatives, and no console errors.
- Fresh desktop and phone contexts opened the landing page and one-click demo.
  The live demo contained furnace filter, water-heater, and gutter records with
  evidence. Reset removed a newly added record. Start for real opened an empty
  real home file and removed the demo database.
- A separate browser context reloaded `/demo` offline and retained the banner,
  offline status, and populated sample.
- Live axe scans found zero serious or critical issues on all public routes,
  including the HTTP 404. Keyboard navigation reaches the skip link first;
  route changes and browser history focus the new `h1`. Reduced-motion dialog
  animation duration is `0s`.
- The live manifest has standalone display, 192 px, 512 px, and maskable icons.
  Chromium reported no installability errors. `/sw.js` returns HTTP 200.
- All discovered same-origin links returned 200 except the deliberately tested
  missing route, which returned 404 with the designed recovery page.
- Cold live Lighthouse: Performance 100, Accessibility 100, Best Practices
  100, SEO 100; FCP 0.90 s, LCP 1.20 s, TBT 33 ms, CLS 0.
- Twenty-two served build files matched the implementation build byte for byte.
  `staticwebapp.config.json` is deployment configuration and is correctly not
  served as a public file.
- Live screenshots and machine-readable results are in
  `/work/.evidence/repair-4-live/`.

## Known external dependency

The Sociobot checkout endpoint for this slug still returns HTTP 404 because the
billing product has not been registered. The app does not show a broken buy
link or price when that check fails. Free records, exports, offline use, and
license restoration remain available. The controller's billing-registration
operator must register the offer described in
`/work/.evidence/billing-offer.json`; no credentials or placeholder purchase
flow were added.

This is a static PWA with no product backend, tenant service, server health
endpoint, or product-side rate limiter. Backend persistence and restart checks
therefore do not apply.
