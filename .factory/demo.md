# Demo sandbox

## Entry point

- Live: <https://home-maintenance-receipts.sociobot.in/demo>
- Local: <http://127.0.0.1:4173/demo> after `npm run build` and `npm run preview`

The home page also links to the demo with **Try it with sample data**.

## Included sample

The demo opens `18 Cedar Lane` with three completed jobs:

1. A furnace filter replacement by the homeowner for $27.84.
2. A gutter cleaning by Northside Home Care for $165.
3. A water-heater service by Maple Plumbing for $189.

Each record includes notes, a next due date, an original text evidence file, and its computed SHA-256 hash. The sample supports search, filters, PDF, CSV, JSON, attachment download, edit, delete, and restore checks.

## Isolation

Demo mode uses the IndexedDB database `demo:home-maintenance-receipts`. Real use keeps data in `home-maintenance-receipts`. Demo startup never reads the real database or its license state.

The persistent banner says **Demo — sample data, nothing is saved**. This means demo changes never enter the real home record.

## Reset and exit

**Reset demo** replaces the demo database contents with the three original samples. **Start for real** deletes the demo database before opening `/log`. Leaving through a legal or home link also deletes the demo database.
