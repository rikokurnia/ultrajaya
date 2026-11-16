import test from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_INVOICES,
  INITIAL_SALES_ORDERS,
  ORDER_STAGE_BASE_COUNTS,
  PENDAPATAN_TABS,
  PERIOD_DATASETS,
  RECEIVABLES_SNAPSHOTS,
  TODAY_TASK_QUEUE,
  formatRupiahCompact,
  formatRupiahFull,
} from "../src/features/cycles/pendapatan/data";

test("pendapatan tabs cover Ringkasan, Pesanan, and Piutang", () => {
  assert.deepEqual(
    PENDAPATAN_TABS.map((t) => t.key),
    ["ringkasan", "pesanan", "piutang"],
  );
  assert.deepEqual(
    PENDAPATAN_TABS.map((t) => t.bannerTitle),
    ["Ringkasan Pendapatan", "Pesanan", "Piutang"],
  );
});

test("30d summary dataset matches reference totals and 4-week series", () => {
  const ds = PERIOD_DATASETS["30d"];
  assert.equal(ds.orderValue, 1_280_000_000);
  assert.equal(ds.paymentReceived, 960_000_000);
  assert.equal(ds.openReceivables, 320_000_000);
  assert.equal(ds.series.length, 4);
  assert.deepEqual(
    ds.series.map((s) => s.orderMillions),
    [240, 310, 330, 400],
  );
  assert.deepEqual(
    ds.series.map((s) => s.paymentMillions),
    [180, 220, 250, 310],
  );
});

test("Indonesian rupiah formatting produces exact full and compact values", () => {
  assert.equal(formatRupiahFull(1_280_000_000), "Rp1.280.000.000");
  assert.equal(formatRupiahFull(42_500_000), "Rp42.500.000");
  assert.equal(formatRupiahCompact(480_000_000), "Rp480 jt");
  assert.equal(formatRupiahCompact(42_500_000), "Rp42,5 jt");
  assert.equal(formatRupiahCompact(28_750_000), "Rp28,75 jt");
  assert.equal(formatRupiahCompact(0), "Rp0");
});

test("receivables aging buckets sum to total receivables", () => {
  for (const snapshot of Object.values(RECEIVABLES_SNAPSHOTS)) {
    const agingSum = snapshot.aging.reduce((acc, b) => acc + b.amount, 0);
    assert.equal(agingSum, snapshot.totalReceivables);
    const overdueSum = snapshot.aging
      .filter((b) => b.tone === "overdue")
      .reduce((acc, b) => acc + b.amount, 0);
    assert.equal(overdueSum, snapshot.overdueReceivables);
  }
});

test("initial orders, stage counts, task queue, and invoices stay consistent", () => {
  assert.equal(TODAY_TASK_QUEUE.length, 3);
  assert.equal(INITIAL_SALES_ORDERS.length, 4);
  assert.equal(ORDER_STAGE_BASE_COUNTS["Menunggu verifikasi"], 4);
  assert.equal(ORDER_STAGE_BASE_COUNTS["Perlu cek stok"], 6);
  assert.equal(ORDER_STAGE_BASE_COUNTS["Siap dikirim"], 8);
  const tableInvoices = INITIAL_INVOICES.filter((inv) => inv.inTable);
  assert.equal(tableInvoices.length, 4);
});
