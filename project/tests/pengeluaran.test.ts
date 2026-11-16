import test from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_GOODS_RECEIPTS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_PURCHASE_REQUESTS,
  INITIAL_RFQS,
  INITIAL_VENDOR_INVOICES,
  PENGELUARAN_PERIOD_DATASETS,
  PENGELUARAN_TABS,
  PURCHASING_DOC_OPTIONS,
  SUMMARY_FOLLOW_UPS,
  TODAY_TASK_QUEUE,
  actionLabelForPo,
  actionLabelForReceipt,
  actionLabelForRequest,
  actionLabelForRfq,
  actionLabelForVendorInvoice,
  computePayablesSnapshot,
  formatQty,
  formatRupiahCompact,
  formatRupiahFull,
} from "../src/features/cycles/pengeluaran/data";

test("pengeluaran tabs cover Ringkasan, Pembelian, Penerimaan, and Utang & Pembayaran in order", () => {
  assert.deepEqual(
    PENGELUARAN_TABS.map((t) => t.key),
    ["ringkasan", "pembelian", "penerimaan", "utang"],
  );
  assert.deepEqual(
    PENGELUARAN_TABS.map((t) => t.label),
    ["Ringkasan", "Pembelian", "Penerimaan", "Utang & Pembayaran"],
  );
  assert.equal(PENGELUARAN_TABS[0].bannerTitle, "Ringkasan Pengeluaran");
  assert.deepEqual(
    PURCHASING_DOC_OPTIONS.map((d) => d.label),
    ["Permintaan Pembelian", "RFQ & Penawaran", "Purchase Order"],
  );
});

test("period datasets keep chart series sums consistent with KPI totals", () => {
  for (const ds of Object.values(PENGELUARAN_PERIOD_DATASETS)) {
    const sumPo =
      ds.series.reduce((acc, s) => acc + s.poMillions, 0) * 1_000_000;
    const sumPay =
      ds.series.reduce((acc, s) => acc + s.paymentMillions, 0) * 1_000_000;
    assert.equal(sumPo, ds.poValue);
    assert.equal(sumPay, ds.vendorPayment);
  }
});

test("payables aging buckets sum to total open payables and overdue payables", () => {
  for (const dateKey of ["2026-11-16", "2026-11-30", "2026-10-31"] as const) {
    const snap = computePayablesSnapshot(INITIAL_VENDOR_INVOICES, dateKey);
    const totalSum = snap.aging.reduce((acc, b) => acc + b.amount, 0);
    assert.equal(totalSum, snap.totalOpenPayables);
    const overdueSum = snap.aging
      .filter((b) => b.label !== "Belum jatuh tempo")
      .reduce((acc, b) => acc + b.amount, 0);
    assert.equal(overdueSum, snap.overduePayables);
  }
});

test("follow-ups and today task queue link to valid documents across tabs", () => {
  const allDocNumbers = new Set([
    ...INITIAL_PURCHASE_REQUESTS.map((r) => r.number),
    ...INITIAL_RFQS.map((r) => r.number),
    ...INITIAL_PURCHASE_ORDERS.map((o) => o.number),
    ...INITIAL_GOODS_RECEIPTS.map((g) => g.number),
    ...INITIAL_VENDOR_INVOICES.map((i) => i.number),
  ]);

  for (const item of SUMMARY_FOLLOW_UPS) {
    assert.ok(
      allDocNumbers.has(item.reference),
      `Follow-up reference ${item.reference} must exist`,
    );
  }
  for (const task of TODAY_TASK_QUEUE) {
    assert.ok(
      allDocNumbers.has(task.reference),
      `Task reference ${task.reference} must exist`,
    );
  }
});

test("completed documents return null action label so table renders a dash", () => {
  assert.equal(actionLabelForRequest("Sudah dibuat RFQ"), null);
  assert.equal(actionLabelForRequest("Stok mencukupi"), null);
  assert.equal(actionLabelForRfq("PO diterbitkan"), null);
  assert.equal(actionLabelForPo("Dikirim ke pemasok"), null);
  assert.equal(actionLabelForReceipt("Lolos QC"), null);
  assert.equal(actionLabelForVendorInvoice("Lunas"), null);
  assert.equal(actionLabelForVendorInvoice("Selisih ditahan"), "Tinjau Selisih");
  assert.equal(actionLabelForVendorInvoice("Perlu pencocokan"), "Cocokkan Dokumen");
  assert.equal(actionLabelForVendorInvoice("Siap dicatat utang"), "Catat Utang");
  assert.equal(actionLabelForVendorInvoice("Siap dibayar"), "Proses Pembayaran");
  assert.equal(formatRupiahFull(1_100_000_000), "Rp1.100.000.000");
  assert.equal(formatRupiahCompact(640_000_000), "Rp640 jt");
  assert.equal(formatQty(10_000, "kg"), "10.000 kg");
});
