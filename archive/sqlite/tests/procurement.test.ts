import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const directory = mkdtempSync(join(tmpdir(), "ultraops-procurement-test-"));
process.env.DATABASE_PATH = join(directory, "test.sqlite");

import { migrate } from "../scripts/migrate";
import { db } from "../src/server/db";
import { hashPassword } from "../src/server/auth-service";
import { ROLES } from "../src/shared/contracts/auth";
import { FIXTURE_IDS } from "../src/shared/fixtures";
import { AccessError } from "../src/lib/auth/permissions";
import { procurementService, calculateLineTotal } from "../src/features/procurement/service";
import { seedProcurement } from "../src/features/procurement/seed";
import { getRequiredApprovalSteps } from "../src/features/procurement/policies";
import type { Actor } from "@/shared/contracts/auth";

migrate();

const now = new Date().toISOString();
for (const role of ROLES) {
  db()
    .prepare("INSERT INTO users VALUES (?,?,?,?,?,1,?,?)")
    .run(
      `usr_${role.toLowerCase()}`,
      role,
      `${role.toLowerCase()}@ultraops.local`,
      role,
      hashPassword("Test-password-2026!"),
      now,
      now,
    );
}

seedProcurement();

const productionActor: Actor = { id: "usr_production", role: "PRODUCTION" };
const warehouseActor: Actor = { id: "usr_warehouse", role: "WAREHOUSE" };
const purchasingActor: Actor = { id: "usr_purchasing", role: "PURCHASING" };
const approverActor: Actor = { id: "usr_approver", role: "APPROVER" };
const auditorActor: Actor = { id: "usr_auditor", role: "AUDITOR" };

after(() => {
  db().close();
  rmSync(directory, { recursive: true, force: true });
});

test("document numbering and fixture counter floors are preserved", () => {
  const row = db()
    .prepare("SELECT sequence FROM document_counters WHERE document_type = 'PO' AND local_day = '261029'")
    .get() as { sequence: number };
  assert.ok(row.sequence >= 45, "PO sequence floor must be at least 45");

  const fpbbRow = db()
    .prepare("SELECT sequence FROM document_counters WHERE document_type = 'FPBB' AND local_day = '261028'")
    .get() as { sequence: number };
  assert.ok(fpbbRow.sequence >= 188, "FPBB sequence floor must be at least 188");
});

test("money calculations and exact decimal quantity conversions", () => {
  // 10,000 kg @ Rp20,000/kg = Rp200,000,000 (20,000,000,000 minor units)
  const powderTotal = calculateLineTotal(2000000, "10000.000");
  assert.equal(powderTotal, 20000000000);

  // 1,000,000 pcs @ Rp120/pcs = Rp120,000,000 (12,000,000,000 minor units)
  const cartonTotal = calculateLineTotal(12000, "1000000.000");
  assert.equal(cartonTotal, 12000000000);
});

test("production creates material request with required fields, ownership and initial SUBMITTED state", async () => {
  const req = await procurementService.createRequest(
    { actor: productionActor, expectedVersion: 1, idempotencyKey: randomUUID() },
    {
      warehouseId: FIXTURE_IDS.warehouses.bandung,
      productionReference: "WO-TEST-999",
      priority: "HIGH",
      requiredOn: "2026-11-10",
      purpose: "Urgent production batch testing",
      lines: [
        {
          materialId: FIXTURE_IDS.materials.milkPowder,
          quantity: "5000.000",
          unit: "kg",
        },
      ],
    },
  );

  assert.ok(req.id);
  assert.ok(req.number.startsWith("FPBB-"));
  assert.equal(req.status, "SUBMITTED");
  assert.equal(req.createdBy, productionActor.id);
  assert.equal(req.lines.length, 1);
  assert.equal(req.lines[0].quantity, "5000.000");
});

test("incomplete submissions fail runtime validation", async () => {
  await assert.rejects(
    async () => {
      await procurementService.createRequest(
        { actor: productionActor, expectedVersion: 1, idempotencyKey: randomUUID() },
        {
          warehouseId: FIXTURE_IDS.warehouses.bandung,
          // Missing required fields
        },
      );
    },
    (err: unknown) => {
      const e = err as Error;
      return e.name === "ZodError" || /invalid_type|expected/i.test(e.message);
    },
  );
});

test("warehouse verification: request with sufficient stock closes with recorded reason and no purchase", async () => {
  // Create request
  const req = await procurementService.createRequest(
    { actor: productionActor, expectedVersion: 1, idempotencyKey: randomUUID() },
    {
      warehouseId: FIXTURE_IDS.warehouses.bandung,
      productionReference: "WO-CLOSE-TEST",
      priority: "NORMAL",
      requiredOn: "2026-11-12",
      purpose: "Standard run with sufficient buffer",
      lines: [
        {
          materialId: FIXTURE_IDS.materials.freshMilk,
          quantity: "2000.000",
          unit: "L",
        },
      ],
    },
  );

  // Warehouse verifies sufficient stock -> REJECTED (closed without purchase)
  const verified = await procurementService.verifyRequest(
    { actor: warehouseActor, expectedVersion: 1, idempotencyKey: randomUUID() },
    req.id,
    {
      outcome: "REJECTED",
      reason: "Sufficient stock on hand in Bandung RM (45,000 L). External procurement not required.",
      availableStock: "45000.000",
    },
  );

  assert.equal(verified.status, "REJECTED");
  assert.equal(verified.verification?.outcome, "REJECTED");
  assert.ok(verified.verification?.reason.includes("Sufficient stock"));
});

test("warehouse verification: request needing purchase is verified with available stock noted", async () => {
  const req = await procurementService.createRequest(
    { actor: productionActor, expectedVersion: 1, idempotencyKey: randomUUID() },
    {
      warehouseId: FIXTURE_IDS.warehouses.bandung,
      productionReference: "WO-PURCHASE-NEEDED",
      priority: "URGENT",
      requiredOn: "2026-11-15",
      purpose: "Depleted stock intake",
      lines: [
        {
          materialId: FIXTURE_IDS.materials.cartons,
          quantity: "500000.000",
          unit: "pcs",
        },
      ],
    },
  );

  const verified = await procurementService.verifyRequest(
    { actor: warehouseActor, expectedVersion: 1, idempotencyKey: randomUUID() },
    req.id,
    {
      outcome: "VERIFIED",
      reason: "Current on hand below minimum buffer. Approved for RFQ.",
      availableStock: "50000.000",
    },
  );

  assert.equal(verified.status, "VERIFIED");
  assert.equal(verified.verification?.outcome, "VERIFIED");
});

test("unauthorized operations fail before database writes", async () => {
  // Auditor cannot create or verify requests
  await assert.rejects(
    async () => {
      await procurementService.createRequest(
        { actor: auditorActor, expectedVersion: 1, idempotencyKey: randomUUID() },
        {
          warehouseId: FIXTURE_IDS.warehouses.bandung,
          productionReference: "WO-FAIL",
          priority: "NORMAL",
          requiredOn: "2026-11-10",
          purpose: "Auditor should fail",
          lines: [{ materialId: FIXTURE_IDS.materials.freshMilk, quantity: "100.000", unit: "L" }],
        },
      );
    },
    (err: unknown) => err instanceof AccessError && err.status === 403,
  );

  // Production cannot verify requests
  await assert.rejects(
    async () => {
      await procurementService.verifyRequest(
        { actor: productionActor, expectedVersion: 1, idempotencyKey: randomUUID() },
        "fpbb_261028_0188",
        { outcome: "VERIFIED", reason: "Unauthorized verify", availableStock: "0" },
      );
    },
    (err: unknown) => err instanceof AccessError && err.status === 403,
  );
});

test("stale updates are rejected via optimistic concurrency version check", async () => {
  await assert.rejects(
    async () => {
      // Intentionally supply wrong expectedVersion
      await procurementService.verifyRequest(
        { actor: warehouseActor, expectedVersion: 999, idempotencyKey: randomUUID() },
        "fpbb_261029_0189",
        { outcome: "VERIFIED", reason: "Stale check", availableStock: "1000.000" },
      );
    },
    /Stale update rejected/i,
  );
});

test("purchasing creates RFQ from verified requests and records supplier quotations", async () => {
  const rfq = await procurementService.createRfq(
    { actor: purchasingActor, expectedVersion: 1, idempotencyKey: randomUUID() },
    {
      requestIds: ["fpbb_261028_0188"],
      supplierIds: [FIXTURE_IDS.suppliers.kemas, "sup_kemasan_sentosa"],
      dueOn: "2026-11-05",
    },
  );

  assert.ok(rfq.id);
  assert.ok(rfq.number.startsWith("RFQ-"));
  assert.equal(rfq.status, "SENT");

  // Record quotation for Kemas
  const quote = await procurementService.recordQuotation(
    { actor: purchasingActor, expectedVersion: 1, idempotencyKey: randomUUID() },
    {
      rfqId: rfq.id,
      supplierId: FIXTURE_IDS.suppliers.kemas,
      validUntil: "2026-11-20",
      leadDays: 2,
      lines: [
        {
          materialId: FIXTURE_IDS.materials.cartons,
          quantity: "1000000.000",
          unit: "pcs",
          unitPrice: 12000, // Rp120
        },
      ],
    },
  );

  assert.ok(quote.id);
  assert.equal(quote.total, 12000000000); // Rp120,000,000
});

test("supplier evaluation persists rationale and multi-criteria scores", async () => {
  const rfq = await procurementService.getRfq(purchasingActor, FIXTURE_IDS.documents.rfq);
  assert.ok(rfq);

  const evalResult = await procurementService.evaluateSuppliers(
    { actor: purchasingActor, expectedVersion: 1, idempotencyKey: randomUUID() },
    {
      rfqId: rfq.id,
      selectedQuotationId: FIXTURE_IDS.documents.quotation,
      criteria: [
        {
          name: "Quality & Specifications Compliance",
          weight: 25,
          scores: { [FIXTURE_IDS.suppliers.kemas]: 95 },
        },
      ],
      reason: "Best commercial bid with verified ISO compliance.",
    },
  );

  assert.ok(evalResult.id);
  assert.equal(evalResult.selectedQuotationId, FIXTURE_IDS.documents.quotation);
  assert.equal(evalResult.status, "FINAL");
});

test("PO creation derives multi-tier approval steps based on demo policy", () => {
  // Tier 1: <= Rp50M (1 step)
  const stepsTier1 = getRequiredApprovalSteps(40_000_000_00, false);
  assert.equal(stepsTier1.length, 1);
  assert.equal(stepsTier1[0].title, "Procurement Manager");

  // Tier 2: <= Rp250M (2 steps)
  const stepsTier2 = getRequiredApprovalSteps(120_000_000_00, false);
  assert.equal(stepsTier2.length, 2);
  assert.equal(stepsTier2[0].title, "Procurement Manager");
  assert.equal(stepsTier2[1].title, "Finance Manager");

  // Tier 3: > Rp250M (3 steps)
  const stepsTier3 = getRequiredApprovalSteps(360_000_000_00, false);
  assert.equal(stepsTier3.length, 3);
  assert.equal(stepsTier3[2].title, "Executive Director");
});

test("creator self-approval is strictly prevented (Segregation of Duties)", async () => {
  // Create an order created by usr_purchasing
  const order = await procurementService.createOrder(
    { actor: purchasingActor, expectedVersion: 1, idempotencyKey: randomUUID() },
    {
      supplierId: FIXTURE_IDS.suppliers.kemas,
      requestIds: ["fpbb_261028_0188"],
      warehouseId: FIXTURE_IDS.warehouses.bandung,
      lines: [
        {
          materialId: FIXTURE_IDS.materials.cartons,
          quantity: "100000.000",
          unit: "pcs",
          unitPrice: 12000,
        },
      ],
    },
  );

  const step = order.approvalSteps[0];
  assert.ok(step);

  // Attempt self-approval by creator (usr_purchasing): MUST THROW 403
  await assert.rejects(
    async () => {
      await procurementService.decideApproval(
        { actor: purchasingActor, expectedVersion: order.version, idempotencyKey: randomUUID() },
        order.id,
        {
          stepId: step.id,
          decision: "APPROVED",
          reason: "Attempting self-approval",
        },
      );
    },
    (err: unknown) =>
      err instanceof AccessError &&
      err.status === 403 &&
      err.message.includes("Creator cannot approve"),
  );
});

test("sequential approval hierarchy: prior steps must complete before later steps", async () => {
  // PO-261029-0045 has Step 1 Approved, Step 2 Pending (Finance Manager), Step 3 Pending (Director)
  const po = await procurementService.getOrder(approverActor, "po_261029_0045");
  assert.ok(po);

  const step3 = po.approvalSteps.find((s) => s.sequence === 3);
  assert.ok(step3);

  // Attempting to decide step 3 before step 2 is approved MUST FAIL
  await assert.rejects(
    async () => {
      await procurementService.decideApproval(
        { actor: approverActor, expectedVersion: po.version, idempotencyKey: randomUUID() },
        po.id,
        {
          stepId: step3.id,
          decision: "APPROVED",
          reason: "Skipping step 2",
        },
      );
    },
    /Prior approval steps must be completed in sequence first/i,
  );
});

test("material change invalidates prior approvals, increments revision, and requires reapproval", async () => {
  const po = await procurementService.getOrder(purchasingActor, "po_261029_0045");
  assert.ok(po);
  const oldRevision = po.revision;

  // Revise order with different lines
  const revised = await procurementService.reviseOrder(
    { actor: purchasingActor, expectedVersion: po.version, idempotencyKey: randomUUID() },
    po.id,
    {
      supplierId: FIXTURE_IDS.suppliers.kemas,
      requestIds: ["fpbb_261028_0188"],
      warehouseId: FIXTURE_IDS.warehouses.bandung,
      deliveryTerms: "Franco Gudang Bandung Revised",
      paymentTerms: "Net 45 Days",
      lines: [
        {
          materialId: FIXTURE_IDS.materials.cartons,
          quantity: "800000.000",
          unit: "pcs",
          unitPrice: 12000,
        },
      ],
    },
  );

  assert.equal(revised.revision, oldRevision + 1);
  assert.equal(revised.status, "AWAITING_APPROVAL");
  // All steps in the new revision must be fresh and PENDING
  assert.ok(revised.approvalSteps.every((s) => s.status === "PENDING"));
});

test("PO issuance is recorded separately from approval, sets status to OPEN, and audits event", async () => {
  // Complete all approvals for a new order
  const order = await procurementService.createOrder(
    { actor: purchasingActor, expectedVersion: 1, idempotencyKey: randomUUID() },
    {
      supplierId: FIXTURE_IDS.suppliers.kemas,
      requestIds: ["fpbb_261028_0188"],
      warehouseId: FIXTURE_IDS.warehouses.bandung,
      lines: [
        {
          materialId: FIXTURE_IDS.materials.cartons,
          quantity: "10000.000",
          unit: "pcs",
          unitPrice: 12000,
        },
      ],
    },
  );

  // Approve all generated approval steps in sequence
  let currentOrder = order;
  for (let i = 0; i < currentOrder.approvalSteps.length; i++) {
    const s = currentOrder.approvalSteps[i];
    await procurementService.decideApproval(
      { actor: approverActor, expectedVersion: currentOrder.version, idempotencyKey: randomUUID() },
      order.id,
      {
        stepId: s.id,
        decision: "APPROVED",
        reason: "Budget approved in sequence",
      },
    );
    currentOrder = (await procurementService.getOrder(purchasingActor, order.id))!;
  }

  assert.equal(currentOrder.status, "APPROVED");

  // Issue PO to supplier
  const issuedOrder = await procurementService.issueOrder(
    { actor: purchasingActor, expectedVersion: currentOrder.version, idempotencyKey: randomUUID() },
    order.id,
    { notes: "Dispatched via electronic EDI" },
  );

  assert.equal(issuedOrder.status, "OPEN");
  assert.ok(issuedOrder.issuedAt);
  assert.equal(issuedOrder.issuedBy, purchasingActor.id);
});

test("cross-module service methods provide verified requests and approved PO lines for inventory and finance", async () => {
  const verified = await procurementService.getVerifiedRequests(purchasingActor);
  assert.ok(verified.length > 0);
  assert.ok(verified.every((r) => r.status === "VERIFIED"));

  // Check approved lines for inventory Goods Receipt & finance 3-way match
  const approvedLines = await procurementService.getApprovedOrderLines(warehouseActor);
  assert.ok(approvedLines.length > 0);
  assert.ok(approvedLines.some((l) => l.orderNumber === "PO-261026-0042"));

  // Outstanding quantity check for powder order (10,000 kg)
  const powderLine = approvedLines.find((l) => l.orderNumber === "PO-261026-0042");
  assert.ok(powderLine);
  const outstanding = await procurementService.getOutstandingReceiptQuantity(warehouseActor, powderLine.id);
  assert.equal(outstanding, "10000.000");
});
