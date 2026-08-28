# Repair handoff — Home Maintenance Receipts

## Result

Repository repair and static deployment completed on 2026-08-28 UTC. The live
artifact at <https://home-maintenance-receipts.sociobot.in> matches the repaired
build and all repository-controlled verifier findings now pass. The release is
still blocked by one factory-owned dependency: the production Sociobot billing
catalog has no `home-maintenance-receipts` product, so its otherwise-correct
production checkout URL returns 404.

- Repair code commit: `8e7b1b7` (`fix: secure backup restore and release policies`)
- Manifest MIME follow-up: `aeda2af` (`fix: declare web manifest MIME mapping`)
- Azure Static Web Apps deployment: `4dcaa8b9-9e0e-4215-968f-97f58545dd62`
- Live artifact identity: 17/17 served files matched `dist/` by SHA-256.

## Candidate findings reproduced

Candidate `5e4451f37bd39cfc93e1fd2efe5401a9bf8279e0` was rebuilt in a clean detached
worktree with Vite 6.0.5 before repair.

- A marker-correct backup containing only `{ "id": "incomplete-record" }` was
  accepted, replaced the current file, and produced `Your home file could not
  open.` after reload.
- A linked text attachment declaring 64 zeroes as its hash restored and showed
  `SHA-256 0000000000…`; its downloaded bytes instead hashed to
  `d121be3103007b41edf96f8262925f8c7d61894afe9a041843b631f69445bc57`.
- Space-only system/task values created a row with both identity fields empty.
- The buy link resolved to `pilot-api.sociobot.in`; at 390×844, Privacy and
  Terms measured 45.16×18.72 and 36.72×18.72 CSS px.
- A clean candidate install reported five development advisories. The original
  live response-policy and MIME evidence remains in `.factory/verification.md`.

## Repairs

- Backup restore now validates the complete version-1 settings, record, and
  evidence schema before opening the replacement confirmation. It checks field
  types and bounds, required trimmed text, real dates/timestamps, unique IDs,
  evidence relationships, encoded MIME/size metadata, and the 15 MB ceiling.
- Every restored attachment is decoded and SHA-256 hashed locally; its bytes,
  attachment metadata, and record metadata must agree. Any failure reports
  `No data was changed.` and never reaches the IndexedDB replacement transaction.
- Restore replacement has explicit progress/error feedback; its existing
  three-store IndexedDB transaction remains atomic.
- Record identity and home-name inputs reject whitespace-only values with
  focused, actionable errors.
- Billing defaults to `https://api.sociobot.in`; callback storage, URL stripping,
  daily verification caching, offline optimism, and restore-by-token are unchanged.
- Mobile footer links now provide at least 44×44 CSS px targets.
- `staticwebapp.config.json` adds a self-only CSP with the production billing
  connection allowlist, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, a
  restrictive Permissions Policy, manifest MIME mapping, immutable asset
  caching, and no-store service-worker caching.
- App JS/CSS now use content-hashed names injected into the v4 precache. Cache
  matching ignores `Vary: Origin`, fixing a browser/offline mismatch discovered
  during repair. The CSP-incompatible inline offline style was moved to a local
  stylesheet.
- Vite/Vitest/axe tooling was updated, ESLint was added, and both production and
  full dependency audits now report zero vulnerabilities.

## Regression coverage

`tests/app.spec.ts` now proves that incomplete and hash-forged backups never
offer replacement and preserve the current record after reload. It also covers
space-only identities, the exact production checkout URL, and measured legal
link targets. `src/deployment.test.ts` locks the CSP, framing, permissions,
manifest, service-worker, and immutable-cache policy. Existing persistence,
hashing, PDF, valid restore, legal, axe, mobile, and offline tests remain.

## Clean verification

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

Observed results:

- Clean install: 137 packages; zero vulnerabilities.
- Unit/policy: 2 files, 5/5 tests passed.
- ESLint: passed with no findings.
- Strict TypeScript: passed with no diagnostics.
- Production build: passed; `dist/index.html` at the static root. Initial JS
  38,043 bytes raw / 13.18 KB gzip; CSS 19,417 bytes raw / 4.84 KB gzip; hero
  WebP 19,528 bytes. All budgets pass.
- Playwright 1.58.2: 16/16 passed across desktop Chromium and 390×844 Chromium.
- Both `npm audit --omit=dev` and full `npm audit`: zero vulnerabilities.

## Live verification

- Factory `verify-url.sh`: HTTP 200 in 867 ms; correct title/lang, one h1, main,
  image alts, and button labels; zero console/page errors.
- Independent live browser smoke: zero cross-origin requests during fresh free
  use and zero console/page errors. Axe found zero serious/critical violations
  in empty, dialog, 390 px, and populated-offline states.
- Keyboard: first Tab reached the skip link, Enter focused main, Enter opened
  the record dialog with system focused, and Escape returned focus to the opener.
  Reduced-motion dialog animation measured `0s`.
- Mobile: document and viewport widths were both 390 px. Privacy measured
  53.16×44 px and Terms 44.72×44 px.
- PWA: Chromium reported zero installability errors. A controlled offline reload
  rendered the full app; a record written offline survived another offline
  reload. Update simulation showed `Update now`, activated `hmr-qa-v5`, removed
  all `hmr-v4` caches, retained an activated controller, and logged no errors.
- License callback smoke stored the token, stripped it from the visible URL,
  verified exactly once, and reused the daily cached verdict after reload.
- Live responses now include CSP, `frame-ancestors 'none'`, X-Frame-Options,
  Permissions-Policy, Referrer-Policy, and nosniff. Hashed JS and image assets
  return `max-age=31536000, immutable`; `sw.js` returns no-store; the manifest
  returns `application/manifest+json`.
- Lighthouse 13.4.1 mobile: Performance 98, Accessibility 100, Best Practices
  100; FCP 986 ms, LCP 1,204 ms, TBT 155 ms, CLS 0, Speed Index 986 ms.

## Remaining release blocker

At handoff, `GET https://api.sociobot.in/api/v1/products` has no
`home-maintenance-receipts` entry and the exact production checkout route returns
HTTP 404 with `{"error":"enabled factory product","status":404}`. A read-only
check also found no matching live Dodo product. The documented factory helper
`fleet/new-paid-product.sh` is absent from this worker image. Repository policy
forbids direct payment-provider or billing-database changes, so no unsafe manual
registration was attempted.

The factory must create the $29 USD one-time Dodo product and enabled Sociobot
mapping with return URL `https://home-maintenance-receipts.sociobot.in/`, then
verify that the checkout route redirects to hosted checkout and a paid callback
unlocks Plus. No application rebuild or redeploy should be required.
