> **Current deployed architecture:** Five-role, database-independent frontend. Read [backend handoff](BACKEND_HANDOFF.md) and the final frontend handoff before historical SQLite instructions below. Supabase is owned by the backend team.

> **Current visual revision (16 November 2026):** Read [foundation-design-revision.md](handoffs/foundation-design-revision.md) before the historical contract below. The three images in `../mynotes/layout-images/dashboard/` now define the shared foundation: Dashboard, Laporan, Pengaturan, and four blank cycle destinations. Preserve the current Ultrajaya name and logo. Existing domain code is retained for its assigned agents.

# UltraOps project contract

Agent 1 foundation, 29 October 2026. All application paths below are relative to `project/`. Original visual references remain in `../mynotes/layout-images/`. Read this document before implementing another module.

## Stack and commands

Next.js 16.4.3 App Router, React/React DOM 19.3.1, TypeScript 6.0.3, Tailwind 4.3.3, Lucide React 1.63.0, Zod 4.6.7, Radix Dialog 1.3.1, iron-session 9.0.1, better-sqlite3 13.0.3. Inter 5.3.0 is locally bundled through @fontsource. Dependencies are exact in package.json and resolved in package-lock.json. No external font request or hosted database is needed. Node >=22.13; verified on Node 26.11.1 / npm 12.2.0. Next ESLint config currently requires ESLint 9; npm reports this major as deprecated, but lint passes.

From the repository root:

```bash
cd project
npm ci
cp .env.example .env.local
openssl rand -base64 48
```

Paste the generated value into SESSION_SECRET; set DEMO_PASSWORD to a local password with at least 12 characters. Then:

```bash
npm run seed
npm run dev
```

Use `http://localhost:3000`. Production verification: `npm run build` then `npm start`. Production requires HTTPS (Secure cookies); loopback localhost was used only for verification. Deploy as a persistent Node process with a writable persistent SQLite volume, not an ephemeral serverless filesystem. Native SQLite requires a supported prebuild or a C++ build toolchain. npm 12 install-script approvals for better-sqlite3, esbuild and unrs-resolver are recorded in package.json.

`npm run migrate` applies all namespace migrations. `npm run seed` applies migrations and inserts missing development users, preserving existing accounts and passwords. Seeding refuses NODE_ENV=production. Tests use a separate temporary database. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` are the validation commands.

## Architecture and ownership

- `src/app`: thin route wrappers; `(workspace)/layout.tsx` authenticates and renders the shared shell. Dynamic rendering prevents user data from being statically cached.
- `src/features/<module>`: module-owned UI, actions and future domain services/repositories. Routes import named page components, not the reverse.
- `src/components`: Agent 1 shared shell and reusable UI. `ModulePage` performs server-side page access checks and renders header/tabs. Pass children into it; never render a domain component outside its permission boundary.
- `src/lib/auth`: pure permissions/redirect logic and the server-only Next session adapter.
- `src/shared/contracts`: transport-safe data types and Zod primitives. No database or UI imports.
- `src/shared/services/interfaces.ts`: proposed typed service/repository interfaces; **no domain implementation or in-memory success stub**.
- `src/shared/fixtures/index.ts`: canonical shared identifiers and master-data seed specifications. Domain records are not seeded by Agent 1.
- `src/server`: implemented identity/session/admin/audit-writing infrastructure and SQLite connection.
- `src/server/db/migrations/<namespace>`: append-only SQL migrations.

| Agent | May modify | Must coordinate through Agent 6 |
| --- | --- | --- |
| 2 | `src/features/dashboard/**`, matching dashboard route wrappers, own tests/docs (Dashboard only per SCOPE_AMENDMENT.md) | Shared shell, routes registry, core audit storage, cross-module data queries |
| 3 | `src/features/procurement/**`, matching procurement wrappers, `migrations/procurement/**`, own tests/docs | Shared contracts, new permissions, inventory/finance links |
| 4 | `src/features/inventory/**`, matching inventory wrappers (including dispatches & returns), `migrations/inventory/**`, material/warehouse schema, own tests/docs | Shared contracts, procurement/finance links |
| 5 | `src/features/finance/**`, matching finance wrappers (including revenue operations & reconciliation), `migrations/finance/**`, account master schema, own tests/docs | Shared contracts, inventory/procurement links |
| 6 | Reports (`src/features/reports/**`, matching reports route wrappers, `migrations/reports/**`, own tests/docs), plus integration adapters, shared contracts, migrations ordering, cross-module tests, and final integration | Preserve role boundaries and frozen route destinations |

Agent 1 owns login, settings, shared UI, auth, core migrations and registries. Agents 2–5 should not rewrite `app-shell.tsx`, global tokens, `shared/routes.ts`, package files or existing migrations. Add module-local styles or Tailwind classes using the established tokens. Record proposed shared changes in your handoff for Agent 6. Route owners may replace only their feature imports/content, retaining `ModulePage` and its path. Reports/audit UI belongs to Agent 6 (amended from Agent 2 per SCOPE_AMENDMENT.md); events are written by domain services on the server.

## Frozen routes and access

`/login` is public. `/` redirects to `/dashboard`. All listed workspace routes are protected. Unknown paths show a 404. Permission failures render a useful access-denied page without protected data (HTTP 200 presentation, not an API status contract). Unauthenticated server operations throw AccessError(401); forbidden operations throw AccessError(403).

| Route | Permission | Owner |
| --- | --- | --- |
| /dashboard | dashboard:read | 2 |
| /procurement/requests | requests:read | 3 |
| /procurement/rfqs | rfqs:read | 3 |
| /procurement/suppliers | suppliers:read | 3 |
| /procurement/orders | orders:read | 3 |
| /procurement/approvals | approvals:read | 3 |
| /inventory/stock | stock:read | 4 |
| /inventory/receipts | receipts:read | 4 |
| /inventory/inspections | inspections:read | 4 |
| /inventory/dispatches | dispatches:read | 4 |
| /inventory/returns | returns:read | 4 |
| /finance/invoices | invoices:read | 5 |
| /finance/payables | payables:read | 5 |
| /finance/payments | payments:read | 5 |
| /finance/journals | journals:read | 5 |
| /finance/revenue | revenue:read | 5 |
| /reports | reports:read | 6 |
| /reports/audit | audit:read | 6 |
| /settings | users:manage | 1 |

`/dev/components` is authenticated, development-only and returns not-found in production. Five primary items remain visible; unavailable modules are noninteractive and marked not authorized for screen readers. Module entry is the first authorized route, not always the first tab. Settings is separately shown only to Admin. Search and notifications open honest capability notices.

## Permission matrix

The executable source of truth is `ROLE_PERMISSIONS` in `src/lib/auth/permissions.ts`. Every role may read the dashboard. Accounts have exactly one role; business authority must not be inferred from Admin status.

| Role | Read scope beyond dashboard | Write authority |
| --- | --- | --- |
| ADMIN | User administration | Create users, change another user's role, activate/suspend; no business approval |
| PRODUCTION | Stock, requests | Own/permitted FPBB requests; domain service must enforce creator/scope |
| WAREHOUSE | Stock, requests, orders, receipts, inspections | Verify requests; record physical receipts |
| PURCHASING | Stock, requests, suppliers, RFQs, orders, approvals, receipts | Suppliers, RFQs, orders |
| APPROVER | Requests, suppliers, RFQs, orders, approvals | Assigned approval decisions within policy/authority |
| QC | Stock, receipts, inspections | Inspections only; no PO price writes |
| AP | Suppliers, orders, receipts, inspections, invoices, payables | Invoice/matching/payable recognition |
| TREASURY | Invoices, payables, payments | Authorized payment records and allocations |
| ACCOUNTING | Invoices, payables, payments, journals, reports | Review/post journals |
| AUDITOR | All business read permissions, including audit | None |

`can(actor, permission)` is for rendering. `PermissionGate` is presentation only. Each Server Action calls `requirePermission(permission)` to resolve the actor from the server session. Service methods then call `authorize(actor, permission, objectRule)` before reading restricted records or writing. Never accept an actor, role, creator, approval authority or event timestamp from client JSON. Load object ownership/assignment from storage, then supply a rule, e.g. `notCreator(po.createdBy)` combined with assigned approver and policy checks. A role grant is necessary but not sufficient. Domain agents must implement these object rules; placeholders currently expose no business operations.

## Authentication and user administration

Choice locked: iron-session, supported by the official Next authentication guide, encrypts/seals only a random opaque token in an HttpOnly, SameSite=Lax cookie. Secure is enabled in production. Server storage keeps a SHA-256 token digest and expiry, never the cookie token. Every request resolves the live user and active state. React cache deduplicates within a request only. Passwords use salted Node crypto scrypt (16-byte random salt, 64-byte hash, timing-safe compare); password hashes are never serialized to clients. Five failed email attempts cause a 15-minute cooldown; generic errors avoid account enumeration. The local limiter is not a distributed ingress defense.

Remember me: persistent cookie and 30-day server lifetime; unchecked: browser-session cookie and 8-hour server limit. No sliding renewal. Even if a cookie seal remains readable, the server record enforces expiry. Sign-out deletes the server record and expires the cookie. User role changes/suspension revoke all that user's sessions; editing one's own access is rejected. Next Server Actions provide same-origin protections; do not enable wildcard allowed origins. `safeDestination` accepts only exact authorized registry paths; all other values fall back to dashboard. The shared layout currently redirects unauthenticated navigation to login with dashboard as its default return destination.

Seed accounts: `admin`, `production`, `warehouse`, `purchasing`, `approver`, `qc`, `ap`, `treasury`, `accounting`, `auditor`, each at `@ultraops.local`, IDs `usr_<lowercase role>`. Password is DEMO_PASSWORD from `.env.local`. A generated local `.env.local` is present in this workspace and ignored by git; use your own credentials for any new environment. Do not seed demo identities into a real deployment. Fresh production bootstrap/enterprise SSO, MFA, password rotation/reset and directory provisioning are future integrations. No recovery email is sent: recovery explains the absence and directs users to internal support. Optional NEXT_PUBLIC_SUPPORT_EMAIL configures a mailto link, not delivery.

## Shared contracts and representation

`auth.ts`: User, Actor, Role, ROLES, roleSchema, loginSchema, userSchema.

`domain.ts`: Entity, Document, DocumentType, DocumentReference, Material, Unit, Warehouse, Supplier, MaterialLine, MaterialRequest, VerificationResult, Rfq, Quotation, SupplierEvaluation, PriceLine, PurchaseOrder, ApprovalStep, ApprovalDecision, GoodsReceipt, ReceiptLine, QcResult, StockBalance, Invoice, InvoiceLine, MatchingResult, PayableBalance, Payment, PaymentAllocation, JournalEntry, JournalLine, Account and immutable AuditEvent.

- IDs: UUID strings for new entities; seeded stable namespaced IDs use `[A-Za-z0-9_-]`, maximum 100 characters. ID is identity; document number is immutable display data, not a foreign key.
- `Entity.version`: monotonically incremented optimistic concurrency number. A write must compare expectedVersion and reject stale changes. Auth core rows currently use timestamps rather than domain versioning.
- Timestamps: server-generated ISO 8601 UTC instants, `createdAt`, `updatedAt`, `occurredAt`; date-only fields are `YYYY-MM-DD` in the business calendar. Display instants in Asia/Jakarta, English dates, suffix WIB when time is included.
- Money: nonnegative **safe integer IDR minor units**; 100 = Rp1, 16,000,000,000 = Rp160,000,000. Currency is IDR throughout. Debits/credits are separate nonnegative amounts. Reject unsafe totals, round only by approved configurable policy; do not use binary floating point for accounting.
- Quantity: exact nonnegative decimal string with at most three decimal places. Calculate using scaled integers/decimal arithmetic; always carry material's `L`, `kg` or `pcs` unit. Do not mix units without an approved conversion policy. Master unit extension is a shared-contract change.
- Document numbers: `<TYPE>-<YYMMDD in Jakarta>-<sequence at least 4 digits>`. Counter scope is type/day. `nextDocumentNumber(type, at?)` implements atomic allocation; invoke after authorization inside the document insertion transaction. Fixture numbers intentionally preserve references and need reserved counter floors when those fixtures are seeded. Supplier invoice/delivery numbers are external fields, not internal IDs.
- Cross-links: use explicit IDs (`purchaseOrderId`, `purchaseOrderLineId`, `receiptLineIds`, `invoiceId`, etc.); `references` supplies traceable presentation metadata. Do not query business relationships by display number.
- Status unions are explicit per entity in domain.ts. Never infer workflow state from a status badge or arbitrary label. `statusLabel` is presentation only.
- Validation convention: domain service owns a Zod input schema composed from `idSchema`, `moneySchema`, `quantitySchema`, `instantSchema`; validate unknown inputs on the server, then enforce cross-field invariants in a transaction. Types alone are not runtime validation.
- Service boundaries: see `ProcurementService`, `InventoryService`, `FinanceService`, `AuditReader`, Repository, MutationContext, Query and Page. Business interfaces are future implementations; do not claim they return data today. Internal repositories must be server-only, use parameterized SQL and never bypass service authorization. Mutations require transactions, optimistic concurrency and persisted idempotency keys for financial/receipt replay protection.

Implemented: identity/session/admin service, `audit()` writer, document number allocator, SQLite and migration infrastructure. Future: all procurement/inventory/finance services and report/audit querying. No universal repository is provided for audit events because they must never expose update/delete.

## Persistence and integration strategy

Core owns users, sessions, login_attempts, audit_events and document_counters. Audit triggers reject update/delete. Migration runner records checksums and rejects changes to applied SQL. Run migrations explicitly before starting; requests never migrate the schema. Core auth/admin changes and their audit events are transactional where state changes must be atomic.

Each agent creates a separate namespace: `procurement`, `inventory`, `finance`, `reports`; never edit another namespace's applied migration. Namespace/file sorting is deterministic, but it is **not** a cross-module dependency solver. Agent 6 reviews and integrates migrations on a fresh database before release. First migrations must create only module-owned tables; cross-module FK constraints requiring another namespace and cross-module data seeding belong in `zz_integration/` after all module schemas exist, or in Agent 6's explicitly ordered integration stage. Do not create duplicate material/supplier/warehouse/account tables. Inventory owns materials/units/warehouses; procurement owns suppliers; finance owns accounts. Core owns users/audit/numbering. SQLite foreign_keys, WAL and busy_timeout are enabled.

Seed strategy: use FIXTURE_IDS and masterFixtures for every module. Add idempotent module-local seed functions under your feature; Agent 6 wires them into an explicit integration seed command **after** all migrations. Avoid each agent changing scripts/seed.ts. Use existing user IDs for creators. Do not invent alternative IDs for Fresh Milk, Milk Powder, Bandung RM or PT Sumber Pangan. Required example: 10,000 kg powder ordered at Rp20,000/kg; 8,000 kg physically received; 7,800 accepted, 200 rejected; invoice Rp160M, accepted value Rp156M, held Rp4M. Historical payment Rp60M leaves Rp100M outstanding, including Rp4M held. This is an agreed fixture specification, not seeded data yet. Domain agents must reserve fixture number sequence floors or seed counters atomically to avoid future collisions.

## Required invariants

1. Physical receipt and QC acceptance are separate. Held/rejected quantities are unavailable for production. Available stock excludes held, rejected and reserved quantities, without double-counting.
2. A PO may have multiple receipts, each linked at line level; prevent over-receipt unless a configured policy explicitly permits it.
3. Approved requires every required approval for the current revision. Creator cannot approve their own PO; assignment/authority rules also apply. Material changes invalidate applicable approvals and trigger reapproval.
4. Check duplicate supplier invoice numbers at least by supplier + normalized invoice number, with an enforceable uniqueness rule and analyst-approved void/reissue policy.
5. Matching uses eligible accepted/received quantities and prevents the same receipt quantity being billed twice. Tax/freight/tolerance rules are configurable and currently unspecified.
6. Held invoices cannot proceed to new payment. **Conflict:** reference 05 shows partial eligibility and payment against a partially held invoice. Preserve the stricter stated invariant until analyst approval; the Rp60M example can be historical before hold. Do not silently invent a partial-hold release policy.
7. Partial payments reduce outstanding balances through explicit allocations. Prevent over-allocation, payment replay and payments exceeding authorized eligible amounts.
8. Posted corrections retain history through linked reversal/correction documents; never edit posted financial records in place. Journals must balance before posting.
9. Audit records are generated by trusted server services, append-only and read-only for auditors. Never use browser-generated audit history as evidence.

## Analyst decisions and deployment limitations

Approval thresholds, sequence/parallel approval policy, assignment and delegation, organizational/request access scope, price/quantity tolerances, tax/freight treatment, chart of accounts, posting dates/period closure, rounding, exchange/conversion policy and partial-hold payment eligibility remain unspecified. No numeric policy is hardcoded into a pretend workflow. Production auth bootstrap, email/SSO/MFA, backup/restore, retention and multi-instance persistence/limiting require deployment decisions. Search and notification services are intentionally not implemented.

## Documentation consulted

- Official Next documentation bundled in `node_modules/next/dist/docs/01-app/02-guides/authentication.md` and `01-getting-started/07-mutating-data.md`; [online auth guide](https://nextjs.org/docs/app/guides/authentication).
- [iron-session official API](https://github.com/vvo/iron-session) via Context7 and installed API source.
- Skills discovered at [skills.sh](https://skills.sh/): frontend-design, vercel-react-best-practices and web-design-guidelines. Snapshots of read instructions are in `docs/research/`; local frontend-design-guidelines and gstack browse were also read. Context7 was available and used; Firecrawl was not needed.
