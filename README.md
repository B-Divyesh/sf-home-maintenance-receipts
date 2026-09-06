# Home Maintenance Receipts

Keep completed home maintenance, dates, providers, costs, next due dates, and receipts in one local record.

This PWA is for households that need repair history during troubleshooting, insurance questions, or a home sale. It works without an account. The production site is <https://home-maintenance-receipts.sociobot.in>.

## Try the sample

Open <https://home-maintenance-receipts.sociobot.in/demo> and choose **Try it with sample data** from the home page.

The demo contains three completed jobs for a sample home. Each job includes realistic details and an evidence file. Demo changes use `demo:home-maintenance-receipts`, a separate IndexedDB database. **Reset demo** restores the three samples. **Start for real** deletes the demo database and opens the real log.

## What it does

- Logs a system, completed task, date, provider, cost, next due date, notes, and one evidence file.
- Hashes each attachment with SHA-256 and keeps the original file in IndexedDB.
- Searches completed work and filters records by due state or attached evidence.
- Creates a PDF with one page for each home system.
- Exports CSV data and a complete JSON backup with original evidence files.
- Checks a backup before replacing the current local record.
- Reloads the complete local record offline after the first visit.

This tool does not inspect work, book contractors, diagnose problems, or prove compliance.

## Free and paid limits

Free use includes 25 completed-work records and one evidence file per record up to 5 MB. PDF, CSV, JSON export, offline use, accessibility, and safety notices remain free.

House File Plus costs $29 once when the billing product is available. It removes the record limit and raises the file limit to 15 MB. The app hides the price and buy link when checkout reports that the product is unavailable.

Sociobot and Dodo act as merchant of record. A license callback or pasted token activates paid limits after verification. License registration is managed outside this repository.

## Privacy and storage

Real records and attachments use the `home-maintenance-receipts` IndexedDB database. They are not uploaded. Normal record use loads no trackers, CDN scripts, or remote fonts.

License tokens use the namespaced `sb_license:home-maintenance-receipts` localStorage key. The app sends a token only to the Sociobot verification endpoint. A cached license is checked at most once per day.

Browser data can be cleared. Download the full JSON backup and keep it somewhere you control. Read the [privacy notice](public/privacy/index.html) and [terms](public/terms/index.html).

## Run from a clean checkout

Node.js 20 or newer is required. Playwright is pinned to 1.58.2.

```sh
npm ci --include=dev
npm run dev
```

The local site opens at the URL printed by Vite.

## Test and build

```sh
npm test
npm run lint
npm run check
npm run build
npm run test:e2e
npm run test:claims
npm audit --omit=dev
npm audit
```

Every public product claim is declared in [`.factory/claims.json`](.factory/claims.json). Each entry names its unique tagged Playwright command and sandbox evidence.

The production build is written to `dist/`. Preview it with:

```sh
npm run preview -- --host 127.0.0.1
```

## Routes

- `/` — job, audience, first actions, product preview, limits, and paid-tier state
- `/demo` — isolated sample maintenance log
- `/log` — real maintenance log
- `/reports` — PDF system report
- `/backup` — JSON and CSV export, restore, home details, and theme
- `/plus` — free and paid limits, purchase state, and license restore
- `/privacy/` and `/terms/` — legal notices

## Project map

- `src/storage.ts` — isolated real and demo IndexedDB storage
- `src/demo.ts` — realistic sample records and evidence files
- `src/backup.ts` — checked JSON restore and CSV export
- `src/report.ts` — local PDF generator
- `src/license.ts` — checkout state and daily license verification
- `public/sw.js` — versioned offline shell and update handling
- `.factory/design.md` — blueprint visual system and asset provenance
- `.factory/demo.md` — demo data and reset behavior
- `.factory/handoff.md` — release verification and remaining dependency

## Deployment

Deploy `dist/` as a static site with HTTPS. Keep the service-worker scope at `/`. The shipped Static Web Apps config defines known SPA rewrites, the styled 404 response, security headers, MIME types, and cache rules.

Do not change billing, DNS, or infrastructure from this repository.

## License

[MIT](LICENSE) © 2026 Sociobot (Param Factory)
