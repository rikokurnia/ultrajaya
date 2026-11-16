# Ultrajaya foundation design revision

16 November 2026. User-authorized visual replacement of the earlier foundation. Application remains inside `project/`. Preserve the existing Ultrajaya name, `src/components/brand.tsx`, and `public/ultrajaya-logo.png`; none were changed.

## Exact reference sources

All three images were visually inspected:

- `../mynotes/layout-images/dashboard/Ultrajaya_dashboard.png`
- `../mynotes/layout-images/dashboard/Ultrajaya ERP report status dashboard.png`
- `../mynotes/layout-images/dashboard/Ultrajaya User Access Settings.png`

Their Indonesian labels, pale background, sidebar proportions, blue selection, page banners, cycle cards, report tabs/status table, and user-access layout now define the foundation. No new primary navigation, KPIs, promotional text, footer, search bar or notification control was added to the shell. The header uses the existing Ultrajaya identity rather than restoring the old UltraOps name printed in one reference.

## Entry points

- `src/components/app-shell.tsx`: Dashboard, Laporan, Pengaturan; Admin-only Pengaturan; existing sign-out and authenticated identity; responsive drawer.
- `src/components/foundation.module.css`: scoped foundation styles. Original global styling and legacy module styles remain for other agents.
- `src/shared/cycles.ts`: canonical cycle labels and destinations.
- `src/features/dashboard/overview/page.tsx`: four reference cycle cards only.
- `src/features/reports/overview/page.tsx`: report reference presentation, keyboard-accessible cycle tabs, status selection, CSV export of displayed reference rows.
- `src/features/settings/settings-view.tsx`: reference layout with real persisted users, search, user-creation drawer and access-management drawer. Reuses existing guarded actions. Account names, emails, roles and permissions were not replaced with the image's fictional users.
- `src/features/settings/forms.tsx`: existing forms with Indonesian labels.
- Dashboard, reports and settings wrappers in `src/app/(workspace)/` now render the new foundation without the previous module header/tabs.

## Blank cycle routes for other agents

`src/app/(workspace)/cycles/[cycle]/page.tsx` authenticates, validates the cycle key and renders an intentionally empty main area:

- `/cycles/pendapatan`
- `/cycles/pengeluaran`
- `/cycles/produksi`
- `/cycles/penggajian`

These are registered in `src/shared/routes.ts` for safe post-login redirects. They provide no business actions or records. Cycle owners may replace this blank content with their module entry points and add domain-specific authorization. Existing procurement, finance, inventory, report/audit services, data, migrations and old workflow routes were retained, not erased or integrated into the new cycles. Blank cycle entry access does not grant authority to business operations.

Reports currently reproduce the supplied reference's counts and three Pendapatan rows as presentation fixtures, not live task aggregation. Other cycle report tables are empty. The CSV contains only those displayed reference rows. Future cycle/report agents must replace fixtures with authorized read models. Admin can view this reference-only report foundation without receiving any business/report service permissions; existing protected audit and domain services retain their checks.

The Settings access-cycle labels summarize existing read permissions for presentation; they do not introduce a new authorization model. Admin's reference label "Semua siklus" denotes access to the four blank entry pages, not business approval authority. All real mutations still use the existing server permission checks.

## Verification

- Scoped ESLint: changed TypeScript/React files pass.
- Authentication/dashboard tests: 16 passed.
- Browser: 1487×1058 desktop and 375×812 mobile. Compared all three rendered pages to the actual references; checked drawer open/Escape, Settings search and add-user panel, and blank cycle content. Dashboard/reports/settings mobile document width remains 375 px at a 375 px viewport.
- Production compilation succeeds, but the production build and repository-wide TypeScript check fail on existing finance integration mismatches (missing permission identifiers, service methods and incompatible revenue types). Full ESLint also fails in existing module code. No check was disabled and unrelated business code was not changed. Agent 6 should resolve these integration issues.
- Screenshots: `docs/screenshots/foundation-{dashboard,reports,settings}-desktop.png`, matching `-mobile.png` files, `foundation-navigation-mobile.png`, and `foundation-cycle-blank.png`.

This revision supersedes the historical five-primary-item shell and operational KPI dashboard sections in the original Agent 1 docs. Authentication, persisted user administration, core contracts and existing module ownership remain in effect.
