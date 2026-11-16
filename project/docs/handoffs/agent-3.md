# Agent 3 — Procurement Module Handoff

## 1. Status and Scope

Agent 3 is responsible exclusively for the UltraOps Procurement module (`/procurement/*`). All business workflows, database tables, migrations, domain services, UI components, routes, integration contracts, seed data, and tests have been implemented, tested, and verified against the visual reference `03-procurement.png`.

The shared shell (`AppShell`) and `ModulePage` wrapper are preserved intact. All procurement views use the established design system tokens, English copy, dense tables, responsive layout drawers, and exact financial/quantity representations.

### Routes Implemented
- `/procurement/requests`: Material Requests / FPBB (Production requisitions, priority, warehouse stock verification, auto-closing if stock is sufficient without purchase).
- `/procurement/rfqs`: Requests for Quotation (RFQs, invited supplier bids, quotation recording, lead time tracking, multi-vendor comparison matrix).
- `/procurement/suppliers`: Supplier Master Directory (legal document tracking, qualification status, supply risk rating, evaluation rationale).
- `/procurement/orders`: Purchase Orders Workspace (Left dense PO table, bottom linked FPBB request card, right drawer with lines, supplier quote comparison, multilevel approval timeline, revise and issue actions).
- `/procurement/approvals`: Executive Approval Queue (Expenditure tier delegation, strict segregation of duties preventing creator self-approval, PO splitting safeguards, decision rationale recording).

---

## 2. Changed and Owned Files

### Database & Migrations
- `src/server/db/migrations/procurement/001_procurement.sql`: 14 tables in the procurement namespace:
  - `suppliers`: Vendor master, qualification status, legal document expiration, risk rating.
  - `material_requests` & `material_request_lines`: FPBB headers and lines with priority, production references, and warehouse verification outcomes.
  - `rfqs`, `rfq_requests`, `rfq_suppliers`, `rfq_lines`: RFQs linked to verified material requests and invited vendors.
  - `quotations` & `quotation_lines`: Formal supplier quotation bids with validity dates and delivery lead days.
  - `supplier_evaluations`: Multi-criteria weighted scoring rationale and winning quotation awards.
  - `purchase_orders`, `purchase_order_requests`, `purchase_order_lines`: Purchase orders with terms, linked references, prices, and revisions.
  - `approval_steps`: Sequential multi-tier approval stages, decisions, approver actors, and revision stamps.

### Domain Service, Policies & Seed
- `src/features/procurement/policies.ts`: Explicit `[Demo Configuration]` policies for:
  - Multi-tier PO approval thresholds (Tier 1 &le; Rp50M, Tier 2 &le; Rp250M, Tier 3 &gt; Rp250M).
  - Suspected PO Splitting safeguard (> Rp100M day-volume to same vendor escalates to Director).
  - 6-dimension weighted supplier evaluation matrix (Quality 25%, Capacity 15%, Delivery 20%, Price 20%, Legal 10%, Risk 10%).
- `src/features/procurement/service.ts`: `ProcurementDomainService` implementing `ProcurementService` from `@/shared/services/interfaces` with optimistic concurrency (`version`), actor authorization (`authorize`), atomic document numbering (`nextDocumentNumber`), and server audit logging (`audit`).
- `src/features/procurement/types.ts`: Zod validation schemas for input mutations, line items, and extended read models.
- `src/features/procurement/actions.ts`: Server Actions (`createRequestAction`, `verifyRequestAction`, `createRfqAction`, `recordQuotationAction`, `evaluateSuppliersAction`, `createOrderAction`, `decideApprovalAction`, `reviseOrderAction`, `issueOrderAction`, `createSupplierAction`).
- `src/features/procurement/seed.ts`: `seedProcurement()` entry point seeding fixture floors, suppliers, canonical powder order scenario, and `03-procurement.png` visual reference records.

### Route Wrappers & UI Components
- `src/app/(workspace)/procurement/orders/page.tsx` & `src/features/procurement/orders/page.tsx`
- `src/app/(workspace)/procurement/requests/page.tsx` & `src/features/procurement/requests/page.tsx`
- `src/app/(workspace)/procurement/rfqs/page.tsx` & `src/features/procurement/rfqs/page.tsx`
- `src/app/(workspace)/procurement/suppliers/page.tsx` & `src/features/procurement/suppliers/page.tsx`
- `src/app/(workspace)/procurement/approvals/page.tsx` & `src/features/procurement/approvals/page.tsx`
- `src/features/procurement/components/po-detail-panel.tsx`: Reference-matched right drawer for PO inspection, lines, quote comparison, approval steps, and actions.
- `src/features/procurement/components/order-dialog.tsx`: "+ Create PO" modal dialog.
- `src/features/procurement/components/request-dialog.tsx`: "+ New Material Request" and "Verify Stock" modal dialogs.
- `src/features/procurement/components/rfq-dialog.tsx`: "Create RFQ", "Record Quotation", and "Evaluate & Award" modals.
- `src/features/procurement/components/supplier-dialog.tsx`: "+ Add Supplier" modal dialog.

### Tests & Documentation
- `tests/procurement.test.ts`: 16 comprehensive automated integration tests covering end-to-end lifecycle, permissions, concurrency, and validation.
- `docs/screenshots/0*-procurement-*.png`: 10 full-page desktop (1600x1000) and mobile (375x812) screenshot captures.

---

## 3. Data & Invariant Implementation

1. **Canonical Milk Powder Scenario Preserved**:
   - Order `PO-261026-0042` with PT Sumber Pangan Sejahtera (`sup_sumber_pangan`): 10,000 kg milk powder (`mat_milk_powder`) @ Rp20,000/kg = Rp200,000,000 (represented exactly as `20000000000` safe integer IDR minor units, quantity `"10000.000"`).
2. **Production Ownership & Warehouse Verification**:
   - Material requests (FPBB) require `productionReference`, `warehouseId`, `requiredOn`, `priority`, and `lines`.
   - Production owns creation; only Warehouse role can verify stock availability.
   - If Warehouse finds sufficient stock, request closes with `CLOSED_SUFFICIENT_STOCK` outcome and reason, bypassing PO generation.
3. **RFQ Quotations & Evaluation Matrix**:
   - RFQs aggregate verified FPBB requirements and invite approved suppliers.
   - Suppliers submit formal quotations with lead times and validity windows.
   - Multi-criteria evaluation persists rationale across 6 weighted dimensions.
4. **Multilevel Approval Hierarchy & Segregation of Duties**:
   - Steps are derived automatically based on expenditure tier policies:
     - &le; Rp50M: 1 step (Procurement Manager).
     - &le; Rp250M: 2 steps (Procurement Manager &rarr; Finance Manager).
     - &gt; Rp250M: 3 steps (Procurement Manager &rarr; Finance Manager &rarr; Executive Director).
   - **Segregation of Duties**: The creator of a PO cannot approve their own PO (`notCreator(po.createdBy)`).
   - Prior steps must complete before subsequent steps can decide.
   - Material edits (`reviseOrder`) invalidate all prior approval decisions, increment `revision`, and require re-approval.
5. **Separate PO Issuance**:
   - Approved POs are issued to suppliers via a distinct `issueOrder` action (setting status to `OPEN` and recording dispatch notes/timestamps). Suppliers do not require system accounts.

---

## 4. Cross-Module Integration Exports

Agent 4 (Inventory) and Agent 5 (Finance) should consume the following domain methods exported from `@/features/procurement/service`:

```typescript
import { procurementService } from "@/features/procurement/service";

// 1. For Inventory & Purchasing: Query verified requests ready for fulfillment or purchasing
const verifiedRequests = await procurementService.getVerifiedRequests(actor, warehouseId?);

// 2. For Inventory Goods Receipts: Query approved PO lines ready for receiving
const approvedLines = await procurementService.getApprovedOrderLines(actor, orderId?);
// Returns: Array<PriceLine & { orderId: string; orderNumber: string; supplierId: string; warehouseId: string }>

// 3. For Inventory Receipts: Calculate remaining balance on a PO line
const remainingQty = await procurementService.getOutstandingReceiptQuantity(actor, orderLineId);

// 4. For Finance 3-Way Matching: Inspect approved PO and quotation pricing
const order = await procurementService.getOrder(actor, orderId);
```

---

## 5. Verification Results

| Check | Tool / Command | Result |
| :--- | :--- | :--- |
| **Procurement Integration Tests** | `npx tsx --conditions=react-server --test tests/procurement.test.ts` | **16/16 Passed** (0 failures) |
| **All System Tests** | `npx tsx --conditions=react-server --test tests/auth.test.ts tests/dashboard.test.ts tests/procurement.test.ts` | **32/32 Passed** (0 failures) |
| **TypeScript Typecheck** | `npm run typecheck` (`tsc --noEmit`) | **0 Errors** |
| **ESLint Validation** | `npx eslint src/features/procurement/**/*.{ts,tsx} tests/procurement.test.ts` | **0 Errors, 0 Warnings** |
| **Next.js Production Build** | `npm run build` | **Successfully compiled** all static & dynamic routes |
| **Visual Fidelity (Desktop & Mobile)** | Playwright (1600x1000 & 375x812) | **Verified** against `03-procurement.png` |

### Captured Screenshots
- `project/docs/screenshots/01-procurement-orders-desktop.png` (296 KB)
- `project/docs/screenshots/01-procurement-orders-mobile.png` (169 KB)
- `project/docs/screenshots/02-procurement-requests-desktop.png` (242 KB)
- `project/docs/screenshots/02-procurement-requests-mobile.png` (106 KB)
- `project/docs/screenshots/03-procurement-rfqs-desktop.png` (235 KB)
- `project/docs/screenshots/03-procurement-rfqs-mobile.png` (124 KB)
- `project/docs/screenshots/04-procurement-suppliers-desktop.png` (289 KB)
- `project/docs/screenshots/04-procurement-suppliers-mobile.png` (159 KB)
- `project/docs/screenshots/05-procurement-approvals-desktop.png` (317 KB)
- `project/docs/screenshots/05-procurement-approvals-mobile.png` (202 KB)
