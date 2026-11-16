import "server-only";
import { db } from "@/server/db";
import { FIXTURE_IDS } from "@/shared/fixtures";

/**
 * Idempotent module-local seed for the Procurement domain.
 * Preserves canonical fixture IDs and exact scenarios specified in PROJECT_CONTRACT.md
 * and visual reference 03-procurement.png.
 */
export function seedProcurement() {
  const sql = db();

  // 1. Reserve document counters floors
  const counters = [
    { type: "FPBB", day: "261028", seq: 188 },
    { type: "RFQ", day: "261028", seq: 12 },
    { type: "QUOTE", day: "261028", seq: 14 },
    { type: "EVAL", day: "261028", seq: 12 },
    { type: "PO", day: "261029", seq: 45 },
  ];

  for (const c of counters) {
    sql
      .prepare(
        `INSERT INTO document_counters (document_type, local_day, sequence)
         VALUES (?, ?, ?)
         ON CONFLICT(document_type, local_day) DO UPDATE SET sequence = max(sequence, ?)`,
      )
      .run(c.type, c.day, c.seq, c.seq);
  }

  // 2. Suppliers
  const suppliers = [
    {
      id: FIXTURE_IDS.suppliers.milkCoop,
      code: "SUP-001",
      name: "Koperasi Susu Sejahtera",
      email: "orders@kss.local",
      phone: "+62 22 8765 4321",
      address: "Jl. Raya Lembang No. 45, Bandung Barat",
      taxId: "01.234.567.8-401.000",
      rating: 4.9,
      qualificationStatus: "QUALIFIED",
      legalDocValidUntil: "2027-12-31",
      riskLevel: "LOW",
    },
    {
      id: FIXTURE_IDS.suppliers.pangan,
      code: "SUP-002",
      name: "PT Sumber Pangan",
      email: "sales@sumberpangan.local",
      phone: "+62 21 5567 8901",
      address: "Kawasan Industri MM2100 Blok C-3, Cikarang",
      taxId: "02.345.678.9-402.000",
      rating: 4.8,
      qualificationStatus: "QUALIFIED",
      legalDocValidUntil: "2028-06-30",
      riskLevel: "LOW",
    },
    {
      id: FIXTURE_IDS.suppliers.kemas,
      code: "SUP-003",
      name: "PT Kemas Prima",
      email: "commercial@kemasprima.local",
      phone: "+62 21 8976 5432",
      address: "Kawasan Industri Jababeka V, Bekasi",
      taxId: "03.456.789.0-403.000",
      rating: 4.9,
      qualificationStatus: "QUALIFIED",
      legalDocValidUntil: "2027-09-30",
      riskLevel: "LOW",
    },
    {
      id: "sup_kemasan_sentosa",
      code: "SUP-004",
      name: "PT Kemasan Sentosa",
      email: "sales@kemasantosa.local",
      phone: "+62 21 7890 1234",
      address: "Jl. Industri Raya No. 12, Tangerang",
      taxId: "04.567.890.1-404.000",
      rating: 4.5,
      qualificationStatus: "QUALIFIED",
      legalDocValidUntil: "2026-12-31",
      riskLevel: "MEDIUM",
    },
    {
      id: "sup_indopack",
      code: "SUP-005",
      name: "PT IndoPack",
      email: "quotes@indopack.local",
      phone: "+62 21 6543 2109",
      address: "Ruko Daan Mogot Baru Blok A-8, Jakarta Barat",
      taxId: "05.678.901.2-405.000",
      rating: 4.4,
      qualificationStatus: "QUALIFIED",
      legalDocValidUntil: "2027-03-31",
      riskLevel: "LOW",
    },
  ];

  const now = new Date().toISOString();
  const insertSupStmt = sql.prepare(
    `INSERT OR IGNORE INTO suppliers (id, code, name, email, phone, address, tax_id, rating, qualification_status, legal_doc_valid_until, risk_level, active, created_at, updated_at, version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 1)`,
  );

  for (const s of suppliers) {
    insertSupStmt.run(
      s.id,
      s.code,
      s.name,
      s.email,
      s.phone,
      s.address,
      s.taxId,
      s.rating,
      s.qualificationStatus,
      s.legalDocValidUntil,
      s.riskLevel,
      now,
      now,
    );
  }

  // 3. Canonical Material Requests
  // 3a. Canonical Powder Request (fpbb_261023_0185)
  sql
    .prepare(
      `INSERT OR IGNORE INTO material_requests (id, number, warehouse_id, production_reference, priority, required_on, purpose, status, created_by, verified_by, verified_at, verification_outcome, verification_reason, verification_stock, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, 'HIGH', '2026-10-27', 'Raw milk powder replenishment for Batch PRD-902', 'VERIFIED', 'usr_production', 'usr_warehouse', '2026-10-24T09:15:00Z', 'VERIFIED', 'Available warehouse stock insufficient for upcoming production run', '1200.000', '2026-10-23T08:00:00Z', '2026-10-24T09:15:00Z', 1)`,
    )
    .run(
      "fpbb_261023_0185",
      "FPBB-261023-0185",
      FIXTURE_IDS.warehouses.bandung,
      "PRD-BATCH-902",
    );

  sql
    .prepare(
      "INSERT OR IGNORE INTO material_request_lines (id, request_id, material_id, quantity, unit) VALUES (?, ?, ?, ?, ?)",
    )
    .run("mrl_powder_1", "fpbb_261023_0185", FIXTURE_IDS.materials.milkPowder, "10000.000", "kg");

  // 3b. Screenshot Request (fpbb_261028_0188) - Packaging Cartons
  sql
    .prepare(
      `INSERT OR IGNORE INTO material_requests (id, number, warehouse_id, production_reference, priority, required_on, purpose, status, created_by, verified_by, verified_at, verification_outcome, verification_reason, verification_stock, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, 'NORMAL', '2026-11-03', 'UHT Line 250ml tetra-pack packaging stock replenishment', 'VERIFIED', 'usr_production', 'usr_warehouse', '2026-10-28T14:30:00Z', 'VERIFIED', 'Bandung RM stock at 200,000 pcs; threshold requires 1.5M pcs buffer', '200000.000', '2026-10-28T10:15:00Z', '2026-10-28T14:30:00Z', 1)`,
    )
    .run(
      FIXTURE_IDS.documents.request,
      "FPBB-261028-0188",
      FIXTURE_IDS.warehouses.bandung,
      "WO-261028-0188",
    );

  sql
    .prepare(
      "INSERT OR IGNORE INTO material_request_lines (id, request_id, material_id, quantity, unit) VALUES (?, ?, ?, ?, ?)",
    )
    .run("mrl_cartons_1", FIXTURE_IDS.documents.request, FIXTURE_IDS.materials.cartons, "1000000.000", "pcs");

  // 3c. Other requests from screenshot
  sql
    .prepare(
      `INSERT OR IGNORE INTO material_requests (id, number, warehouse_id, production_reference, priority, required_on, purpose, status, created_by, verified_by, verified_at, verification_outcome, verification_reason, verification_stock, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, 'NORMAL', '2026-10-30', 'Regular packaging corrugated boxes', 'VERIFIED', 'usr_production', 'usr_warehouse', '2026-10-25T11:00:00Z', 'VERIFIED', 'Verified for procurement', '50000.000', '2026-10-25T09:00:00Z', '2026-10-25T11:00:00Z', 1)`,
    )
    .run("fpbb_261025_0187", "FPBB-261025-0187", FIXTURE_IDS.warehouses.bandung, "WO-261025-0187");

  sql
    .prepare(
      `INSERT OR IGNORE INTO material_requests (id, number, warehouse_id, production_reference, priority, required_on, purpose, status, created_by, verified_by, verified_at, verification_outcome, verification_reason, verification_stock, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, 'HIGH', '2026-10-29', 'Daily fresh milk delivery for processing plant', 'VERIFIED', 'usr_production', 'usr_warehouse', '2026-10-24T10:00:00Z', 'VERIFIED', 'Verified for immediate cooperative intake', '15000.000', '2026-10-24T08:30:00Z', '2026-10-24T10:00:00Z', 1)`,
    )
    .run("fpbb_261024_0186", "FPBB-261024-0186", FIXTURE_IDS.warehouses.bandung, "WO-261024-0186");

  // 3d. A Pending / Submitted request for verification demonstration
  sql
    .prepare(
      `INSERT OR IGNORE INTO material_requests (id, number, warehouse_id, production_reference, priority, required_on, purpose, status, created_by, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, 'URGENT', '2026-11-05', 'Fresh Milk buffer intake for peak weekend demand', 'SUBMITTED', 'usr_production', '2026-10-29T07:15:00Z', '2026-10-29T07:15:00Z', 1)`,
    )
    .run("fpbb_261029_0189", "FPBB-261029-0189", FIXTURE_IDS.warehouses.bandung, "WO-261029-0189");

  sql
    .prepare(
      "INSERT OR IGNORE INTO material_request_lines (id, request_id, material_id, quantity, unit) VALUES (?, ?, ?, ?, ?)",
    )
    .run("mrl_fresh_pending", "fpbb_261029_0189", FIXTURE_IDS.materials.freshMilk, "40000.000", "L");

  // 4. RFQ for Packaging Cartons (RFQ-261028-0012)
  sql
    .prepare(
      `INSERT OR IGNORE INTO rfqs (id, number, due_on, status, created_by, created_at, updated_at, version)
       VALUES (?, ?, '2026-11-01', 'SENT', 'usr_purchasing', '2026-10-28T15:00:00Z', '2026-10-28T15:00:00Z', 1)`,
    )
    .run(FIXTURE_IDS.documents.rfq, "RFQ-261028-0012");

  sql
    .prepare("INSERT OR IGNORE INTO rfq_requests (rfq_id, request_id) VALUES (?, ?)")
    .run(FIXTURE_IDS.documents.rfq, FIXTURE_IDS.documents.request);

  for (const sId of [FIXTURE_IDS.suppliers.kemas, "sup_kemasan_sentosa", "sup_indopack"]) {
    sql.prepare("INSERT OR IGNORE INTO rfq_suppliers (rfq_id, supplier_id) VALUES (?, ?)").run(
      FIXTURE_IDS.documents.rfq,
      sId,
    );
  }

  sql
    .prepare(
      "INSERT OR IGNORE INTO rfq_lines (id, rfq_id, material_id, quantity, unit) VALUES (?, ?, ?, ?, ?)",
    )
    .run("rfql_cartons_1", FIXTURE_IDS.documents.rfq, FIXTURE_IDS.materials.cartons, "1000000.000", "pcs");

  // 5. Quotations for RFQ-261028-0012 (Matches table in 03-procurement.png!)
  // Quote 1: PT Kemas Prima (Selected: Rp120/pcs, 2 days lead time, total Rp120,000,000)
  // 12,000 minor units = Rp120. Total = 12,000,000,000 minor units = Rp120M
  sql
    .prepare(
      `INSERT OR IGNORE INTO quotations (id, number, rfq_id, supplier_id, valid_until, lead_days, total, status, created_by, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, '2026-11-15', 2, 12000000000, 'EVALUATED', 'usr_purchasing', '2026-10-28T16:30:00Z', '2026-10-28T16:30:00Z', 1)`,
    )
    .run(
      FIXTURE_IDS.documents.quotation,
      "QUOTE-261028-0012",
      FIXTURE_IDS.documents.rfq,
      FIXTURE_IDS.suppliers.kemas,
    );

  sql
    .prepare(
      `INSERT OR IGNORE INTO quotation_lines (id, quotation_id, material_id, quantity, unit, unit_price, total)
       VALUES (?, ?, ?, '1000000.000', 'pcs', 12000, 12000000000)`,
    )
    .run("ql_kemas_1", FIXTURE_IDS.documents.quotation, FIXTURE_IDS.materials.cartons);

  // Quote 2: PT Kemasan Sentosa (Rp124/pcs, 3 days lead time, total Rp124,000,000)
  // 12,400 minor units = Rp124. Total = 12,400,000,000 minor units = Rp124M
  sql
    .prepare(
      `INSERT OR IGNORE INTO quotations (id, number, rfq_id, supplier_id, valid_until, lead_days, total, status, created_by, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, '2026-11-15', 3, 12400000000, 'RECEIVED', 'usr_purchasing', '2026-10-28T17:00:00Z', '2026-10-28T17:00:00Z', 1)`,
    )
    .run(
      "quote_261028_0013",
      "QUOTE-261028-0013",
      FIXTURE_IDS.documents.rfq,
      "sup_kemasan_sentosa",
    );

  sql
    .prepare(
      `INSERT OR IGNORE INTO quotation_lines (id, quotation_id, material_id, quantity, unit, unit_price, total)
       VALUES (?, ?, ?, '1000000.000', 'pcs', 12400, 12400000000)`,
    )
    .run("ql_sentosa_1", "quote_261028_0013", FIXTURE_IDS.materials.cartons);

  // Quote 3: PT IndoPack (Rp128/pcs, 4 days lead time, total Rp128,000,000)
  // 12,800 minor units = Rp128. Total = 12,800,000,000 minor units = Rp128M
  sql
    .prepare(
      `INSERT OR IGNORE INTO quotations (id, number, rfq_id, supplier_id, valid_until, lead_days, total, status, created_by, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, '2026-11-15', 4, 12800000000, 'RECEIVED', 'usr_purchasing', '2026-10-28T17:30:00Z', '2026-10-28T17:30:00Z', 1)`,
    )
    .run(
      "quote_261028_0014",
      "QUOTE-261028-0014",
      FIXTURE_IDS.documents.rfq,
      "sup_indopack",
    );

  sql
    .prepare(
      `INSERT OR IGNORE INTO quotation_lines (id, quotation_id, material_id, quantity, unit, unit_price, total)
       VALUES (?, ?, ?, '1000000.000', 'pcs', 12800, 12800000000)`,
    )
    .run("ql_indopack_1", "quote_261028_0014", FIXTURE_IDS.materials.cartons);

  // 6. Supplier Evaluation (eval_261028_0012)
  const evalCriteria = [
    {
      name: "Quality & Specifications Compliance",
      weight: 25,
      scores: {
        [FIXTURE_IDS.suppliers.kemas]: 95,
        sup_kemasan_sentosa: 88,
        sup_indopack: 85,
      },
    },
    {
      name: "Manufacturing Capacity",
      weight: 15,
      scores: {
        [FIXTURE_IDS.suppliers.kemas]: 90,
        sup_kemasan_sentosa: 85,
        sup_indopack: 82,
      },
    },
    {
      name: "Delivery & Lead Time Reliability",
      weight: 20,
      scores: {
        [FIXTURE_IDS.suppliers.kemas]: 96,
        sup_kemasan_sentosa: 88,
        sup_indopack: 80,
      },
    },
    {
      name: "Commercial Terms & Price",
      weight: 20,
      scores: {
        [FIXTURE_IDS.suppliers.kemas]: 98,
        sup_kemasan_sentosa: 92,
        sup_indopack: 85,
      },
    },
    {
      name: "Qualification & Legal Validity",
      weight: 10,
      scores: {
        [FIXTURE_IDS.suppliers.kemas]: 100,
        sup_kemasan_sentosa: 90,
        sup_indopack: 90,
      },
    },
    {
      name: "Supply Chain & Financial Risk",
      weight: 10,
      scores: {
        [FIXTURE_IDS.suppliers.kemas]: 92,
        sup_kemasan_sentosa: 80,
        sup_indopack: 88,
      },
    },
  ];

  sql
    .prepare(
      `INSERT OR IGNORE INTO supplier_evaluations (id, number, rfq_id, selected_quotation_id, criteria_json, reason, status, created_by, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, ?, ?, 'FINAL', 'usr_purchasing', '2026-10-28T18:00:00Z', '2026-10-28T18:00:00Z', 1)`,
    )
    .run(
      FIXTURE_IDS.documents.evaluation,
      "EVAL-261028-0012",
      FIXTURE_IDS.documents.rfq,
      FIXTURE_IDS.documents.quotation,
      JSON.stringify(evalCriteria),
      "PT Kemas Prima demonstrated superior technical quality compliance (95/100), shortest delivery lead time (2 days), and the lowest competitive unit price of Rp120/pcs.",
    );

  // 7. Purchase Orders (Matches 03-procurement.png rows!)
  // 7a. Row 4: Canonical Powder Order (PO-261026-0042)
  // 10,000 kg Milk Powder @ Rp20,000 = Rp200,000,000 (20,000,000,000 minor units)
  sql
    .prepare(
      `INSERT OR IGNORE INTO purchase_orders (id, number, supplier_id, quotation_id, warehouse_id, revision, status, delivery_terms, payment_terms, total, issued_at, issued_by, issued_notes, created_by, created_at, updated_at, version)
       VALUES (?, ?, ?, NULL, ?, 1, 'OPEN', 'Franco Gudang Bandung', 'Net 30 Days', 20000000000, '2026-10-26T14:00:00Z', 'usr_purchasing', 'Dispatched to supplier via standard purchase agreement', 'usr_purchasing', '2026-10-26T08:00:00Z', '2026-10-26T14:00:00Z', 1)`,
    )
    .run(
      FIXTURE_IDS.documents.order,
      "PO-261026-0042",
      FIXTURE_IDS.suppliers.pangan,
      FIXTURE_IDS.warehouses.bandung,
    );

  sql
    .prepare("INSERT OR IGNORE INTO purchase_order_requests (order_id, request_id) VALUES (?, ?)")
    .run(FIXTURE_IDS.documents.order, "fpbb_261023_0185");

  sql
    .prepare(
      `INSERT OR IGNORE INTO purchase_order_lines (id, order_id, material_id, quantity, unit, unit_price, total)
       VALUES (?, ?, ?, '10000.000', 'kg', 2000000, 20000000000)`,
    )
    .run("pol_powder_1", FIXTURE_IDS.documents.order, FIXTURE_IDS.materials.milkPowder);

  // 7b. Row 3: Fresh Milk PO (PO-261027-0043) - Rp360,000,000 (36,000,000,000 minor units)
  sql
    .prepare(
      `INSERT OR IGNORE INTO purchase_orders (id, number, supplier_id, quotation_id, warehouse_id, revision, status, delivery_terms, payment_terms, total, issued_at, issued_by, created_by, created_at, updated_at, version)
       VALUES (?, ?, ?, NULL, ?, 1, 'APPROVED', 'Franco Gudang Bandung', 'Net 14 Days', 36000000000, '2026-10-27T16:00:00Z', 'usr_purchasing', 'usr_purchasing', '2026-10-27T08:30:00Z', '2026-10-27T16:00:00Z', 1)`,
    )
    .run(
      "po_261027_0043",
      "PO-261027-0043",
      FIXTURE_IDS.suppliers.milkCoop,
      FIXTURE_IDS.warehouses.bandung,
    );

  sql
    .prepare("INSERT OR IGNORE INTO purchase_order_requests (order_id, request_id) VALUES (?, ?)")
    .run("po_261027_0043", "fpbb_261024_0186");

  sql
    .prepare(
      `INSERT OR IGNORE INTO purchase_order_lines (id, order_id, material_id, quantity, unit, unit_price, total)
       VALUES (?, ?, ?, '45000.000', 'L', 800000, 36000000000)`,
    )
    .run("pol_fresh_1", "po_261027_0043", FIXTURE_IDS.materials.freshMilk);

  // 7c. Row 2: Kemas Prima PO (PO-261028-0044) - Rp240,000,000 (24,000,000,000 minor units)
  sql
    .prepare(
      `INSERT OR IGNORE INTO purchase_orders (id, number, supplier_id, quotation_id, warehouse_id, revision, status, delivery_terms, payment_terms, total, issued_at, issued_by, created_by, created_at, updated_at, version)
       VALUES (?, ?, ?, NULL, ?, 1, 'APPROVED', 'Franco Gudang Bandung', 'Net 30 Days', 24000000000, '2026-10-28T15:00:00Z', 'usr_purchasing', 'usr_purchasing', '2026-10-28T09:00:00Z', '2026-10-28T15:00:00Z', 1)`,
    )
    .run(
      "po_261028_0044",
      "PO-261028-0044",
      FIXTURE_IDS.suppliers.kemas,
      FIXTURE_IDS.warehouses.bandung,
    );

  sql
    .prepare("INSERT OR IGNORE INTO purchase_order_requests (order_id, request_id) VALUES (?, ?)")
    .run("po_261028_0044", "fpbb_261025_0187");

  sql
    .prepare(
      `INSERT OR IGNORE INTO purchase_order_lines (id, order_id, material_id, quantity, unit, unit_price, total)
       VALUES (?, ?, ?, '2000000.000', 'pcs', 12000, 24000000000)`,
    )
    .run("pol_cartons_prev", "po_261028_0044", FIXTURE_IDS.materials.cartons);

  // 7d. Row 1: Active Focus PO (PO-261029-0045) - Rp120,000,000 (12,000,000,000 minor units)
  // Status: AWAITING_APPROVAL, Stage: Finance Manager (Matches right detail drawer in 03-procurement.png!)
  sql
    .prepare(
      `INSERT OR IGNORE INTO purchase_orders (id, number, supplier_id, quotation_id, warehouse_id, revision, status, delivery_terms, payment_terms, total, created_by, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, ?, 1, 'AWAITING_APPROVAL', 'Franco Gudang Bandung', 'Net 30 Days', 12000000000, 'usr_admin', '2026-10-29T03:25:00Z', '2026-10-29T03:31:00Z', 1)`,
    )
    .run(
      "po_261029_0045",
      "PO-261029-0045",
      FIXTURE_IDS.suppliers.kemas,
      FIXTURE_IDS.documents.quotation,
      FIXTURE_IDS.warehouses.bandung,
    );

  sql
    .prepare("INSERT OR IGNORE INTO purchase_order_requests (order_id, request_id) VALUES (?, ?)")
    .run("po_261029_0045", FIXTURE_IDS.documents.request);

  sql
    .prepare(
      `INSERT OR IGNORE INTO purchase_order_lines (id, order_id, material_id, quantity, unit, unit_price, total)
       VALUES (?, ?, ?, '1000000.000', 'pcs', 12000, 12000000000)`,
    )
    .run("pol_cartons_focus", "po_261029_0045", FIXTURE_IDS.materials.cartons);

  // Approval steps for PO-261029-0045 matching the visual reference:
  // Step 1: Requester (Ayu Pratama) - Submitted • 29 Oct 2026, 10:25
  // Step 2: Dimas Saputra • Procurement Manager - Approved • 29 Oct 2026, 10:31
  // Step 3: Sinta Maharani • Finance Manager - Awaiting approval
  // Step 4: Hendra Wijaya • Director - Next approver • After finance approval
  const steps = [
    {
      id: "step_po45_1",
      seq: 1,
      title: "Procurement Manager",
      assignedUser: "usr_approver",
      role: "APPROVER",
      policy: "POL_DEMO_PROC_MGR",
      status: "APPROVED",
      decidedBy: "usr_approver",
      decidedAt: "2026-10-29T03:31:00Z",
      outcome: "APPROVED",
      reason: "Verified RFQ quotes and winning supplier pricing benchmark.",
    },
    {
      id: "step_po45_2",
      seq: 2,
      title: "Finance Manager",
      assignedUser: "usr_approver",
      role: "APPROVER",
      policy: "POL_DEMO_FIN_MGR",
      status: "PENDING",
      decidedBy: null,
      decidedAt: null,
      outcome: null,
      reason: null,
    },
    {
      id: "step_po45_3",
      seq: 3,
      title: "Executive Director",
      assignedUser: "usr_approver",
      role: "APPROVER",
      policy: "POL_DEMO_DIRECTOR",
      status: "PENDING",
      decidedBy: null,
      decidedAt: null,
      outcome: null,
      reason: null,
    },
  ];

  const insertStep = sql.prepare(
    `INSERT OR IGNORE INTO approval_steps (id, order_id, sequence, title, assigned_user_id, assigned_role, authority_policy_id, status, decision_id, decided_by, decided_at, decision_outcome, decision_reason, document_revision)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
  );

  for (const s of steps) {
    insertStep.run(
      s.id,
      "po_261029_0045",
      s.seq,
      s.title,
      s.assignedUser,
      s.role,
      s.policy,
      s.status,
      s.outcome ? `dec_${s.id}` : null,
      s.decidedBy,
      s.decidedAt,
      s.outcome,
      s.reason,
    );
  }
}
