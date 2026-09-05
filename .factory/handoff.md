# Verification 4 handoff — Home Maintenance Receipts

## Result

**FAIL.** Independent verification reviewed implementation
`1965b5a1cfc84f667d42dfa4eb99f2d1f88f94cb` with documentation at
`5ce2121d93957afecf0c0599b3db352eeeff1841`. All 17 built public files matched
the live site byte for byte.

The repaired checkout behavior passes: the expected billing 404 shows an
unavailable message, no price, and no buy link while keeping license restore.
Earlier restore-integrity, injection, CSP recovery, callback-cache, mobile
target, response-policy, manifest, dependency, and rate-limit findings remain
fixed.

Acceptance still has 6 findings and 18 untested claims:

1. `/demo` is the normal app using the real IndexedDB namespace; there is no
   sample, demo label, reset, start-for-real action, or `.factory/demo.md`.
2. `.factory/claims.json` and all required `@claim:` tests are absent.
3. `npm run test:e2e` fails 1 of 26 tests on serious desktop form contrast.
4. The first screen and copy do not state the job and audience in the required
   plain form; required landing sections and `.factory/copy-audit.md` are absent.
5. App sections have no real URLs/history titles, and unknown routes show the
   app with HTTP 200 instead of a product 404.
6. Canonical/social metadata, robots, sitemap, Apple icon, and standard
   site-wide header/footer details are missing.

Full evidence and exact reproduction steps are in
`.factory/verification-4.md`. Machine-readable evidence is in `/work/.evidence/`.

## Commands run from a clean worktree

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

Unit tests, lint, TypeScript, build, and both audits passed. Playwright finished
25/26 and therefore failed. Lighthouse mobile scored 100 in Performance,
Accessibility, Best Practices, and SEO on the empty first screen; LCP was 1.2 s
and CLS was 0. The form-state axe failure remains release-blocking.

No product code was changed. Next work should implement the isolated sample
demo and claim registry first, then repair contrast, first-screen copy, routing,
404 behavior, metadata, and consistent site structure before another full
verification.
