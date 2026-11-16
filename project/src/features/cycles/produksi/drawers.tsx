"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, Check, Clock3, X } from "lucide-react";
import type { User } from "@/shared/contracts/auth";
import { can } from "@/lib/auth/permissions";
import {
  computeBatchTotalCost,
  computeBatchUnitHpp,
  formatNumberId,
  formatQuantityWithUnit,
  formatRupiahFull,
  type BatchStatus,
  type HppAuditStatus,
  type InventorySyncState,
  type ProductionBatchRecord,
  type ProductionOrderRecord,
  type ProductionOrderStatus,
  type QcReleaseState,
  type StorageState,
  type TaskStatus,
} from "./data";
import styles from "./produksi.module.css";

function DrawerShell({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="drawer"
          style={{ overscrollBehavior: "contain" }}
        >
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
          <Dialog.Close
            className="icon-button drawer-close"
            aria-label="Tutup panel"
          >
            <X size={20} />
          </Dialog.Close>
          <div className="drawer-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function TaskStatusPill({ status }: { status: TaskStatus }) {
  const cls =
    status === "Sedang berjalan"
      ? styles.pillInfo
      : status === "Perlu ditinjau" || status === "Menunggu QC"
        ? styles.pillWarning
        : styles.pillSuccess;
  return <span className={`${styles.pill} ${cls}`}>{status}</span>;
}

export function OrderStatusPill({ status }: { status: ProductionOrderStatus }) {
  const cls =
    status === "Dirilis ke produksi"
      ? styles.pillInfo
      : status === "Siap dirilis"
        ? styles.pillSuccess
        : status === "Menunggu bahan (FPBB)"
          ? styles.pillWarning
          : styles.pillDanger;
  return <span className={`${styles.pill} ${cls}`}>{status}</span>;
}

export function BatchStatusPill({ status }: { status: BatchStatus }) {
  const cls =
    status === "Dalam Proses"
      ? styles.pillInfo
      : status === "Menunggu QC"
        ? styles.pillWarning
        : status === "Ditahan"
          ? styles.pillDanger
          : styles.pillSuccess;
  return <span className={`${styles.pill} ${cls}`}>{status}</span>;
}

export function QcReleasePill({ state }: { state: QcReleaseState }) {
  const cls =
    state === "Dirilis QC"
      ? styles.pillSuccess
      : state === "Menunggu QC"
        ? styles.pillWarning
        : styles.pillDanger;
  return <span className={`${styles.pill} ${cls}`}>{state}</span>;
}

export function StorageStatePill({ state }: { state: StorageState }) {
  const cls =
    state === "Tersimpan di AS/RS"
      ? styles.pillSuccess
      : state === "Siap disimpan"
        ? styles.pillInfo
        : state === "Karantina QC"
          ? styles.pillDanger
          : styles.pillNeutral;
  return <span className={`${styles.pill} ${cls}`}>{state}</span>;
}

export function SyncStatePill({ state }: { state: InventorySyncState }) {
  const cls =
    state === "Tersinkron ke Stok"
      ? styles.pillSuccess
      : state === "Menunggu konfirmasi"
        ? styles.pillWarning
        : styles.pillDanger;
  return <span className={`${styles.pill} ${cls}`}>{state}</span>;
}

export function HppStatusPill({ status }: { status: HppAuditStatus }) {
  const cls =
    status === "Terverifikasi Audit"
      ? styles.pillSuccess
      : status === "Perlu tinjauan HPP"
        ? styles.pillWarning
        : styles.pillNeutral;
  return <span className={`${styles.pill} ${cls}`}>{status}</span>;
}

export function ProductionOrderDetailDrawer({
  order,
  onOpenChange,
  user,
  onReviewMaterials,
  onReleaseOrder,
  onOpenBatch,
}: {
  order: ProductionOrderRecord | null;
  onOpenChange: (open: boolean) => void;
  user: User;
  onReviewMaterials: (orderId: string, note: string) => void;
  onReleaseOrder: (orderId: string) => void;
  onOpenBatch: (batchNumber: string) => void;
}) {
  const [reviewNote, setReviewNote] = useState(
    "Kebutuhan kekurangan bahan telah diverifikasi; pengajuan FPBB diteruskan ke Gudang RM & Purchasing.",
  );

  if (!order) return null;

  const canReviewMaterials = can(user, "production_orders:write");
  const canReleaseOrder = can(user, "production_orders:write");

  const hasShortage = order.materials.some((m) => m.shortQty > 0);

  return (
    <DrawerShell
      open={!!order}
      onOpenChange={onOpenChange}
      title={`${order.number} — ${order.productName}`}
      description={`Jadwal ${order.scheduleDateLabel} · ${order.shiftLabel} · ${order.productionLine}`}
    >
      <div className={styles.drawerStack}>
        <div className={styles.drawerSection}>
          <div className={styles.drawerSectionHeader}>
            <h3>Ringkasan Order Produksi</h3>
            <OrderStatusPill status={order.status} />
          </div>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span>Nomor Order</span>
              <strong>{order.number}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Kode Jadwal MPS</span>
              <strong>{order.mpsCode}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Kuantitas Rencana</span>
              <strong>
                {formatQuantityWithUnit(order.plannedQty, order.unit)}
              </strong>
            </div>
            <div className={styles.metaItem}>
              <span>Jadwal &amp; Shift</span>
              <strong>
                {order.scheduleDateLabel} · {order.shiftLabel}
              </strong>
            </div>
            <div className={styles.metaItem}>
              <span>Lini Produksi</span>
              <strong>{order.productionLine}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Gudang Bahan Baku</span>
              <strong>{order.warehouseName}</strong>
            </div>
          </div>
          {order.linkedBatchNumber && (
            <div
              style={{
                paddingTop: 8,
                borderTop: "1px solid #dce6f7",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 12.5, color: "#36476a" }}>
                Batch Produksi Terkait:
              </span>
              <button
                type="button"
                className={styles.codeLink}
                onClick={() => {
                  onOpenChange(false);
                  onOpenBatch(order.linkedBatchNumber!);
                }}
              >
                {order.linkedBatchNumber}
              </button>
            </div>
          )}
        </div>

        <div className={styles.drawerSection}>
          <div className={styles.drawerSectionHeader}>
            <h3>Kebutuhan Bahan Baku &amp; Kemasan (MRP)</h3>
            {hasShortage ? (
              <span className={`${styles.pill} ${styles.pillDanger}`}>
                Ada kekurangan bahan
              </span>
            ) : (
              <span className={`${styles.pill} ${styles.pillSuccess}`}>
                Bahan tersedia lengkap
              </span>
            )}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.miniTable}>
              <thead>
                <tr>
                  <th scope="col">Bahan</th>
                  <th scope="col">Kebutuhan</th>
                  <th scope="col">Tersedia</th>
                  <th scope="col">Kekurangan</th>
                </tr>
              </thead>
              <tbody>
                {order.materials.map((mat) => (
                  <tr key={mat.code}>
                    <td>
                      <strong>{mat.code}</strong>
                      <div style={{ fontSize: 11.5, color: "#36476a" }}>
                        {mat.name}
                      </div>
                    </td>
                    <td>{formatQuantityWithUnit(mat.requiredQty, mat.unit)}</td>
                    <td>
                      {formatQuantityWithUnit(mat.availableQty, mat.unit)}
                    </td>
                    <td>
                      {mat.shortQty > 0 ? (
                        <span className={`${styles.pill} ${styles.pillDanger}`}>
                          {formatQuantityWithUnit(mat.shortQty, mat.unit)}
                        </span>
                      ) : (
                        <span
                          className={`${styles.pill} ${styles.pillSuccess}`}
                        >
                          0 {mat.unit}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: "#2b3f66" }}>
            <strong>Catatan PPIC:</strong> {order.planningNote}
          </p>
        </div>

        {order.status === "Kekurangan bahan" && (
          <div className={styles.drawerForm}>
            {!canReviewMaterials && (
              <div className={styles.drawerNotice} role="status">
                Tindakan <strong>Tinjau Kebutuhan Bahan</strong> diotorisasi
                untuk peran <strong>Produksi (PPIC)</strong> atau{" "}
                <strong>Gudang</strong>. Akun Anda saat ini bersifat hanya-baca.
              </div>
            )}
            <label>
              Catatan Tinjauan Kebutuhan Bahan &amp; Koordinasi FPBB
              <textarea
                rows={2}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                disabled={!canReviewMaterials}
              />
            </label>
            <div className={styles.drawerActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => onOpenChange(false)}
              >
                Tutup
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={!canReviewMaterials}
                onClick={() => {
                  onReviewMaterials(order.id, reviewNote.trim());
                  onOpenChange(false);
                }}
              >
                Tinjau Kebutuhan Bahan
              </button>
            </div>
          </div>
        )}

        {order.status === "Siap dirilis" && (
          <>
            {!canReleaseOrder && (
              <div className={styles.drawerNotice} role="status">
                Tindakan <strong>Rilis Order</strong> diotorisasi untuk peran{" "}
                <strong>Produksi (PPIC)</strong> atau{" "}
                <strong>Pejabat Penyetuju (Plant Manager)</strong>. Akun Anda
                saat ini bersifat hanya-baca.
              </div>
            )}
            <div className={styles.drawerActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => onOpenChange(false)}
              >
                Tutup
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={!canReleaseOrder}
                onClick={() => {
                  onReleaseOrder(order.id);
                  onOpenChange(false);
                }}
              >
                Rilis Order
              </button>
            </div>
          </>
        )}

        {(order.status === "Dirilis ke produksi" ||
          order.status === "Menunggu bahan (FPBB)") && (
          <div className={styles.drawerActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => onOpenChange(false)}
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </DrawerShell>
  );
}

export function BatchDetailDrawer({
  batch,
  onOpenChange,
  user,
  onRecordProductionResult,
  onReviewQcTests,
  onReleaseBatch,
  onHoldBatch,
  onOpenOrder,
}: {
  batch: ProductionBatchRecord | null;
  onOpenChange: (open: boolean) => void;
  user: User;
  onRecordProductionResult: (
    batchId: string,
    actualQty: number,
    rejectQty: number,
    processNote: string,
  ) => void;
  onReviewQcTests: (batchId: string, qcNote: string) => void;
  onReleaseBatch: (batchId: string) => void;
  onHoldBatch: (batchId: string, holdReason: string) => void;
  onOpenOrder: (orderNumber: string) => void;
}) {
  const [actualInput, setActualInput] = useState("");
  const [rejectInput, setRejectInput] = useState("");
  const [processNote, setProcessNote] = useState(
    "Sterilisasi UHT 138,5°C stabil selama siklus penuh; pengemasan aseptik selesai dan sampel diserahkan ke QC.",
  );
  const [qcReviewNote, setQcReviewNote] = useState(
    "Parameter pH, viskositas, berat bersih, dan uji mikrobiologi B0 sesuai standar mutu Ultrajaya.",
  );
  const [holdReasonInput, setHoldReasonInput] = useState("");
  const [showHoldForm, setShowHoldForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!batch) return null;

  const canRecordProduction = can(user, "batches:write");
  const canManageQc = can(user, "production_qc:write");

  const actionTitle =
    batch.nextAction === "CATAT_HASIL"
      ? "Catat Hasil Produksi"
      : batch.nextAction === "TINJAU_UJI"
        ? "Tinjau Hasil Uji"
        : batch.nextAction === "RILIS_BATCH"
          ? "Rilis Batch"
          : null;

  return (
    <DrawerShell
      open={!!batch}
      onOpenChange={(open) => {
        if (!open) {
          setShowHoldForm(false);
          setError(null);
        }
        onOpenChange(open);
      }}
      title={`${batch.batchNumber} — ${batch.productName}`}
      description={`${batch.productionLine} · ${batch.dateLabel} (${batch.shiftLabel})`}
    >
      <div className={styles.drawerStack}>
        {batch.status === "Ditahan" && (
          <div className={styles.holdAlertBox} role="alert">
            <div className={styles.holdAlertHeader}>
              <span className={styles.holdAlertTitle}>
                <AlertTriangle
                  size={16}
                  style={{
                    display: "inline",
                    verticalAlign: "text-bottom",
                    marginRight: 6,
                  }}
                  aria-hidden
                />
                Batch Ditahan oleh QC (Hold Karantina)
              </span>
              <span className={`${styles.pill} ${styles.pillDanger}`}>
                {batch.holdZone ?? "Area Karantina"}
              </span>
            </div>
            <p className={styles.holdAlertBody}>
              <strong>Alasan Penahanan:</strong>{" "}
              {batch.holdReason ??
                "Ditemukan ketidaksesuaian parameter mutu pada uji akhir batch."}
            </p>
          </div>
        )}

        <div className={styles.drawerSection}>
          <div className={styles.drawerSectionHeader}>
            <h3>Identitas &amp; Hasil Batch</h3>
            <BatchStatusPill status={batch.status} />
          </div>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span>Nomor Batch</span>
              <strong>{batch.batchNumber}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Order Produksi</span>
              <div>
                <button
                  type="button"
                  className={styles.codeLink}
                  onClick={() => {
                    onOpenChange(false);
                    onOpenOrder(batch.orderNumber);
                  }}
                >
                  {batch.orderNumber}
                </button>
              </div>
            </div>
            <div className={styles.metaItem}>
              <span>Target Rencana</span>
              <strong>
                {formatQuantityWithUnit(batch.plannedQty, batch.unit)}
              </strong>
            </div>
            <div className={styles.metaItem}>
              <span>Output Tercatat / Reject</span>
              <strong>
                {formatQuantityWithUnit(batch.actualQty, batch.unit)} (Reject{" "}
                {formatNumberId(batch.rejectQty)})
              </strong>
            </div>
            <div className={styles.metaItem}>
              <span>Parameter UHT &amp; pH</span>
              <strong>
                {batch.uhtTempCelsius} · pH {batch.phLevel}
              </strong>
            </div>
            <div className={styles.metaItem}>
              <span>Mikrobiologi &amp; Kemasan</span>
              <strong>
                {batch.microbiologyResult} · {batch.sealIntegrityResult}
              </strong>
            </div>
          </div>
        </div>

        <div className={styles.drawerSection}>
          <h3>
            Alur Tahapan Batch (Inspeksi &amp; Persiapan Bahan → UHT &amp;
            Pengemasan → Uji Batch &amp; Rilis QC)
          </h3>
          <ol className={styles.timelineList}>
            {batch.timeline.map((step, index) => {
              const stepCls =
                step.state === "held"
                  ? `${styles.timelineStep} ${styles.timelineStepHeld}`
                  : step.state === "current"
                    ? `${styles.timelineStep} ${styles.timelineStepCurrent}`
                    : styles.timelineStep;
              const dotCls =
                step.state === "completed"
                  ? `${styles.timelineDot} ${styles.dotCompleted}`
                  : step.state === "current"
                    ? `${styles.timelineDot} ${styles.dotCurrent}`
                    : step.state === "held"
                      ? `${styles.timelineDot} ${styles.dotHeld}`
                      : `${styles.timelineDot} ${styles.dotUpcoming}`;

              return (
                <li key={step.key} className={stepCls}>
                  <span className={dotCls} aria-hidden>
                    {step.state === "completed" ? (
                      <Check size={14} />
                    ) : step.state === "held" ? (
                      "!"
                    ) : step.state === "current" ? (
                      index + 1
                    ) : (
                      <Clock3 size={13} />
                    )}
                  </span>
                  <div className={styles.timelineBody}>
                    <div className={styles.timelineTop}>
                      <span className={styles.timelineTitle}>{step.title}</span>
                      <span className={styles.timelineMeta}>
                        {step.timestampLabel} · {step.actorLabel}
                      </span>
                    </div>
                    <p className={styles.timelineResult}>
                      {step.resultSummary}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {batch.nextAction === "CATAT_HASIL" && (
          <div className={styles.drawerSection}>
            <h3>Tindakan Berikutnya: Catat Hasil Produksi</h3>
            {!canRecordProduction && (
              <div className={styles.drawerNotice} role="status">
                Tindakan <strong>Catat Hasil Produksi</strong> diotorisasi untuk
                peran <strong>Operator Produksi (PRODUCTION)</strong>. Akun Anda
                saat ini bersifat hanya-baca.
              </div>
            )}
            <form
              className={styles.drawerForm}
              onSubmit={(e) => {
                e.preventDefault();
                if (!canRecordProduction) return;
                const finalActual = actualInput.trim()
                  ? Number(actualInput)
                  : batch.actualQty;
                const finalReject = rejectInput.trim()
                  ? Number(rejectInput)
                  : batch.rejectQty;
                if (!Number.isFinite(finalActual) || finalActual <= 0) {
                  setError("Masukkan kuantitas output baik yang valid.");
                  return;
                }
                setError(null);
                onRecordProductionResult(
                  batch.id,
                  finalActual,
                  Math.max(0, finalReject),
                  processNote.trim(),
                );
                onOpenChange(false);
              }}
            >
              <div className={styles.metaGrid}>
                <label>
                  Output Baik (karton)
                  <input
                    type="number"
                    min={1}
                    placeholder={String(batch.actualQty)}
                    value={actualInput}
                    onChange={(e) => setActualInput(e.target.value)}
                    disabled={!canRecordProduction}
                  />
                </label>
                <label>
                  Reject Kemasan (karton)
                  <input
                    type="number"
                    min={0}
                    placeholder={String(batch.rejectQty)}
                    value={rejectInput}
                    onChange={(e) => setRejectInput(e.target.value)}
                    disabled={!canRecordProduction}
                  />
                </label>
              </div>
              <label>
                Catatan Penyelesaian UHT &amp; Pengemasan
                <input
                  type="text"
                  value={processNote}
                  onChange={(e) => setProcessNote(e.target.value)}
                  disabled={!canRecordProduction}
                />
              </label>
              {error && (
                <p className="field-error" role="alert">
                  {error}
                </p>
              )}
              <div className={styles.drawerActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => onOpenChange(false)}
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={!canRecordProduction}
                >
                  Catat Hasil Produksi
                </button>
              </div>
            </form>
          </div>
        )}

        {(batch.nextAction === "TINJAU_UJI" ||
          batch.nextAction === "RILIS_BATCH") && (
          <div className={styles.drawerSection}>
            <h3>Tindakan Berikutnya: {actionTitle}</h3>
            {!canManageQc && (
              <div className={styles.drawerNotice} role="status">
                Tindakan <strong>{actionTitle}</strong> dan penetapan status
                Hold diotorisasi untuk peran{" "}
                <strong>Quality Control (QC)</strong>. Akun Anda saat ini
                bersifat hanya-baca.
              </div>
            )}

            {batch.nextAction === "TINJAU_UJI" && !showHoldForm && (
              <div className={styles.drawerForm}>
                <label>
                  Kesimpulan Evaluasi Uji Laboratorium QC
                  <textarea
                    rows={2}
                    value={qcReviewNote}
                    onChange={(e) => setQcReviewNote(e.target.value)}
                    disabled={!canManageQc}
                  />
                </label>
              </div>
            )}

            {showHoldForm && (
              <div className={styles.drawerForm}>
                <label>
                  Alasan Penahanan Batch (QC Hold)
                  <textarea
                    rows={2}
                    placeholder="Contoh: Deviasi pH di bawah 6,60 atau temuan kebocoran seal pada sampel..."
                    value={holdReasonInput}
                    onChange={(e) => setHoldReasonInput(e.target.value)}
                    disabled={!canManageQc}
                  />
                </label>
                {error && (
                  <p className="field-error" role="alert">
                    {error}
                  </p>
                )}
              </div>
            )}

            <div className={styles.drawerActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => onOpenChange(false)}
              >
                Tutup
              </button>

              {!showHoldForm ? (
                <>
                  <button
                    type="button"
                    className={styles.dangerButton}
                    disabled={!canManageQc}
                    onClick={() => setShowHoldForm(true)}
                  >
                    Tahan Batch (Hold)
                  </button>
                  {batch.nextAction === "TINJAU_UJI" ? (
                    <button
                      type="button"
                      className={styles.primaryButton}
                      disabled={!canManageQc}
                      onClick={() => {
                        onReviewQcTests(batch.id, qcReviewNote.trim());
                        onOpenChange(false);
                      }}
                    >
                      Tinjau Hasil Uji
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.primaryButton}
                      disabled={!canManageQc}
                      onClick={() => {
                        onReleaseBatch(batch.id);
                        onOpenChange(false);
                      }}
                    >
                      Rilis Batch
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => {
                      setShowHoldForm(false);
                      setError(null);
                    }}
                  >
                    Batal Hold
                  </button>
                  <button
                    type="button"
                    className={styles.dangerButton}
                    disabled={!canManageQc}
                    onClick={() => {
                      if (!holdReasonInput.trim()) {
                        setError("Alasan penahanan QC wajib diisi.");
                        return;
                      }
                      onHoldBatch(batch.id, holdReasonInput.trim());
                      onOpenChange(false);
                    }}
                  >
                    Konfirmasi Tahan Batch
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {batch.nextAction === "NONE" && (
          <div className={styles.drawerActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => onOpenChange(false)}
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </DrawerShell>
  );
}

export function WarehouseBatchDrawer({
  batch,
  onOpenChange,
  user,
  onConfirmStorage,
}: {
  batch: ProductionBatchRecord | null;
  onOpenChange: (open: boolean) => void;
  user: User;
  onConfirmStorage: (batchId: string, asrsLocation: string) => void;
}) {
  const [locationInput, setLocationInput] = useState("");

  if (!batch) return null;

  const canConfirmStorage = can(user, "storage:confirm");
  const isReadyToConfirm =
    batch.qcReleaseState === "Dirilis QC" &&
    batch.storageState === "Siap disimpan";

  return (
    <DrawerShell
      open={!!batch}
      onOpenChange={onOpenChange}
      title={`Gudang AS/RS — ${batch.batchNumber}`}
      description={`${batch.productName} · Order ${batch.orderNumber}`}
    >
      <div className={styles.drawerStack}>
        <div className={styles.drawerSection}>
          <h3>Status Terpisah: Rilis QC · Penyimpanan · Sinkronisasi Stok</h3>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span>1. Status Rilis QC</span>
              <div>
                <QcReleasePill state={batch.qcReleaseState} />
              </div>
            </div>
            <div className={styles.metaItem}>
              <span>2. Status Penyimpanan AS/RS</span>
              <div>
                <StorageStatePill state={batch.storageState} />
              </div>
            </div>
            <div className={styles.metaItem}>
              <span>3. Sinkronisasi Stok ERP</span>
              <div>
                <SyncStatePill state={batch.inventorySyncState} />
              </div>
            </div>
            <div className={styles.metaItem}>
              <span>Referensi Bukti Gudang</span>
              <strong>{batch.fgReceiptRef ?? "Menunggu konfirmasi"}</strong>
            </div>
          </div>
        </div>

        <div className={styles.drawerSection}>
          <h3>Rincian Lokasi AS/RS &amp; Kuantitas Barang Jadi</h3>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span>Nomor Batch</span>
              <strong>{batch.batchNumber}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Zona Penyimpanan</span>
              <strong>{batch.asrsZone}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Lokasi Rak AS/RS</span>
              <strong>{batch.asrsLocation}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Kuantitas Tersimpan / Layak</span>
              <strong>
                {formatQuantityWithUnit(batch.storedQty, batch.unit)} /{" "}
                {formatQuantityWithUnit(batch.actualQty, batch.unit)}
              </strong>
            </div>
          </div>
        </div>

        {batch.status === "Ditahan" && batch.holdReason && (
          <div className={styles.holdAlertBox}>
            <span className={styles.holdAlertTitle}>
              Diblokir dari Penyimpanan Barang Jadi (AS/RS)
            </span>
            <p className={styles.holdAlertBody}>{batch.holdReason}</p>
          </div>
        )}

        {isReadyToConfirm ? (
          <div className={styles.drawerSection}>
            <h3>Konfirmasi Penyimpanan AS/RS &amp; Sinkronisasi Persediaan</h3>
            {!canConfirmStorage && (
              <div className={styles.drawerNotice} role="status">
                Tindakan <strong>Konfirmasi Penyimpanan</strong> diotorisasi
                untuk peran <strong>Gudang (WAREHOUSE)</strong>. Akun Anda saat
                ini bersifat hanya-baca.
              </div>
            )}
            <div className={styles.drawerForm}>
              <label>
                Konfirmasi Kode Rak AS/RS
                <input
                  type="text"
                  placeholder={batch.asrsLocation}
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  disabled={!canConfirmStorage}
                />
              </label>
              <div className={styles.drawerActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => onOpenChange(false)}
                >
                  Tutup
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={!canConfirmStorage}
                  onClick={() => {
                    onConfirmStorage(
                      batch.id,
                      locationInput.trim() || batch.asrsLocation,
                    );
                    setLocationInput("");
                    onOpenChange(false);
                  }}
                >
                  Konfirmasi Penyimpanan
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.drawerActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => onOpenChange(false)}
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </DrawerShell>
  );
}

export function HppBatchDrawer({
  batch,
  onOpenChange,
  user,
  onReviewHpp,
}: {
  batch: ProductionBatchRecord | null;
  onOpenChange: (open: boolean) => void;
  user: User;
  onReviewHpp: (batchId: string, controllerNote: string) => void;
}) {
  const [noteInput, setNoteInput] = useState(
    "Komponen biaya bahan baku, tenaga kerja langsung, dan overhead pabrik telah diperiksa dan dinyatakan wajar sesuai standar akuntansi biaya.",
  );

  if (!batch) return null;

  const canReviewHpp = can(user, "production_costs:review");
  const isReviewable = batch.hppAuditStatus === "Perlu tinjauan HPP";

  const totalCost = computeBatchTotalCost(batch);
  const unitHpp = computeBatchUnitHpp(batch);
  const diffPerUnit = unitHpp - batch.standardHppPerUnit;
  const diffPct =
    batch.standardHppPerUnit > 0
      ? ((diffPerUnit / batch.standardHppPerUnit) * 100).toFixed(2)
      : "0.00";

  return (
    <DrawerShell
      open={!!batch}
      onOpenChange={onOpenChange}
      title={`Rincian HPP — ${batch.batchNumber}`}
      description={`${batch.productName} · Order ${batch.orderNumber} · Jurnal ${batch.hppJournalRef}`}
    >
      <div className={styles.drawerStack}>
        <div className={styles.drawerSection}>
          <div className={styles.drawerSectionHeader}>
            <h3>Ringkasan Perhitungan HPP &amp; Status Audit</h3>
            <HppStatusPill status={batch.hppAuditStatus} />
          </div>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span>Nomor Batch</span>
              <strong>{batch.batchNumber}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Kuantitas Dasar Perhitungan</span>
              <strong>
                {formatQuantityWithUnit(batch.actualQty, batch.unit)}
              </strong>
            </div>
            <div className={styles.metaItem}>
              <span>Total Biaya Produksi</span>
              <strong>{formatRupiahFull(totalCost)}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>HPP Aktual per Karton</span>
              <strong>{formatRupiahFull(unitHpp)} / karton</strong>
            </div>
            <div className={styles.metaItem}>
              <span>HPP Anggaran Standar</span>
              <strong>
                {formatRupiahFull(batch.standardHppPerUnit)} / karton
              </strong>
            </div>
            <div className={styles.metaItem}>
              <span>Varians terhadap Standar</span>
              <strong>
                {diffPerUnit >= 0 ? "+" : ""}
                {formatRupiahFull(diffPerUnit)} ({diffPct}%)
              </strong>
            </div>
          </div>
        </div>

        <div className={styles.drawerSection}>
          <h3>Komponen Biaya Produksi Batch</h3>
          <table className={styles.miniTable}>
            <thead>
              <tr>
                <th scope="col">Komponen Biaya</th>
                <th scope="col">Porsi</th>
                <th scope="col">Nominal (IDR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Biaya Bahan Baku &amp; Kemasan</td>
                <td>{Math.round((batch.materialCost / totalCost) * 100)}%</td>
                <td>{formatRupiahFull(batch.materialCost)}</td>
              </tr>
              <tr>
                <td>Biaya Tenaga Kerja Langsung</td>
                <td>{Math.round((batch.laborCost / totalCost) * 100)}%</td>
                <td>{formatRupiahFull(batch.laborCost)}</td>
              </tr>
              <tr>
                <td>Biaya Overhead Pabrik (UHT, CIP, AS/RS)</td>
                <td>{Math.round((batch.overheadCost / totalCost) * 100)}%</td>
                <td>{formatRupiahFull(batch.overheadCost)}</td>
              </tr>
              <tr>
                <td>
                  <strong>Total HPP Batch</strong>
                </td>
                <td>
                  <strong>100%</strong>
                </td>
                <td>
                  <strong>{formatRupiahFull(totalCost)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{ margin: 0, fontSize: 12.5, color: "#2b3f66" }}>
            <strong>Catatan Evaluasi Biaya:</strong> {batch.hppControllerNote}
          </p>
        </div>

        {isReviewable ? (
          <div className={styles.drawerSection}>
            <h3>Tindakan: Tinjau HPP &amp; Pengesahan Audit Biaya</h3>
            {!canReviewHpp && (
              <div className={styles.drawerNotice} role="status">
                Tindakan <strong>Tinjau HPP</strong> diotorisasi untuk peran{" "}
                <strong>Akuntansi (ACCOUNTING)</strong> atau{" "}
                <strong>Financial Controller (FAM)</strong>. Akun Anda saat ini
                bersifat hanya-baca.
              </div>
            )}
            <div className={styles.drawerForm}>
              <label>
                Catatan Pengesahan Akuntan Biaya / Financial Controller
                <textarea
                  rows={2}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  disabled={!canReviewHpp}
                />
              </label>
              <div className={styles.drawerActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => onOpenChange(false)}
                >
                  Tutup
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={!canReviewHpp}
                  onClick={() => {
                    onReviewHpp(batch.id, noteInput.trim());
                    onOpenChange(false);
                  }}
                >
                  Tinjau HPP
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.drawerActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => onOpenChange(false)}
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </DrawerShell>
  );
}
