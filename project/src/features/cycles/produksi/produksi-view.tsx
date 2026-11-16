"use client";

import { useState } from "react";
import { AlertTriangle, Search } from "lucide-react";
import type { User } from "@/shared/contracts/auth";
import foundationStyles from "@/components/foundation.module.css";
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
  formatNumberId,
  formatQuantityWithUnit,
  formatRupiahCompact,
  formatRupiahFull,
  type BatchStatus,
  type GudangHppViewOption,
  type HppAuditStatus,
  type MrpRequirementItem,
  type PeriodOption,
  type PlanningViewOption,
  type ProductFilterOption,
  type ProductionBatchRecord,
  type ProductionOrderRecord,
  type ProductionOrderStatus,
  type ProduksiTab,
  type StorageState,
} from "./data";
import {
  BatchStageBreakdownVisual,
  CostBreakdownVisual,
  MaterialReadinessPanel,
  TargetVsRealisasiChart,
  WarehouseSyncFlowVisual,
} from "./visuals";
import {
  BatchDetailDrawer,
  BatchStatusPill,
  HppBatchDrawer,
  HppStatusPill,
  OrderStatusPill,
  ProductionOrderDetailDrawer,
  QcReleasePill,
  StorageStatePill,
  SyncStatePill,
  TaskStatusPill,
  WarehouseBatchDrawer,
} from "./drawers";
import styles from "./produksi.module.css";

function normalizeTab(raw?: string): ProduksiTab {
  if (
    raw === "perencanaan" ||
    raw === "batch" ||
    raw === "gudang-hpp" ||
    raw === "ringkasan"
  ) {
    return raw;
  }
  return "ringkasan";
}

function normalizeGudangHppView(raw?: string): GudangHppViewOption {
  if (raw === "hpp") return "hpp";
  return "gudang";
}

function normalizePlanningView(raw?: string): PlanningViewOption {
  if (raw === "mps" || raw === "mrp") return raw;
  return "orders";
}

function actionLabelForOrder(status: ProductionOrderStatus): string {
  switch (status) {
    case "Kekurangan bahan":
      return "Tinjau Kebutuhan Bahan";
    case "Siap dirilis":
      return "Rilis Order";
    case "Menunggu bahan (FPBB)":
    case "Dirilis ke produksi":
      return "Lihat order";
  }
}

function actionLabelForBatch(batch: ProductionBatchRecord): string {
  switch (batch.nextAction) {
    case "CATAT_HASIL":
      return "Catat Hasil Produksi";
    case "TINJAU_UJI":
      return "Tinjau Hasil Uji";
    case "RILIS_BATCH":
      return "Rilis Batch";
    case "NONE":
      return batch.status === "Ditahan" ? "Lihat alasan hold" : "Lihat batch";
  }
}

export function ProduksiView({
  user,
  initialTab,
  initialView,
}: {
  user: User;
  initialTab?: string;
  initialView?: string;
}) {
  const [activeTab, setActiveTab] = useState<ProduksiTab>(() =>
    normalizeTab(initialTab),
  );
  const [planningView, setPlanningView] = useState<PlanningViewOption>(() =>
    normalizePlanningView(initialView),
  );
  const [gudangHppView, setGudangHppView] = useState<GudangHppViewOption>(() =>
    normalizeGudangHppView(initialView),
  );

  // Ringkasan filters
  const [period, setPeriod] = useState<PeriodOption>("30d");
  const [productFilter, setProductFilter] =
    useState<ProductFilterOption>("ALL");

  // Shared domain records across all 4 tabs
  const [orders, setOrders] = useState<ProductionOrderRecord[]>(() => [
    ...INITIAL_PRODUCTION_ORDERS,
  ]);
  const [mrpItems, setMrpItems] = useState<MrpRequirementItem[]>(() => [
    ...INITIAL_MRP_SUMMARY,
  ]);
  const [batches, setBatches] = useState<ProductionBatchRecord[]>(() => [
    ...INITIAL_BATCHES,
  ]);
  const [recordedExtraByProduct, setRecordedExtraByProduct] = useState<
    Partial<Record<Exclude<ProductFilterOption, "ALL">, number>>
  >({});

  // Search & filters per tab
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<
    "ALL" | ProductionOrderStatus
  >("ALL");

  const [batchSearch, setBatchSearch] = useState("");
  const [batchStatusFilter, setBatchStatusFilter] = useState<
    "ALL" | BatchStatus
  >("ALL");

  const [gudangSearch, setGudangSearch] = useState("");
  const [gudangFilter, setGudangFilter] = useState<"ALL" | StorageState>("ALL");

  const [hppSearch, setHppSearch] = useState("");
  const [hppFilter, setHppFilter] = useState<"ALL" | HppAuditStatus>("ALL");

  // Active detail drawers
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedWarehouseBatchId, setSelectedWarehouseBatchId] = useState<
    string | null
  >(null);
  const [selectedHppBatchId, setSelectedHppBatchId] = useState<string | null>(
    null,
  );

  const activeTabMeta =
    PRODUKSI_TABS.find((t) => t.key === activeTab) ?? PRODUKSI_TABS[0];

  function syncUrl(
    nextTab: ProduksiTab,
    nextSubView?: PlanningViewOption | GudangHppViewOption,
  ) {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (nextTab === "ringkasan") {
      url.searchParams.delete("tab");
      url.searchParams.delete("view");
    } else {
      url.searchParams.set("tab", nextTab);
      if (nextSubView) {
        url.searchParams.set("view", nextSubView);
      } else {
        url.searchParams.delete("view");
      }
    }
    window.history.replaceState(null, "", url.toString());
  }

  function selectTab(next: ProduksiTab) {
    setActiveTab(next);
    if (next === "perencanaan") {
      syncUrl(next, planningView);
    } else if (next === "gudang-hpp") {
      syncUrl(next, gudangHppView);
    } else {
      syncUrl(next);
    }
  }

  function selectPlanningView(next: PlanningViewOption) {
    setPlanningView(next);
    syncUrl("perencanaan", next);
  }

  function selectGudangHppView(next: GudangHppViewOption) {
    setGudangHppView(next);
    syncUrl("gudang-hpp", next);
  }

  // Navigation helpers that open a specific Order or Batch drawer directly
  function openOrderRecord(
    orderNumber: string,
    switchTab: boolean = true,
  ): void {
    const found = orders.find((o) => o.number === orderNumber);
    if (switchTab) {
      setActiveTab("perencanaan");
      setPlanningView("orders");
      syncUrl("perencanaan", "orders");
    }
    if (found) {
      setSelectedOrderId(found.id);
    }
  }

  function openBatchRecord(
    batchNumber: string,
    destination: "batch" | "gudang" | "hpp" = "batch",
  ): void {
    const found = batches.find((b) => b.batchNumber === batchNumber);
    if (!found) return;
    if (destination === "batch") {
      setActiveTab("batch");
      syncUrl("batch");
      setSelectedBatchId(found.id);
    } else if (destination === "gudang") {
      setActiveTab("gudang-hpp");
      setGudangHppView("gudang");
      syncUrl("gudang-hpp", "gudang");
      setSelectedWarehouseBatchId(found.id);
    } else {
      setActiveTab("gudang-hpp");
      setGudangHppView("hpp");
      syncUrl("gudang-hpp", "hpp");
      setSelectedHppBatchId(found.id);
    }
  }

  // Workflow Mutations
  function handleReviewMaterials(orderId: string, note: string) {
    const targetOrder = orders.find((o) => o.id === orderId);
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              status: "Menunggu bahan (FPBB)",
              planningNote:
                note ||
                "Kebutuhan kekurangan bahan telah ditinjau; FPBB diajukan ke Gudang RM.",
            }
          : ord,
      ),
    );
    if (targetOrder) {
      setMrpItems((prev) =>
        prev.map((item) =>
          item.affectedOrderNumbers.includes(targetOrder.number) &&
          item.shortageQty > 0
            ? { ...item, status: "FPBB diajukan" }
            : item,
        ),
      );
    }
  }

  function handleReleaseOrder(orderId: string) {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;
    const newBatchNumber =
      targetOrder.linkedBatchNumber ??
      `BATCH-261116-0${batches.length + 1}`;

    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              status: "Dirilis ke produksi",
              linkedBatchNumber: newBatchNumber,
              planningNote: `Order telah dirilis ke ${ord.productionLine} dengan nomor batch ${newBatchNumber}.`,
            }
          : ord,
      ),
    );

    if (!batches.some((b) => b.batchNumber === newBatchNumber)) {
      const productMeta = PRODUCT_CATALOG.find(
        (p) => p.id === targetOrder.productId,
      );
      const stdHpp = productMeta?.standardHppPerUnit ?? 45_000;
      const estTotalCost = targetOrder.plannedQty * stdHpp;
      const newBatch: ProductionBatchRecord = {
        id: `batch-${newBatchNumber.toLowerCase()}`,
        batchNumber: newBatchNumber,
        orderNumber: targetOrder.number,
        productId: targetOrder.productId,
        productName: targetOrder.productName,
        productionLine: targetOrder.productionLine,
        dateLabel: targetOrder.scheduleDateLabel,
        shiftLabel: targetOrder.shiftLabel,
        plannedQty: targetOrder.plannedQty,
        actualQty: targetOrder.plannedQty,
        rejectQty: 0,
        unit: "karton",
        status: "Dalam Proses",
        nextAction: "CATAT_HASIL",
        uhtTempCelsius: "138,0°C · Setup awal",
        phLevel: "6,65 (Target standar)",
        microbiologyResult: "Menunggu sampel in-line",
        sealIntegrityResult: "Kalibrasi mesin kemas aseptik selesai",
        timeline: [
          {
            key: "inspeksi",
            title: "Inspeksi & Persiapan Bahan",
            state: "completed",
            timestampLabel: `${targetOrder.scheduleDateLabel} · Awal shift`,
            actorLabel: "Operator Produksi",
            resultSummary:
              "Bahan baku dan kemasan dari Gudang Bandung RM telah disiapkan sesuai BOM.",
          },
          {
            key: "uht",
            title: "UHT & Pengemasan",
            state: "current",
            timestampLabel: "Sedang berlangsung",
            actorLabel: `Operator ${targetOrder.productionLine}`,
            resultSummary:
              "Order baru dirilis; proses sterilisasi UHT dan pengemasan sedang berjalan.",
          },
          {
            key: "qc",
            title: "Uji Batch & Rilis QC",
            state: "upcoming",
            timestampLabel: "Menunggu penyelesaian pengemasan",
            actorLabel: "Tim QC / QA Lab",
            resultSummary: "Menunggu pencatatan hasil produksi.",
          },
        ],
        qcReleaseState: "Menunggu QC",
        storageState: "Belum di gudang",
        inventorySyncState: "Menunggu konfirmasi",
        asrsZone: "Zona A-01 (High-Bay)",
        asrsLocation: `ASRS-A01-R1${batches.length + 1} (Terjadwal)`,
        storedQty: 0,
        materialCost: Math.round(estTotalCost * 0.72),
        laborCost: Math.round(estTotalCost * 0.12),
        overheadCost: Math.round(estTotalCost * 0.16),
        standardHppPerUnit: stdHpp,
        hppAuditStatus: "Menunggu penyelesaian batch",
        hppJournalRef: `JRN-HPP-261116-0${batches.length + 1}`,
        hppControllerNote:
          "Batch baru dirilis dari Perencanaan; akumulasi biaya WIP sedang berjalan.",
      };
      setBatches((prev) => [newBatch, ...prev]);
    }
  }

  function handleRecordProductionResult(
    batchId: string,
    actualQty: number,
    rejectQty: number,
    processNote: string,
  ) {
    const target = batches.find((b) => b.id === batchId);
    if (target) {
      const delta = actualQty - target.actualQty;
      if (delta !== 0) {
        setRecordedExtraByProduct((prev) => ({
          ...prev,
          [target.productId]: (prev[target.productId] ?? 0) + delta,
        }));
      }
    }

    setBatches((prev) =>
      prev.map((batch) => {
        if (batch.id !== batchId) return batch;
        return {
          ...batch,
          actualQty,
          rejectQty,
          status: "Menunggu QC",
          nextAction: "TINJAU_UJI",
          hppAuditStatus: "Perlu tinjauan HPP",
          timeline: batch.timeline.map((step) => {
            if (step.key === "uht") {
              return {
                ...step,
                state: "completed",
                timestampLabel: "16 Nov 2026 · Baru dicatat",
                resultSummary: `${processNote || "Proses UHT & pengemasan selesai."} Output: ${formatNumberId(actualQty)} karton layak, ${formatNumberId(rejectQty)} karton reject.`,
              };
            }
            if (step.key === "qc") {
              return {
                ...step,
                state: "current",
                timestampLabel: "Menunggu tinjauan hasil uji QC",
                resultSummary:
                  "Sampel akhir batch telah diserahkan ke laboratorium QC untuk verifikasi parameter mutu.",
              };
            }
            return step;
          }),
        };
      }),
    );
  }

  function handleReviewQcTests(batchId: string, qcNote: string) {
    setBatches((prev) =>
      prev.map((batch) => {
        if (batch.id !== batchId) return batch;
        return {
          ...batch,
          status: "Menunggu QC",
          nextAction: "RILIS_BATCH",
          timeline: batch.timeline.map((step) =>
            step.key === "qc"
              ? {
                  ...step,
                  state: "current",
                  timestampLabel: "16 Nov 2026 · Hasil uji terverifikasi",
                  resultSummary: `${qcNote || "Seluruh parameter uji laboratorium memenuhi standar SNI."} Siap keputusan Rilis Batch.`,
                }
              : step,
          ),
        };
      }),
    );
  }

  function handleReleaseBatch(batchId: string) {
    setBatches((prev) =>
      prev.map((batch) => {
        if (batch.id !== batchId) return batch;
        const cleanRack = batch.asrsLocation.replace(/\s*\(.*\)$/, "");
        return {
          ...batch,
          status: "Dirilis QC",
          nextAction: "NONE",
          qcReleaseState: "Dirilis QC",
          storageState: "Siap disimpan",
          inventorySyncState: "Menunggu konfirmasi",
          asrsLocation: cleanRack,
          storedQty: batch.actualQty,
          fgReceiptRef: batch.fgReceiptRef ?? `FG-RCV-${batch.batchNumber.slice(-9)}`,
          hppAuditStatus:
            batch.hppAuditStatus === "Menunggu penyelesaian batch"
              ? "Perlu tinjauan HPP"
              : batch.hppAuditStatus,
          timeline: batch.timeline.map((step) =>
            step.key === "qc"
              ? {
                  ...step,
                  state: "completed",
                  timestampLabel: "16 Nov 2026 · Dirilis QC",
                  resultSummary:
                    "Status Released ditetapkan oleh QC. Batch siap dikonfirmasi penyimpanannya di Gudang AS/RS.",
                }
              : step,
          ),
        };
      }),
    );
  }

  function handleHoldBatch(batchId: string, holdReason: string) {
    setBatches((prev) =>
      prev.map((batch) => {
        if (batch.id !== batchId) return batch;
        return {
          ...batch,
          status: "Ditahan",
          nextAction: "NONE",
          holdReason,
          holdZone: "Area Karantina Blok K-02",
          qcReleaseState: "Ditahan",
          storageState: "Karantina QC",
          inventorySyncState: "Ditangguhkan",
          asrsLocation: "KARANTINA-K02",
          storedQty: 0,
          timeline: batch.timeline.map((step) =>
            step.key === "qc"
              ? {
                  ...step,
                  state: "held",
                  timestampLabel: "16 Nov 2026 · Ditetapkan Hold",
                  resultSummary: `Batch ditahan (Hold): ${holdReason}`,
                }
              : step,
          ),
        };
      }),
    );
  }

  function handleConfirmStorage(batchId: string, asrsLocation: string) {
    setBatches((prev) =>
      prev.map((batch) =>
        batch.id === batchId
          ? {
              ...batch,
              asrsLocation,
              storedQty: batch.actualQty,
              storageState: "Tersimpan di AS/RS",
              inventorySyncState: "Tersinkron ke Stok",
              fgReceiptRef:
                batch.fgReceiptRef ?? `FG-RCV-${batch.batchNumber.slice(-9)}`,
            }
          : batch,
      ),
    );
  }

  function handleReviewHpp(batchId: string, controllerNote: string) {
    setBatches((prev) =>
      prev.map((batch) =>
        batch.id === batchId
          ? {
              ...batch,
              hppAuditStatus: "Terverifikasi Audit",
              hppControllerNote:
                controllerNote ||
                "Perhitungan HPP dan alokasi biaya telah ditinjau serta disahkan oleh Akuntan Biaya / Financial Controller.",
            }
          : batch,
      ),
    );
  }

  // Computed datasets & filtered lists
  const summaryDataset = buildSummaryDataset(
    period,
    productFilter,
    recordedExtraByProduct,
  );

  const waitingQcBatchesForSummary = batches.filter(
    (b) =>
      b.status === "Menunggu QC" &&
      (productFilter === "ALL" || b.productId === productFilter),
  );

  const shortageOrders = orders.filter(
    (o) =>
      o.status === "Kekurangan bahan" || o.status === "Menunggu bahan (FPBB)",
  );
  const readyOrders = orders.filter((o) => o.status === "Siap dirilis");
  const waitingQcBatches = batches.filter((b) => b.status === "Menunggu QC");
  const readyStorageBatches = batches.filter(
    (b) =>
      b.qcReleaseState === "Dirilis QC" && b.storageState === "Siap disimpan",
  );
  const heldBatches = batches.filter((b) => b.status === "Ditahan");

  // Dynamic follow-ups for Ringkasan
  const summaryFollowUps = [
    ...shortageOrders.map((ord) => {
      const shortMat = ord.materials.find((m) => m.shortQty > 0);
      return {
        id: `fu-ord-${ord.id}`,
        title: `Kekurangan bahan pada order ${ord.productName}`,
        meta: shortMat
          ? `Kurang ${formatQuantityWithUnit(shortMat.shortQty, shortMat.unit)} ${shortMat.name}`
          : "Menunggu pemenuhan bahan baku",
        reference: ord.number,
        actionLabel: "Tinjau order",
        onClick: () => openOrderRecord(ord.number, true),
      };
    }),
    ...waitingQcBatches.map((b) => ({
      id: `fu-qc-${b.id}`,
      title: `Batch menunggu rilis QC (${b.productName})`,
      meta: `${formatQuantityWithUnit(b.actualQty, b.unit)} · ${
        b.nextAction === "TINJAU_UJI"
          ? "Menunggu tinjauan hasil uji lab"
          : "Siap keputusan rilis batch"
      }`,
      reference: b.batchNumber,
      actionLabel: "Buka batch QC",
      onClick: () => openBatchRecord(b.batchNumber, "batch"),
    })),
    ...readyStorageBatches.map((b) => ({
      id: `fu-wh-${b.id}`,
      title: `Batch rilis QC siap disimpan ke AS/RS`,
      meta: `${b.productName} · ${formatQuantityWithUnit(b.actualQty, b.unit)} menuju ${b.asrsLocation}`,
      reference: b.batchNumber,
      actionLabel: "Konfirmasi simpan",
      onClick: () => openBatchRecord(b.batchNumber, "gudang"),
    })),
  ];

  // Filtered Orders (Tab 2)
  const filteredOrders = orders.filter((ord) => {
    if (orderStatusFilter !== "ALL" && ord.status !== orderStatusFilter) {
      return false;
    }
    const q = orderSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      ord.number.toLowerCase().includes(q) ||
      ord.mpsCode.toLowerCase().includes(q) ||
      ord.productName.toLowerCase().includes(q) ||
      ord.productionLine.toLowerCase().includes(q)
    );
  });

  // Filtered Batches (Tab 3)
  const filteredBatches = batches.filter((b) => {
    if (batchStatusFilter !== "ALL" && b.status !== batchStatusFilter) {
      return false;
    }
    const q = batchSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      b.batchNumber.toLowerCase().includes(q) ||
      b.orderNumber.toLowerCase().includes(q) ||
      b.productName.toLowerCase().includes(q) ||
      b.productionLine.toLowerCase().includes(q)
    );
  });

  // Filtered Gudang Batches (Tab 4A)
  const filteredGudangBatches = batches.filter((b) => {
    if (gudangFilter !== "ALL" && b.storageState !== gudangFilter) {
      return false;
    }
    const q = gudangSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      b.batchNumber.toLowerCase().includes(q) ||
      b.productName.toLowerCase().includes(q) ||
      b.asrsLocation.toLowerCase().includes(q)
    );
  });

  // Filtered HPP Batches (Tab 4B)
  const filteredHppBatches = batches.filter((b) => {
    if (hppFilter !== "ALL" && b.hppAuditStatus !== hppFilter) {
      return false;
    }
    const q = hppSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      b.batchNumber.toLowerCase().includes(q) ||
      b.productName.toLowerCase().includes(q) ||
      b.hppJournalRef.toLowerCase().includes(q)
    );
  });

  const selectedOrder =
    orders.find((o) => o.id === selectedOrderId) ?? null;
  const selectedBatch =
    batches.find((b) => b.id === selectedBatchId) ?? null;
  const selectedWarehouseBatch =
    batches.find((b) => b.id === selectedWarehouseBatchId) ?? null;
  const selectedHppBatch =
    batches.find((b) => b.id === selectedHppBatchId) ?? null;

  const attainmentPct =
    summaryDataset.targetTotal > 0
      ? ((summaryDataset.actualTotal / summaryDataset.targetTotal) * 100).toFixed(
          1,
        )
      : "0.0";

  return (
    <section className={styles.page}>
      <header className={foundationStyles.banner}>
        <h1>{activeTabMeta.bannerTitle}</h1>
      </header>

      <div
        className={styles.tabBar}
        role="tablist"
        aria-label="Submenu Siklus Produksi"
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          e.preventDefault();
          const idx = PRODUKSI_TABS.findIndex((t) => t.key === activeTab);
          const next =
            PRODUKSI_TABS[
              (idx +
                (e.key === "ArrowRight" ? 1 : PRODUKSI_TABS.length - 1)) %
                PRODUKSI_TABS.length
            ];
          selectTab(next.key);
          document.getElementById(`produksi-tab-${next.key}`)?.focus();
        }}
      >
        {PRODUKSI_TABS.map((tab) => (
          <button
            key={tab.key}
            id={`produksi-tab-${tab.key}`}
            type="button"
            role="tab"
            className={styles.tabButton}
            tabIndex={activeTab === tab.key ? 0 : -1}
            aria-selected={activeTab === tab.key}
            onClick={() => selectTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        aria-labelledby={`produksi-tab-${activeTab}`}
        className={styles.page}
      >
        {/* ================= TAB 1: RINGKASAN ================= */}
        {activeTab === "ringkasan" && (
          <>
            <div className={styles.filterBar}>
              <span className={styles.unitBadge}>
                Satuan kuantitas: Karton (Aseptik)
              </span>
              <div className={styles.filterGroup}>
                <label
                  htmlFor="produksi-product-filter"
                  className={styles.filterLabel}
                >
                  Produk
                </label>
                <div className={styles.selectControl}>
                  <select
                    id="produksi-product-filter"
                    value={productFilter}
                    onChange={(e) =>
                      setProductFilter(e.target.value as ProductFilterOption)
                    }
                  >
                    <option value="ALL">Semua produk</option>
                    {PRODUCT_CATALOG.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name}
                      </option>
                    ))}
                  </select>
                </div>

                <label
                  htmlFor="produksi-period-filter"
                  className={styles.filterLabel}
                >
                  Periode
                </label>
                <div className={styles.selectControl}>
                  <select
                    id="produksi-period-filter"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as PeriodOption)}
                  >
                    <option value="30d">30 hari terakhir</option>
                    <option value="7d">7 hari terakhir</option>
                    <option value="90d">90 hari terakhir</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.kpiGrid}>
              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Target Produksi</span>
                <strong className={styles.kpiValue}>
                  {formatQuantityWithUnit(
                    summaryDataset.targetTotal,
                    summaryDataset.unit,
                  )}
                </strong>
                <span className={styles.kpiSub}>
                  {summaryDataset.productLabel} · {summaryDataset.periodLabel}
                </span>
              </article>

              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Realisasi Produksi</span>
                <strong className={styles.kpiValue}>
                  {formatQuantityWithUnit(
                    summaryDataset.actualTotal,
                    summaryDataset.unit,
                  )}
                </strong>
                <span className={styles.kpiSub}>
                  Pencapaian {attainmentPct}% dari target ({summaryDataset.unit})
                </span>
              </article>

              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>
                  Batch Menunggu Rilis QC
                </span>
                <strong className={styles.kpiValue}>
                  {waitingQcBatchesForSummary.length} batch
                </strong>
                <span className={styles.kpiSub}>
                  {formatQuantityWithUnit(
                    waitingQcBatchesForSummary.reduce(
                      (acc, b) => acc + b.actualQty,
                      0,
                    ),
                    "karton",
                  )}{" "}
                  menunggu verifikasi mutu
                </span>
              </article>
            </div>

            <div className={styles.splitGrid}>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleGroup}>
                    <h2 className={styles.cardTitle}>
                      Target vs Realisasi Produksi
                    </h2>
                    <span className={styles.unitBadge}>
                      Satuan: {summaryDataset.unit}
                    </span>
                  </div>
                  <span className={`${styles.pill} ${styles.pillInfo}`}>
                    Realisasi {attainmentPct}%
                  </span>
                </div>
                <TargetVsRealisasiChart dataset={summaryDataset} />
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Perlu Ditindaklanjuti</h2>
                  <span className={styles.unitBadge}>
                    {summaryFollowUps.length} item
                  </span>
                </div>
                {summaryFollowUps.length === 0 ? (
                  <p className={styles.emptyRow}>
                    Seluruh order dan batch produksi telah ditindaklanjuti.
                  </p>
                ) : (
                  <ul className={styles.followUpList}>
                    {summaryFollowUps.map((item) => (
                      <li className={styles.followUpItem} key={item.id}>
                        <div className={styles.followUpMain}>
                          <span className={styles.followUpTitle}>
                            {item.title}
                          </span>
                          <span className={styles.followUpMeta}>
                            {item.meta}
                          </span>
                        </div>
                        <div className={styles.followUpRight}>
                          <button
                            type="button"
                            className={styles.codeLink}
                            onClick={item.onClick}
                          >
                            {item.reference}
                          </button>
                          <button
                            type="button"
                            className={styles.textLink}
                            onClick={item.onClick}
                          >
                            {item.actionLabel}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Antrean Tugas Hari Ini</h2>
                <span className={styles.unitBadge}>
                  Klik nomor referensi atau aksi untuk membuka dokumen
                </span>
              </div>
              <div
                className={styles.tableWrap}
                role="region"
                tabIndex={0}
                aria-label="Antrean Tugas Hari Ini"
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Tugas</th>
                      <th scope="col">Referensi</th>
                      <th scope="col">Tahap</th>
                      <th scope="col">Status</th>
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {INITIAL_PRODUCTION_TASKS.map((task) => {
                      const handleTaskOpen = () => {
                        if (task.referenceType === "order") {
                          openOrderRecord(task.reference, true);
                        } else if (task.targetSubView === "gudang") {
                          openBatchRecord(task.reference, "gudang");
                        } else if (task.targetSubView === "hpp") {
                          openBatchRecord(task.reference, "hpp");
                        } else {
                          openBatchRecord(task.reference, "batch");
                        }
                      };
                      return (
                        <tr key={task.id}>
                          <td>
                            <strong>{task.task}</strong>
                            <span className={styles.cellSub}>
                              {task.ownerRole}
                            </span>
                          </td>
                          <td className={styles.tabular}>
                            <button
                              type="button"
                              className={styles.codeLink}
                              onClick={handleTaskOpen}
                            >
                              {task.reference}
                            </button>
                          </td>
                          <td>{task.stage}</td>
                          <td>
                            <TaskStatusPill status={task.status} />
                          </td>
                          <td>
                            <button
                              type="button"
                              className={styles.textLink}
                              onClick={handleTaskOpen}
                            >
                              {task.actionLabel}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* ================= TAB 2: PERENCANAAN ================= */}
        {activeTab === "perencanaan" && (
          <>
            <div className={styles.kpiGrid}>
              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>
                  Jadwal Order Produksi (MPS)
                </span>
                <strong className={styles.kpiValue}>
                  {orders.length} order
                </strong>
                <span className={styles.kpiSub}>
                  Total rencana:{" "}
                  {formatQuantityWithUnit(
                    orders.reduce((acc, o) => acc + o.plannedQty, 0),
                    "karton",
                  )}
                </span>
              </article>

              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>
                  Order Siap Dirilis (Bahan Lengkap)
                </span>
                <strong className={styles.kpiValue}>
                  {readyOrders.length} order
                </strong>
                <span className={styles.kpiSub}>
                  {
                    orders.filter((o) => o.status === "Dirilis ke produksi")
                      .length
                  }{" "}
                  order telah berjalan di lini UHT
                </span>
              </article>

              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>
                  Order Kekurangan Bahan (MRP)
                </span>
                <strong className={styles.kpiValue}>
                  {shortageOrders.length} order
                </strong>
                <span className={styles.kpiSub}>
                  Perlu tinjauan kebutuhan bahan &amp; FPBB
                </span>
              </article>
            </div>

            <div className={styles.splitGrid}>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    Kesiapan Bahan (Ringkasan MRP)
                  </h2>
                  <span className={styles.unitBadge}>Gudang: Bandung RM</span>
                </div>
                <MaterialReadinessPanel
                  items={mrpItems}
                  onSelectOrder={(orderNumber) =>
                    openOrderRecord(orderNumber, false)
                  }
                />
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    Prioritas Tindak Lanjut PPIC
                  </h2>
                </div>
                <ul className={styles.followUpList}>
                  {orders
                    .filter((o) => o.status !== "Dirilis ke produksi")
                    .map((ord) => (
                      <li className={styles.followUpItem} key={ord.id}>
                        <div className={styles.followUpMain}>
                          <span className={styles.followUpTitle}>
                            {ord.productName} ({formatNumberId(ord.plannedQty)}{" "}
                            {ord.unit})
                          </span>
                          <span className={styles.followUpMeta}>
                            {ord.scheduleDateLabel} · {ord.productionLine}
                          </span>
                          <div>
                            <OrderStatusPill status={ord.status} />
                          </div>
                        </div>
                        <div className={styles.followUpRight}>
                          <button
                            type="button"
                            className={styles.codeLink}
                            onClick={() => setSelectedOrderId(ord.id)}
                          >
                            {ord.number}
                          </button>
                          <button
                            type="button"
                            className={styles.textLink}
                            onClick={() => setSelectedOrderId(ord.id)}
                          >
                            {actionLabelForOrder(ord.status)}
                          </button>
                        </div>
                      </li>
                    ))}
                </ul>
              </section>
            </div>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleGroup}>
                  <h2 className={styles.cardTitle}>
                    Jadwal MPS, Kebutuhan MRP, dan Order Produksi
                  </h2>
                </div>

                <div
                  className={styles.viewSwitcher}
                  role="group"
                  aria-label="Pemilih tampilan perencanaan"
                >
                  <button
                    type="button"
                    className={styles.viewSwitchBtn}
                    aria-pressed={planningView === "orders"}
                    onClick={() => selectPlanningView("orders")}
                  >
                    Order Produksi
                    <span className={styles.viewCount}>{orders.length}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.viewSwitchBtn}
                    aria-pressed={planningView === "mps"}
                    onClick={() => selectPlanningView("mps")}
                  >
                    Jadwal Produksi (MPS)
                    <span className={styles.viewCount}>{orders.length}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.viewSwitchBtn}
                    aria-pressed={planningView === "mrp"}
                    onClick={() => selectPlanningView("mrp")}
                  >
                    Kebutuhan Bahan (MRP)
                    <span className={styles.viewCount}>{mrpItems.length}</span>
                  </button>
                </div>
              </div>

              {planningView !== "mrp" && (
                <div className={styles.toolbar} style={{ marginBottom: 14 }}>
                  <label className={styles.searchBox}>
                    <Search aria-hidden />
                    <span className="sr-only">
                      Cari nomor order, kode MPS, produk, atau lini
                    </span>
                    <input
                      type="search"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Cari nomor order, kode MPS, produk, atau lini"
                    />
                  </label>
                  <div className={styles.selectControl}>
                    <label htmlFor="plan-status-filter" className="sr-only">
                      Filter status order produksi
                    </label>
                    <select
                      id="plan-status-filter"
                      value={orderStatusFilter}
                      onChange={(e) =>
                        setOrderStatusFilter(
                          e.target.value as "ALL" | ProductionOrderStatus,
                        )
                      }
                    >
                      <option value="ALL">Semua status order</option>
                      <option value="Kekurangan bahan">Kekurangan bahan</option>
                      <option value="Menunggu bahan (FPBB)">
                        Menunggu bahan (FPBB)
                      </option>
                      <option value="Siap dirilis">Siap dirilis</option>
                      <option value="Dirilis ke produksi">
                        Dirilis ke produksi
                      </option>
                    </select>
                  </div>
                </div>
              )}

              {planningView === "orders" && (
                <div
                  className={styles.tableWrap}
                  role="region"
                  tabIndex={0}
                  aria-label="Tabel Order Produksi"
                >
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">No. Order</th>
                        <th scope="col">Produk</th>
                        <th scope="col">Jadwal &amp; Lini</th>
                        <th scope="col">Kuantitas Rencana</th>
                        <th scope="col">Kesiapan Bahan</th>
                        <th scope="col">Status</th>
                        <th scope="col">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className={styles.emptyRow}>
                            Tidak ada Order Produksi yang cocok dengan filter.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((ord) => {
                          const shortItem = ord.materials.find(
                            (m) => m.shortQty > 0,
                          );
                          return (
                            <tr key={ord.id}>
                              <td className={styles.tabular}>
                                <button
                                  type="button"
                                  className={styles.codeLink}
                                  onClick={() => setSelectedOrderId(ord.id)}
                                >
                                  {ord.number}
                                </button>
                                <span className={styles.cellSub}>
                                  {ord.mpsCode}
                                </span>
                              </td>
                              <td>{ord.productName}</td>
                              <td>
                                {ord.scheduleDateLabel}
                                <span className={styles.cellSub}>
                                  {ord.productionLine} · {ord.shiftLabel}
                                </span>
                              </td>
                              <td className={styles.tabular}>
                                {formatQuantityWithUnit(
                                  ord.plannedQty,
                                  ord.unit,
                                )}
                              </td>
                              <td>
                                {shortItem ? (
                                  <span style={{ color: "#9e1c2e" }}>
                                    Kurang{" "}
                                    {formatQuantityWithUnit(
                                      shortItem.shortQty,
                                      shortItem.unit,
                                    )}{" "}
                                    {shortItem.code}
                                  </span>
                                ) : (
                                  <span style={{ color: "#0d663f" }}>
                                    Lengkap ({ord.materials.length} bahan)
                                  </span>
                                )}
                              </td>
                              <td>
                                <OrderStatusPill status={ord.status} />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className={styles.textLink}
                                  onClick={() => setSelectedOrderId(ord.id)}
                                >
                                  {actionLabelForOrder(ord.status)}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {planningView === "mps" && (
                <div
                  className={styles.tableWrap}
                  role="region"
                  tabIndex={0}
                  aria-label="Tabel Jadwal Induk Produksi (MPS)"
                >
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Kode MPS</th>
                        <th scope="col">Tanggal &amp; Shift</th>
                        <th scope="col">Lini Produksi</th>
                        <th scope="col">Produk</th>
                        <th scope="col">Target MPS</th>
                        <th scope="col">Order Produksi</th>
                        <th scope="col">Status</th>
                        <th scope="col">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={8} className={styles.emptyRow}>
                            Tidak ada jadwal MPS yang cocok dengan pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((ord) => (
                          <tr key={`mps-${ord.id}`}>
                            <td className={styles.tabular}>
                              <strong>{ord.mpsCode}</strong>
                            </td>
                            <td>
                              {ord.scheduleDateLabel}
                              <span className={styles.cellSub}>
                                {ord.shiftLabel}
                              </span>
                            </td>
                            <td>{ord.productionLine}</td>
                            <td>{ord.productName}</td>
                            <td className={styles.tabular}>
                              {formatQuantityWithUnit(ord.plannedQty, ord.unit)}
                            </td>
                            <td className={styles.tabular}>
                              <button
                                type="button"
                                className={styles.codeLink}
                                onClick={() => setSelectedOrderId(ord.id)}
                              >
                                {ord.number}
                              </button>
                            </td>
                            <td>
                              <OrderStatusPill status={ord.status} />
                            </td>
                            <td>
                              <button
                                type="button"
                                className={styles.textLink}
                                onClick={() => setSelectedOrderId(ord.id)}
                              >
                                {actionLabelForOrder(ord.status)}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {planningView === "mrp" && (
                <div
                  className={styles.tableWrap}
                  role="region"
                  tabIndex={0}
                  aria-label="Tabel Kebutuhan Bahan Baku (MRP)"
                >
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Kode &amp; Bahan Baku</th>
                        <th scope="col">Kebutuhan Total</th>
                        <th scope="col">Stok Tersedia</th>
                        <th scope="col">Kekurangan (Shortage)</th>
                        <th scope="col">Order Terkait</th>
                        <th scope="col">Status MRP</th>
                        <th scope="col">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mrpItems.map((item) => {
                        const primaryOrderNo = item.affectedOrderNumbers[0];
                        return (
                          <tr key={item.id}>
                            <td>
                              <strong>
                                {item.code} · {item.name}
                              </strong>
                              <span className={styles.cellSub}>
                                Gudang: {item.warehouseName}
                              </span>
                            </td>
                            <td className={styles.tabular}>
                              {formatQuantityWithUnit(
                                item.requiredTotal,
                                item.unit,
                              )}
                            </td>
                            <td className={styles.tabular}>
                              {formatQuantityWithUnit(
                                item.availableStock,
                                item.unit,
                              )}
                            </td>
                            <td className={styles.tabular}>
                              {item.shortageQty > 0 ? (
                                <strong style={{ color: "#9e1c2e" }}>
                                  {formatQuantityWithUnit(
                                    item.shortageQty,
                                    item.unit,
                                  )}
                                </strong>
                              ) : (
                                `0 ${item.unit}`
                              )}
                            </td>
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  flexWrap: "wrap",
                                }}
                              >
                                {item.affectedOrderNumbers.map((ordNo) => (
                                  <button
                                    key={ordNo}
                                    type="button"
                                    className={styles.codeLink}
                                    onClick={() =>
                                      openOrderRecord(ordNo, false)
                                    }
                                  >
                                    {ordNo}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td>
                              <span
                                className={`${styles.pill} ${
                                  item.status === "Tersedia lengkap"
                                    ? styles.pillSuccess
                                    : item.status === "FPBB diajukan"
                                      ? styles.pillWarning
                                      : styles.pillDanger
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td>
                              {primaryOrderNo ? (
                                <button
                                  type="button"
                                  className={styles.textLink}
                                  onClick={() =>
                                    openOrderRecord(primaryOrderNo, false)
                                  }
                                >
                                  {item.shortageQty > 0
                                    ? "Tinjau Kebutuhan Bahan"
                                    : "Lihat order"}
                                </button>
                              ) : (
                                <span className={styles.mutedAction}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {/* ================= TAB 3: BATCH PRODUKSI ================= */}
        {activeTab === "batch" && (
          <>
            <div className={styles.kpiGrid}>
              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Dalam Proses</span>
                <strong className={styles.kpiValue}>
                  {batches.filter((b) => b.status === "Dalam Proses").length}
                </strong>
                <span className={styles.kpiSub}>
                  Pengolahan UHT &amp; pengemasan aseptik aktif
                </span>
              </article>

              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Menunggu QC</span>
                <strong className={styles.kpiValue}>
                  {batches.filter((b) => b.status === "Menunggu QC").length}
                </strong>
                <span className={styles.kpiSub}>
                  Menunggu tinjauan hasil uji atau rilis batch
                </span>
              </article>

              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Ditahan</span>
                <strong className={styles.kpiValue}>
                  {batches.filter((b) => b.status === "Ditahan").length}
                </strong>
                <span className={styles.kpiSub}>
                  Dikarantina oleh QC karena deviasi mutu
                </span>
              </article>
            </div>

            <div className={styles.splitGrid}>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    Ringkasan Status Batch &amp; Tahapan Produksi
                  </h2>
                </div>
                <BatchStageBreakdownVisual batches={batches} />
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    Perhatian QC &amp; Penahanan Batch
                  </h2>
                </div>
                <div className={styles.drawerStack}>
                  {heldBatches.map((hb) => (
                    <div className={styles.holdAlertBox} key={hb.id}>
                      <div className={styles.holdAlertHeader}>
                        <span className={styles.holdAlertTitle}>
                          <AlertTriangle
                            size={15}
                            style={{
                              display: "inline",
                              verticalAlign: "text-bottom",
                              marginRight: 5,
                            }}
                            aria-hidden
                          />
                          QC Hold: {hb.batchNumber} ({hb.productName})
                        </span>
                        <button
                          type="button"
                          className={styles.codeLink}
                          onClick={() => setSelectedBatchId(hb.id)}
                        >
                          Buka detail hold
                        </button>
                      </div>
                      <p className={styles.holdAlertBody}>
                        {hb.holdReason ??
                          "Batch ditahan untuk pemeriksaan lebih lanjut."}
                      </p>
                    </div>
                  ))}

                  <ul className={styles.followUpList}>
                    {waitingQcBatches.map((wb) => (
                      <li className={styles.followUpItem} key={wb.id}>
                        <div className={styles.followUpMain}>
                          <span className={styles.followUpTitle}>
                            {wb.batchNumber} · {wb.productName}
                          </span>
                          <span className={styles.followUpMeta}>
                            {wb.productionLine} ·{" "}
                            {formatQuantityWithUnit(wb.actualQty, wb.unit)}
                          </span>
                        </div>
                        <div className={styles.followUpRight}>
                          <button
                            type="button"
                            className={styles.textLink}
                            onClick={() => setSelectedBatchId(wb.id)}
                          >
                            {actionLabelForBatch(wb)}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Daftar Batch Produksi</h2>
                <div className={styles.headerControls}>
                  <label className={styles.searchBox}>
                    <Search aria-hidden />
                    <span className="sr-only">
                      Cari nomor batch, produk, atau lini produksi
                    </span>
                    <input
                      type="search"
                      value={batchSearch}
                      onChange={(e) => setBatchSearch(e.target.value)}
                      placeholder="Cari nomor batch, produk, atau lini"
                    />
                  </label>
                  <div className={styles.selectControl}>
                    <label htmlFor="batch-status-filter" className="sr-only">
                      Filter status batch
                    </label>
                    <select
                      id="batch-status-filter"
                      value={batchStatusFilter}
                      onChange={(e) =>
                        setBatchStatusFilter(
                          e.target.value as "ALL" | BatchStatus,
                        )
                      }
                    >
                      <option value="ALL">Semua status</option>
                      <option value="Dalam Proses">Dalam Proses</option>
                      <option value="Menunggu QC">Menunggu QC</option>
                      <option value="Ditahan">Ditahan</option>
                      <option value="Dirilis QC">Dirilis QC</option>
                    </select>
                  </div>
                </div>
              </div>

              <div
                className={styles.tableWrap}
                role="region"
                tabIndex={0}
                aria-label="Daftar Batch Produksi"
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">No. Batch</th>
                      <th scope="col">Produk</th>
                      <th scope="col">Lini Produksi</th>
                      <th scope="col">Tanggal</th>
                      <th scope="col">Status</th>
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBatches.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.emptyRow}>
                          Tidak ada batch produksi yang cocok dengan pencarian
                          atau filter.
                        </td>
                      </tr>
                    ) : (
                      filteredBatches.map((batch) => (
                        <tr
                          key={batch.id}
                          className={
                            batch.status === "Ditahan"
                              ? styles.holdRow
                              : undefined
                          }
                        >
                          <td className={styles.tabular}>
                            <button
                              type="button"
                              className={styles.codeLink}
                              onClick={() => setSelectedBatchId(batch.id)}
                            >
                              {batch.batchNumber}
                            </button>
                            <span className={styles.cellSub}>
                              Order: {batch.orderNumber} ·{" "}
                              {formatQuantityWithUnit(
                                batch.actualQty,
                                batch.unit,
                              )}
                            </span>
                          </td>
                          <td>
                            {batch.productName}
                            {batch.status === "Ditahan" && batch.holdReason && (
                              <span
                                className={styles.cellSub}
                                style={{ color: "#9e1c2e", fontWeight: 600 }}
                              >
                                Hold: {batch.holdReason.slice(0, 68)}…
                              </span>
                            )}
                          </td>
                          <td>{batch.productionLine}</td>
                          <td>
                            {batch.dateLabel}
                            <span className={styles.cellSub}>
                              {batch.shiftLabel}
                            </span>
                          </td>
                          <td>
                            <BatchStatusPill status={batch.status} />
                          </td>
                          <td>
                            <button
                              type="button"
                              className={styles.textLink}
                              onClick={() => setSelectedBatchId(batch.id)}
                            >
                              {actionLabelForBatch(batch)}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* ================= TAB 4: GUDANG & HPP ================= */}
        {activeTab === "gudang-hpp" && (
          <>
            <div className={styles.toolbar}>
              <div
                className={styles.viewSwitcher}
                role="group"
                aria-label="Pemilih tampilan Gudang dan HPP"
              >
                <button
                  type="button"
                  className={styles.viewSwitchBtn}
                  aria-pressed={gudangHppView === "gudang"}
                  onClick={() => selectGudangHppView("gudang")}
                >
                  Gudang
                  <span className={styles.viewCount}>{batches.length}</span>
                </button>
                <button
                  type="button"
                  className={styles.viewSwitchBtn}
                  aria-pressed={gudangHppView === "hpp"}
                  onClick={() => selectGudangHppView("hpp")}
                >
                  HPP
                  <span className={styles.viewCount}>{batches.length}</span>
                </button>
              </div>

              <span className={styles.unitBadge}>
                Referensi batch konsisten di seluruh tampilan Produksi, Gudang,
                dan HPP
              </span>
            </div>

            {gudangHppView === "gudang" ? (
              <>
                <div className={styles.kpiGrid}>
                  <article className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>Batch Lolos Rilis QC</span>
                    <strong className={styles.kpiValue}>
                      {
                        batches.filter((b) => b.qcReleaseState === "Dirilis QC")
                          .length
                      }{" "}
                      batch
                    </strong>
                    <span className={styles.kpiSub}>
                      Layak masuk penyimpanan barang jadi AS/RS
                    </span>
                  </article>

                  <article className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>
                      Tersimpan &amp; Tersinkron di AS/RS
                    </span>
                    <strong className={styles.kpiValue}>
                      {
                        batches.filter(
                          (b) => b.storageState === "Tersimpan di AS/RS",
                        ).length
                      }{" "}
                      batch
                    </strong>
                    <span className={styles.kpiSub}>
                      {formatQuantityWithUnit(
                        batches
                          .filter(
                            (b) => b.storageState === "Tersimpan di AS/RS",
                          )
                          .reduce((acc, b) => acc + b.storedQty, 0),
                        "karton",
                      )}{" "}
                      aktif di stok ERP
                    </span>
                  </article>

                  <article className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>
                      Menunggu Konfirmasi Penyimpanan
                    </span>
                    <strong className={styles.kpiValue}>
                      {readyStorageBatches.length} batch
                    </strong>
                    <span className={styles.kpiSub}>
                      Telah rilis QC, siap konfirmasi rak AS/RS
                    </span>
                  </article>
                </div>

                <div className={styles.splitGrid}>
                  <section className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h2 className={styles.cardTitle}>
                        Status Rilis QC, Penyimpanan AS/RS, dan Sinkronisasi
                        Stok
                      </h2>
                    </div>
                    <WarehouseSyncFlowVisual batches={batches} />
                  </section>

                  <section className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h2 className={styles.cardTitle}>
                        Antrean Penerimaan Gudang AS/RS
                      </h2>
                    </div>
                    {readyStorageBatches.length === 0 ? (
                      <p className={styles.emptyRow}>
                        Seluruh batch yang telah dirilis QC sudah dikonfirmasi
                        di AS/RS.
                      </p>
                    ) : (
                      <ul className={styles.followUpList}>
                        {readyStorageBatches.map((b) => (
                          <li className={styles.followUpItem} key={b.id}>
                            <div className={styles.followUpMain}>
                              <span className={styles.followUpTitle}>
                                {b.batchNumber} · {b.productName}
                              </span>
                              <span className={styles.followUpMeta}>
                                Lokasi tujuan: {b.asrsLocation} ·{" "}
                                {formatQuantityWithUnit(b.actualQty, b.unit)}
                              </span>
                            </div>
                            <div className={styles.followUpRight}>
                              <button
                                type="button"
                                className={styles.textLink}
                                onClick={() => setSelectedWarehouseBatchId(b.id)}
                              >
                                Konfirmasi Penyimpanan
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>

                <section className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>
                      Daftar Batch Gudang AS/RS &amp; Sinkronisasi Persediaan
                    </h2>
                    <div className={styles.headerControls}>
                      <label className={styles.searchBox}>
                        <Search aria-hidden />
                        <span className="sr-only">
                          Cari nomor batch, produk, atau lokasi AS/RS
                        </span>
                        <input
                          type="search"
                          value={gudangSearch}
                          onChange={(e) => setGudangSearch(e.target.value)}
                          placeholder="Cari batch, produk, atau rak AS/RS"
                        />
                      </label>
                      <div className={styles.selectControl}>
                        <label
                          htmlFor="gudang-storage-filter"
                          className="sr-only"
                        >
                          Filter status penyimpanan
                        </label>
                        <select
                          id="gudang-storage-filter"
                          value={gudangFilter}
                          onChange={(e) =>
                            setGudangFilter(
                              e.target.value as "ALL" | StorageState,
                            )
                          }
                        >
                          <option value="ALL">Semua status penyimpanan</option>
                          <option value="Siap disimpan">Siap disimpan</option>
                          <option value="Tersimpan di AS/RS">
                            Tersimpan di AS/RS
                          </option>
                          <option value="Karantina QC">Karantina QC</option>
                          <option value="Belum di gudang">
                            Belum di gudang
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div
                    className={styles.tableWrap}
                    role="region"
                    tabIndex={0}
                    aria-label="Tabel Penyimpanan Gudang AS/RS dan Sinkronisasi Stok"
                  >
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">No. Batch</th>
                          <th scope="col">Produk</th>
                          <th scope="col">Lokasi AS/RS</th>
                          <th scope="col">Kuantitas Disimpan</th>
                          <th scope="col">Rilis QC</th>
                          <th scope="col">Penyimpanan</th>
                          <th scope="col">Sinkronisasi Stok</th>
                          <th scope="col">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredGudangBatches.length === 0 ? (
                          <tr>
                            <td colSpan={8} className={styles.emptyRow}>
                              Tidak ada data gudang batch yang cocok dengan
                              filter.
                            </td>
                          </tr>
                        ) : (
                          filteredGudangBatches.map((batch) => {
                            const canConfirm =
                              batch.qcReleaseState === "Dirilis QC" &&
                              batch.storageState === "Siap disimpan";
                            return (
                              <tr key={`wh-${batch.id}`}>
                                <td className={styles.tabular}>
                                  <button
                                    type="button"
                                    className={styles.codeLink}
                                    onClick={() =>
                                      setSelectedWarehouseBatchId(batch.id)
                                    }
                                  >
                                    {batch.batchNumber}
                                  </button>
                                  <span className={styles.cellSub}>
                                    Order: {batch.orderNumber}
                                  </span>
                                </td>
                                <td>{batch.productName}</td>
                                <td className={styles.tabular}>
                                  <strong>{batch.asrsLocation}</strong>
                                  <span className={styles.cellSub}>
                                    {batch.asrsZone}
                                  </span>
                                </td>
                                <td className={styles.tabular}>
                                  {batch.storageState ===
                                  "Tersimpan di AS/RS" ? (
                                    formatQuantityWithUnit(
                                      batch.storedQty,
                                      batch.unit,
                                    )
                                  ) : batch.storageState === "Siap disimpan" ? (
                                    <span>
                                      0 /{" "}
                                      {formatQuantityWithUnit(
                                        batch.actualQty,
                                        batch.unit,
                                      )}{" "}
                                      siap simpan
                                    </span>
                                  ) : (
                                    `0 ${batch.unit}`
                                  )}
                                </td>
                                <td>
                                  <QcReleasePill state={batch.qcReleaseState} />
                                </td>
                                <td>
                                  <StorageStatePill
                                    state={batch.storageState}
                                  />
                                </td>
                                <td>
                                  <SyncStatePill
                                    state={batch.inventorySyncState}
                                  />
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className={styles.textLink}
                                    onClick={() =>
                                      setSelectedWarehouseBatchId(batch.id)
                                    }
                                  >
                                    {canConfirm
                                      ? "Konfirmasi Penyimpanan"
                                      : "Lihat gudang"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            ) : (
              /* ================= SUBVIEW: HPP ================= */
              <>
                <div className={styles.kpiGrid}>
                  <article className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>
                      Total Biaya Produksi (HPP)
                    </span>
                    <strong className={styles.kpiValue}>
                      {formatRupiahFull(
                        batches.reduce(
                          (acc, b) => acc + computeBatchTotalCost(b),
                          0,
                        ),
                      )}
                    </strong>
                    <span className={styles.kpiSub}>
                      Akumulasi Bahan Baku, Tenaga Kerja, dan Overhead (
                      {batches.length} batch)
                    </span>
                  </article>

                  <article className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>
                      Rata-rata HPP per Unit (Karton)
                    </span>
                    <strong className={styles.kpiValue}>
                      {formatRupiahFull(
                        Math.round(
                          batches.reduce(
                            (acc, b) => acc + computeBatchTotalCost(b),
                            0,
                          ) /
                            Math.max(
                              1,
                              batches.reduce((acc, b) => acc + b.actualQty, 0),
                            ),
                        ),
                      )}
                    </strong>
                    <span className={styles.kpiSub}>
                      Total output terhitung:{" "}
                      {formatQuantityWithUnit(
                        batches.reduce((acc, b) => acc + b.actualQty, 0),
                        "karton",
                      )}
                    </span>
                  </article>

                  <article className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>
                      Batch Perlu Tinjauan HPP
                    </span>
                    <strong className={styles.kpiValue}>
                      {
                        batches.filter(
                          (b) => b.hppAuditStatus === "Perlu tinjauan HPP",
                        ).length
                      }{" "}
                      batch
                    </strong>
                    <span className={styles.kpiSub}>
                      {
                        batches.filter(
                          (b) => b.hppAuditStatus === "Terverifikasi Audit",
                        ).length
                      }{" "}
                      batch telah terverifikasi audit biaya
                    </span>
                  </article>
                </div>

                <div className={styles.splitGrid}>
                  <section className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h2 className={styles.cardTitle}>
                        Rincian Komposisi Biaya Produksi (HPP)
                      </h2>
                      <span className={styles.unitBadge}>
                        Bahan Baku · Tenaga Kerja · Overhead
                      </span>
                    </div>
                    <CostBreakdownVisual batches={batches} />
                  </section>

                  <section className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h2 className={styles.cardTitle}>
                        Antrean Tinjauan HPP &amp; Audit Biaya
                      </h2>
                    </div>
                    <ul className={styles.followUpList}>
                      {batches
                        .filter(
                          (b) => b.hppAuditStatus === "Perlu tinjauan HPP",
                        )
                        .map((b) => (
                          <li className={styles.followUpItem} key={b.id}>
                            <div className={styles.followUpMain}>
                              <span className={styles.followUpTitle}>
                                {b.batchNumber} · {b.productName}
                              </span>
                              <span className={styles.followUpMeta}>
                                Total {formatRupiahCompact(computeBatchTotalCost(b))}{" "}
                                · HPP {formatRupiahFull(computeBatchUnitHpp(b))}
                                /karton
                              </span>
                            </div>
                            <div className={styles.followUpRight}>
                              <button
                                type="button"
                                className={styles.textLink}
                                onClick={() => setSelectedHppBatchId(b.id)}
                              >
                                Tinjau HPP
                              </button>
                            </div>
                          </li>
                        ))}
                    </ul>
                  </section>
                </div>

                <section className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>
                      Tabel Perhitungan HPP per Batch &amp; Status Audit
                    </h2>
                    <div className={styles.headerControls}>
                      <label className={styles.searchBox}>
                        <Search aria-hidden />
                        <span className="sr-only">
                          Cari nomor batch, produk, atau jurnal HPP
                        </span>
                        <input
                          type="search"
                          value={hppSearch}
                          onChange={(e) => setHppSearch(e.target.value)}
                          placeholder="Cari nomor batch, produk, atau jurnal"
                        />
                      </label>
                      <div className={styles.selectControl}>
                        <label htmlFor="hpp-audit-filter" className="sr-only">
                          Filter status tinjauan HPP
                        </label>
                        <select
                          id="hpp-audit-filter"
                          value={hppFilter}
                          onChange={(e) =>
                            setHppFilter(
                              e.target.value as "ALL" | HppAuditStatus,
                            )
                          }
                        >
                          <option value="ALL">Semua status audit HPP</option>
                          <option value="Perlu tinjauan HPP">
                            Perlu tinjauan HPP
                          </option>
                          <option value="Terverifikasi Audit">
                            Terverifikasi Audit
                          </option>
                          <option value="Menunggu penyelesaian batch">
                            Menunggu penyelesaian batch
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div
                    className={styles.tableWrap}
                    role="region"
                    tabIndex={0}
                    aria-label="Tabel Perhitungan HPP per Batch"
                  >
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">No. Batch</th>
                          <th scope="col">Produk &amp; Output</th>
                          <th scope="col">Biaya Bahan Baku</th>
                          <th scope="col">Tenaga Kerja</th>
                          <th scope="col">Overhead Pabrik</th>
                          <th scope="col">HPP per Unit</th>
                          <th scope="col">Status Audit</th>
                          <th scope="col">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHppBatches.length === 0 ? (
                          <tr>
                            <td colSpan={8} className={styles.emptyRow}>
                              Tidak ada catatan HPP batch yang cocok dengan
                              filter.
                            </td>
                          </tr>
                        ) : (
                          filteredHppBatches.map((batch) => {
                            const unitHpp = computeBatchUnitHpp(batch);
                            const canReview =
                              batch.hppAuditStatus === "Perlu tinjauan HPP";
                            return (
                              <tr key={`hpp-${batch.id}`}>
                                <td className={styles.tabular}>
                                  <button
                                    type="button"
                                    className={styles.codeLink}
                                    onClick={() =>
                                      setSelectedHppBatchId(batch.id)
                                    }
                                  >
                                    {batch.batchNumber}
                                  </button>
                                  <span className={styles.cellSub}>
                                    {batch.hppJournalRef}
                                  </span>
                                </td>
                                <td>
                                  {batch.productName}
                                  <span className={styles.cellSub}>
                                    Output:{" "}
                                    {formatQuantityWithUnit(
                                      batch.actualQty,
                                      batch.unit,
                                    )}
                                  </span>
                                </td>
                                <td className={styles.tabular}>
                                  {formatRupiahFull(batch.materialCost)}
                                </td>
                                <td className={styles.tabular}>
                                  {formatRupiahFull(batch.laborCost)}
                                </td>
                                <td className={styles.tabular}>
                                  {formatRupiahFull(batch.overheadCost)}
                                </td>
                                <td className={styles.tabular}>
                                  <strong>{formatRupiahFull(unitHpp)}</strong>
                                  <span className={styles.cellSub}>
                                    Std:{" "}
                                    {formatRupiahFull(batch.standardHppPerUnit)}
                                    /karton
                                  </span>
                                </td>
                                <td>
                                  <HppStatusPill
                                    status={batch.hppAuditStatus}
                                  />
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className={styles.textLink}
                                    onClick={() =>
                                      setSelectedHppBatchId(batch.id)
                                    }
                                  >
                                    {canReview ? "Tinjau HPP" : "Lihat HPP"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </div>

      {/* Drawers */}
      <ProductionOrderDetailDrawer
        order={selectedOrder}
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null);
        }}
        user={user}
        onReviewMaterials={handleReviewMaterials}
        onReleaseOrder={handleReleaseOrder}
        onOpenBatch={(batchNumber) => openBatchRecord(batchNumber, "batch")}
      />

      <BatchDetailDrawer
        batch={selectedBatch}
        onOpenChange={(open) => {
          if (!open) setSelectedBatchId(null);
        }}
        user={user}
        onRecordProductionResult={handleRecordProductionResult}
        onReviewQcTests={handleReviewQcTests}
        onReleaseBatch={handleReleaseBatch}
        onHoldBatch={handleHoldBatch}
        onOpenOrder={(orderNumber) => openOrderRecord(orderNumber, true)}
      />

      <WarehouseBatchDrawer
        batch={selectedWarehouseBatch}
        onOpenChange={(open) => {
          if (!open) setSelectedWarehouseBatchId(null);
        }}
        user={user}
        onConfirmStorage={handleConfirmStorage}
      />

      <HppBatchDrawer
        batch={selectedHppBatch}
        onOpenChange={(open) => {
          if (!open) setSelectedHppBatchId(null);
        }}
        user={user}
        onReviewHpp={handleReviewHpp}
      />
    </section>
  );
}
