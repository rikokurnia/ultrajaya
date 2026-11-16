# Backend handoff — frontend integration contract

The deployed Next.js frontend is database-independent. The backend team owns Supabase, real identity provisioning, row-level/security policies, API implementation, audit persistence and all durable mutations. No Supabase project or credential was created by the frontend work.

## Current boundaries

- `src/shared/contracts/auth.ts`: exactly five role IDs, User, Actor and CycleAssignment. Role labels are presentation; persist stable IDs.
- `src/lib/auth/permissions.ts`: DUTY_CATALOG, eligibility, explicit cycle/duty grants, canDuty, canViewCycle, authorize and notCreator. This is frontend behavior, not backend security.
- `src/lib/auth/session.ts` and `src/features/auth/actions.ts`: replace the signed frontend identity/role selector with backend session verification and real sign-in/logout. Existing fixed preview identities/password are public and must be removed before real records are served. Role switching is intentionally available to every preview visitor, not a production impersonation feature.
- `src/lib/demo/provider.tsx`: current browser-local user/access store. Replace its localStorage reads/writes with authenticated backend user and access endpoints; do not treat browser state as authority.
- `src/lib/demo/users.ts`: five identity fixtures. System Admin has no business assignments by default. All standard profiles omit salary:read and bank:read until explicitly assigned in Settings.
- `src/features/cycles/{pendapatan,pengeluaran,produksi,penggajian}/data.ts`: deterministic display fixtures/calculations; replace fixture initialization in the corresponding `*-view.tsx` with authorized repository reads. View event handlers currently change React state; replace them with awaited, versioned API mutations and visible pending/error feedback.
- `src/features/cycles/workspace.tsx`: cycle gate using the current identity and assignments. Backend must independently verify every read/mutation.
- `src/features/settings`: browser-local account/access editor; adding a user does not provision a backend login account.
- `src/features/reports/overview/page.tsx`: reference task rows and counts, not computed server reporting. Replace with scoped aggregate/task endpoints.

Historical SQLite services, schemas, routes and tests are in repository-root `archive/sqlite/`. No production application imports them; do not run those migrations against Supabase without a reviewed conversion. Original shared domain/revenue types remain available for discussion, but the new cycle fixture DTOs and business-unit conventions need reconciliation before becoming API contracts.

## Identity payload

```json
{
  "id": "backend-issued-stable-id",
  "name": "User name",
  "email": "user@company.example",
  "role": "OPERATIONS_STAFF",
  "active": true,
  "assignments": [
    {"cycle": "pengeluaran", "duties": ["cycle:read", "receipts:write"]}
  ],
  "createdAt": "2026-11-16T00:00:00Z",
  "updatedAt": "2026-11-16T00:00:00Z"
}
```

Role IDs: SYSTEM_ADMIN, OPERATIONS_STAFF, FINANCE_STAFF, HR_PAYROLL_STAFF, MANAGER_APPROVER. Cycle IDs: pendapatan, pengeluaran, produksi, penggajian. Each duty must exist in DUTY_CATALOG for that exact cycle and be eligible for the user's role. Role membership alone grants no business duty. System Admin can receive explicit business assignments separately, but never gains managerial approval powers merely through administrative access.

## Required API capabilities (proposed; not implemented)

| Boundary | Operations |
| --- | --- |
| Identity | Get current session/user, real sign-in/logout, revoke disabled users |
| Administration | List/create/update users; assign role/cycle/duties; workspace settings |
| Revenue | Customers/credit; orders; stock verification; delivery evidence; invoice matching; receivables, receipts and reconciliation; aging review |
| Expenditure | Requests; RFQs/offers; purchase orders and approval; physical receipts; independent QC; vendor invoice matching; payable allocations/payments |
| Production | Planning/material requirements; orders; batches/results; QC release; storage confirmation; costs/HPP review |
| Payroll | Employee/onboarding; attendance; KPI; calculations; review/approval; disbursement; journals |
| Reporting | Authorized task counts, period summaries and document trace/audit reads |

Use JSON DTOs, stable IDs and explicit status enums. Lists should support pagination/filtering and return `{items,total,nextCursor}`; errors should provide `{code,message,fieldErrors?}` and appropriate 401/403/409/422 responses. Every mutation should accept expectedVersion and financial mutations should additionally require an idempotency key. Obtain actor and timestamps from verified server context, never submitted role/user IDs. Endpoint URLs are deliberately not frozen until the backend team agrees to them.

## Non-negotiable authorization and invariants

1. Role, cycle membership and exact duty must all pass. Receiving access does not grant QC. Production QC and incoming-goods QC are distinct cycle assignments.
2. Individual salary and full bank data need explicit salary:read / bank:read duties. Redact unauthorized fields in server responses; frontend masking is insufficient. Aggregate payroll totals are a separate duty.
3. Never approve a document created by the same actor. Check current ownership/assignment from trusted storage, then apply authority/threshold policies. PO and payroll preview controls demonstrate this boundary; the backend must enforce it atomically.
4. Physical receipt and QC acceptance remain separate; held/rejected stock is not available. Support partial receipt/payment allocations and prevent double counting/over-allocation.
5. Match invoices against eligible accepted quantities; prevent duplicate supplier invoices. The historical reference's partly-held payment behavior still requires analyst confirmation.
6. Journal posting balances debits/credits; posted corrections use traceable reversals; payroll approval precedes disbursement and posting.
7. Audit events are server generated, append-only and never editable by business users. This frontend does not implement authoritative audit logs.

## Numeric representation

Current cycle fixtures use numeric **whole rupiah** for presentation and exact strings where units require precision; older shared domain interfaces specify **IDR minor units (100 = Rp1)**. Do not directly mix them. Agree one transport representation with the backend and add explicit conversion at the repository boundary. Prefer decimal strings/scaled integers for persisted arithmetic and reject unsafe totals. All UI dates use the Jakarta business calendar; store instants in UTC and date-only business fields as YYYY-MM-DD.

## Environment and deployment

Only SESSION_SECRET is currently required in Vercel for the signed frontend identity. No database connection remains. The backend team should provide the API origin and agreed public auth client configuration when ready; never send service-role credentials to a browser. Deployments retain professional product copy without visible demo/simulation marketing labels, per user direction. This document records the technical limits for maintainers.
