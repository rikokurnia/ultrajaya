import "server-only";
import type Database from "better-sqlite3";
import { db } from "@/server/db";
import { FIXTURE_IDS } from "@/shared/fixtures";

export function seedFinance(customDb?: Database.Database) {
  const sql = customDb || db();
  const now = new Date().toISOString();

  // 1. Chart of Accounts (Account Master Data)
  const accounts = [
    { id: "acc_1101", code: "1101", name: "Cash & Bank (BCA Operational)", type: "ASSET" },
    { id: "acc_1102", code: "1102", name: "Accounts Receivable (Trade)", type: "ASSET" },
    { id: "acc_1103", code: "1103", name: "Inventory - Raw Materials", type: "ASSET" },
    { id: "acc_1104", code: "1104", name: "Inventory - Finished Goods", type: "ASSET" },
    { id: "acc_2101", code: "2101", name: "Accounts Payable (Trade)", type: "LIABILITY" },
    { id: "acc_2102", code: "2102", name: "Accrued Liabilities / Unbilled GRN", type: "LIABILITY" },
    { id: "acc_3101", code: "3101", name: "Capital Stock", type: "EQUITY" },
    { id: "acc_3201", code: "3201", name: "Retained Earnings", type: "EQUITY" },
    { id: "acc_4101", code: "4101", name: "Sales Revenue (Beverage)", type: "REVENUE" },
    { id: "acc_5101", code: "5101", name: "Cost of Goods Sold (COGS)", type: "EXPENSE" },
    { id: "acc_5201", code: "5201", name: "Bad Debt Expense", type: "EXPENSE" },
    { id: "acc_5202", code: "5202", name: "Sales Returns & Discounts", type: "EXPENSE" },
  ];

  const insertAcc = sql.prepare(
    "INSERT OR IGNORE INTO accounts (id, code, name, type, active, version, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 1, ?, ?)",
  );
  for (const acc of accounts) {
    insertAcc.run(acc.id, acc.code, acc.name, acc.type, now, now);
  }

  // 2. Canonical Purchasing Fixture
  // Supplier: PT Sumber Pangan
  const invSpId = FIXTURE_IDS.documents.invoice; // inv_sp_1028_087
  const supPanganId = FIXTURE_IDS.suppliers.pangan; // sup_sumber_pangan
  const poId = FIXTURE_IDS.documents.order; // po_261026_0042
  const grnId = FIXTURE_IDS.documents.receipt; // grn_261028_0068
  const payId = FIXTURE_IDS.documents.payment; // pay_261029_0031
  const jrnId = FIXTURE_IDS.documents.journal; // jrn_261029_0001

  // Insert supplier invoice INV-SP-1028-087
  sql.prepare(`
    INSERT OR REPLACE INTO invoices (
      id, number, supplier_id, supplier_invoice_number, purchase_order_id, receipt_ids,
      issued_on, due_on, total, status, version, created_by, created_at, updated_at
    ) VALUES (?, 'INV-SP-1028-087', ?, 'INV-SP-1028-087', ?, ?, '2026-10-28', '2026-11-27', 16000000000, 'HELD', 1, 'usr_ap', ?, ?)
  `).run(invSpId, supPanganId, poId, JSON.stringify([grnId]), now, now);

  // Line item for INV-SP-1028-087 (8,000 kg @ Rp20,000/kg = Rp160M)
  sql.prepare(`
    INSERT OR REPLACE INTO invoice_lines (
      id, invoice_id, purchase_order_line_id, material_id, quantity, unit, unit_price, total, receipt_line_ids
    ) VALUES ('invl_sp_001', ?, 'pol_sp_001', 'mat_milk_powder', '8000', 'kg', 2000000, 16000000000, ?)
  `).run(invSpId, JSON.stringify(["grnl_261028_0068_1"]));

  // Matching Result for INV-SP-1028-087:
  // Accepted 7,800 kg @ 20k = 156M, Discrepancy 200 kg @ 20k = 4M on hold
  const matchId = "match_sp_1028_087";
  sql.prepare(`
    INSERT OR REPLACE INTO matching_results (
      id, invoice_id, matched_by, matched_at, policy_id, status, eligible, held, created_at
    ) VALUES (?, ?, 'usr_ap', '2026-10-28T14:30:00.000Z', 'pol_3way_std', 'HELD', 15600000000, 400000000, ?)
  `).run(matchId, invSpId, now);

  sql.prepare("DELETE FROM matching_checks WHERE matching_id = ?").run(matchId);
  const insertCheck = sql.prepare(
    "INSERT INTO matching_checks (id, matching_id, code, outcome, reason) VALUES (?, ?, ?, ?, ?)",
  );
  insertCheck.run("chk_1", matchId, "SUPPLIER_PO_REF", "PASS", "Supplier & PO reference • Matched");
  insertCheck.run("chk_2", matchId, "UNIT_PRICE", "PASS", "Unit price • Matched");
  insertCheck.run("chk_3", matchId, "QC_ACCEPTED_QTY", "HOLD", "QC-accepted quantity • 200 kg discrepancy");

  // Historical Payment: PAY-261029-0031 Rp60M
  sql.prepare(`
    INSERT OR REPLACE INTO payments (
      id, number, paid_on, bank_reference, method, amount, status, version, created_by, created_at, updated_at
    ) VALUES (?, 'PAY-261029-0031', '2026-10-29T09:20:00.000Z', 'TRX-BCA-882910', 'BANK_TRANSFER', 6000000000, 'POSTED', 1, 'usr_treasury', ?, ?)
  `).run(payId, now, now);

  sql.prepare("DELETE FROM payment_allocations WHERE payment_id = ?").run(payId);
  sql.prepare(`
    INSERT INTO payment_allocations (id, payment_id, invoice_id, amount, created_at)
    VALUES ('alloc_pay_001', ?, ?, 6000000000, ?)
  `).run(payId, invSpId, now);

  // Payable balance for INV-SP-1028-087:
  // Recognized Rp160M, Paid Rp60M, Outstanding Rp100M, Held Rp4M, Eligible unpaid Rp96M
  sql.prepare(`
    INSERT OR REPLACE INTO payable_balances (
      invoice_id, supplier_id, recognized, paid, outstanding, held, eligible_unpaid, as_of
    ) VALUES (?, ?, 16000000000, 6000000000, 10000000000, 400000000, 9600000000, '2026-10-29')
  `).run(invSpId, supPanganId);

  // 3. Other reference invoices from 05-finance.png
  // INV-KSS-1027-041 (Koperasi Susu Sejahtera): Rp360M total, Rp0 paid, Rp360M balance, Matched
  const invKssId = "inv_kss_1027_041";
  const supKssId = FIXTURE_IDS.suppliers.milkCoop;
  sql.prepare(`
    INSERT OR REPLACE INTO invoices (
      id, number, supplier_id, supplier_invoice_number, purchase_order_id, receipt_ids,
      issued_on, due_on, total, status, version, created_by, created_at, updated_at
    ) VALUES (?, 'INV-KSS-1027-041', ?, 'INV-KSS-1027-041', 'po_kss_001', '[]', '2026-10-27', '2026-11-26', 36000000000, 'MATCHED', 1, 'usr_ap', ?, ?)
  `).run(invKssId, supKssId, now, now);

  sql.prepare(`
    INSERT OR REPLACE INTO payable_balances (
      invoice_id, supplier_id, recognized, paid, outstanding, held, eligible_unpaid, as_of
    ) VALUES (?, ?, 36000000000, 0, 36000000000, 0, 36000000000, '2026-10-29')
  `).run(invKssId, supKssId);

  // INV-KP-1028-066 (PT Kemas Prima): Rp240M total, Rp120M paid, Rp120M balance, Matched
  const invKpId = "inv_kp_1028_066";
  const supKemasId = FIXTURE_IDS.suppliers.kemas;
  sql.prepare(`
    INSERT OR REPLACE INTO invoices (
      id, number, supplier_id, supplier_invoice_number, purchase_order_id, receipt_ids,
      issued_on, due_on, total, status, version, created_by, created_at, updated_at
    ) VALUES (?, 'INV-KP-1028-066', ?, 'INV-KP-1028-066', 'po_kp_001', '[]', '2026-10-28', '2026-11-27', 24000000000, 'MATCHED', 1, 'usr_ap', ?, ?)
  `).run(invKpId, supKemasId, now, now);

  sql.prepare(`
    INSERT OR REPLACE INTO payable_balances (
      invoice_id, supplier_id, recognized, paid, outstanding, held, eligible_unpaid, as_of
    ) VALUES (?, ?, 24000000000, 12000000000, 12000000000, 0, 12000000000, '2026-10-29')
  `).run(invKpId, supKemasId);

  // Additional 24 simulated open invoices to complete the 27 open invoices KPI matching 05-finance.png
  // Outstanding: Rp1.28B (128,000,000,000 minor)
  // Overdue: Rp210M (6 invoices past due)
  // Scheduled: Rp420M (Next 7 days)
  // Held: 4 invoices (Rp84M held amount)
  // Let's seed background rows so live SQL queries match these exact figures!
  const additionalInvoices = [
    // 3 extra held invoices (with invSpId making total 4 held invoices with Rp84M held total: 4M + 20M + 30M + 30M = 84M)
    { id: "inv_bg_h1", num: "INV-SUP-1010-001", sup: supPanganId, total: 5000000000, paid: 1000000000, out: 4000000000, held: 2000000000, due: "2026-11-15", status: "HELD" },
    { id: "inv_bg_h2", num: "INV-SUP-1012-002", sup: supKssId, total: 6000000000, paid: 0, out: 6000000000, held: 3000000000, due: "2026-11-20", status: "HELD" },
    { id: "inv_bg_h3", num: "INV-SUP-1015-003", sup: supKemasId, total: 4000000000, paid: 0, out: 4000000000, held: 3000000000, due: "2026-11-25", status: "HELD" },
    // 6 overdue invoices (Total overdue Rp210M = 21,000,000,000 minor)
    { id: "inv_bg_od1", num: "INV-SUP-0910-004", sup: supPanganId, total: 4000000000, paid: 0, out: 4000000000, held: 0, due: "2026-10-10", status: "POSTED" },
    { id: "inv_bg_od2", num: "INV-SUP-0915-005", sup: supKssId, total: 3500000000, paid: 0, out: 3500000000, held: 0, due: "2026-10-15", status: "POSTED" },
    { id: "inv_bg_od3", num: "INV-SUP-0920-006", sup: supKemasId, total: 3500000000, paid: 0, out: 3500000000, held: 0, due: "2026-10-20", status: "POSTED" },
    { id: "inv_bg_od4", num: "INV-SUP-0922-007", sup: supPanganId, total: 3000000000, paid: 0, out: 3000000000, held: 0, due: "2026-10-22", status: "POSTED" },
    { id: "inv_bg_od5", num: "INV-SUP-0925-008", sup: supKssId, total: 3500000000, paid: 0, out: 3500000000, held: 0, due: "2026-10-25", status: "POSTED" },
    { id: "inv_bg_od6", num: "INV-SUP-0927-009", sup: supKemasId, total: 3500000000, paid: 0, out: 3500000000, held: 0, due: "2026-10-27", status: "POSTED" },
    // Scheduled payments within next 7 days (Total scheduled Rp420M = 42,000,000,000 minor)
    { id: "inv_bg_sc1", num: "INV-SUP-1025-010", sup: supPanganId, total: 15000000000, paid: 0, out: 15000000000, held: 0, due: "2026-10-31", status: "POSTED" },
    { id: "inv_bg_sc2", num: "INV-SUP-1026-011", sup: supKssId, total: 15000000000, paid: 0, out: 15000000000, held: 0, due: "2026-11-02", status: "POSTED" },
    { id: "inv_bg_sc3", num: "INV-SUP-1027-012", sup: supKemasId, total: 12000000000, paid: 0, out: 12000000000, held: 0, due: "2026-11-04", status: "POSTED" },
    // Remaining regular open invoices to bring total open to 27 and total outstanding to Rp1.28B
    { id: "inv_bg_rg1", num: "INV-SUP-1020-013", sup: supPanganId, total: 5000000000, paid: 0, out: 5000000000, held: 0, due: "2026-11-18", status: "POSTED" },
    { id: "inv_bg_rg2", num: "INV-SUP-1020-014", sup: supKssId, total: 5000000000, paid: 0, out: 5000000000, held: 0, due: "2026-11-19", status: "POSTED" },
    { id: "inv_bg_rg3", num: "INV-SUP-1021-015", sup: supKemasId, total: 5000000000, paid: 0, out: 5000000000, held: 0, due: "2026-11-20", status: "POSTED" },
    { id: "inv_bg_rg4", num: "INV-SUP-1021-016", sup: supPanganId, total: 3000000000, paid: 0, out: 3000000000, held: 0, due: "2026-11-21", status: "POSTED" },
    { id: "inv_bg_rg5", num: "INV-SUP-1022-017", sup: supKssId, total: 3000000000, paid: 0, out: 3000000000, held: 0, due: "2026-11-22", status: "POSTED" },
    { id: "inv_bg_rg6", num: "INV-SUP-1022-018", sup: supKemasId, total: 2000000000, paid: 0, out: 2000000000, held: 0, due: "2026-11-23", status: "POSTED" },
    { id: "inv_bg_rg7", num: "INV-SUP-1023-019", sup: supPanganId, total: 2000000000, paid: 0, out: 2000000000, held: 0, due: "2026-11-24", status: "POSTED" },
    { id: "inv_bg_rg8", num: "INV-SUP-1023-020", sup: supKssId, total: 2000000000, paid: 0, out: 2000000000, held: 0, due: "2026-11-25", status: "POSTED" },
    { id: "inv_bg_rg9", num: "INV-SUP-1024-021", sup: supKemasId, total: 2000000000, paid: 0, out: 2000000000, held: 0, due: "2026-11-26", status: "POSTED" },
    { id: "inv_bg_rg10", num: "INV-SUP-1024-022", sup: supPanganId, total: 1000000000, paid: 0, out: 1000000000, held: 0, due: "2026-11-27", status: "POSTED" },
    { id: "inv_bg_rg11", num: "INV-SUP-1025-023", sup: supKssId, total: 1000000000, paid: 0, out: 1000000000, held: 0, due: "2026-11-28", status: "POSTED" },
    { id: "inv_bg_rg12", num: "INV-SUP-1025-024", sup: supKemasId, total: 1000000000, paid: 0, out: 1000000000, held: 0, due: "2026-11-29", status: "POSTED" },
  ];

  for (const inv of additionalInvoices) {
    sql.prepare(`
      INSERT OR REPLACE INTO invoices (
        id, number, supplier_id, supplier_invoice_number, purchase_order_id, receipt_ids,
        issued_on, due_on, total, status, version, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'po_auto', '[]', '2026-10-15', ?, ?, ?, 1, 'usr_ap', ?, ?)
    `).run(inv.id, inv.num, inv.sup, inv.num, inv.due, inv.total, inv.status, now, now);

    sql.prepare(`
      INSERT OR REPLACE INTO payable_balances (
        invoice_id, supplier_id, recognized, paid, outstanding, held, eligible_unpaid, as_of
      ) VALUES (?, ?, ?, ?, ?, ?, ?, '2026-10-29')
    `).run(inv.id, inv.sup, inv.total, inv.paid, inv.out, inv.held, inv.out - inv.held);
  }

  // 4. Initial Journal Entry (Opening Balance / AP Recognition)
  sql.prepare(`
    INSERT OR REPLACE INTO journal_entries (
      id, number, posting_date, status, posted_by, posted_at, description, version, created_by, created_at, updated_at
    ) VALUES (?, 'JRN-261029-0001', '2026-10-29', 'POSTED', 'usr_accounting', '2026-10-29T10:00:00.000Z', 'Initial Recognition of Inbound Milk Powder & AP', 1, 'usr_accounting', ?, ?)
  `).run(jrnId, now, now);

  sql.prepare("DELETE FROM journal_lines WHERE journal_id = ?").run(jrnId);
  const insertJrnLine = sql.prepare(
    "INSERT INTO journal_lines (id, journal_id, account_id, debit, credit, description, document_type, document_id, document_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  // Debit 1103 Inventory Raw Materials Rp156M (15,600,000,000 minor)
  insertJrnLine.run("jnl_001", jrnId, "acc_1103", 15600000000, 0, "Inventory receipt 7,800 kg accepted milk powder", "INV", invSpId, "INV-SP-1028-087");
  // Debit 1101 Claims / Discrepancy Suspense (or Accrued) Rp4M (400,000,000 minor)
  insertJrnLine.run("jnl_002", jrnId, "acc_5202", 400000000, 0, "Pending credit note for 200 kg rejected milk powder", "INV", invSpId, "INV-SP-1028-087");
  // Credit 2101 Accounts Payable Rp160M (16,000,000,000 minor)
  insertJrnLine.run("jnl_003", jrnId, "acc_2101", 0, 16000000000, "Trade AP recognized PT Sumber Pangan", "INV", invSpId, "INV-SP-1028-087");

  // 5. Seed Revenue Cycle Data
  // Customers
  const customers = [
    {
      id: "cust_indofood",
      code: "CUST-001",
      name: "PT Indofood Sukses Makmur Tbk",
      email: "finance@indofood.co.id",
      phone: "+62 21 5795 8822",
      address: "Sudirman Plaza, Indofood Tower 27th Fl, Jakarta",
      taxId: "01.324.567.8-012.000",
      creditLimit: 50000000000, // Rp500M
      creditTermsDays: 30,
      creditStatus: "ACTIVE",
    },
    {
      id: "cust_mayora",
      code: "CUST-002",
      name: "PT Mayora Indah Tbk",
      email: "accounting@mayora.co.id",
      phone: "+62 21 8063 7000",
      address: "Gedung Mayora, Jl. Tomang Raya No. 21-23, Jakarta Barat",
      taxId: "01.888.777.6-045.000",
      creditLimit: 30000000000, // Rp300M
      creditTermsDays: 30,
      creditStatus: "ACTIVE",
    },
    {
      id: "cust_ultra_prima",
      code: "CUST-003",
      name: "PT Ultra Prima Abadi",
      email: "finance@ot.id",
      phone: "+62 21 5839 7888",
      address: "OT Building, Jl. Lingkar Luar Barat No. 1, Jakarta Barat",
      taxId: "02.123.456.7-089.000",
      creditLimit: 20000000000, // Rp200M
      creditTermsDays: 14,
      creditStatus: "PENDING_REVIEW",
    },
    {
      id: "cust_garuda",
      code: "CUST-004",
      name: "PT Garuda Food Putra Putri Jaya",
      email: "ar@garudafood.co.id",
      phone: "+62 21 7289 7000",
      address: "Jl. Bintaro Raya No. 10A, Jakarta Selatan",
      taxId: "01.999.888.1-011.000",
      creditLimit: 40000000000, // Rp400M
      creditTermsDays: 45,
      creditStatus: "ACTIVE",
    },
  ];

  const insertCust = sql.prepare(`
    INSERT OR REPLACE INTO ar_customers (
      id, code, name, email, phone, address, tax_id, credit_limit, credit_terms_days,
      credit_status, active, version, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'usr_sales_admin', ?, ?)
  `);

  for (const c of customers) {
    insertCust.run(c.id, c.code, c.name, c.email, c.phone, c.address, c.taxId, c.creditLimit, c.creditTermsDays, c.creditStatus, now, now);
  }

  // Credit Decisions
  sql.prepare(`
    INSERT OR REPLACE INTO ar_credit_decisions (
      id, customer_id, decision_type, limit_amount, reason, decided_by, decided_at, created_at
    ) VALUES
    ('cdec_001', 'cust_indofood', 'SET_LIMIT', 50000000000, 'Tier 1 strategic FMCG account, approved standard limit Rp500M.', 'usr_credit_manager', '2026-10-20T09:00:00.000Z', ?),
    ('cdec_002', 'cust_mayora', 'SET_LIMIT', 30000000000, 'Established customer, good payment history, approved Rp300M.', 'usr_credit_manager', '2026-10-21T10:00:00.000Z', ?)
  `).run(now, now);

  // Sales Orders
  // SO-261028-0001 (Indofood) - Delivered & Invoiced
  sql.prepare(`
    INSERT OR REPLACE INTO sales_orders (
      id, number, customer_id, customer_name, warehouse_id, status, credit_status,
      total_minor, ordered_at, created_at
    ) VALUES ('so_261028_0001', 'SO-261028-0001', 'cust_indofood', 'PT Indofood Sukses Makmur Tbk', 'wh_bandung_rm', 'COMPLETED', 'APPROVED', 11000000000, '2026-10-28', ?)
  `).run(now);

  sql.prepare(`
    INSERT OR REPLACE INTO sales_order_finance (
      sales_order_id, discount_rate, discount_amount, subtotal, tax_amount, special_discount_approved,
      special_discount_approved_by, credit_approved, credit_approved_by, credit_approved_at,
      credit_exposure_at_approval, updated_at
    ) VALUES ('so_261028_0001', 3.0, 300000000, 10000000000, 1000000000, 1, 'usr_sales_admin', 1, 'usr_credit_manager', '2026-10-28T11:00:00.000Z', 11000000000, ?)
  `).run(now);

  sql.prepare("DELETE FROM sales_order_lines WHERE sales_order_id = 'so_261028_0001'").run();
  sql.prepare(`
    INSERT INTO sales_order_lines (id, sales_order_id, material_id, quantity, reserved_quantity, dispatched_quantity, unit, unit_price_minor)
    VALUES ('sol_001_1', 'so_261028_0001', 'mat_fresh_milk', '4000', '0', '4000', 'L', 2500000)
  `).run();

  // SO-261029-0002 (Mayora) - Draft with special discount (8% > 5%) awaiting FAM authorization
  sql.prepare(`
    INSERT OR REPLACE INTO sales_orders (
      id, number, customer_id, customer_name, warehouse_id, status, credit_status,
      total_minor, ordered_at, created_at
    ) VALUES ('so_261029_0002', 'SO-261029-0002', 'cust_mayora', 'PT Mayora Indah Tbk', 'wh_bandung_rm', 'DRAFT', 'PENDING', 8800000000, '2026-10-29', ?)
  `).run(now);

  sql.prepare(`
    INSERT OR REPLACE INTO sales_order_finance (
      sales_order_id, discount_rate, discount_amount, subtotal, tax_amount, special_discount_approved,
      special_discount_approved_by, credit_approved, credit_approved_by, credit_approved_at,
      credit_exposure_at_approval, updated_at
    ) VALUES ('so_261029_0002', 8.0, 800000000, 8000000000, 800000000, 0, NULL, 0, NULL, NULL, 0, ?)
  `).run(now);

  sql.prepare("DELETE FROM sales_order_lines WHERE sales_order_id = 'so_261029_0002'").run();
  sql.prepare(`
    INSERT INTO sales_order_lines (id, sales_order_id, material_id, quantity, reserved_quantity, dispatched_quantity, unit, unit_price_minor)
    VALUES ('sol_002_1', 'so_261029_0002', 'mat_fresh_milk', '3200', '3200', '0', 'L', 2500000)
  `).run();

  // Delivery Order with signed DO evidence for SO-261028-0001
  sql.prepare(`
    INSERT OR REPLACE INTO delivery_orders (
      id, number, sales_order_id, warehouse_id, carrier_3pl, tracking_number, driver_name,
      vehicle_number, status, dispatched_at, delivered_at, created_by, created_at, updated_at, version
    ) VALUES (
      'do_261028_0015', 'DO-261028-0015', 'so_261028_0001', 'wh_bandung_rm', 'Internal Fleet', 'TRK-BDG-091',
      'Hendra Setiawan', 'B 9281 UJ', 'DELIVERED', '2026-10-28T13:00:00.000Z', '2026-10-28T16:00:00.000Z',
      'usr_warehouse', ?, ?, 1
    )
  `).run(now, now);

  // Customer AR Invoice for SO-261028-0001: Total Rp110M, Paid Rp50M, Outstanding Rp60M
  sql.prepare(`
    INSERT OR REPLACE INTO ar_invoices (
      id, number, customer_id, sales_order_id, delivery_order_id, issued_on, due_on,
      subtotal, tax_amount, total, paid_amount, outstanding_balance, status, e_faktur_number,
      e_faktur_status, version, created_by, created_at, updated_at
    ) VALUES (
      'arinv_261028_0001', 'INV-AR-261028-0001', 'cust_indofood', 'so_261028_0001', 'do_261028_0015',
      '2026-10-28', '2026-11-27', 10000000000, 1000000000, 11000000000, 5000000000, 6000000000,
      'PARTIALLY_PAID', '010.001-26.00000088', 'SIMULATED', 1, 'usr_ar', ?, ?
    )
  `).run(now, now);

  sql.prepare("DELETE FROM ar_invoice_lines WHERE ar_invoice_id = 'arinv_261028_0001'").run();
  sql.prepare(`
    INSERT INTO ar_invoice_lines (id, ar_invoice_id, sales_order_line_id, description, quantity, unit, unit_price, total)
    VALUES ('arinvl_001', 'arinv_261028_0001', 'sol_001_1', 'Fresh Milk Pasteurized 4,000 L', '4000', 'L', 2500000, 10000000000)
  `).run();

  // Customer Receipt for Indofood: Rp50M allocated to INV-AR-261028-0001
  sql.prepare(`
    INSERT OR REPLACE INTO ar_receipts (
      id, number, customer_id, received_on, bank_reference, payment_method, amount,
      allocated_amount, unallocated_amount, status, bank_evidence_ref, treasury_validated_by,
      treasury_validated_at, version, created_by, created_at, updated_at
    ) VALUES (
      'rcpt_261029_0001', 'RCPT-261029-0001', 'cust_indofood', '2026-10-29', 'MANDIRI-IN-98124',
      'BANK_TRANSFER', 5000000000, 5000000000, 0, 'SETTLED', 'ATTACH-SLIP-98124.pdf',
      'usr_treasury', '2026-10-29T10:15:00.000Z', 1, 'usr_ar', ?, ?
    )
  `).run(now, now);

  sql.prepare("DELETE FROM ar_receipt_allocations WHERE receipt_id = 'rcpt_261029_0001'").run();
  sql.prepare(`
    INSERT INTO ar_receipt_allocations (id, receipt_id, ar_invoice_id, amount, created_at)
    VALUES ('ar_alloc_001', 'rcpt_261029_0001', 'arinv_261028_0001', 5000000000, ?)
  `).run(now);

  // Return Claim: Customer Indofood, status AUTHORIZED
  sql.prepare(`
    INSERT OR REPLACE INTO return_claims (
      id, number, customer_id, customer_name, sales_order_id, delivery_order_id, material_id,
      claimed_quantity, unit, reason, status, created_at
    ) VALUES (
      'ret_261029_0001', 'RET-261029-0001', 'cust_indofood', 'PT Indofood Sukses Makmur Tbk',
      'so_261028_0001', 'do_261028_0015', 'mat_fresh_milk', '100', 'L',
      'Minor seal leakage identified upon delivery reception.', 'AUTHORIZED', ?
    )
  `).run(now);

  sql.prepare(`
    INSERT OR REPLACE INTO return_claim_finance (
      return_claim_id, ar_invoice_id, completeness_checked, completeness_checked_by, completeness_checked_at,
      fam_authorized, fam_authorized_by, fam_authorized_at, credit_note_id, credit_amount, updated_at
    ) VALUES (
      'ret_261029_0001', 'arinv_261028_0001', 1, 'usr_sales_admin', '2026-10-29T10:30:00.000Z',
      1, 'usr_fam', '2026-10-29T11:00:00.000Z', 'cn_261029_0001', 250000000, ?
    )
  `).run(now);

  // Credit Note issued for Return Claim: Rp2,500,000 (250,000,000 minor)
  sql.prepare(`
    INSERT OR REPLACE INTO ar_credit_notes (
      id, number, customer_id, return_claim_id, ar_invoice_id, amount, status, issued_by, issued_at, created_at
    ) VALUES (
      'cn_261029_0001', 'CN-261029-0001', 'cust_indofood', 'ret_261029_0001', 'arinv_261028_0001',
      250000000, 'ISSUED', 'usr_ar', '2026-10-29T11:15:00.000Z', ?
    )
  `).run(now);

  // Bad-Debt Write-Off Request: Ultra Prima Abadi Rp15M (1,500,000,000 minor)
  sql.prepare(`
    INSERT OR REPLACE INTO ar_write_off_requests (
      id, number, customer_id, ar_invoice_id, amount, reason, submitted_by, submitted_at,
      fam_authorized, fam_authorized_by, fam_authorized_at, journal_id, status, created_at, updated_at
    ) VALUES (
      'wro_261029_0001', 'WRO-261029-0001', 'cust_ultra_prima', 'arinv_261028_0001', 1500000000,
      'Customer dispute pending resolution over 180 days; provision approved.', 'usr_ar', '2026-10-29T08:00:00.000Z',
      0, NULL, NULL, NULL, 'PENDING', ?, ?
    )
  `).run(now, now);

  // Bank Reconciliation: October 2026
  sql.prepare(`
    INSERT OR REPLACE INTO bank_reconciliations (
      id, period_month, statement_balance, book_balance, unreconciled_difference, status,
      prepared_by, prepared_at, notes, version, created_at, updated_at
    ) VALUES (
      'rec_2026_10', '2026-10', 185000000000, 185000000000, 0, 'PREPARED',
      'usr_accounting', '2026-10-29T12:00:00.000Z',
      'October 2026 BCA Operational account reconciliation prepared with zero variance.', 1, ?, ?
    )
  `).run(now, now);

  sql.prepare("DELETE FROM bank_reconciliation_items WHERE reconciliation_id = 'rec_2026_10'").run();
  const insertRecItem = sql.prepare(`
    INSERT INTO bank_reconciliation_items (
      id, reconciliation_id, transaction_type, reference, amount, matched, details, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertRecItem.run("rec_item_1", "rec_2026_10", "PAYMENT", "TRX-BCA-882910", 6000000000, 1, "Supplier Payment PT Sumber Pangan", now);
  insertRecItem.run("rec_item_2", "rec_2026_10", "RECEIPT", "MANDIRI-IN-98124", 5000000000, 1, "Customer Inbound PT Indofood", now);
  insertRecItem.run("rec_item_3", "rec_2026_10", "BANK_FEE", "FEE-OCT-2026", 25000000, 1, "Monthly Account Administration Fee", now);

  // Reserve sequence counter floors so nextDocumentNumber doesn't collide with seeded fixtures
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (kind: string) => parts.find((p) => p.type === kind)!.value;
  const day = `${get("year")}${get("month")}${get("day")}`;

  const reserveFloor = sql.prepare(`
    INSERT INTO document_counters (document_type, local_day, sequence)
    VALUES (?, ?, ?)
    ON CONFLICT(document_type, local_day) DO UPDATE SET sequence = MAX(sequence, excluded.sequence)
  `);

  reserveFloor.run("JRN", day, 10);
  reserveFloor.run("INV", day, 100);
  reserveFloor.run("PAY", day, 50);
  reserveFloor.run("SO", day, 10);
  reserveFloor.run("DO", day, 20);
  reserveFloor.run("CINV", day, 10);
  reserveFloor.run("RCPT", day, 10);
  reserveFloor.run("RET", day, 10);
  reserveFloor.run("CN", day, 10);
  reserveFloor.run("WROFF", day, 10);
}
