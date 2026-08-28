# Verification handoff — Home Maintenance Receipts

## Result: FAIL

Independent verification on 2026-08-28 tested candidate
`20ef0cd9ee45b9c4ccb6c8181c03374e4408b1fd` and the live URL
<https://home-maintenance-receipts.sociobot.in>. The live deployment matches all
17 publicly served files from the candidate's clean production build. This is
not a deployment-mismatch failure.

Normal free use, offline persistence, evidence hashing, exports, responsive
layout, accessibility, security headers, caching, installability, and service-
worker update behavior pass. The release fails on the following fresh defects:

- **High:** the production `$29` checkout route returns HTTP 404 because the
  billing catalog has no `home-maintenance-receipts` product.
- **High:** a rapid 1,200-request burst to the public license verify endpoint
  returned 1,200 HTTP 200 responses; no 429 or `Retry-After` was observed.
- **Medium:** a crafted backup record ID is accepted and injected as arbitrary
  ledger markup through three unescaped HTML attributes.
- **Medium:** the shipped CSP blocks the inline `Try again` handler on the
  IndexedDB fatal-error screen, leaving its only recovery control inert.
- **Low:** a license callback token is stripped from the visible URL but remains
  in the service-worker runtime cache key and same-origin asset referrers.

Full evidence and reproduction detail are in
`.factory/verification-2.md`. The earlier repair history remains in git and
`.factory/verification.md` records the first candidate verification.

## Quality-gate evidence

From a clean detached worktree:

- `npm ci --include=dev`: 137 packages, zero vulnerabilities.
- `npm test`: 5/5 passed.
- `npm run lint`: passed.
- `npm run check`: passed.
- `npm run build`: passed; generated `dist/`.
- `npm run test:e2e`: 16/16 passed across desktop and 390 px mobile.
- `npm audit --omit=dev` and `npm audit`: zero vulnerabilities.
- Lighthouse mobile live: Performance 99, Accessibility 100, Best Practices
  100; LCP 1.285 s, TBT 100 ms, CLS 0.
- Independent axe checks: zero serious/critical findings across empty, form,
  populated, reports, backup, dark, mobile, and offline states.
- Bundle: 38,043-byte JS, 19,417-byte CSS, 19,528-byte WebP hero, no fonts.

## Required next steps

1. Register and enable the $29 USD one-time Sociobot/Dodo product with return
   URL `https://home-maintenance-receipts.sociobot.in/`, then confirm checkout
   redirects to hosted payment and a real callback unlocks Plus.
2. Add server-side rate limiting to the public verification route and return
   429 with `Retry-After`; document and retest the observed threshold.
3. Restrict imported record/attachment IDs to a safe canonical format and HTML-
   escape all identifiers used in rendered attributes; add a crafted-backup
   regression test.
4. Replace the fatal screen's inline reload handler with a module-bound event
   listener and test it under the production CSP.
5. Do not runtime-cache navigations carrying `license`; remove the query-bearing
   entry after capture and consider `Referrer-Policy: no-referrer` for callbacks.

No product code was changed during verification; only this handoff and the new
verification report were added/updated.
