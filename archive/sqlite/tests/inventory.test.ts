import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = mkdtempSync(join(tmpdir(), "ultraops-inventory-"));
process.env.DATABASE_PATH = join(directory, "test.sqlite");
process.env.ATTACHMENT_STORAGE_PATH = join(directory, "attachments");

import { migrate } from "../scripts/migrate";
import { db } from "../src/server/db";
import { hashPassword } from "../src/server/auth-service";
import { ROLES } from "../src/shared/contracts/auth";
import { FIXTURE_IDS } from "../src/shared/fixtures";
import { seedInventory } from "../src/features/inventory/server/seed";
import { inventoryService } from "../src/features/inventory/server/inventory-service";
import {
  addQuantity,
  subQuantity,
  compareQuantity,
  formatQuantityExact,
} from "../src/features/inventory/server/decimal";
import {
  saveAttachment,
  readAttachmentFile,
} from "../src/features/inventory/server/attachments";
import { AccessError } from "@/lib/auth/permissions";

const warehouseActor = { id: "usr_warehouse", role: "WAREHOUSE" as const };
const qcActor = { id: "usr_qc", role: "QC" as const };
const auditorActor = { id: "usr_auditor", role: "AUDITOR" as const };
const productionActor = { id: "usr_production", role: "PRODUCTION" as const };

before(() => {
  migrate();
  const now = new Date().toISOString();
  for (const role of ROLES) {
    db()
      .prepare("INSERT OR IGNORE INTO users VALUES (?,?,?,?,?,1,?,?)")
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
  seedInventory(db());
});

after(() => {
  db().close();
  rmSync(directory, { recursive: true, force: true });
});

test("decimal arithmetic maintains exact 3-decimal precision without float errors", () => {
  assert.equal(addQuantity("7800.000", "200.000"), "8000.000");
  assert.equal(subQuantity("10000.000", "8000.000"), "2000.000");
  assert.equal(formatQuantityExact("12.5"), "12.500");
  assert.equal(compareQuantity("10.000", "9.999"), 1);
  assert.equal(compareQuantity("5.500", "5.500"), 0);
  assert.equal(compareQuantity("1.000", "2.000"), -1);
  assert.throws(() => subQuantity("5.000", "6.000"), /Negative quantity/);
});

test("canonical fixture preserves stock balances and non-overlapping categories", async () => {
  const balances = await inventoryService.stock(warehouseActor, FIXTURE_IDS.warehouses.bandung);
  const milkPowder = balances.find((b) => b.materialId === FIXTURE_IDS.materials.milkPowder);

  assert.ok(milkPowder);
  assert.equal(milkPowder.physical, "18200.000");
  assert.equal(milkPowder.qcPending, "2000.000");
  assert.equal(milkPowder.accepted, "16000.000");
  assert.equal(milkPowder.rejected, "200.000");
  assert.equal(milkPowder.reserved, "0.000");
  assert.equal(milkPowder.available, "16000.000");
  assert.equal(milkPowder.status, "HEALTHY");

  // Invariant verification: physical = qc_pending + accepted + rejected + reserved
  const sumCategories = addQuantity(
    addQuantity(milkPowder.qcPending, milkPowder.accepted),
    addQuantity(milkPowder.rejected, milkPowder.reserved),
  );
  assert.equal(milkPowder.physical, sumCategories);

  // Available = accepted - reserved
  assert.equal(milkPowder.available, subQuantity(milkPowder.accepted, milkPowder.reserved));
});

test("goods receipts record partial receipts and save goods as QC-pending rather than available", async () => {
  const stockBefore = await inventoryService.stock(warehouseActor, FIXTURE_IDS.warehouses.bandung);
  const freshMilkBefore = stockBefore.find((b) => b.materialId === FIXTURE_IDS.materials.freshMilk)!;

  const context = {
    actor: warehouseActor,
    expectedVersion: 1,
    idempotencyKey: "test_grn_partial_001",
  };

  const receipt = await inventoryService.receive(context, {
    purchaseOrderId: "po_test_001",
    purchaseOrderNumber: "PO-TEST-001",
    supplierId: FIXTURE_IDS.suppliers.milkCoop,
    supplierName: "Koperasi Susu Sejahtera",
    warehouseId: FIXTURE_IDS.warehouses.bandung,
    supplierDeliveryNumber: "SJ-TEST-101",
    permitOverReceipt: false,
    lines: [
      {
        purchaseOrderLineId: "poline_test_001",
        materialId: FIXTURE_IDS.materials.freshMilk,
        batch: "FM-BATCH-99",
        location: "Bandung RM / Tank-02",
        orderedQuantity: "10000.000",
        receivedQuantity: "4000.000",
        unit: "L",
      },
    ],
  });

  assert.ok(receipt);
  assert.equal(receipt.status, "RECORDED");

  const stockAfter = await inventoryService.stock(warehouseActor, FIXTURE_IDS.warehouses.bandung);
  const freshMilkAfter = stockAfter.find((b) => b.materialId === FIXTURE_IDS.materials.freshMilk)!;

  // Physical and QC-Pending increased by 4,000 L, but Available stayed exactly the same!
  assert.equal(freshMilkAfter.physical, addQuantity(freshMilkBefore.physical, "4000.000"));
  assert.equal(freshMilkAfter.qcPending, addQuantity(freshMilkBefore.qcPending, "4000.000"));
  assert.equal(freshMilkAfter.available, freshMilkBefore.available);
});

test("policy controls prevent over-receipt unless explicitly authorized", async () => {
  const context = {
    actor: warehouseActor,
    expectedVersion: 1,
    idempotencyKey: "test_grn_over_reject",
  };

  // Remaining ordered on poline_test_001 is 6,000 (10,000 ordered, 4,000 received earlier).
  // Attempting to receive 7,000 without permitOverReceipt should be rejected.
  await assert.rejects(
    async () => {
      await inventoryService.receive(context, {
        purchaseOrderId: "po_test_001",
        purchaseOrderNumber: "PO-TEST-001",
        supplierId: FIXTURE_IDS.suppliers.milkCoop,
        supplierName: "Koperasi Susu Sejahtera",
        warehouseId: FIXTURE_IDS.warehouses.bandung,
        supplierDeliveryNumber: "SJ-TEST-102",
        permitOverReceipt: false,
        lines: [
          {
            purchaseOrderLineId: "poline_test_001",
            materialId: FIXTURE_IDS.materials.freshMilk,
            batch: "FM-BATCH-100",
            location: "Bandung RM / Tank-02",
            orderedQuantity: "10000.000",
            receivedQuantity: "7000.000",
            unit: "L",
          },
        ],
      });
    },
    /Over-receipt policy violation/,
  );

  // Receiving with permitOverReceipt: true succeeds
  const allowedContext = {
    actor: warehouseActor,
    expectedVersion: 1,
    idempotencyKey: "test_grn_over_allowed",
  };

  const receipt = await inventoryService.receive(allowedContext, {
    purchaseOrderId: "po_test_001",
    purchaseOrderNumber: "PO-TEST-001",
    supplierId: FIXTURE_IDS.suppliers.milkCoop,
    supplierName: "Koperasi Susu Sejahtera",
    warehouseId: FIXTURE_IDS.warehouses.bandung,
    supplierDeliveryNumber: "SJ-TEST-103",
    permitOverReceipt: true,
    lines: [
      {
        purchaseOrderLineId: "poline_test_001",
        materialId: FIXTURE_IDS.materials.freshMilk,
        batch: "FM-BATCH-101",
        location: "Bandung RM / Tank-02",
        orderedQuantity: "10000.000",
        receivedQuantity: "6500.000",
        unit: "L",
      },
    ],
  });

  assert.ok(receipt);
  assert.equal(receipt.status, "RECORDED");
});

test("QC inspection enforces inspected == accepted + rejected and moves stock atomically", async () => {
  // Create a fresh receipt to inspect
  const receipt = await inventoryService.receive(
    { actor: warehouseActor, expectedVersion: 1, idempotencyKey: "test_grn_for_qc" },
    {
      purchaseOrderId: "po_test_qc",
      purchaseOrderNumber: "PO-TEST-QC",
      supplierId: FIXTURE_IDS.suppliers.pangan,
      supplierName: "PT Sumber Pangan",
      warehouseId: FIXTURE_IDS.warehouses.bandung,
      supplierDeliveryNumber: "SJ-QC-001",
      permitOverReceipt: false,
      lines: [
        {
          purchaseOrderLineId: "poline_qc_001",
          materialId: FIXTURE_IDS.materials.milkPowder,
          batch: "MP-TEST-01",
          location: "Bandung RM / B-01",
          orderedQuantity: "5000.000",
          receivedQuantity: "5000.000",
          unit: "kg",
        },
      ],
    },
  );

  const lineId = receipt.lines[0].id;
  const stockBefore = await inventoryService.stock(qcActor, FIXTURE_IDS.warehouses.bandung);
  const mpBefore = stockBefore.find((b) => b.materialId === FIXTURE_IDS.materials.milkPowder)!;

  // Invariant test: rejected if inspected != accepted + rejected
  await assert.rejects(
    async () => {
      await inventoryService.inspect(
        { actor: qcActor, expectedVersion: 1, idempotencyKey: "test_qc_mismatch" },
        {
          receiptId: receipt.id,
          receiptLineId: lineId,
          inspectedQuantity: "5000.000",
          acceptedQuantity: "4800.000",
          rejectedQuantity: "100.000", // sum = 4900 != 5000
          tests: [{ name: "Moisture", result: "Pass", outcome: "ACCEPTED" }],
        },
      );
    },
    /Quantity mismatch/,
  );

  // Successful inspection: 5,000 inspected -> 4,700 accepted, 300 rejected
  const inspection = await inventoryService.inspect(
    { actor: qcActor, expectedVersion: 1, idempotencyKey: "test_qc_valid" },
    {
      receiptId: receipt.id,
      receiptLineId: lineId,
      inspectedQuantity: "5000.000",
      acceptedQuantity: "4700.000",
      rejectedQuantity: "300.000",
      tests: [
        { name: "Moisture", result: "3.5%", outcome: "ACCEPTED" },
        { name: "Bags", result: "300 kg punctured", outcome: "REJECTED" },
      ],
      quarantineReason: "300 kg quarantined due to punctured bags",
      quarantineValueMinor: 600000000, // Rp6,000,000
    },
  );

  assert.ok(inspection);
  assert.equal(inspection.status, "COMPLETED");

  const stockAfter = await inventoryService.stock(qcActor, FIXTURE_IDS.warehouses.bandung);
  const mpAfter = stockAfter.find((b) => b.materialId === FIXTURE_IDS.materials.milkPowder)!;

  // Stock updates:
  // qc_pending reduced by 5,000
  // accepted increased by 4,700
  // available increased by 4,700
  // rejected increased by 300
  assert.equal(mpAfter.qcPending, subQuantity(mpBefore.qcPending, "5000.000"));
  assert.equal(mpAfter.accepted, addQuantity(mpBefore.accepted, "4700.000"));
  assert.equal(mpAfter.available, addQuantity(mpBefore.available, "4700.000"));
  assert.equal(mpAfter.rejected, addQuantity(mpBefore.rejected, "300.000"));
});

test("replay protection via idempotency prevents duplicate stock processing", async () => {
  const key = "test_idempotent_receipt_001";
  const context = { actor: warehouseActor, expectedVersion: 1, idempotencyKey: key };

  const first = await inventoryService.receive(context, {
    purchaseOrderId: "po_idem_01",
    purchaseOrderNumber: "PO-IDEM-01",
    supplierId: FIXTURE_IDS.suppliers.milkCoop,
    supplierName: "Koperasi Susu Sejahtera",
    warehouseId: FIXTURE_IDS.warehouses.bandung,
    supplierDeliveryNumber: "SJ-IDEM-1",
    permitOverReceipt: false,
    lines: [
      {
        purchaseOrderLineId: "poline_idem_01",
        materialId: FIXTURE_IDS.materials.freshMilk,
        batch: "FM-IDEM",
        location: "Tank-1",
        orderedQuantity: "1000.000",
        receivedQuantity: "1000.000",
        unit: "L",
      },
    ],
  });

  const stockAfterFirst = await inventoryService.stock(warehouseActor, FIXTURE_IDS.warehouses.bandung);

  // Calling again with the same idempotency key returns identical receipt without duplicating stock movement
  const second = await inventoryService.receive(context, {
    purchaseOrderId: "po_idem_01",
    purchaseOrderNumber: "PO-IDEM-01",
    supplierId: FIXTURE_IDS.suppliers.milkCoop,
    supplierName: "Koperasi Susu Sejahtera",
    warehouseId: FIXTURE_IDS.warehouses.bandung,
    supplierDeliveryNumber: "SJ-IDEM-1",
    permitOverReceipt: false,
    lines: [
      {
        purchaseOrderLineId: "poline_idem_01",
        materialId: FIXTURE_IDS.materials.freshMilk,
        batch: "FM-IDEM",
        location: "Tank-1",
        orderedQuantity: "1000.000",
        receivedQuantity: "1000.000",
        unit: "L",
      },
    ],
  });

  assert.equal(first.id, second.id);
  const stockAfterSecond = await inventoryService.stock(warehouseActor, FIXTURE_IDS.warehouses.bandung);
  assert.deepEqual(stockAfterFirst, stockAfterSecond);
});

test("warehouse FPBB verification checks physical availability against material requests", async () => {
  // Verify request with sufficient stock
  const resultPass = await inventoryService.verifyRequestStock(warehouseActor, {
    requestId: "fpbb_test_pass",
    warehouseId: FIXTURE_IDS.warehouses.bandung,
    items: [
      { materialId: FIXTURE_IDS.materials.milkPowder, requestedQuantity: "1000.000" },
    ],
  });

  assert.equal(resultPass.overallOutcome, "VERIFIED");

  // Verify request with excessive requested quantity
  const resultFail = await inventoryService.verifyRequestStock(warehouseActor, {
    requestId: "fpbb_test_fail",
    warehouseId: FIXTURE_IDS.warehouses.bandung,
    items: [
      { materialId: FIXTURE_IDS.materials.milkPowder, requestedQuantity: "999999.000" },
    ],
  });

  assert.equal(resultFail.overallOutcome, "REJECTED");
  assert.ok(resultFail.details[0].reason.includes("Shortfall"));
});

test("outbound dispatches enforce credit approval and atomic stock reservation", async () => {
  // Test credit hold blocks reservation
  db()
    .prepare(
      `INSERT INTO sales_orders (id, number, customer_id, customer_name, warehouse_id, status, credit_status, total_minor, ordered_at, created_at)
       VALUES ('so_credit_hold', 'SO-HOLD-001', 'cust_1', 'Bad Credit PT', 'wh_bandung_fg', 'DRAFT', 'HOLD', 1000000, '2026-10-29', '2026-10-29')`,
    )
    .run();

  db()
    .prepare(
      `INSERT INTO sales_order_lines (id, sales_order_id, material_id, quantity, reserved_quantity, dispatched_quantity, unit, unit_price_minor)
       VALUES ('soline_hold_1', 'so_credit_hold', 'fg_ultra_milk_1l', '500.000', '0.000', '0.000', 'pcs', 1800000)`,
    )
    .run();

  await assert.rejects(
    async () => {
      await inventoryService.reserveStock(
        { actor: warehouseActor, expectedVersion: 1, idempotencyKey: "test_res_hold" },
        {
          salesOrderId: "so_credit_hold",
          salesOrderLineId: "soline_hold_1",
          materialId: "fg_ultra_milk_1l",
          warehouseId: "wh_bandung_fg",
          quantity: "500.000",
        },
      );
    },
    /credit status is "HOLD"/,
  );

  // Test approved SO allows reservation and dispatches
  const resSuccess = await inventoryService.reserveStock(
    { actor: warehouseActor, expectedVersion: 1, idempotencyKey: "test_res_ok" },
    {
      salesOrderId: "so_261028_0015",
      salesOrderLineId: "soline_261028_001",
      materialId: "fg_ultra_milk_1l",
      warehouseId: "wh_bandung_fg",
      quantity: "500.000",
    },
  );

  assert.equal(resSuccess.reservedQuantity, "500.000");

  // Create dispatch against reserved quantity
  const dispatch = await inventoryService.createDispatch(
    { actor: warehouseActor, expectedVersion: 1, idempotencyKey: "test_do_create" },
    {
      salesOrderId: "so_261028_0015",
      warehouseId: "wh_bandung_fg",
      carrier3pl: "Internal Fleet",
      vehicleNumber: "B 1234 UJ",
      lines: [
        {
          salesOrderLineId: "soline_261028_001",
          materialId: "fg_ultra_milk_1l",
          quantity: "500.000",
          unit: "pcs",
        },
      ],
    },
  );

  assert.ok(dispatch);
  assert.equal(dispatch.status, "DISPATCHED");
});

test("protected attachment storage validates file magic and prevents unauthorized downloads", async () => {
  // Reject invalid magic bytes
  const fakePdf = Buffer.from("THIS IS NOT A VALID PDF FILE", "utf8");
  assert.throws(
    () => {
      saveAttachment(warehouseActor, {
        entityType: "DELIVERY_ORDER",
        entityId: "do_test_01",
        fileName: "fake.pdf",
        mimeType: "application/pdf",
        buffer: fakePdf,
      });
    },
    /do not match specified MIME type/,
  );

  // Valid PDF magic bytes (%PDF-)
  const validPdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>%%EOF", "ascii");
  const attachment = saveAttachment(warehouseActor, {
    entityType: "DELIVERY_ORDER",
    entityId: "do_test_01",
    fileName: "signed_do_test.pdf",
    mimeType: "application/pdf",
    buffer: validPdf,
  });

  assert.ok(attachment.id);
  assert.equal(attachment.fileName, "signed_do_test.pdf");

  // Read attachment with authorized actor
  const readSuccess = readAttachmentFile(warehouseActor, attachment.id);
  assert.equal(readSuccess.record.fileName, "signed_do_test.pdf");

  // Unauthorized actor (null) throws 401
  assert.throws(
    () => readAttachmentFile(null, attachment.id),
    (e) => e instanceof AccessError && e.status === 401,
  );
});

test("physical returns classify condition and return only eligible accepted quantities to available stock", async () => {
  // Create a return claim
  db()
    .prepare(
      `INSERT INTO return_claims (id, number, customer_id, customer_name, material_id, claimed_quantity, unit, reason, status, created_at)
       VALUES ('ret_test_claim', 'RET-CLAIM-01', 'cust_indomarco', 'PT Indomarco', 'fg_ultra_milk_1l', '100.000', 'pcs', 'Transport damage', 'SUBMITTED', '2026-10-29')`,
    )
    .run();

  const stockBefore = await inventoryService.stock(qcActor, "wh_bandung_fg");
  const fgBefore = stockBefore.find((b) => b.materialId === "fg_ultra_milk_1l")!;

  // Inspect return: 100 claimed -> 70 accepted (resaleable), 30 damaged (scrap)
  const returnInsp = await inventoryService.inspectReturnGoods(
    { actor: qcActor, expectedVersion: 1, idempotencyKey: "test_ret_insp" },
    {
      returnClaimId: "ret_test_claim",
      warehouseId: "wh_bandung_fg",
      materialId: "fg_ultra_milk_1l",
      claimedQuantity: "100.000",
      inspectedQuantity: "100.000",
      acceptedQuantity: "70.000",
      damagedQuantity: "30.000",
      rejectedQuantity: "0.000",
      unit: "pcs",
      conditionClassification: "RESALEABLE",
      findings: "70 intact packages restored to available stock. 30 leaking cartons scrapped.",
    },
  );

  assert.ok(returnInsp);
  assert.equal(returnInsp.conditionClassification, "RESALEABLE");

  const stockAfter = await inventoryService.stock(qcActor, "wh_bandung_fg");
  const fgAfter = stockAfter.find((b) => b.materialId === "fg_ultra_milk_1l")!;

  // Stock verification:
  // Available stock only increased by accepted quantity (70)
  // Rejected stock increased by damaged quantity (30)
  // Total physical increased by 100
  assert.equal(fgAfter.available, addQuantity(fgBefore.available, "70.000"));
  assert.equal(fgAfter.rejected, addQuantity(fgBefore.rejected, "30.000"));
  assert.equal(fgAfter.physical, addQuantity(fgBefore.physical, "100.000"));
});

test("unauthorized actions are strictly blocked by role permissions", async () => {
  const context = { actor: auditorActor, expectedVersion: 1, idempotencyKey: "test_unauth" };

  // Auditor has no write permission
  await assert.rejects(
    async () => {
      await inventoryService.receive(context, {
        purchaseOrderId: "po_test",
        purchaseOrderNumber: "PO-TEST",
        supplierId: "sup_1",
        supplierName: "Supplier",
        warehouseId: FIXTURE_IDS.warehouses.bandung,
        supplierDeliveryNumber: "SJ-1",
        lines: [],
      });
    },
    (e) => e instanceof AccessError && e.status === 403,
  );

  // Production cannot perform QC inspection
  await assert.rejects(
    async () => {
      await inventoryService.inspect(
        { actor: productionActor, expectedVersion: 1, idempotencyKey: "test_prod_qc" },
        {
          receiptId: "grn_1",
          receiptLineId: "line_1",
          inspectedQuantity: "10.000",
          acceptedQuantity: "10.000",
          rejectedQuantity: "0.000",
          tests: [],
        },
      );
    },
    (e) => e instanceof AccessError && e.status === 403,
  );

  // QC cannot dispatch delivery orders
  await assert.rejects(
    async () => {
      await inventoryService.createDispatch(
        { actor: qcActor, expectedVersion: 1, idempotencyKey: "test_qc_dispatch" },
        {
          salesOrderId: "so_1",
          warehouseId: "wh_1",
          carrier3pl: "Carrier",
          lines: [],
        },
      );
    },
    (e) => e instanceof AccessError && e.status === 403,
  );
});
