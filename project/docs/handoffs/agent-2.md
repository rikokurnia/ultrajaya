# Agent 2 — Dashboard handoff

## Status and scope

Dashboard placeholder replaced; ModulePage and shared shell retained. Reports untouched, per the user's ownership amendment. **Integration incomplete:** `docs/SCOPE_AMENDMENT.md` and Agent 6 Phase A read-model interfaces are absent, checked before implementation and at handoff. No persisted domain sources exist in the supplied server tree (only core identity/numbering). This page deliberately displays unavailable sources rather than reference numbers, invented metrics, or empty arrays presented as live zero results.

## Changed files

- `src/features/dashboard/overview/page.tsx`: server-authorized overview, six permission-filtered KPI queue links, chart unavailable states, activity table, attention queue navigation, compact Revenue section, honest source/update footer.
- `src/features/dashboard/dashboard.module.css`: local responsive styles, reference six-card and 62/38 composition, no global changes.
- `src/features/dashboard/metrics.ts`: pure helpers using existing shared domain contracts, permission metadata, exact quantity/money arithmetic, Jakarta period calculations.
- `src/app/(workspace)/dashboard/page.tsx`: async searchParams forwarding inside ModulePage.
- `tests/dashboard.test.ts`: six tests.
- `docs/screenshots/agent-2-dashboard-{desktop,mobile}.png`: full-page captures at 1600×1000 and 375×812 viewports.

## Dependencies and metric definitions

Runtime calls requirePermission(dashboard:read); no module source is queried without an integration contract. `visibleMetrics` checks each underlying permission on the server; Admin receives no business KPIs. Each destination is a frozen authorized registry path. Revenue has no supplied permissions/routes/contracts, so shows only generic unavailable labels and no values or destinations.

Pure helpers accept shared Material, StockBalance, MaterialRequest, PurchaseOrder, GoodsReceipt, Invoice and PayableBalance contracts. They do not constitute a new service interface and are not wired to fabricated records.

- Critical materials: active materials with a supplied stock record, sum available across warehouses, below minimum using thousandth-unit bigint arithmetic. Domain adapter must establish authorized warehouse completeness and minimum scope before using this aggregate.
- Pending requests: SUBMITTED; excludes draft, verified, rejected and cancelled.
- Pending approvals: AWAITING_APPROVAL; adapter must enforce assigned/object scope.
- Receipts awaiting QC: RECORDED or PARTIALLY_INSPECTED, not INSPECTED.
- Held invoices: HELD documents.
- Payables due: outstanding minor units joined by invoice ID, inclusive today through today +7, excludes voided invoices; includes held outstanding as liability, without implying payment eligibility. Overdue balances require a separately agreed definition.
- Period: activity window of 7/30/90 inclusive Jakarta dates, URL `period`; invalid values fall back to 30d. Queues are current snapshots, not creation-date cohorts.
- sumMoney rejects invalid/unsafe minor-unit amounts; quantities reject >3 decimal places and use bigint arithmetic.

## Verification

Passed typecheck, lint, all 16 tests (10 foundation +6 Dashboard), production build. No unrelated failures observed. Browser via gstack browse: authenticated Auditor render, 7-day select/Apply updates URL and visible range to 2026-10-23–29, KPI navigation reaches /inventory/stock. Inspected desktop and mobile screenshots against 02-dashboard.png. Mobile document width equals viewport width (375px), no page overflow. Desktop labels tightened after visual inspection. Shared gradient/header/shell preserved. Screenshots use unavailable sources, not screenshot-derived business data. No real-device or assistive-technology audit performed.

Tests cover role-filtered navigation for every role, Admin/QC financial restrictions, inclusive date boundaries across midnight WIB, exact fractional stock threshold, safe minor units, connected-empty calculation results, and payable date/void boundaries. Unavailable presentation was browser verified; live empty/error/retry behavior cannot be tested without the adapter.

## Required Agent 6 integration work

Supply Phase A amendment and shared dashboard/revenue read-model interfaces before wiring business reads. Required capabilities: server-authorized and object-scoped metric snapshots with explicit ready/empty/unavailable/error states, source label and successful update time; authorized monthly actual spending and separate budget availability; PO status distribution; activity feed; attention records with authorized destinations; revenue queue permissions and frozen routes. Readers must query persisted domain services rather than direct Dashboard SQL and protect financial values independently of dashboard:read. Existing interfaces.ts lacks these capabilities; do not interpret missing integration as zero.

Once supplied, wire ready results to KPI values, real activity/attention rows and native chart data. **Live metric display, chart tooltips, persisted activity, role-specific Revenue figures and ready/empty/error visual states remain outstanding.** No chart points or tooltips are invented while the source is unavailable. The existing generic FinanceService.payables and AuditReader.list cannot supply all Dashboard aggregates and must not be used to infer Revenue permissions.
