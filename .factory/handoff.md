# Handoff — Home Maintenance Receipts

## Shipped

A finished local-first PWA for recording completed home maintenance and finding
its evidence quickly. The production build is a static Vite/TypeScript app in
`dist/`.

- IndexedDB maintenance records: system, task, completed date, provider, cost,
  next due, notes, and evidence metadata.
- Original attachment storage with an in-browser SHA-256 hash and download.
- Search, due-state filtering, edit, specific delete confirmation, empty state,
  local-storage failure state, and live action feedback.
- Dependency-free PDF report generation with one blueprint sheet per system,
  including dates, provider, cost, due date, and evidence hashes.
- CSV export and complete versioned JSON export/import, including attachment
  bytes and home settings. Restore validates the format and confirms replacement.
- Installable PWA with authored 192/512/maskable icons, versioned app-shell
  precache, navigation fallback, runtime caching, offline status, update toast,
  `skipWaiting`, and `clients.claim`.
- Light/dark/system treatments, 390 px responsive layout, keyboard-operable
  native dialog/forms, designed focus states, reduced-motion fallback, and
  skip navigation.
- $29 one-time House File Plus tier: the free tier has 25 records and 5 MB
  evidence files; Plus unlocks unlimited records and 15 MB files. PDF/CSV/JSON,
  accessibility, offline behavior, and safety language remain free. Checkout,
  callback token capture, daily verification cache, optimistic offline behavior,
  inactive-license handling, and paste-to-restore follow the Sociobot contract.
- Standalone `/privacy/` and `/terms/` pages, MIT license, full README, and the
  blueprint visual/provenance specification in `.factory/design.md`.
- Original factory-generated blueprint desk asset, reviewed for artifacts and
  optimized to 20 KB WebP / 44 KB JPEG. Source and prompt sidecars are retained
  in `assets/src/`.

## Verification

Run from a clean checkout:

```sh
npm install
npm test
npm run check
npm run build
npm run test:e2e
```

Verified on 2026-08-28:

- `npm test`: 3/3 unit tests passed.
- `npm run check`: strict TypeScript passed.
- `npm run build`: passed; `dist/index.html` is at the deploy root.
- `npm run test:e2e`: 10/10 Playwright checks passed across desktop Chromium
  and a 390×844 Chromium viewport. These cover persistence, evidence hashing,
  PDF download, JSON backup/restore, legal routes, serious/critical axe checks
  in light and dark treatments, mobile overflow, and a real offline reload.
- Factory `verify-url.sh`: HTTP 200; title/lang/main/alt/button checks passed;
  one `<h1>`; zero browser console or page errors; 553 ms local load.
- Lighthouse 12 mobile simulation: Performance 100, Accessibility 100, Best
  Practices 100; FCP 0.90 s, LCP 1.50 s, TBT 0 ms, CLS 0.00, Speed Index 0.90 s.
- Production payload: initial JS 33.79 KB raw / 12.02 KB gzip; CSS 19.33 KB raw /
  4.77 KB gzip; hero WebP 20 KB. No runtime font payload.
- `npm audit --omit=dev`: zero production vulnerabilities.

## Operational notes

- The staging billing base is intentionally
  `https://pilot-api.sociobot.in`. Build release with
  `VITE_BILLING_API_BASE=https://api.sociobot.in` after the factory registers
  the paid product. No billing product ID or secret is stored here.
- Static hosting must serve directory indexes for `/privacy/` and `/terms/`,
  use HTTPS, and allow the service worker at `/sw.js` to control `/`.
- User data has no server copy. Browser/device loss is unrecoverable without the
  prominent JSON backup; this is stated in-product and in the privacy notice.

## Known gaps / next steps

- There is no cross-device sync by design. Transfer is explicit JSON backup and
  restore, preserving the brief's no-external-storage default.
- The compact PDF uses built-in PDF fonts to stay offline and small. Latin
  diacritics are transliterated; scripts outside the built-in ASCII set are
  replaced in the PDF only. Original app data and JSON/CSV exports remain intact.
- The factory still needs to register the paid product, switch the release
  billing base, deploy `dist/`, and perform a live checkout callback smoke test.
