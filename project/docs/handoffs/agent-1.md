> **Current deployed architecture:** Five-role, database-independent frontend. Read [backend handoff](../BACKEND_HANDOFF.md) and the final frontend handoff before historical SQLite instructions below. Supabase is owned by the backend team.

> **Latest foundation design:** Read [foundation-design-revision.md](foundation-design-revision.md) first. It supersedes the earlier shell layout and dashboard presentation described below.

# Agent 1 handoff — UltraOps foundation

## Ready for the next agent

The Next.js application lives entirely in `project/`. Run every application command there. Original notes and references remain in `../mynotes/`. Start by reading:

1. `docs/PROJECT_CONTRACT.md` — frozen routes, exact dependency versions, permissions, contracts, module ownership, migration strategy, fixture IDs and unresolved policies.
2. `docs/DESIGN_SYSTEM.md` — inspected references, tokens, layouts and component usage.
3. This file — setup, exports, verification and implementation limits.
4. `src/shared/routes.ts`, `src/shared/contracts/auth.ts`, `src/shared/contracts/domain.ts`, `src/shared/services/interfaces.ts`, `src/shared/fixtures/index.ts`.
5. `src/lib/auth/permissions.ts`, `src/lib/auth/session.ts`, `src/components/module-page.tsx`, `src/components/ui/index.tsx`, `src/components/ui/overlays.tsx`, `scripts/migrate.ts`.

## Implemented

Responsive shared shell, five primary navigation items, separate Admin-only Settings, module tabs, accessible mobile drawer, search/notification capability notices, local Inter typography, design tokens, UI primitives and development showcase. Login includes branding/reference illustration, password visibility, preserved inputs on failure, validation, pending state, remember-me, error feedback, safe redirects and honest recovery support.

SQLite-backed identity, salted scrypt password hashes, encrypted iron-session cookie, token-digest storage, server-side expiry/revocation, active-user resolution, ten role grants, server page/action/service permission checks, object-rule hooks, Admin user creation/access changes/suspension, immutable server-written audit events and atomic Jakarta document numbering. All frozen business routes exist as styled placeholders; business workflows are intentionally reserved for their owners.

## Exact exports and entry points

- `@/shared/contracts/auth`: ROLES, roleSchema, loginSchema, userSchema; Role, User, Actor.
- `@/shared/contracts/domain`: shared entity/document contracts and idSchema, moneySchema, quantitySchema, instantSchema. Full entity list is in PROJECT_CONTRACT.
- `@/shared/services/interfaces`: ProcurementService, InventoryService, FinanceService, AuditReader, Repository, MutationContext, Query, Page, ModuleNotImplementedError. These are future service interfaces, not working business services.
- `@/shared/fixtures`: FIXTURE_IDS, masterFixtures. Reuse these identifiers; domain data has not been seeded.
- `@/shared/routes`: ROUTES, MODULES, ModuleKey, RouteDefinition. Agent 6 coordinates registry changes.
- `@/lib/auth/permissions`: PERMISSIONS, ROLE_PERMISSIONS, can, authorize, AccessError, notCreator, ownDocument; Permission.
- `@/lib/auth/session` (server-only): sessionCookie, getCurrentUser, requireUser, requirePermission.
- `@/lib/auth/redirect`: safeDestination; exact authorized registry destinations only.
- `@/server/auth-service` (server-only): authenticate, hashPassword, verifyPassword, createSession, resolveSession, revokeSession, listUsers, createUser, updateUserAccess, audit. Trusted actors must come from the server session.
- `@/server/db`: db. `@/server/document-number`: nextDocumentNumber. Call number allocation inside the authorized creation transaction.
- `@/components/ui`: cn, Button, Input, Select, Field, Card, PageHeader, TabNavigation, StatusBadge, KpiCard, EmptyState, DataTable, ApprovalTimeline, Currency, Quantity, DateDisplay; StatusTone.
- `@/components/ui/overlays`: DetailDrawer, ConfirmDialog. Radix supplies focus trapping/return and Escape behavior.
- `@/components/module-page`: ModulePage, required wrapper for module routes.
- `@/components/permission-gate`: PermissionGate, presentation only.
- `@/shared/format`: formatCurrency, formatQuantity, formatDate, statusLabel.
- `src/features/auth/actions.ts`: signIn, signOut. `src/features/settings/actions.ts`: addUser, changeAccess.
- `/dev/components`: authenticated component showcase in development, unavailable in production.

## Setup and seed

```bash
cd project
npm ci
cp .env.example .env.local
# Set SESSION_SECRET to a unique random string of at least 32 characters.
# Set DEMO_PASSWORD to a local password of at least 12 characters.
npm run seed
npm run dev
```

A configured, git-ignored `.env.local` and seeded local database already exist in this workspace. Preserve them to use the existing accounts; do not overwrite the file just to restart. Read DEMO_PASSWORD locally. Ten accounts: `admin@ultraops.local`, `production@ultraops.local`, `warehouse@ultraops.local`, `purchasing@ultraops.local`, `approver@ultraops.local`, `qc@ultraops.local`, `ap@ultraops.local`, `treasury@ultraops.local`, `accounting@ultraops.local`, `auditor@ultraops.local`. All use the configured DEMO_PASSWORD. Seed preserves existing passwords and refuses production mode. A browser-verification account was created and suspended during UI verification; it is not part of the canonical seed.

`npm run migrate` applies pending migrations. `npm run build && npm start` runs production; production cookies require HTTPS except trusted localhost verification. SQLite needs a persistent writable volume and Node runtime. Do not deploy demo credentials. Recovery email, SSO, MFA and production identity bootstrap are not configured.

## Modification boundaries for Agents 2–6

- Agent 2: read all files listed above, then own `src/features/dashboard/**`, `src/app/(workspace)/dashboard/**`, own tests/docs (Dashboard only; Reports reassigned to Agent 6 per SCOPE_AMENDMENT.md).
- Agent 3: read the shared files, then own `src/features/procurement/**`, `src/app/(workspace)/procurement/**`, own tests/docs and `src/server/db/migrations/procurement/**`. Own suppliers and purchasing documents.
- Agent 4: read the shared files, then own `src/features/inventory/**`, `src/app/(workspace)/inventory/**` (including dispatches & returns), own tests/docs and `src/server/db/migrations/inventory/**`. Own material/unit/warehouse master data, QC, dispatches, and return inspections.
- Agent 5: read the shared files, then own `src/features/finance/**`, `src/app/(workspace)/finance/**` (including revenue operations and bank reconciliation), own tests/docs and `src/server/db/migrations/finance/**`. Own account master data, payables, receivables, and revenue.
- Agent 6: own Reports (`src/features/reports/**`, `src/app/(workspace)/reports/**`, `migrations/reports/**`), integrate cross-module dependencies, service adapters, shared changes, migration ordering, fixture seeding and end-to-end tests. Preserve the existing authorization boundaries and route destinations.

All migration paths above are relative to `project/`; Agent 2's abbreviated `migrations/reports/**` means `src/server/db/migrations/reports/**`. Never edit an applied migration. Agents 2–5 should not rewrite the shell, auth, core schema, package files or shared registry. Keep ModulePage in route wrappers. Add module-local seed functions; Agent 6 wires an integration seed after all schemas exist. Read the migration dependency strategy in PROJECT_CONTRACT before introducing cross-module foreign keys. No other agents were spawned during this implementation.

## Verification

Passed: `npm run typecheck`, `npm run lint`, `npm test` (10 tests), and production build. Repeated after substantive fixes. `npm ci --dry-run --ignore-scripts` passed; native dependencies were approved/rebuilt and SQLite seed/migrations executed successfully. Full clean reinstall was not repeated after successful install.

Automated tests cover successful/failed sign-in, unknown user, password-hash non-disclosure, throttling, remember-me lifetimes, expiry, token forgery rejection, logout/revocation, unauthenticated server writes, authenticated forbidden user administration, auditor write denial, Admin access, QC price-write denial, creator approval denial, live role changes/suspension, self-access protection, audit immutability, repeatable migrations, safe redirects and Jakarta document numbering.

Gstack browser verification covered desktop 1600×1000, tablet 768×1024 and mobile 375×812: login, wrong-password feedback, sign-in/out, protected-route redirect, recovery panel, authenticated shell, mobile navigation open/Escape, denied auditor Settings and Admin user creation/suspension. Mobile document width measured 375 px at a 375 px viewport. Production unchecked remember-me cookie was confirmed HttpOnly, Secure, SameSite=Lax, with no persistent expiry. A remembered development cookie was also confirmed HttpOnly/SameSite=Lax with persistent expiry. Production build runs as expected; no external email integration could be tested because none exists.

Screenshots in `docs/screenshots/`:

- `login-desktop.png`, `login-tablet.png`, `login-mobile.png`.
- `shell-desktop.png`, `shell-tablet.png`, `shell-mobile.png`.
- `navigation-mobile.png`, `access-denied-mobile.png`, `settings-desktop.png`.
- `components-desktop.png` (development showcase).

Screenshots were inspected against actual references. A duplicate SVG gradient ID discovered in the mobile drawer was fixed with React useId. Some earlier captures predate this final small fix. Gstack's early screenshot caret-style injection triggered a development hydration diagnostic; production captures avoid the development issue indicator. Real-device, Windows rendering and a full assistive-technology audit were not available.

## References and limitations

Inspected: `01-login.png`, `02-dashboard.png`, `03-procurement.png`, `04-inventory-quality-control.png`, `05-finance.png`. Missing: none. Empty analyst notes file: `../mynotes/com_usflow.txt`. The login uses a CSS crop of the supplied illustration; obtain an approved standalone asset before production.

Business pages, global search, notification feed and report/audit querying are not implemented. Admin does not receive business approvals. Object-level request scope, assigned approval authority and policy checks must be added by the domain owners using authorize's objectRule hook. Module interfaces and decimal/money conventions are frozen in the contract; do not substitute disconnected mock arrays or successful no-op services.

Analyst decisions: approval thresholds/delegation, reapproval details, matching tolerances, tax/freight, rounding, posting/period policies and organization scope. Explicit policy conflict: reference 05 permits paying an eligible portion of a partly held invoice, while the stated invariant blocks held invoices from payment. Treat held invoices as blocked for new payments until clarified; historical example payments may predate the hold. See PROJECT_CONTRACT for all required invariants.
