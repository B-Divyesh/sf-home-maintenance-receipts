# Repair handoff — Home Maintenance Receipts

## Result

This repair addresses the release-blocking finding in independent verification
3 (`0375c043139a5cfeca9c7dac67ffe5c0e394e9d1`) for candidate
`777e6d0b185747555f8daec33a5a6526d3db6817`.

The app no longer advertises a $29 checkout that Sociobot has not enabled. The
House File Plus panel now makes a same-endpoint, manual-redirect availability
check before it renders the official purchase link:

- a registered checkout (success or redirect) shows the unchanged official
  `https://api.sociobot.in/api/v1/products/home-maintenance-receipts/checkout`
  link;
- the verifier's observed `404 {"error":"enabled factory product"}` shows a
  clear temporary-unavailability message and no purchase link; and
- a connection/CORS failure likewise shows no purchase link and says how to
  retry. Existing license restoration remains available in every state.

The free local-first maintenance log, exports, offline operation, accessibility
and existing Plus-license behavior are unchanged. The factory must still
register the product before customers can buy it; this repository must not
alter factory billing infrastructure. Once registration is complete, the
already-integrated official link becomes available on the visitor's next view.

## Exact regression coverage

`tests/app.spec.ts` now has two browser regressions in both desktop Chromium
and the 390×844 mobile project:

- a mocked enabled checkout (204 in the contract test) must render the exact
  Sociobot checkout URL; and
- the verifier's exact 404 response must render “House File Plus purchases are
  temporarily unavailable”, expose no Buy link, retain the free-tier message,
  and retain the expandable license-restore form.

The locally hosted app was also exercised at 390 px. A browser page from the
real deployed origin fetched the production endpoint with
`{ "ok": false, "status": 404, "type": "cors" }`, matching the verifier's
finding and the guarded state. At 390 px the repaired panel had a 390 px
document width and no Buy link.

## Verification performed

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

Observed on 2026-08-28 UTC:

- Clean install: 137 packages, with zero reported vulnerabilities.
- Unit/policy tests: 2 files, 5/5 passed.
- ESLint and strict TypeScript: passed with no findings.
- Production build: passed; `dist/index.html` exists. Initial app JavaScript is
  39.41 KB raw / 13.56 KB gzip and CSS is 19.83 KB raw / 4.92 KB gzip.
- Playwright 1.58.2: 26/26 passed (13 desktop Chromium and 13 at 390×844),
  including axe serious/critical checks in empty/form/light/dark states,
  keyboard skip link/form/Escape behavior, record persistence, PDF/backup,
  privacy callback handling, offline reload, and the new checkout regression.
- `npm audit --omit=dev` and full `npm audit`: zero vulnerabilities.

The existing static response-policy unit coverage remains in
`src/deployment.test.ts`: self-only CSP with the billing allowlist,
anti-framing, restrictive permissions policy, `no-referrer`, manifest MIME,
no-cache service worker, and immutable hashed assets.

## Deployment and live verification

Commit `1965b5a1cfc84f667d42dfa4eb99f2d1f88f94cb` was pushed to `main` and
deployed as Static Web Apps deployment
`34c749e9-472b-4b3f-a0f5-31c87abbfed7` at
<https://home-maintenance-receipts.sociobot.in>.

- `verify-url.sh` returned HTTPS 200 in 785 ms with the correct title,
  `lang="en"`, one h1, main landmark, image alt text, labelled controls, and
  zero console/page errors on load.
- Fresh desktop and 390×844 browser contexts opened **Unlock Plus** against
  the live 404 endpoint. Both rendered no Buy link and no `$29` price, had no
  horizontal overflow, and had zero axe serious/critical findings in the
  unavailable-purchase state.
- Live HTML references `app-D9WvFPPl.js` and `app-B-LEYavV.css`, the current
  production build. Live headers retain the self-only CSP with the Sociobot
  billing allowlist, `no-referrer`, `X-Frame-Options: DENY`, restrictive
  Permissions-Policy, and HSTS.

The 404 availability request is an intentional response to the missing
factory product; it is handled as an unavailable purchase rather than a link
to a failed checkout page.

## Known follow-up

Factory billing still needs to register and enable the `$29` one-time product
slug `home-maintenance-receipts` with return URL
`https://home-maintenance-receipts.sociobot.in/`. This is an external billing
operation, deliberately outside this repository. It no longer produces a
broken customer purchase link while pending.
