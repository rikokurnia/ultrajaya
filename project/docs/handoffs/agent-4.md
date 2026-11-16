# Agent 4 — Inventory Module Handoff

## 1. Status and Scope

Agent 4 has implemented the UltraOps Inventory domain inside `project/src/features/inventory/**` and registered workspace routes under `project/src/app/(workspace)/inventory/**`. The shared shell, token architecture, and authentication infrastructure remain preserved. Compact subnavigation provides seamless switching across all inventory workspaces:

- `/inventory/stock`: Real-time warehouse balances, minimum stock alerts, exact category breakdown, and full stock movement transaction ledger.
- `/inventory/receipts`: Inbound goods receipts against approved Procurement PO lines, partial receipt tracking, and policy-governed over-receipt controls.
- `/inventory/inspections`: Quality Control inspections matching `04-inventory-quality-control.png`, multi-test results, dual acceptance/rejection progress, and quarantine evaluation.
- `/inventory/dispatches`: Outbound delivery order workflow against Finance-owned Sales Orders, credit status verification, atomic stock reservation, 3PL carrier tracking, and signed DO evidence upload.
- `/inventory/returns`: Physical return inspections against Finance return claims, condition classification, and quarantine routing.

---

## 2. Changed and Created Files

### Migrations & Storage
- `src/server/db/migrations/inventory/001_inventory_schema.sql`: 14 tables including materials, warehouses, unit conversions, stock balances, stock movements, goods receipts, QC inspections, delivery orders, attachments, return claims/inspections, and FPBB verifications.
- `src/features/inventory/server/attachments.ts`: Protected local file storage outside `public/` (`data/attachments/inventory/`), magic bytes validation for PDF/PNG/JPEG, SHA-256 integrity hashing, and size restrictions (10MB).
- `src/app/api/inventory/attachments/[id]/route.ts`: Authenticated, permission-gated streaming route handler for secure evidence downloads.

### Arithmetic & Seed
- `src/features/inventory/server/decimal.ts`: Fixed-point 3-decimal arithmetic using `BigInt` (scaled by 1,000) preventing floating-point inaccuracies.
- `src/features/inventory/server/seed.ts`: Idempotent domain seed function `seedInventory(sql)` preserving canonical fixtures, materials, warehouses, and master data.

### Service & Actions
- `src/features/inventory/server/inventory-service.ts`: Core service implementing `InventoryService` interface, mutation workflows with replay protection (`idempotency_key`), optimistic concurrency versioning, and atomic transactions.
- `src/features/inventory/types.ts`: TypeScript contracts and Zod validation schemas for all inventory mutations and query read models.
- `src/features/inventory/actions.ts`: Server actions for receipts, QC inspections, dispatches, stock reservations, signed DO uploads, and return inspections.

### User Interface & Styles
- `src/features/inventory/inventory.module.css`: Visual layout styles matching visual reference `04-inventory-quality-control.png` (cards, badges, dual acceptance bar, test table, quarantine alert).
- `src/features/inventory/stock/stock-view.tsx` & `page.tsx`
- `src/features/inventory/receipts/receipts-view.tsx` & `page.tsx`
- `src/features/inventory/inspections/inspections-view.tsx` & `page.tsx`
- `src/features/inventory/dispatches/dispatches-view.tsx` & `page.tsx`
- `src/features/inventory/returns/returns-view.tsx` & `page.tsx`
- Workspace route wrappers: `src/app/(workspace)/inventory/{stock,receipts,inspections,dispatches,returns}/page.tsx`

### Verification & Documentation
- `tests/inventory.test.ts`: Comprehensive test suite verifying 11 test scenarios.
- `docs/screenshots/inventory-*.png`: Responsive desktop, tablet, and mobile captures.

---

## 3. Quantity Formulas & Invariants

All quantities are represented as strings formatted to exactly 3 decimal places (e.g. `"16000.000"`). Arithmetic is executed strictly using BigInt integer arithmetic scaled by 1,000.

### Bucket Definitions
- **Physical**: Total physical inventory physically located within the warehouse.
- **QC-Pending**: Inbound goods physically received at the dock but awaiting QC inspection and test decisions.
- **Accepted**: High-grade goods that have passed QC and are approved for production consumption or order fulfillment.
- **Rejected**: Quarantined, substandard, or damaged stock segregated from production and fulfillment.
- **Reserved**: Stock allocated and committed to approved Sales Orders or active production allocations, preventing concurrent overselling.
- **Available**: Stock unencumbered and immediately available for new allocations.

### Exact Mathematical Invariants
1. **Total Physical Invariant**:
   $$\text{Physical} = \text{QC\_Pending} + \text{Accepted} + \text{Rejected} + \text{Reserved}$$
   All five buckets represent non-overlapping, disjoint subsets of inventory.

2. **Available Stock Invariant**:
   $$\text{Available} = \text{Accepted} - \text{Reserved}$$
   Available stock is strictly calculated from accepted stock less reserved allocations.

3. **QC Inspection Total Invariant**:
   $$\text{Inspected} = \text{Accepted} + \text{Rejected}$$
   Any QC inspection must account for 100% of the inspected quantity. On completion, stock moves atomically:
   - $\text{QC\_Pending} \leftarrow \text{QC\_Pending} - \text{Inspected}$
   - $\text{Accepted} \leftarrow \text{Accepted} + \text{AcceptedQuantity}$
   - $\text{Rejected} \leftarrow \text{Rejected} + \text{RejectedQuantity}$
   - $\text{Physical}$ remains constant during QC.

4. **Canonical Fixture Balance (Milk Powder in Bandung RM)**:
   - Physical: `18,200.000 kg`
   - QC-Pending: `2,000.000 kg`
   - Accepted: `16,000.000 kg`
   - Rejected: `200.000 kg`
   - Reserved: `0.000 kg`
   - Available: `16,000.000 kg`
   - Verification: $2,000 + 16,000 + 200 + 0 = 18,200\text{ kg}$. In the QC view (`04-inventory-quality-control.png`), "QC-Held" displays $\text{QC\_Pending} + \text{Rejected} = 2,200\text{ kg}$, which matches visual reference exactly ($16,000\text{ available} + 2,200\text{ held} = 18,200\text{ physical}$). Minimum threshold is $12,000\text{ kg}$ (`HEALTHY`).

---

## 4. Protected Evidence Storage Architecture

Signed Delivery Orders (DO) and physical return inspection evidence contain legally binding customer acknowledgments and driver signatures:

- **Storage Path**: Protected local directory configured by `ATTACHMENT_STORAGE_PATH` (defaults to `data/attachments/inventory/` in development). This directory is outside `public/` and completely inaccessible to web crawlers or unauthenticated requests.
- **Content Inspection**: Magic byte inspection verifies genuine MIME types:
  - PDF: `%PDF` (`0x25 0x50 0x44 0x46`)
  - PNG: `\x89PNG` (`0x89 0x50 0x4e 0x47`)
  - JPEG: `\xFF\xD8\xFF` (`0xff 0xd8 0xff`)
- **Integrity**: Files are stored under random UUIDs with their SHA-256 hash recorded in `inventory_attachments`.
- **Authorized Download**: Streamed through `/api/inventory/attachments/[id]`, enforcing active server session and role permissions (`dispatches:read` or `receipts:read`). Unauthorized downloads return HTTP 403 Forbidden.

---

## 5. Cross-Module Service Exports & Interfaces

The service is exported as `inventoryService` from `src/features/inventory/server/inventory-service.ts`:

```typescript
export interface InventoryService {
  // Inbound & Balances
  stock(actor: Actor, warehouseId: string): Promise<StockBalanceView[]>;
  receive(context: MutationContext, rawInput: unknown): Promise<GoodsReceiptView>;
  inspect(context: MutationContext, rawInput: unknown): Promise<InspectionView>;
  eligibleReceiptQuantity(actor: Actor, orderLineId: string, orderedQty?: string): Promise<string>;
  
  // Production Support
  verifyRequestStock(actor: Actor, input: { requestId: string; warehouseId: string; items: { materialId: string; requestedQuantity: string }[] }): Promise<{ allAvailable: boolean; items: Array<{ materialId: string; outcome: "VERIFIED" | "REJECTED"; availableStock: string; requestedQuantity: string; reason: string }> }>;

  // Outbound Revenue Flow
  reserveStock(context: MutationContext, rawInput: unknown): Promise<{ salesOrderId: string; salesOrderLineId: string; reservedQuantity: string; newAvailable: string; newReserved: string }>;
  releaseStockReservation(context: MutationContext, input: { salesOrderId: string; salesOrderLineId: string; materialId: string; warehouseId: string; quantity: string }): Promise<{ released: string; newAvailable: string; newReserved: string }>;
  createDispatch(context: MutationContext, rawInput: unknown): Promise<DeliveryOrderView>;

  // Returns & Classification
  inspectReturnGoods(context: MutationContext, rawInput: unknown): Promise<ReturnInspectionView>;

  // Queries
  getReceipt(actor: Actor, id: string): Promise<GoodsReceiptView | null>;
  listReceipts(actor: Actor, query?: { warehouseId?: string; search?: string }): Promise<GoodsReceiptView[]>;
  getInspection(actor: Actor, id: string): Promise<InspectionView | null>;
  listInspections(actor: Actor, query?: { receiptId?: string }): Promise<InspectionView[]>;
  getDispatch(actor: Actor, id: string): Promise<DeliveryOrderView | null>;
  listDispatches(actor: Actor, query?: { salesOrderId?: string }): Promise<DeliveryOrderView[]>;
  getReturn(actor: Actor, id: string): Promise<ReturnClaimView | null>;
  listReturns(actor: Actor): Promise<ReturnClaimView[]>;
}
```

### Integration Dependencies
1. **Procurement**:
   - Reads approved PO lines (`orders:read`) via `eligibleReceiptQuantity(actor, orderLineId)`.
   - Prevents double-counting by returning net outstanding receipt capacity ($PO\ Quantity - Sum(Received)$).
   - Supplies `verifyRequestStock` to verify material request availability for Production FPBB.
2. **Finance**:
   - Reads Finance-owned Sales Order (`SO-261028-0015`), verifying credit status is `APPROVED` before permitting stock reservation or dispatch.
   - Attaches signed DO evidence and exposes delivered quantities for AR customer invoice matching.
   - Reads Finance-owned Return Claims (`RET-261029-0003`), inspects physical goods, classifies condition (`RESALEABLE`, `DAMAGED_SCRAP`, `CUSTOMER_MISUSE`, `INCOMPLETE`), and exposes inspection records for FAM authorization and Credit Note issuance. Resaleable goods are returned to available stock; damaged goods are quarantined.

---

## 6. Seed Entry Point

- **Location**: `src/features/inventory/server/seed.ts`
- **Function**: `seedInventory(sql: Database): void`
- **Behavior**: Completely idempotent. Uses `INSERT ... ON CONFLICT DO UPDATE` or `INSERT OR IGNORE`.
- **Entities Seeded**:
  - Warehouses: `wh_bandung_rm` (Raw Material), `wh_bandung_fg` (Finished Goods).
  - Materials: Fresh Milk (`mat_fresh_milk`), Milk Powder (`mat_milk_powder`), Packaging Cartons (`mat_cartons`), Ultra Milk 1000ml (`fg_ultra_milk_1l`), Ultra Milk 250ml (`fg_ultra_milk_250ml`).
  - Unit Conversions: `kg -> g` (multiplier 1,000), `carton -> pcs` (multiplier 12).
  - Canonical Stock Balances: Milk Powder (18,200 kg physical, 16,000 kg available, 2,200 kg held).
  - Inbound PO Fixture: Canonical 10,000 kg PO, 8,000 kg received on `GRN-261028-0001`, 7,800 kg accepted and 200 kg rejected on `QC-261028-0001`.
  - Outbound Sales Order & Delivery: `SO-261028-0015` with `DO-261028-0002` (3,000 pcs Ultra Milk 1000ml) including signed DO attachment.
  - Return Claim: `RET-261029-0003` for 500 pcs Ultra Milk 250ml.

---

## 7. Verification Results

### Quality Gates
- `npm run typecheck`: Passed with 0 errors.
- `npx eslint src/features/inventory/ src/app/api/inventory/ tests/inventory.test.ts`: Passed with 0 errors and 0 warnings.
- `npm run build`: Production Turbopack build succeeded in 592ms, generating all static and dynamic `/inventory/*` routes.
- `npx tsx --conditions=react-server --test tests/inventory.test.ts`: All 11 tests passed in 1,140ms.

### Test Coverage Summary
1. `decimal arithmetic maintains exact 3-decimal precision without float errors`: Verifies fixed-point arithmetic.
2. `canonical fixture preserves stock balances and non-overlapping categories`: Verifies Milk Powder 18,200 kg total invariant and category formulas.
3. `goods receipts record partial receipts and save goods as QC-pending rather than available`: Verifies GRN creation and bucket updates.
4. `policy controls prevent over-receipt unless explicitly authorized`: Enforces manager override policy.
5. `QC inspection enforces inspected == accepted + rejected and moves stock atomically`: Verifies atomic stock transfer from QC_PENDING to ACCEPTED/REJECTED.
6. `replay protection via idempotency prevents duplicate stock processing`: Ensures duplicate requests are returned safely without double-mutating stock.
7. `warehouse FPBB verification checks physical availability against material requests`: Tests stock availability reviews.
8. `outbound dispatches enforce credit approval and atomic stock reservation`: Blocks unapproved credit orders and overselling.
9. `protected attachment storage validates file magic and prevents unauthorized downloads`: Validates binary signatures and access control.
10. `physical returns classify condition and return only eligible accepted quantities to available stock`: Verifies resaleable vs damaged segregation.
11. `unauthorized actions are strictly blocked by role permissions`: Role checks on Auditor, Sales Admin, and unauthenticated actors.

### Screenshots Captured
Rendered full-page screenshots captured via headless browser using authenticated warehouse session:
- `project/docs/screenshots/inventory-stock-desktop.png` (1600x1000)
- `project/docs/screenshots/inventory-stock-tablet.png` (768x1024)
- `project/docs/screenshots/inventory-stock-mobile.png` (375x812)
- `project/docs/screenshots/inventory-receipts-desktop.png` (1600x1000)
- `project/docs/screenshots/inventory-receipts-tablet.png` (768x1024)
- `project/docs/screenshots/inventory-receipts-mobile.png` (375x812)
- `project/docs/screenshots/inventory-inspections-desktop.png` (1600x1000)
- `project/docs/screenshots/inventory-inspections-tablet.png` (768x1024)
- `project/docs/screenshots/inventory-inspections-mobile.png` (375x812)
- `project/docs/screenshots/inventory-dispatches-desktop.png` (1600x1000)
- `project/docs/screenshots/inventory-dispatches-mobile.png` (375x812)
- `project/docs/screenshots/inventory-returns-desktop.png` (1600x1000)
- `project/docs/screenshots/inventory-returns-mobile.png` (375x812)
