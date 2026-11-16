import Database from "better-sqlite3";
import { FIXTURE_IDS } from "@/shared/fixtures";
import { getStorageDirectory } from "./attachments";
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

export function seedInventory(sql: Database.Database) {
  const now = "2026-10-29T03:42:00.000Z";

  // 1. Warehouses
  const warehouses = [
    { id: FIXTURE_IDS.warehouses.bandung, code: "BDG-RM", name: "Bandung RM" },
    { id: "wh_bandung_fg", code: "BDG-FG", name: "Bandung Finished Goods" },
  ];
  for (const wh of warehouses) {
    sql
      .prepare(
        `INSERT INTO warehouses (id, code, name, active, created_at, updated_at, version)
         VALUES (?, ?, ?, 1, ?, ?, 1)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, code = excluded.code`,
      )
      .run(wh.id, wh.code, wh.name, now, now);
  }

  // 2. Materials (Raw, Packaging, Finished Goods)
  const materials = [
    {
      id: FIXTURE_IDS.materials.freshMilk,
      code: "RM-001",
      name: "Fresh Milk",
      category: "RAW_MATERIAL",
      unit: "L",
      minimum: "50000.000",
    },
    {
      id: FIXTURE_IDS.materials.milkPowder,
      code: "RM-002",
      name: "Milk Powder",
      category: "RAW_MATERIAL",
      unit: "kg",
      minimum: "12000.000",
    },
    {
      id: FIXTURE_IDS.materials.cartons,
      code: "PK-001",
      name: "Packaging Cartons",
      category: "PACKAGING",
      unit: "pcs",
      minimum: "1500000.000",
    },
    {
      id: "fg_ultra_milk_1l",
      code: "FG-001",
      name: "Ultra Milk Full Cream 1000ml",
      category: "FINISHED_GOOD",
      unit: "pcs",
      minimum: "5000.000",
    },
    {
      id: "fg_ultra_milk_250ml",
      code: "FG-002",
      name: "Ultra Milk Chocolate 250ml",
      category: "FINISHED_GOOD",
      unit: "pcs",
      minimum: "10000.000",
    },
  ];
  for (const m of materials) {
    sql
      .prepare(
        `INSERT INTO materials (id, code, name, category, unit, minimum_quantity, active, created_at, updated_at, version)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, 1)
         ON CONFLICT(id) DO UPDATE SET code = excluded.code, name = excluded.name, minimum_quantity = excluded.minimum_quantity`,
      )
      .run(m.id, m.code, m.name, m.category, m.unit, m.minimum, now, now);
  }

  // 3. Unit Conversions (Stored approved conversions)
  const conversions = [
    {
      id: "conv_kg_to_g",
      material_id: FIXTURE_IDS.materials.milkPowder,
      from_unit: "kg",
      to_unit: "g",
      multiplier: "1000",
    },
    {
      id: "conv_carton_to_pcs",
      material_id: "fg_ultra_milk_1l",
      from_unit: "carton",
      to_unit: "pcs",
      multiplier: "12",
    },
  ];
  for (const conv of conversions) {
    sql
      .prepare(
        `INSERT OR IGNORE INTO unit_conversions (id, material_id, from_unit, to_unit, multiplier, active)
         VALUES (?, ?, ?, ?, ?, 1)`,
      )
      .run(conv.id, conv.material_id, conv.from_unit, conv.to_unit, conv.multiplier);
  }

  // 4. Canonical Stock Balances
  // In Bandung RM:
  // Fresh Milk: physical: 48,000, qc_pending: 8,000, accepted: 40,000, rejected: 0, reserved: 0, available: 40,000, min: 50,000 (Below minimum)
  // Milk Powder: physical: 18,200, qc_pending: 2,000, accepted: 16,000, rejected: 200, reserved: 0, available: 16,000, min: 12,000 (Healthy)
  // Cartons: physical: 1,250,000, qc_pending: 50,000, accepted: 1,200,000, rejected: 0, reserved: 0, available: 1,200,000, min: 1,500,000 (Below minimum)
  // In Bandung FG:
  // Ultra Milk 1000ml: physical: 15,000, qc_pending: 0, accepted: 15,000, rejected: 0, reserved: 3,000, available: 12,000, min: 5,000 (Healthy)
  // Ultra Milk 250ml: physical: 25,000, qc_pending: 0, accepted: 25,000, rejected: 0, reserved: 5,000, available: 20,000, min: 10,000 (Healthy)
  const balances = [
    {
      material_id: FIXTURE_IDS.materials.freshMilk,
      warehouse_id: FIXTURE_IDS.warehouses.bandung,
      physical: "48000.000",
      qc_pending: "8000.000",
      accepted: "40000.000",
      rejected: "0.000",
      reserved: "0.000",
      available: "40000.000",
    },
    {
      material_id: FIXTURE_IDS.materials.milkPowder,
      warehouse_id: FIXTURE_IDS.warehouses.bandung,
      physical: "18200.000",
      qc_pending: "2000.000",
      accepted: "16000.000",
      rejected: "200.000",
      reserved: "0.000",
      available: "16000.000",
    },
    {
      material_id: FIXTURE_IDS.materials.cartons,
      warehouse_id: FIXTURE_IDS.warehouses.bandung,
      physical: "1250000.000",
      qc_pending: "50000.000",
      accepted: "1200000.000",
      rejected: "0.000",
      reserved: "0.000",
      available: "1200000.000",
    },
    {
      material_id: "fg_ultra_milk_1l",
      warehouse_id: "wh_bandung_fg",
      physical: "15000.000",
      qc_pending: "0.000",
      accepted: "15000.000",
      rejected: "0.000",
      reserved: "3000.000",
      available: "12000.000",
    },
    {
      material_id: "fg_ultra_milk_250ml",
      warehouse_id: "wh_bandung_fg",
      physical: "25000.000",
      qc_pending: "0.000",
      accepted: "25000.000",
      rejected: "0.000",
      reserved: "5000.000",
      available: "20000.000",
    },
  ];
  for (const b of balances) {
    sql
      .prepare(
        `INSERT INTO stock_balances (material_id, warehouse_id, physical, qc_pending, accepted, rejected, reserved, available, version, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
         ON CONFLICT(material_id, warehouse_id) DO UPDATE SET
           physical = excluded.physical,
           qc_pending = excluded.qc_pending,
           accepted = excluded.accepted,
           rejected = excluded.rejected,
           reserved = excluded.reserved,
           available = excluded.available,
           updated_at = excluded.updated_at`,
      )
      .run(b.material_id, b.warehouse_id, b.physical, b.qc_pending, b.accepted, b.rejected, b.reserved, b.available, now);
  }

  // 5. Goods Receipts (canonical fixture: GRN-261028-0068, GRN-261029-0069, GRN-261029-0070)
  const receipts = [
    {
      id: FIXTURE_IDS.documents.receipt, // grn_261028_0068
      number: "GRN-261028-0068",
      purchase_order_id: FIXTURE_IDS.documents.order, // po_261026_0042
      purchase_order_number: "PO-261026-0042",
      supplier_id: FIXTURE_IDS.suppliers.pangan,
      supplier_name: "PT Sumber Pangan",
      warehouse_id: FIXTURE_IDS.warehouses.bandung,
      supplier_delivery_number: "SJ-SP-8821",
      status: "INSPECTED",
      received_at: "2026-10-28T08:30:00.000Z",
      created_by: "usr_warehouse",
      lines: [
        {
          id: "rline_261028_0068",
          purchase_order_line_id: "poline_261026_0042_1",
          material_id: FIXTURE_IDS.materials.milkPowder,
          batch: "MP-261028-01",
          location: "Bandung RM / B-02-08",
          ordered_quantity: "10000.000",
          received_quantity: "8000.000",
          accepted_quantity: "7800.000",
          rejected_quantity: "200.000",
          unit: "kg",
          status: "INSPECTED",
          discrepancy_reason: "Partial receipt: 8,000 kg received of 10,000 kg ordered",
        },
      ],
    },
    {
      id: "grn_261029_0069",
      number: "GRN-261029-0069",
      purchase_order_id: "po_261028_0045",
      purchase_order_number: "PO-261028-0045",
      supplier_id: FIXTURE_IDS.suppliers.milkCoop,
      supplier_name: "Koperasi Susu Sejahtera",
      warehouse_id: FIXTURE_IDS.warehouses.bandung,
      supplier_delivery_number: "SJ-KSS-0199",
      status: "RECORDED",
      received_at: "2026-10-29T07:15:00.000Z",
      created_by: "usr_warehouse",
      lines: [
        {
          id: "rline_261029_0069",
          purchase_order_line_id: "poline_261028_0045_1",
          material_id: FIXTURE_IDS.materials.freshMilk,
          batch: "FM-261029-01",
          location: "Bandung RM / T-01",
          ordered_quantity: "10000.000",
          received_quantity: "8000.000",
          accepted_quantity: "0.000",
          rejected_quantity: "0.000",
          unit: "L",
          status: "PENDING_QC",
          discrepancy_reason: null,
        },
      ],
    },
    {
      id: "grn_261029_0070",
      number: "GRN-261029-0070",
      purchase_order_id: "po_261028_0046",
      purchase_order_number: "PO-261028-0046",
      supplier_id: FIXTURE_IDS.suppliers.kemas,
      supplier_name: "PT Kemas Prima",
      warehouse_id: FIXTURE_IDS.warehouses.bandung,
      supplier_delivery_number: "SJ-KP-4402",
      status: "RECORDED",
      received_at: "2026-10-29T08:45:00.000Z",
      created_by: "usr_warehouse",
      lines: [
        {
          id: "rline_261029_0070",
          purchase_order_line_id: "poline_261028_0046_1",
          material_id: FIXTURE_IDS.materials.cartons,
          batch: "PK-261029-01",
          location: "Bandung RM / C-04",
          ordered_quantity: "100000.000",
          received_quantity: "50000.000",
          accepted_quantity: "0.000",
          rejected_quantity: "0.000",
          unit: "pcs",
          status: "PENDING_QC",
          discrepancy_reason: null,
        },
      ],
    },
  ];

  for (const r of receipts) {
    sql
      .prepare(
        `INSERT INTO goods_receipts (id, number, purchase_order_id, purchase_order_number, supplier_id, supplier_name, warehouse_id, supplier_delivery_number, status, received_at, created_by, created_at, updated_at, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT(id) DO UPDATE SET status = excluded.status`,
      )
      .run(
        r.id,
        r.number,
        r.purchase_order_id,
        r.purchase_order_number,
        r.supplier_id,
        r.supplier_name,
        r.warehouse_id,
        r.supplier_delivery_number,
        r.status,
        r.received_at,
        r.created_by,
        now,
        now,
      );

    for (const l of r.lines) {
      sql
        .prepare(
          `INSERT INTO goods_receipt_lines (id, receipt_id, purchase_order_line_id, material_id, batch, location, ordered_quantity, received_quantity, accepted_quantity, rejected_quantity, unit, status, discrepancy_reason)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             accepted_quantity = excluded.accepted_quantity,
             rejected_quantity = excluded.rejected_quantity,
             status = excluded.status`,
        )
        .run(
          l.id,
          r.id,
          l.purchase_order_line_id,
          l.material_id,
          l.batch,
          l.location,
          l.ordered_quantity,
          l.received_quantity,
          l.accepted_quantity,
          l.rejected_quantity,
          l.unit,
          l.status,
          l.discrepancy_reason,
        );
    }
  }

  // 6. Canonical QC Inspection: QC-261028-0068
  sql
    .prepare(
      `INSERT INTO qc_inspections (id, number, receipt_id, receipt_line_id, inspector_id, inspected_at, inspected_quantity, accepted_quantity, rejected_quantity, held_quantity, unit, status, notes, quarantine_reason, quarantine_value, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON CONFLICT(id) DO UPDATE SET status = excluded.status`,
    )
    .run(
      FIXTURE_IDS.documents.inspection, // qc_261028_0068
      "QC-261028-0068",
      FIXTURE_IDS.documents.receipt,
      "rline_261028_0068",
      "usr_qc",
      "2026-10-28T09:30:00.000Z",
      "8000.000",
      "7800.000",
      "200.000",
      "0.000",
      "kg",
      "COMPLETED",
      "Inspection completed. 7,800 kg accepted into stock. 200 kg rejected due to bag tears and quarantined.",
      "Rejected quantity quarantined • 200 kg × Rp20,000 = Rp4,000,000 • Supplier credit note required • INV-SP-1028-087",
      400000000, // Rp4,000,000 in minor units
      now,
      now,
    );

  // QC Inspection Tests
  const tests = [
    {
      id: "qctest_001",
      inspection_id: FIXTURE_IDS.documents.inspection,
      name: "Moisture",
      result: "3.8% (limit ≤ 4.5%)",
      outcome: "ACCEPTED",
    },
    {
      id: "qctest_002",
      inspection_id: FIXTURE_IDS.documents.inspection,
      name: "Microbiology",
      result: "Within limit",
      outcome: "ACCEPTED",
    },
    {
      id: "qctest_003",
      inspection_id: FIXTURE_IDS.documents.inspection,
      name: "Packaging integrity",
      result: "200 kg damaged bags",
      outcome: "REJECTED",
    },
  ];
  for (const t of tests) {
    sql
      .prepare(
        `INSERT OR IGNORE INTO qc_inspection_tests (id, inspection_id, name, result, outcome)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(t.id, t.inspection_id, t.name, t.result, t.outcome);
  }

  // 7. Canonical Stock Movements
  const movements = [
    {
      id: "smov_261028_001",
      material_id: FIXTURE_IDS.materials.milkPowder,
      warehouse_id: FIXTURE_IDS.warehouses.bandung,
      movement_type: "RECEIPT",
      quantity: "8000.000",
      unit: "kg",
      from_bucket: "NONE",
      to_bucket: "QC_PENDING",
      reference_type: "GRN",
      reference_id: "GRN-261028-0068",
      batch: "MP-261028-01",
      location: "Bandung RM / B-02-08",
      actor_id: "usr_warehouse",
      notes: "Goods received from PT Sumber Pangan PO-261026-0042",
      occurred_at: "2026-10-28T08:30:00.000Z",
    },
    {
      id: "smov_261028_002",
      material_id: FIXTURE_IDS.materials.milkPowder,
      warehouse_id: FIXTURE_IDS.warehouses.bandung,
      movement_type: "QC_ACCEPT",
      quantity: "7800.000",
      unit: "kg",
      from_bucket: "QC_PENDING",
      to_bucket: "ACCEPTED",
      reference_type: "QC",
      reference_id: "QC-261028-0068",
      batch: "MP-261028-01",
      location: "Bandung RM / B-02-08",
      actor_id: "usr_qc",
      notes: "QC approved 7,800 kg for production use",
      occurred_at: "2026-10-28T09:30:00.000Z",
    },
    {
      id: "smov_261028_003",
      material_id: FIXTURE_IDS.materials.milkPowder,
      warehouse_id: FIXTURE_IDS.warehouses.bandung,
      movement_type: "QC_REJECT",
      quantity: "200.000",
      unit: "kg",
      from_bucket: "QC_PENDING",
      to_bucket: "REJECTED",
      reference_type: "QC",
      reference_id: "QC-261028-0068",
      batch: "MP-261028-01",
      location: "Bandung RM / Quarantine-01",
      actor_id: "usr_qc",
      notes: "200 kg rejected due to bag integrity failure",
      occurred_at: "2026-10-28T09:30:00.000Z",
    },
  ];
  for (const m of movements) {
    sql
      .prepare(
        `INSERT OR IGNORE INTO stock_movements (id, material_id, warehouse_id, movement_type, quantity, unit, from_bucket, to_bucket, reference_type, reference_id, batch, location, actor_id, notes, occurred_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        m.id,
        m.material_id,
        m.warehouse_id,
        m.movement_type,
        m.quantity,
        m.unit,
        m.from_bucket,
        m.to_bucket,
        m.reference_type,
        m.reference_id,
        m.batch,
        m.location,
        m.actor_id,
        m.notes,
        m.occurred_at,
      );
  }

  // 8. Canonical Sales Order & Dispatches (Outbound Revenue Flow)
  const salesOrder = {
    id: "so_261028_0015",
    number: "SO-261028-0015",
    customer_id: "cust_indomarco",
    customer_name: "PT Indomarco Prismatama",
    warehouse_id: "wh_bandung_fg",
    status: "APPROVED",
    credit_status: "APPROVED",
    total_minor: 9000000000, // Rp90,000,000
    ordered_at: "2026-10-28T10:00:00.000Z",
    lines: [
      {
        id: "soline_261028_001",
        material_id: "fg_ultra_milk_1l",
        quantity: "5000.000",
        reserved_quantity: "3000.000",
        dispatched_quantity: "3000.000",
        unit: "pcs",
        unit_price_minor: 1800000, // Rp18,000
      },
    ],
  };

  sql
    .prepare(
      `INSERT INTO sales_orders (id, number, customer_id, customer_name, warehouse_id, status, credit_status, total_minor, ordered_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET status = excluded.status, credit_status = excluded.credit_status`,
    )
    .run(
      salesOrder.id,
      salesOrder.number,
      salesOrder.customer_id,
      salesOrder.customer_name,
      salesOrder.warehouse_id,
      salesOrder.status,
      salesOrder.credit_status,
      salesOrder.total_minor,
      salesOrder.ordered_at,
      now,
    );

  for (const sol of salesOrder.lines) {
    sql
      .prepare(
        `INSERT INTO sales_order_lines (id, sales_order_id, material_id, quantity, reserved_quantity, dispatched_quantity, unit, unit_price_minor)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           reserved_quantity = excluded.reserved_quantity,
           dispatched_quantity = excluded.dispatched_quantity`,
      )
      .run(
        sol.id,
        salesOrder.id,
        sol.material_id,
        sol.quantity,
        sol.reserved_quantity,
        sol.dispatched_quantity,
        sol.unit,
        sol.unit_price_minor,
      );
  }

  // Delivery Order DO-261029-0008 (Partial dispatch: 3,000 pcs of 5,000 pcs)
  const deliveryOrder = {
    id: "do_261029_0008",
    number: "DO-261029-0008",
    sales_order_id: salesOrder.id,
    warehouse_id: "wh_bandung_fg",
    carrier_3pl: "Dakota Logistics",
    tracking_number: "DKT-JKT-8921",
    driver_name: "Budi Santoso",
    vehicle_number: "B 9821 UJ",
    status: "DELIVERED",
    dispatched_at: "2026-10-29T06:00:00.000Z",
    delivered_at: "2026-10-29T10:15:00.000Z",
    created_by: "usr_warehouse",
    lines: [
      {
        id: "doline_261029_001",
        sales_order_line_id: "soline_261028_001",
        material_id: "fg_ultra_milk_1l",
        quantity: "3000.000",
        unit: "pcs",
      },
    ],
  };

  sql
    .prepare(
      `INSERT INTO delivery_orders (id, number, sales_order_id, warehouse_id, carrier_3pl, tracking_number, driver_name, vehicle_number, status, dispatched_at, delivered_at, created_by, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON CONFLICT(id) DO UPDATE SET status = excluded.status, delivered_at = excluded.delivered_at`,
    )
    .run(
      deliveryOrder.id,
      deliveryOrder.number,
      deliveryOrder.sales_order_id,
      deliveryOrder.warehouse_id,
      deliveryOrder.carrier_3pl,
      deliveryOrder.tracking_number,
      deliveryOrder.driver_name,
      deliveryOrder.vehicle_number,
      deliveryOrder.status,
      deliveryOrder.dispatched_at,
      deliveryOrder.delivered_at,
      deliveryOrder.created_by,
      now,
      now,
    );

  for (const dol of deliveryOrder.lines) {
    sql
      .prepare(
        `INSERT INTO delivery_order_lines (id, delivery_order_id, sales_order_line_id, material_id, quantity, unit)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET quantity = excluded.quantity`,
      )
      .run(dol.id, deliveryOrder.id, dol.sales_order_line_id, dol.material_id, dol.quantity, dol.unit);
  }

  // Seed signed delivery receipt attachment in private directory
  const storageDir = getStorageDirectory();
  const samplePdfPath = join(storageDir, "do_261029_0008_signed.pdf");
  const samplePdfContent = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Title (Signed Delivery Order DO-261029-0008) /Author (Dakota Logistics) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n",
    "ascii",
  );
  if (!existsSync(samplePdfPath)) {
    writeFileSync(samplePdfPath, samplePdfContent);
  }
  const samplePdfHash = createHash("sha256").update(samplePdfContent).digest("hex");

  sql
    .prepare(
      `INSERT OR IGNORE INTO inventory_attachments (id, entity_type, entity_id, file_name, mime_type, file_size, storage_path, sha256, uploaded_by, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      "att_do_261029_0008",
      "DELIVERY_ORDER",
      deliveryOrder.id,
      "Signed_DO_261029_0008.pdf",
      "application/pdf",
      samplePdfContent.length,
      samplePdfPath,
      samplePdfHash,
      "usr_warehouse",
      "2026-10-29T10:30:00.000Z",
    );

  // 9. Canonical Return Claim & Physical Return Inspection
  const returnClaim = {
    id: "ret_261029_0003",
    number: "RET-261029-0003",
    customer_id: "cust_alfaria",
    customer_name: "PT Sumber Alfaria Trijaya",
    sales_order_id: "so_261028_0012",
    delivery_order_id: "do_261028_0004",
    material_id: "fg_ultra_milk_250ml",
    claimed_quantity: "500.000",
    unit: "pcs",
    reason: "Crushed outer carton during transport; possible carton damage.",
    status: "INSPECTED",
  };

  sql
    .prepare(
      `INSERT INTO return_claims (id, number, customer_id, customer_name, sales_order_id, delivery_order_id, material_id, claimed_quantity, unit, reason, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET status = excluded.status`,
    )
    .run(
      returnClaim.id,
      returnClaim.number,
      returnClaim.customer_id,
      returnClaim.customer_name,
      returnClaim.sales_order_id,
      returnClaim.delivery_order_id,
      returnClaim.material_id,
      returnClaim.claimed_quantity,
      returnClaim.unit,
      returnClaim.reason,
      returnClaim.status,
      now,
    );

  sql
    .prepare(
      `INSERT INTO return_inspections (id, number, return_claim_id, warehouse_id, material_id, claimed_quantity, inspected_quantity, accepted_quantity, damaged_quantity, rejected_quantity, unit, condition_classification, findings, inspector_id, inspected_at, status, fam_authorized_by, fam_authorized_at, credit_note_number, created_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON CONFLICT(id) DO UPDATE SET status = excluded.status`,
    )
    .run(
      "ret_insp_261029_0003",
      "RET-261029-0003",
      returnClaim.id,
      FIXTURE_IDS.warehouses.bandung,
      "fg_ultra_milk_250ml",
      "500.000",
      "500.000",
      "420.000", // Resaleable inner packages returned to available stock
      "80.000",  // Damaged packages quarantined
      "0.000",
      "pcs",
      "RESALEABLE",
      "Inspected 500 pcs return. 420 pcs intact with undamaged seals restored to available stock. 80 pcs punctured and leaking quarantined for disposal.",
      "usr_qc",
      "2026-10-29T11:00:00.000Z",
      "INSPECTED",
      "usr_accounting",
      "2026-10-29T11:30:00.000Z",
      "CN-261029-0002",
      now,
    );
}
