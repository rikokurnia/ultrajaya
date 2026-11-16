import { test, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = mkdtempSync(join(tmpdir(), "ultraops-finance-"));
process.env.DATABASE_PATH = join(directory, "finance-test.sqlite");

import { migrate } from "../scripts/migrate";
import { db } from "../src/server/db";
import { hashPassword } from "../src/server/auth-service";
import { ROLES } from "../src/shared/contracts/auth";
import { FIXTURE_IDS } from "../src/shared/fixtures";
import { FinanceService } from "../src/features/finance/server/finance-service";
import { seedProcurement } from "../src/features/procurement/seed";
import { seedInventory } from "../src/features/inventory/server/seed";
import { seedFinance } from "../src/features/finance/server/seed";
import { AccessError } from "../src/lib/auth/permissions";

// Initialize test database
migrate();
const now = new Date().toISOString();
for (const role of ROLES) {
  db()
    .prepare("INSERT OR REPLACE INTO users VALUES (?,?,?,?,?,1,?,?)")
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
seedInventory(db());
seedFinance();

const ap = { id: "usr_ap", role: "AP" as const };
const treasury = { id: "usr_treasury", role: "TREASURY" as const };
const accounting = { id: "usr_accounting", role: "ACCOUNTING" as const };
const approver = { id: "usr_approver", role: "APPROVER" as const };
const salesAdmin = { id: "usr_sales_admin", role: "SALES_ADMIN" as const };
const creditManager = { id: "usr_credit_manager", role: "CREDIT_MANAGER" as const };
const ar = { id: "usr_ar", role: "AR" as const };
const fam = { id: "usr_fam", role: "FAM" as const };
const auditor = { id: "usr_auditor", role: "AUDITOR" as const };

const service = new FinanceService();

after(() => {
  db().close();
  rmSync(directory, { recursive: true, force: true });
});

test("duplicate supplier invoice rejection enforces unique supplier + invoice number", async () => {
  const context = { actor: ap, expectedVersion: 1, idempotencyKey: "test_dup_1" };

  // First creation of test supplier invoice
  const inv = await service.recordInvoice(context, {
    supplierId: "sup_sumber_pangan",
    supplierInvoiceNumber: "INV-DUP-TEST-001",
    purchaseOrderId: "po_test_001",
    issuedOn: "2026-10-29",
    dueOn: "2026-11-29",
    lines: [
      {
        purchaseOrderLineId: "pol_test_01",
        materialId: "mat_milk_powder",
        quantity: "100",
        unit: "kg",
        unitPrice: 2000000, // Rp20,000/kg
      },
    ],
  });

  assert.ok(inv.id);
  assert.equal(inv.supplierInvoiceNumber, "INV-DUP-TEST-001");

  // Attempt duplicate registration with same supplier and normalized number
  await assert.rejects(
    async () => {
      await service.recordInvoice(context, {
        supplierId: "sup_sumber_pangan",
        supplierInvoiceNumber: "inv-dup-test-001", // lowercase variant
        purchaseOrderId: "po_test_002",
        issuedOn: "2026-10-29",
        dueOn: "2026-11-29",
        lines: [
          {
            purchaseOrderLineId: "pol_test_02",
            materialId: "mat_milk_powder",
            quantity: "50",
            unit: "kg",
            unitPrice: 2000000,
          },
        ],
      });
    },
    /Duplicate invoice rejected/,
  );
});

test("3-way matching detects discrepancies and prevents receipt quantity double-billing", async () => {
  const context = { actor: ap, expectedVersion: 1, idempotencyKey: "test_match_1" };

  // Canonical fixture invoice: billed 8,000 kg, but only 7,800 kg accepted (200 kg discrepancy)
  const matchResult = await service.matchInvoice(context, FIXTURE_IDS.documents.invoice);

  assert.equal(matchResult.status, "HELD");
  assert.equal(matchResult.eligible, 15600000000); // Rp156M
  assert.equal(matchResult.held, 400000000); // Rp4M held discrepancy
  assert.ok(matchResult.checks.some((c) => c.code === "QC_ACCEPTED_QTY" && c.outcome === "HOLD"));

  // Check payable balance is updated with held amount
  const payables = await service.getPayables(ap, { supplierId: "sup_sumber_pangan" });
  const pb = payables.items.find((p) => p.invoiceId === FIXTURE_IDS.documents.invoice);
  assert.ok(pb);
  assert.equal(pb.recognized, 16000000000);
  assert.equal(pb.held, 400000000);
  assert.equal(pb.outstanding, 10000000000);
  assert.equal(pb.eligibleUnpaid, 9600000000);
});

test("held-payment rejection blocks new payments under Invariant 6", async () => {
  const context = { actor: treasury, expectedVersion: 1, idempotencyKey: "test_held_pay_1" };

  // Attempt to record payment against canonical held invoice INV-SP-1028-087
  await assert.rejects(
    async () => {
      await service.recordPayment(context, {
        paidOn: "2026-10-29T10:00:00Z",
        bankReference: "BCA-ILLEGAL-01",
        method: "BANK_TRANSFER",
        amount: 1000000000, // Rp10M
        allocations: [{ invoiceId: FIXTURE_IDS.documents.invoice, amount: 1000000000 }],
      });
    },
    /held invoices are strictly blocked from receiving new payments/i,
  );
});

test("partial payment allocations and overpayment prevention for eligible invoices", async () => {
  const context = { actor: treasury, expectedVersion: 1, idempotencyKey: "test_partial_pay_1" };

  // INV-KSS-1027-041 has Rp360M outstanding and Matched status
  const invKssId = "inv_kss_1027_041";

  // 1. Partial payment of Rp100M
  const payment = await service.recordPayment(context, {
    paidOn: "2026-10-29T11:00:00Z",
    bankReference: "BCA-TRX-KSS-100",
    method: "BANK_TRANSFER",
    amount: 10000000000, // Rp100M
    allocations: [{ invoiceId: invKssId, amount: 10000000000 }],
  });

  assert.ok(payment.id);
  assert.equal(payment.status, "POSTED");

  // Check updated payable balance
  const payables = await service.getPayables(treasury);
  const pb = payables.items.find((p) => p.invoiceId === invKssId);
  assert.ok(pb);
  assert.equal(pb.paid, 10000000000); // Rp100M paid
  assert.equal(pb.outstanding, 26000000000); // Rp260M remaining

  // 2. Overpayment attempt: trying to pay Rp300M when only Rp260M remains
  await assert.rejects(
    async () => {
      await service.recordPayment(
        { actor: treasury, expectedVersion: 1, idempotencyKey: "test_overpay_attempt" },
        {
          paidOn: "2026-10-29T11:30:00Z",
          bankReference: "BCA-OVERPAY",
          method: "BANK_TRANSFER",
          amount: 30000000000,
          allocations: [{ invoiceId: invKssId, amount: 30000000000 }],
        },
      );
    },
    /Over-allocation rejected/,
  );
});

test("payment replay prevention via idempotency key and traceable reversal", async () => {
  const idempotencyKey = "replay_prevention_key_001";
  const context = { actor: treasury, expectedVersion: 1, idempotencyKey };

  // Initial payment
  const p1 = await service.recordPayment(context, {
    paidOn: "2026-10-29T12:00:00Z",
    bankReference: "BCA-REPLAY-01",
    method: "BANK_TRANSFER",
    amount: 5000000000, // Rp50M
    allocations: [{ invoiceId: "inv_kp_1028_066", amount: 5000000000 }],
  });

  // Replay attempt with same idempotency key returns original payment without double charging
  const p2 = await service.recordPayment(context, {
    paidOn: "2026-10-29T12:00:00Z",
    bankReference: "BCA-REPLAY-01",
    method: "BANK_TRANSFER",
    amount: 5000000000,
    allocations: [{ invoiceId: "inv_kp_1028_066", amount: 5000000000 }],
  });

  assert.equal(p1.id, p2.id);

  // Traceable payment reversal
  const reversal = await service.reversePayment(
    { actor: treasury, expectedVersion: 1, idempotencyKey: "rev_key_01" },
    p1.id,
    "Bank transfer cancelled due to account discrepancy",
  );

  assert.equal(reversal.status, "REVERSED");
  assert.equal(reversal.reversalOf, p1.id);
});

test("balanced journal entries, posting authorization, and reversal", async () => {
  const context = { actor: accounting, expectedVersion: 1, idempotencyKey: "jrn_test_1" };

  // 1. Unbalanced entry attempt (Debits 100M != Credits 80M) rejected
  await assert.rejects(
    async () => {
      await service.recordJournal(context, {
        postingDate: "2026-10-29",
        description: "Unbalanced test",
        lines: [
          { accountId: "acc_1101", debit: 10000000000, credit: 0, description: "Bank" },
          { accountId: "acc_4101", debit: 0, credit: 8000000000, description: "Revenue" },
        ],
      });
    },
    /Unbalanced journal entry rejected/,
  );

  // 2. Balanced entry: Debits 50M == Credits 50M
  const jrn = await service.recordJournal(context, {
    postingDate: "2026-10-29",
    description: "Operational office expense",
    lines: [
      { accountId: "acc_5101", debit: 5000000000, credit: 0, description: "COGS Expense" },
      { accountId: "acc_1101", debit: 0, credit: 5000000000, description: "Cash BCA" },
    ],
  });

  assert.equal(jrn.status, "DRAFT");

  // 3. Review and Post
  await service.reviewJournal(context, jrn.id);
  const posted = await service.postJournal(context, jrn.id);
  assert.equal(posted.status, "POSTED");

  // 4. Traceable Reversal creates reversing journal with swapped debits and credits
  const reversal = await service.reverseJournal(context, jrn.id, "Accounting correction");
  assert.equal(reversal.status, "POSTED");
  assert.equal(reversal.reversalOf, jrn.id);
});

test("customer credit limit & exposure calculation prevents over-exposure without double counting", async () => {
  const context = { actor: salesAdmin, expectedVersion: 1, idempotencyKey: "so_credit_1" };

  // Indofood has credit limit Rp500M (50,000,000,000 minor)
  // Current outstanding invoice is Rp60M.
  // Order of Rp300M should succeed.
  const so1 = await service.createSalesOrder(context, {
    customerId: "cust_indofood",
    orderDate: "2026-10-29",
    discountRate: 3.0, // standard discount <= 5%
    lines: [
      {
        materialId: "mat_fresh_milk",
        quantity: "10000",
        unit: "L",
        unitPrice: 2500000, // Rp25,000/L -> Rp250M
      },
    ],
  });

  assert.ok(so1.id);
  assert.equal(so1.specialDiscountApproved, true); // approved automatically because <= 5%

  // Credit Manager approves order
  await service.verifyStockAndApproveCredit(
    { actor: creditManager, expectedVersion: 1, idempotencyKey: "capp_1" },
    so1.id,
  );

  // Attempt massive order exceeding remaining credit limit
  const soExcess = await service.createSalesOrder(context, {
    customerId: "cust_indofood",
    orderDate: "2026-10-29",
    discountRate: 2.0,
    lines: [
      {
        materialId: "mat_fresh_milk",
        quantity: "30000",
        unit: "L",
        unitPrice: 2500000, // Rp750M (exceeds Rp500M credit limit!)
      },
    ],
  });

  // Credit approval should be rejected due to limit breach
  await assert.rejects(
    async () => {
      await service.verifyStockAndApproveCredit(
        { actor: creditManager, expectedVersion: 1, idempotencyKey: "capp_excess" },
        soExcess.id,
      );
    },
    /Credit limit exceeded/,
  );
});

test("special discount authority requires FAM authorization for discounts > 5%", async () => {
  const context = { actor: salesAdmin, expectedVersion: 1, idempotencyKey: "so_disc_1" };

  // Sales Order with 10% discount (> 5% threshold)
  const so = await service.createSalesOrder(context, {
    customerId: "cust_mayora",
    orderDate: "2026-10-29",
    discountRate: 10.0,
    lines: [
      {
        materialId: "mat_fresh_milk",
        quantity: "1000",
        unit: "L",
        unitPrice: 2500000,
      },
    ],
  });

  assert.equal(so.specialDiscountApproved, false);

  // Credit approval cannot proceed without FAM discount approval
  await assert.rejects(
    async () => {
      await service.verifyStockAndApproveCredit(
        { actor: creditManager, expectedVersion: 1, idempotencyKey: "capp_fam_fail" },
        so.id,
      );
    },
    /Special discount \(10%\) requires FAM authorization first/,
  );

  // FAM authorizes discount
  await service.authorizeSpecialDiscount(
    { actor: fam, expectedVersion: 1, idempotencyKey: "fam_auth_1" },
    so.id,
    true,
  );

  // Now credit approval succeeds
  await assert.doesNotThrow(async () => {
    await service.verifyStockAndApproveCredit(
      { actor: creditManager, expectedVersion: 1, idempotencyKey: "capp_fam_ok" },
      so.id,
    );
  });
});

test("signed DO prerequisite enforced before AR customer invoice issuance", async () => {
  const context = { actor: ar, expectedVersion: 1, idempotencyKey: "ar_inv_do_1" };

  // Attempt to issue invoice for undelivered DO throws error
  const fakeUndeliveredDo = "do_fake_undelivered";
  db().prepare(`
    INSERT INTO delivery_orders (id, number, sales_order_id, warehouse_id, carrier_3pl, status, created_by, created_at, updated_at)
    VALUES (?, 'DO-TEST-UNDELIVERED', 'so_261028_0001', 'wh_bandung_rm', 'JNE', 'PICKED', 'usr_warehouse', ?, ?)
  `).run(fakeUndeliveredDo, now, now);

  await assert.rejects(
    async () => {
      await service.issueCustomerInvoice(context, {
        salesOrderId: "so_261028_0001",
        deliveryOrderId: fakeUndeliveredDo,
        issuedOn: "2026-10-29",
        dueOn: "2026-11-29",
      });
    },
    /Proof of delivery \(status DELIVERED with signed DO\) is required prior to invoicing/,
  );

  // For delivered DO (do_261028_0015), issuance succeeds and generates simulated e-Faktur
  const cinv = await service.issueCustomerInvoice(context, {
    salesOrderId: "so_261028_0001",
    deliveryOrderId: "do_261028_0015",
    issuedOn: "2026-10-29",
    dueOn: "2026-11-29",
  });

  assert.ok(cinv.id);
  assert.equal(cinv.status, "ISSUED");
  assert.equal(cinv.eFakturStatus, "SIMULATED");
  assert.ok(cinv.eFakturNumber?.startsWith("010.001-26."));
});

test("incoming customer payment requires Treasury validation before settlement", async () => {
  const arContext = { actor: ar, expectedVersion: 1, idempotencyKey: "ar_rcpt_1" };
  const treasuryContext = { actor: treasury, expectedVersion: 1, idempotencyKey: "tr_settle_1" };

  // AR records incoming payment evidence
  const rcpt = await service.recordCustomerReceipt(arContext, {
    customerId: "cust_indofood",
    receivedOn: "2026-10-29",
    bankReference: "BCA-IN-99221",
    paymentMethod: "BANK_TRANSFER",
    amount: 10000000000, // Rp100M
    bankEvidenceRef: "SLIP-BCA-99221.pdf",
    allocations: [{ invoiceId: "arinv_261028_0001", amount: 1000000000 }], // Rp10M
  });

  assert.equal(rcpt.status, "RECORDED");

  // Treasury validates bank evidence and finalizes settlement
  await service.validateAndSettleReceipt(treasuryContext, rcpt.id);

  // Verify settlement persistence
  const receipts = await service.getCustomerReceipts(ar);
  const settled = receipts.find((r) => r.id === rcpt.id);
  assert.ok(settled);
  assert.equal(settled.status, "SETTLED");
  assert.equal(settled.treasuryValidatedBy, "usr_treasury");
});

test("return claim completeness, inspection, FAM authorization and Credit Note limit", async () => {
  const claimId = "ret_261029_0001";

  // 1. Sales Admin checks claim completeness
  await service.verifyReturnClaimCompleteness(
    { actor: salesAdmin, expectedVersion: 1, idempotencyKey: "ret_comp_1" },
    claimId,
  );

  // 2. FAM authorizes claim amount
  await service.authorizeReturnClaim(
    { actor: fam, expectedVersion: 1, idempotencyKey: "ret_auth_1" },
    claimId,
    250000000, // Rp2.5M
  );

  // 3. AR issues Credit Note
  const cn = await service.issueCreditNote(
    { actor: ar, expectedVersion: 1, idempotencyKey: "ret_cn_1" },
    claimId,
  );

  assert.ok(cn.id);
  assert.equal(cn.status, "ISSUED");
  assert.equal(cn.amount, 250000000);
});

test("bad-debt write-off workflow: AR submits, FAM authorizes, Accounting records GL journal", async () => {
  // 1. AR submits write-off request
  const wro = await service.submitWriteOffRequest(
    { actor: ar, expectedVersion: 1, idempotencyKey: "wro_sub_1" },
    {
      customerId: "cust_ultra_prima",
      invoiceId: "arinv_261028_0001",
      amount: 5000000000, // Rp50M
      reason: "Customer bankrupt and insolvent after legal settlement",
    },
  );

  assert.equal(wro.status, "PENDING");

  // 2. FAM authorizes write-off
  await service.authorizeWriteOff(
    { actor: fam, expectedVersion: 1, idempotencyKey: "wro_auth_1" },
    wro.id,
    true,
  );

  // 3. Accounting records GL journal
  await service.recordWriteOffJournal(
    { actor: accounting, expectedVersion: 1, idempotencyKey: "wro_jrn_1" },
    wro.id,
  );

  // Check write-off status is RECORDED
  const writeOffs = await service.getWriteOffRequests(accounting);
  const recorded = writeOffs.find((w) => w.id === wro.id);
  assert.ok(recorded);
  assert.equal(recorded.status, "RECORDED");
  assert.ok(recorded.journalId);
});

test("bank reconciliation preparation and FAM approval", async () => {
  // 1. Accounting prepares reconciliation
  const rec = await service.prepareBankReconciliation(
    { actor: accounting, expectedVersion: 1, idempotencyKey: "rec_prep_1" },
    {
      periodMonth: "2026-11",
      statementBalance: 200000000000,
      bookBalance: 200000000000,
      notes: "November balanced statement",
    },
  );

  assert.equal(rec.status, "PREPARED");
  assert.equal(rec.unreconciledDifference, 0);

  // 2. FAM reviews and approves
  await service.approveBankReconciliation(
    { actor: fam, expectedVersion: 1, idempotencyKey: "rec_app_1" },
    rec.id,
    true,
    "Reviewed and approved without exception",
  );

  const reconciliations = await service.getBankReconciliations(fam);
  const approved = reconciliations.find((r) => r.id === rec.id);
  assert.ok(approved);
  assert.equal(approved.status, "FAM_APPROVED");
});

test("role separation: Auditor and unauthorized roles cannot execute business writes", async () => {
  // Auditor cannot record invoices, payments, or write-offs
  await assert.rejects(
    async () => {
      await service.recordInvoice(
        { actor: auditor, expectedVersion: 1, idempotencyKey: "aud_fail_1" },
        {
          supplierId: "sup_kss",
          supplierInvoiceNumber: "INV-AUD",
          purchaseOrderId: "po_1",
          issuedOn: "2026-10-29",
          dueOn: "2026-11-29",
          lines: [{ purchaseOrderLineId: "pol_1", materialId: "mat_fresh_milk", quantity: "10", unit: "L", unitPrice: 2000000 }],
        },
      );
    },
    AccessError,
  );

  // Treasury cannot decide customer credit limits
  await assert.rejects(
    async () => {
      await service.decideCustomerCredit(
        { actor: treasury, expectedVersion: 1, idempotencyKey: "tr_fail_1" },
        { customerId: "cust_indofood", decisionType: "SET_LIMIT", limitAmount: 90000000000, reason: "Unauthorized" },
      );
    },
    AccessError,
  );

  // AP cannot validate treasury settlements
  await assert.rejects(
    async () => {
      await service.validateAndSettleReceipt(
        { actor: ap, expectedVersion: 1, idempotencyKey: "ap_fail_1" },
        "rcpt_261029_0001",
      );
    },
    AccessError,
  );
});

test("report read models return authorized aging, revenue, and reconciliation views", async () => {
  const aging = await service.getArAgingReport(auditor);
  assert.ok(aging.length > 0);
  assert.ok(aging.some((a) => a.customerCode === "CUST-001"));

  const revenue = await service.getRevenueSummaryReport(auditor, "2026-10");
  assert.ok(revenue.grossRevenue > 0);
  assert.ok(revenue.netRevenue > 0);

  const recon = await service.getBankReconciliationSummary(auditor, "2026-10");
  assert.equal(recon.isBalanced, true);
});
