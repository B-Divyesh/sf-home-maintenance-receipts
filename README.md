# Home Maintenance Receipts

Home Maintenance Receipts is a private, offline-first home maintenance ledger.
It is for households that need to answer “when was this done, by whom, and where
is the receipt?” without depending on a vendor cloud. The production site is
<https://home-maintenance-receipts.sociobot.in>.

## What it does

- Records a home system, completed task, completion date, provider, cost,
  next-due date, notes, and one evidence file.
- hashes each attachment with SHA-256 and keeps the original in IndexedDB.
- searches and filters completed work and flags upcoming/overdue dates.
- creates a portable PDF with one blueprint sheet per home system.
- exports CSV and a complete JSON backup, including original evidence files.
- restores a full backup after showing exactly what will be replaced.
- installs as a PWA and reloads the complete home file while offline.
- provides a useful free tier and a $29 one-time House File Plus unlock when
  the factory billing product is enabled. The app does not show a purchase link
  if the billing service reports that checkout is unavailable.

This is a record-keeping aid, not proof of warranty, permit, insurance, tax, or
legal compliance. It does not book contractors, diagnose a home, or file claims.

## Privacy and storage

Records and attachments remain in the browser's IndexedDB by default. There are
no analytics, advertising trackers, CDN scripts, or remote fonts. JSON, CSV, and
PDF exports are generated locally. Because browser storage can be cleared, the
full JSON backup is deliberately prominent.

License tokens are kept in localStorage and sent to the Sociobot verification
endpoint at most once per day. See [`/privacy`](public/privacy/index.html) and
[`/terms`](public/terms/index.html) for the complete notices.

## Develop

Requires Node.js 20 or newer.

```sh
npm install
npm run dev
```

Release builds use the production Sociobot billing endpoint by default. A
different base may be injected only for an isolated billing-contract test:

```sh
VITE_BILLING_API_BASE=https://pilot-api.sociobot.in npm run build
```

No product ID is embedded. The product slug is used with the standard Sociobot
checkout and verification routes.

## Test and build

```sh
npm test          # unit tests
npm run test:e2e # desktop + 390px Chromium, axe, exports, restore, offline
npm run check     # strict TypeScript
npm run build     # production output -> dist/
npm run preview   # serve dist/ locally
```

Playwright is pinned to 1.58.2. The exact deploy command is `npm run build`, and
the static deploy root is `dist/` with `dist/index.html` at its root.

## Project map

- `src/storage.ts` — IndexedDB records, attachments, and settings
- `src/backup.ts` — complete JSON backups and CSV export
- `src/report.ts` — dependency-free local PDF generator
- `src/license.ts` — one-time checkout callback and daily verification cache
- `public/sw.js` — versioned offline shell and runtime cache
- `.factory/design.md` — blueprint visual system and asset provenance
- `.factory/handoff.md` — verification results and operational handoff

## Deployment

Deploy the contents of `dist/` as a static site with HTTPS and directory-index
support for `/privacy/` and `/terms/`. The service worker scope must remain `/`.
`staticwebapp.config.json` ships the source/framing policy, manifest MIME type,
and cache rules with the static artifact. Infrastructure, DNS, and billing
product registration remain factory-managed outside this repository.

## License

[MIT](LICENSE) © 2026 Sociobot (Param Factory)
