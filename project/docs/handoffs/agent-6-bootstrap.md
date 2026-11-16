# Agent 6 Phase A Bootstrap Handoff — Shared Contracts & Revenue Architecture

**Author:** Agent 6 (Shared Contract Coordinator & Reports Owner)  
**Date:** 29 October 2026  
**Status:** Bootstrap Complete (Phase A Ready for Agents 2–5)  
**Primary References:** `docs/SCOPE_AMENDMENT.md`, `docs/PROJECT_CONTRACT.md`, `docs/DESIGN_SYSTEM.md`

---

## 1. Executive Summary

Phase A bootstrap establishes the foundation for the commercial revenue cycle without modifying existing core login semantics or applied migrations. It realigns module ownership according to user instructions, formalizes cross-module interfaces between Finance and Inventory, provides read models for Dashboard and Reports, registers additive routes and subviews, adds least-privilege revenue roles and permissions, and extends canonical fixtures with stable identifiers.

---

## 2. Updated Ownership Realignment

The user's updated ownership overrides the original ownership table in `PROJECT_CONTRACT.md`:

| Agent | Module Scope | Owned Code Paths | Key Responsibilities |
| --- | --- | --- | --- |
| **Agent 2** | **Dashboard only** | `src/features/dashboard/**`, `src/app/(workspace)/dashboard/**` | Operational queues, period filters, authorized KPI snapshots. Does not own Reports. |
| **Agent 3** | **Procurement only** | `src/features/procurement/**`, `src/app/(workspace)/procurement/**`, `src/server/db/migrations/procurement/**` | Suppliers, FPBB material requests, RFQs, vendor evaluations, purchase orders, sequential approval hierarchies. |
| **Agent 4** | **Inventory only** | `src/features/inventory/**`, `src/app/(workspace)/inventory/**`, `src/server/db/migrations/inventory/**` | Raw materials, stock balances, goods receipts, QC inspections, **plus dispatches (`/inventory/dispatches`) and customer returns (`/inventory/returns`)**. |
| **Agent 5** | **Finance only** | `src/features/finance/**`, `src/app/(workspace)/finance/**`, `src/server/db/migrations/finance/**` | Supplier invoices, 3-way matching, AP payables, outgoing payments, general ledger, **plus revenue operations (`/finance/revenue`) and bank reconciliation (`/finance/journals?subview=reconciliation`)**. |
| **Agent 6** | **Reports & Integration** | `src/features/reports/**`, `src/app/(workspace)/reports/**`, `src/server/db/migrations/reports/**` | Cross-workflow audit querying, document traceability, operational/financial report tables, CSV exports, migration ordering, integration seed, and end-to-end testing. |

### Sidebar Invariant
The workspace sidebar strictly preserves the **five primary items**:
1. Dashboard (`/dashboard`)
2. Procurement (`/procurement/*`)
3. Inventory (`/inventory/*`)
4. Finance (`/finance/*`)
5. Reports (`/reports/*`)
With separate bottom **Settings** (`/settings`) for `ADMIN`. **No primary "Sales" menu is created.**

---

## 3. Exact Export Paths & Shared Contracts

### 3.1 `@/shared/contracts/revenue`
Dedicated contract definitions composed from existing primitives (`Id`, `Money`, `Quantity`, `Unit`, `Document`, `DocumentReference`):
- `Customer`: Code, name, address, tax NPWP, active state, credit profile.
- `CustomerCreditProfile`: Credit limit (IDR minor units), payment term days, credit status (`PENDING_ACTIVATION`, `ACTIVE`, `SUSPENDED`, `BLOCKED`), utilized/available credit.
- `SalesOrder` & `SalesOrderLine`: Customer link, warehouse link, unit prices, discount basis points, reserved/dispatched/returned quantities, statuses (`DRAFT`, `PENDING_VALIDATION`, `PENDING_STOCK_VERIFICATION`, `PENDING_CREDIT_APPROVAL`, `APPROVED`, `PARTIALLY_DISPATCHED`, `DISPATCHED`, `COMPLETED`, `REJECTED`, `CANCELLED`).
- `StockReservation` & `StockVerificationResult`: Reservation lifecycle (`ACTIVE`, `CONSUMED`, `RELEASED`), per-item stock verification.
- `DeliveryOrder` & `SignedDeliveryEvidence`: Dispatch metadata, recipient name, signed slip evidence reference, warehouse verification timestamp.
- `CustomerInvoice` & `CustomerInvoiceLine`: Tax invoice with verified signed DO link.
- `ReceivableBalance`: Aging schedule (`CURRENT`, `1_30`, `31_60`, `61_90`, `90_PLUS`), outstanding, credited, and written-off balances.
- `IncomingReceipt` & `IncomingReceiptAllocation`: Customer payment slip, bank reference, AR allocation proposal, Treasury bank validation.
- `ReturnClaim` & `ReturnInspectionResult`: Customer claim details, technical QC finding (`DAMAGED_IN_TRANSIT`, `WRONG_ITEM`, `EXPIRED`, `CUSTOMER_REJECT`, `DEFECT_FREE`), accepted/rejected quantities.
- `CreditNote` & `CreditNoteLine`: Price/return adjustments linked to customer invoices and return claims.
- `BadDebtWriteOff`: AR recommendation and FAM managerial approval.
- `BankReconciliation`: Statement vs. book balances, difference calculation, FAM sign-off.

### 3.2 `@/shared/services/revenue-interfaces`
Typed cross-module service interfaces and error types:
- `FinanceToInventoryService`:
  - `verifyStockForSalesOrder(actor, input)`
  - `createStockReservation(context, input)`
  - `releaseStockReservation(context, reservationId)`
  - `checkDispatchEligibility(actor, salesOrderId)`
  - `recordReturnInspection(context, input)`
- `InventoryToFinanceService`:
  - `getApprovedSalesOrder(actor, salesOrderId)`
  - `checkCustomerCreditStatus(actor, customerId)`
  - `getSalesOrderDeliveryProgress(actor, salesOrderId)`
  - `getSignedDeliveryOrderEvidence(actor, deliveryOrderId)`
  - `getReturnFindings(actor, returnClaimId)`
- `DashboardRevenueReadModel`:
  - `getPendingCreditApprovals(actor)`
  - `getPendingDispatches(actor)`
  - `getOverdueReceivables(actor, asOfDate)`
  - `getRevenueKpis(actor, period)`
- `ReportsRevenueReadModel`:
  - `getCustomerAgingSummary(actor, cutoffDate)`
  - `getSalesRevenueReport(actor, period)`
  - `getIncomingReceiptsReport(actor, period)`
  - `getAdjustmentsReport(actor, period)`
  - `getBankReconciliationReport(actor, accountId, period)`
  - `getDocumentTraceability(actor, query)`
- Error classes:
  - `InsufficientStockError`
  - `CreditLimitExceededError`
  - `CreditAccountSuspendedError`
  - `SignedEvidenceRequiredError`
  - `InvalidRevenueStatusTransitionError`
  - `PaymentOverAllocationError`
- Status transition maps:
  - `SALES_ORDER_TRANSITIONS`, `DELIVERY_ORDER_TRANSITIONS`, `CUSTOMER_INVOICE_TRANSITIONS`, `INCOMING_RECEIPT_TRANSITIONS`, `RETURN_CLAIM_TRANSITIONS`, `WRITE_OFF_TRANSITIONS`.

---

## 4. Roles & Permissions Architecture

### 4.1 New Revenue Roles
Four missing revenue roles added to `ROLES` in `@/shared/contracts/auth`:
- `SALES_ADMIN`: Customer entry, sales order input, initial return intake.
- `CREDIT_MANAGER`: Credit profile activation, credit limit management, credit release decisions, credit note authorization.
- `AR`: Verified signed DO check, customer billing, payment slip recording & allocation, write-off recommendations.
- `FAM` (Finance & Accounting Manager): High-tier discount approvals (> 5%), bad debt write-off authorization, bank reconciliation approval.

### 4.2 Reused Roles
Existing roles reuse their documented authority:
- `WAREHOUSE`: Physical stock verification, reservations, picking, dispatch execution, signed DO evidence recording, return inspection & restock.
- `TREASURY`: Incoming bank payment validation (bank statement matching), cash receipt issuance.
- `ACCOUNTING`: Review and posting of revenue/payment journals, bank reconciliation preparation.
- `AUDITOR`: Inherits all `:read` permissions across all modules; zero write permissions.
- `ADMIN`: Exclusively `dashboard:read` and `users:manage`; completely separated from business operations.

### 4.3 Database Migration for Roles
- Applied migrations `core/001_auth.sql` and `core/002_document_numbers.sql` preserved unchanged.
- Append-only migration `src/server/db/migrations/core/003_revenue_roles.sql` safely recreates the `users` table CHECK constraint to include `'SALES_ADMIN','CREDIT_MANAGER','AR','FAM'`.
- `scripts/migrate.ts` temporarily sets `PRAGMA foreign_keys = OFF` during migrations and enforces `PRAGMA foreign_keys = ON` with `PRAGMA foreign_key_check` afterwards.
- `scripts/seed.ts` seeds 14 accounts (IDs `usr_<lowercase role>`, password from `DEMO_PASSWORD` in `.env.local`).

---

## 5. Additive Destinations & Subviews

### 5.1 Routes in `src/shared/routes.ts`
1. `/inventory/dispatches` (Module: `inventory`, Permission: `dispatches:read`)
2. `/inventory/returns` (Module: `inventory`, Permission: `returns:read`)
3. `/finance/revenue` (Module: `finance`, Permission: `revenue:read`)

### 5.2 Finance Revenue Subviews (`/finance/revenue?subview=<id>`)
Defined in `@/features/finance/revenue/subviews`:
- `customers`: Permission `customers:read` (Action: `customers:write`, `credit:manage`)
- `sales-orders`: Permission `sales_orders:read` (Action: `sales_orders:write`)
- `credit-decisions`: Permission `sales_orders:read` (Action: `sales_orders:approve`)
- `invoices`: Permission `customer_invoices:read` (Action: `customer_invoices:write`)
- `receipts`: Permission `receipts_incoming:read` (Action: `receipts_incoming:write`, `receipts_incoming:validate`)
- `returns`: Permission `returns:read` (Action: `credit_notes:write`)
- `write-offs`: Permission `writeoffs:read` (Action: `writeoffs:recommend`, `writeoffs:approve`)

### 5.3 Bank Reconciliation Subview (`/finance/journals?subview=reconciliation`)
- Prepared by Accounting: `reconciliation:write`
- Approved by FAM: `reconciliation:approve`

---

## 6. Document Numbering Conventions

`nextDocumentNumber(type: DocumentType, at?: Date)` in `@/server/document-number` allocates atomic numbers formatted as `<TYPE>-<YYMMDD>-<SEQUENCE 4+ digits>`.

Additive document types supported:
- `SO`: Sales Order (`SO-261029-0001`)
- `DO`: Delivery Order (`DO-261029-0001`)
- `CINV` / `ARINV`: Customer Invoice (`CINV-261029-0001`)
- `RCPT`: Incoming Receipt (`RCPT-261029-0001`)
- `RET`: Customer Return Claim (`RET-261029-0001`)
- `CN` / `CRN`: Credit Note (`CN-261029-0001`)
- `WROFF` / `WRO`: Bad Debt Write-Off (`WROFF-261029-0001`)
- `BREC`: Bank Reconciliation (`BREC-261029-0001`)

---

## 7. Canonical Fixture Specifications

Stable IDs in `src/shared/fixtures/index.ts`:

- **Customers:**
  - `cust_indofood`: PT Indofood Sukses Makmur (`CUST-001`, Limit: Rp500,000,000, Terms: 30 days)
  - `cust_mayora`: PT Mayora Indah Tbk (`CUST-002`, Limit: Rp300,000,000, Terms: 30 days)
- **Accounts:**
  - `acc_1101_cash_bca`: 1101 Bank BCA - Operating (ASSET)
  - `acc_1103_ar`: 1103 Trade Accounts Receivable (ASSET)
  - `acc_1104_allowance`: 1104 Allowance for Doubtful Accounts (ASSET)
  - `acc_2101_ap`: 2101 Trade Accounts Payable (LIABILITY)
  - `acc_4101_sales`: 4101 Commercial Sales Revenue (REVENUE)
  - `acc_4102_returns`: 4102 Sales Returns & Allowances (REVENUE)
  - `acc_6105_bad_debt`: 6105 Bad Debt Expense (EXPENSE)
- **Revenue Documents:**
  - `so_261029_0001`: Sales Order (5,000 kg Milk Powder @ Rp25,000 = Rp125M)
  - `res_261029_0001`: Active warehouse reservation (5,000 kg)
  - `do_261029_0001`: Delivery Order (Dispatched 5,000 kg, Signed by Budi Santoso)
  - `cinv_261029_0001`: Customer Invoice (Total Rp125M)
  - `rcpt_261029_0001`: Incoming Receipt (Rp100M partial payment, Bank ref BCA-TRX-98231, Outstanding Rp25M)
  - `ret_261029_0001`: Return Claim (200 kg packaging damage)
  - `cn_261029_0001`: Credit Note (Rp5M deduction, New outstanding Rp20M)
  - `wroff_261029_0001`: Bad Debt Write-Off
  - `brec_261029_0001`: Bank Reconciliation (October 2026 BCA account)
- **Users:**
  - `usr_sales_admin`, `usr_credit_manager`, `usr_ar`, `usr_fam`

---

## 8. Decisions Agents 2–5 Must Follow

1. **Strict Namespace Isolation:** Module migrations must belong solely to `migrations/inventory/`, `migrations/procurement/`, `migrations/finance/`. Do not create tables owned by other domains. Cross-module constraints belong in `zz_integration/` coordinated by Agent 6.
2. **Delivery Evidence Invariant:** AR Customer Invoices cannot be created without verified signed delivery order evidence.
3. **Credit Exposure Formula:**
   $$\text{Credit Exposure} = \text{Outstanding AR Invoices} + \text{Unbilled Released Sales Orders} - \text{Unallocated Receipts}$$
   Obligations transition from unbilled SO to AR invoice upon billing without double-counting.
4. **Discount Authorization:** Discounts up to 5% may be submitted by Sales Admin; discounts exceeding 5% require explicit FAM approval before order release.
5. **Settlement Finalization:** AR payment slip recordings remain pending until Treasury validates the bank evidence and issues the cash receipt record.
6. **Purchasing Fixture Hold Integrity:** Fixture `inv_sp_1028_087` (`INV-SP-1028-087`, Rp100M outstanding with Rp4M held) must remain blocked from new payment attempts while in HELD status.
7. **Read-Only Reporting:** Reports are read-only views querying authorized domain read models. Do not duplicate mutable business state into independent report tables.

---

## 9. Verification & Validation Status

- **Automated Tests:** 41 tests passing across `tests/auth.test.ts`, `tests/dashboard.test.ts`, `tests/procurement.test.ts`, and `tests/revenue-contract.test.ts`.
- **TypeScript Typecheck:** `npm run typecheck` passes with zero errors.
- **Production Build:** `npm run build` succeeds across all 24 workspace routes.
- **SQLite Migrations & Seed:** Clean execution with 14 active accounts.

**Phase A is complete. Shared contracts, schemas, permissions, routes, and fixture specifications are ready for implementation by Agents 2–5.**
