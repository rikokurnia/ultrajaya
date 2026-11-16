import test from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_BATCHES,
  INITIAL_MRP_SUMMARY,
  INITIAL_PRODUCTION_ORDERS,
  INITIAL_PRODUCTION_TASKS,
  PRODUCT_CATALOG,
  PRODUKSI_TABS,
  buildSummaryDataset,
  computeBatchTotalCost,
  computeBatchUnitHpp,
} from "../src/features/cycles/produksi/data";

test("produksi tabs are in exact order: Ringkasan, Perencanaan, Batch Produksi, Gudang & HPP", () => {
  assert.deepEqual(
    PRODUKSI_TABS.map((t) => t.key),
    ["ringkasan", "perencanaan", "batch", "gudang-hpp"],
  );
  assert.deepEqual(
    PRODUKSI_TABS.map((t) => t.label),
    ["Ringkasan", "Perencanaan", "Batch Produksi", "Gudang & HPP"],
  );
  assert.equal(PRODUKSI_TABS[0].bannerTitle, "Ringkasan Produksi");
});

test("summary chart totals match point sums for every period and product filter", () => {
  const periods = ["30d", "7d", "90d"] as const;
  const products = [
    "ALL",
    ...PRODUCT_CATALOG.map((p) => p.id),
  ] as const;

  for (const period of periods) {
    for (const product of products) {
      const ds = buildSummaryDataset(period, product);
      assert.equal(ds.unit, "karton");
      assert.equal(ds.points.length, 4);
      const sumTarget = ds.points.reduce((acc, p) => acc + p.targetKarton, 0);
      const sumActual = ds.points.reduce((acc, p) => acc + p.actualKarton, 0);
      assert.equal(ds.targetTotal, sumTarget);
      assert.equal(ds.actualTotal, sumActual);
      assert.ok(ds.yMax >= Math.max(sumTarget / 4, 100));
    }

    // All products total equals sum of individual product totals
    const allDs = buildSummaryDataset(period, "ALL");
    const prodSumTarget = PRODUCT_CATALOG.reduce(
      (acc, p) => acc + buildSummaryDataset(period, p.id).targetTotal,
      0,
    );
    const prodSumActual = PRODUCT_CATALOG.reduce(
      (acc, p) => acc + buildSummaryDataset(period, p.id).actualTotal,
      0,
    );
    assert.equal(allDs.targetTotal, prodSumTarget);
    assert.equal(allDs.actualTotal, prodSumActual);
  }
});

test("planning orders and MRP summary highlight material shortages accurately", () => {
  const shortOrders = INITIAL_PRODUCTION_ORDERS.filter(
    (o) => o.status === "Kekurangan bahan",
  );
  assert.ok(shortOrders.length >= 2);
  for (const ord of shortOrders) {
    assert.ok(ord.materials.some((m) => m.shortQty > 0));
  }

  const shortMaterials = INITIAL_MRP_SUMMARY.filter((m) => m.shortageQty > 0);
  assert.ok(shortMaterials.length >= 2);
  for (const mat of shortMaterials) {
    assert.equal(mat.shortageQty, mat.requiredTotal - mat.availableStock);
    assert.ok(mat.affectedOrderNumbers.length > 0);
  }
});

test("batches cover Dalam Proses, Menunggu QC, Ditahan, and Dirilis QC with 3-step timelines", () => {
  const statuses = new Set(INITIAL_BATCHES.map((b) => b.status));
  assert.ok(statuses.has("Dalam Proses"));
  assert.ok(statuses.has("Menunggu QC"));
  assert.ok(statuses.has("Ditahan"));
  assert.ok(statuses.has("Dirilis QC"));

  for (const batch of INITIAL_BATCHES) {
    assert.deepEqual(
      batch.timeline.map((s) => s.title),
      [
        "Inspeksi & Persiapan Bahan",
        "UHT & Pengemasan",
        "Uji Batch & Rilis QC",
      ],
    );
    if (batch.status === "Ditahan") {
      assert.ok(batch.holdReason && batch.holdReason.length > 10);
      assert.equal(batch.qcReleaseState, "Ditahan");
      assert.equal(batch.storageState, "Karantina QC");
    }
    const totalCost = computeBatchTotalCost(batch);
    assert.equal(
      totalCost,
      batch.materialCost + batch.laborCost + batch.overheadCost,
    );
    assert.equal(
      computeBatchUnitHpp(batch),
      Math.round(totalCost / batch.actualQty),
    );
  }
});

test("task queue references resolve to valid orders or batches", () => {
  const orderNums = new Set(INITIAL_PRODUCTION_ORDERS.map((o) => o.number));
  const batchNums = new Set(INITIAL_BATCHES.map((b) => b.batchNumber));
  for (const task of INITIAL_PRODUCTION_TASKS) {
    if (task.referenceType === "order") {
      assert.ok(orderNums.has(task.reference), `Missing order ${task.reference}`);
    } else {
      assert.ok(batchNums.has(task.reference), `Missing batch ${task.reference}`);
    }
  }
});
