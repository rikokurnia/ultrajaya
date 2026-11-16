> **Current visual revision (16 November 2026):** Read [foundation-design-revision.md](handoffs/foundation-design-revision.md) before the historical contract below. The three images in `../mynotes/layout-images/dashboard/` now define the shared foundation: Dashboard, Laporan, Pengaturan, and four blank cycle destinations. Preserve the current Ultrajaya name and logo. Existing domain code is retained for its assigned agents.

# UltraOps design system

## Visual source

All five exact references were found and visually inspected in `../mynotes/layout-images/`:

- `01-login.png`: primary login source, 1600 × 1000; left branding 55.75%, right form 44.25%, blue procurement illustration, light workspace background, rounded bordered form card.
- `02-dashboard.png`: shared shell source; 240–255 px sidebar, five primary items, separate bottom Settings, compact topbar, gradient page header, bordered cards and dense tables.
- `03-procurement.png`: module tabs, tables, detail panel, quotation comparison and approval timeline.
- `04-inventory-quality-control.png`: quantity/unit displays, semantic QC states and separate receipt versus acceptance presentation.
- `05-finance.png`: invoice matching, currency hierarchy, allocation presentation and document trace links. Its partial-hold payment policy is unresolved; see PROJECT_CONTRACT.

Missing references: none. Analyst text `../mynotes/com_usflow.txt` exists but is empty; behavior follows the user's supplied use cases and invariants. Generated reference counts/text are not authoritative business records.

The login illustration is a CSS-clipped viewport of the supplied `01-login.png`, copied to `public/login-reference.png`. Form, text, logo, labels and workflow chips are real HTML/SVG, not a full-page screenshot. The logo is a recreated scalable droplet. Replace the reference-derived illustration with an approved standalone production asset when available; preserve the original references. No image-generation service was used.

## Tokens

Source: `src/app/globals.css`, `:root` and Tailwind `@theme inline`.

| Token | Value / use |
| --- | --- |
| --primary | #0755C9, active navigation, focus, links and main actions |
| --navy | #102B55, main text |
| --sky | #48B8F2, restrained gradient accents |
| --background | #F5F9FF |
| --surface | #FFFFFF |
| --border | #D6E7FA |
| --muted | #52658A, supporting text |
| --gradient | #103E99 → #1675E8 → #62C8F5 |
| --danger | #B42336 |
| --success | #087747 |
| --warning | #995100 |
| --radius | 14 px cards |
| --shadow | 0 4px 20px #0755C908 |
| --sidebar | 240 px |

Local Inter weights 400/500/600/700, Arial fallback. Body 14 px; table 13 px; column headers 12 px; section titles 20 px; page titles 33 px; desktop login headline fluid up to 59 px. Use tabular numerals for financial and quantity values. All labels are English. Normal fields are 44 px; login fields 54–59 px desktop, 50 px mobile. Buttons are at least 42 px; icon buttons 42 × 42. Cards use 20 px padding desktop, 17 px mobile. Primary desktop gutters 20 px. Prefer spacing in multiples of 4; image fidelity justifies documented exceptions.

Light mode is the sole approved theme; no dark-mode toggle is presented. Do not add module-specific palettes or competing fonts.

## Components and usage

Import display primitives from `@/components/ui`:

- `Button`: primary/secondary/ghost/danger; pass disabled and aria-busy for pending writes.
- `Input`, `Select`: native accessible controls. `Field` associates label and error text; provide id, aria-invalid and aria-describedby to the control.
- `Card`, `KpiCard`: consistent cards; KPI receives label, value, hint and an outline icon. Do not invent live counts on placeholder pages.
- `PageHeader`: title, description, optional actions; use `concept` when simulated business data appears. Runtime dates use Jakarta formatting. Header background is restrained gradient.
- `TabNavigation`: links for module page destinations, aria-current=page; horizontally scrolls on small screens. It is route navigation, not an ARIA tab widget.
- `DataTable<T>`: explicit column render functions, rowKey and rows; state ready/loading/error, error/retry slots, useful empty copy. Horizontal scrolling stays inside table container. Persist future filters in URL search parameters.
- `StatusBadge`: status string and explicit neutral/info/success/warning/danger tone. Text is mandatory; color never carries meaning alone.
- `EmptyState`, `ApprovalTimeline`, `Currency`, `Quantity`, `DateDisplay`.
- `cn`: clsx + tailwind-merge for Tailwind class composition.

Interactive overlays import from `@/components/ui/overlays`: `DetailDrawer` and `ConfirmDialog`, built on Radix Dialog for modal semantics, focus trap/return and Escape dismissal. Pass a real button as trigger. ConfirmDialog awaits onConfirm, disables dismissal while pending, closes after success and shows an error on rejection. A mutation still needs server permission checks. Use Radix primitives for future complex controls rather than reproducing keyboard interactions manually.

`PermissionGate` is in `@/components/permission-gate`; this only controls presentation. `ModulePage` provides the server page gate, module header and permission-filtered subnavigation. Domain actions must call requirePermission and authorize separately.

Development showcase: sign in and open `/dev/components` with `npm run dev`. It demonstrates fields, validation, button states, currency/quantity/date, status badges, timeline, drawers, confirmation and all table states. It contains no persisted business mutation. Hidden in production.

## Shared layouts

`AppShell` owns primary navigation. Exactly Dashboard, Procurement, Inventory, Finance and Reports appear; unauthorized modules are visibly unavailable. The first authorized route is a module's destination. Settings is separate at the bottom and Admin-only. Topbar provides search and notification capability notices plus user identity and sign-out. Do not put supplier/PO/QC/journal subpages in the primary sidebar.

At desktop widths >=1024 px, fixed 240 px sidebar; workspace subtracts its width. At tablet widths below 1024 px, the sidebar becomes a modal drawer. At <=700 px, topbar search becomes an icon; user identity details collapse to initials; headers wrap; cards stack and tabs scroll. The mobile drawer preserves the same five primary items, traps focus, closes on Escape and returns focus to its trigger. Settings remains permission-filtered.

Login keeps two panels above 700 px. Mobile shows a compact blue brand introduction followed by the form, in natural document flow; vertical scrolling is expected at 375 × 812, no horizontal page overflow. Illustration and repeated workflow chips are omitted on narrow screens. Support/recovery panels are accessible drawers and say plainly that reset email is not configured.

## Accessibility and formatting

Visible 3 px focus outline, skip-to-content link, labeled inputs, native validation, inline server errors, status text, table headers, touch targets and reduced-motion overrides are shared defaults. Use accessible names for icon-only buttons and aria-hidden for purely decorative icons. Native user-menu details responds to Escape. Do not suppress real hydration problems; gstack screenshot caret-hiding can produce a development-only diagnostic if it runs before hydration. Final production screenshots should be captured after the page has loaded.

`src/shared/format.ts`: `formatCurrency(minor)` renders IDR using id-ID grouping; `formatQuantity(decimalString,unit)` uses en-GB grouping and up to 3 decimals; `formatDate(value,includeTime)` uses Asia/Jakarta, English dates and WIB time; `statusLabel` is a presentation mapping. Do not pass rupiah-major values into Currency. Date-only fields must be treated as business dates and not shifted by a local browser time zone.

Visual verification captures are in `docs/screenshots/`. See `docs/handoffs/agent-1.md` for exact tested viewports and outcomes. Windows font rendering and a real mobile device were not available; Chromium was used.
