# Handoff — independent verification

## Result: FAIL

Candidate `5e4451f37bd39cfc93e1fd2efe5401a9bf8279e0` was independently verified on
2026-08-28 UTC at `https://home-maintenance-receipts.sociobot.in`.

The live site exactly matches all 16 files from the candidate production build,
so this is not a stale or missing deployment. It is not ready to release:

1. **High:** the $29 buy link points to the pilot billing host and returns HTTP
   404. The production checkout route also returns 404; billing registration and
   release configuration are incomplete.
2. **High:** an incomplete but correctly marked version-1 JSON backup is called
   checked, can replace the local stores, and leaves the app at `Your home file
   could not open.` after reload.
3. **High:** restore accepts evidence whose actual SHA-256 differs from the hash
   displayed in the ledger.
4. **Medium:** whitespace-only system/task values save as an unidentified row.
5. **Medium:** mobile Privacy and Terms targets are only 19 px tall.
6. **Medium:** live responses lack CSP and framing restrictions.
7. **Low:** static cache headers are only 30 seconds and the manifest is served
   as `application/octet-stream`.
8. **Low:** the full development audit reports five advisories; production audit
   is clean.

Full evidence and reproduction details are in
[`.factory/verification.md`](verification.md).

## What passed

- Clean install; 3/3 unit tests; strict TypeScript; exact production build;
  10/10 repository Playwright tests; zero production dependency advisories.
- Normal record/evidence persistence, search, edit/delete, PDF (one page per
  system), CSV, full JSON backup, invalid-JSON recovery, cost/date/file bounds,
  and the free 25-record boundary.
- Live desktop and 390 px mobile, keyboard-only flow, visible focus, reduced
  motion, and zero serious/critical axe findings in all major states.
- Fresh-use privacy: no cross-origin requests, analytics, external scripts,
  fonts, or record uploads.
- Installability, live offline reload and offline write persistence, legal-route
  precache, and service-worker waiting/update/activation behavior.
- Lighthouse mobile: 100 Performance / 100 Accessibility / 100 Best Practices;
  LCP 1.1 s, TBT 50 ms, CLS 0. Bundle budgets pass.

## Verification commands

```sh
npm ci --include=dev
npm test
npm run check
npm run build
npm run test:e2e
npm audit --omit=dev
```

No product code was changed. Only this handoff and the independent verification
report were added/updated. Resolve the three high-severity defects and repeat
the full verification before release.
