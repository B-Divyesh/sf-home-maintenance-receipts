# Visual thesis — the household blueprint ledger

## Direction and rationale

Home Maintenance Receipts is a **blueprint drafting sheet**, not an inventory
dashboard. A measured cobalt grid, registration marks, ruled annotations, and
warm paper-white surfaces make each maintenance record feel deliberately
documented. The interface borrows the care and legibility of an architect's
working set while avoiding faux technical complexity. Evidence is the product:
dates, systems, receipts, and reports remain visually dominant.

The light treatment is the default drafting table: warm vellum over dark ink.
The dark treatment resembles a blueprint viewed on a dim workbench. Both use
the same semantic hierarchy and meet WCAG AA contrast.

## Palette

| Token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| paper | `#f4f0e6` | `#101d29` | page/background |
| sheet | `#fffdf7` | `#172838` | primary surface |
| ink | `#142c3c` | `#f6f2e8` | body text |
| muted | `#465c68` | `#b7c7cf` | supporting text |
| blueprint | `#135ea8` | `#66b4ff` | actions, measurement marks |
| blueprint deep | `#0b477f` | `#98ceff` | hover/emphasis |
| rule | `#b8c8cf` | `#415566` | outlines and grid |
| success | `#1f6c4a` | `#74d6a5` | stored/current |
| warning | `#8a5207` | `#ffca70` | due soon |
| danger | `#a33131` | `#ff9d98` | overdue/destructive |
| stamp | `#d45233` | `#ff9478` | small physical-document accents |

Color never carries status by itself; every status includes text or an icon.

## Type and spacing

No font is fetched. Humanist system sans (`ui-sans-serif`, Segoe UI, Arial)
keeps forms readable; the document voice uses the resident monospace stack
(`ui-monospace`, SFMono-Regular, Consolas) for labels, measurements, dates,
hashes, and tabular numbers. This avoids network exposure and a font payload.

The scale is 12 / 14 / 16 / 20 / 28 / 40 px, with body text at 16 px minimum.
Spacing follows a 4 px base: 4, 8, 12, 16, 24, 32, 48, 64. Content measure is
72 characters. Controls are at least 44 px tall, with an 8 px minimum gap.

## Layout and interaction grammar

- A narrow drafting rail contains home status and primary destinations on
  wide screens. It becomes a horizontal tab row on phones.
- The page header acts as a title block. Each route has one job-naming `<h1>`;
  section titles use `<h2>` and report-style overlines.
- Records are ruled ledger rows rather than floating cards. Corners are 2–8 px,
  never pill-shaped except compact status badges.
- Fine grid lines explain the visual world but sit behind opaque reading
  surfaces. Registration crosses and dimension arrows are decorative only.
- Primary actions are filled blueprint-blue rectangles; secondary actions are
  paper buttons with precise ink rules. Focus uses a double cobalt/white ring.
- Dialogs arrive from the action that opened them; destructive operations name
  the exact record and require confirmation. Saves produce a brief stamped
  acknowledgement in the live region.

## Responsive intent

At 390 px, the rail becomes a compact top title block, overview statistics
collapse from four cells to two, ledger metadata stacks, and secondary action
labels remain visible. Nothing depends on hover. Report controls stay in flow;
no fixed bar obscures safe areas or the keyboard.

## Motion policy

Motion is functional and restrained: dialogs fade and translate 8 px in 180 ms;
new ledger rows receive a single 260 ms highlight; toasts rise 6 px in 180 ms.
No animation loops. Under `prefers-reduced-motion: reduce`, transitions and
smooth scrolling become instant while state and depth remain visible through
outlines and surface contrast.

## Original asset plan and provenance

The hero illustration is an original AI-generated editorial still life: an
overhead home-maintenance desk with a furnace filter receipt, wrench, ruler,
and hand-drawn house plan arranged on cobalt blueprint paper. It clarifies the
product's promise—turning upkeep into an orderly evidence file—without depicting
features the app does not provide. The app icons are original hand-authored SVG
geometry derived from an indexed document and roof line.

### Prompt sheet

Subject: overhead still life of a household maintenance record desk, small
receipt, folded furnace filter instructions, steel ruler, pencil, simple wrench,
paperclip, and blank home plan. World/materials: tactile cobalt blueprint paper,
warm ivory receipt stock, graphite, brushed steel, subtle fold marks. Light/lens:
soft north-window light, orthographic top-down view, modest realistic shadows,
editorial product photography. Palette words: Prussian blue, drafting cyan,
vellum cream, charcoal ink, restrained safety orange. Negative list: people,
hands, readable text, logos, brands, watermarks, UI screenshots, futuristic HUD,
neon gradient, excessive clutter, illegible pseudo-writing.

Generated with the factory Azure image model (`factory-image`) on 2026-08-28.
Prompt sidecar is stored beside the source image in `assets/src/`. The generated
image is original to this product and used under the factory's output terms.

The 1200×630 social card is a centered crop of that source image. The 180px
Apple touch icon is resized from the original hand-authored product icon. Both
derivatives were made locally with ImageMagick on 2026-09-06; no new source art
or third-party material was introduced.
