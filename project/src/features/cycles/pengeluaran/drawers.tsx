"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { User } from "@/shared/contracts/auth";
import { can } from "@/lib/auth/permissions";
import {
  formatQty,
  formatRupiahCompact,
  formatRupiahFull,
  type GoodsReceiptRecord,
  type PoStatus,
  type PurchaseOrderRecord,
  type PurchaseRequestRecord,
  type QcStatus,
  type RequestPriority,
  type RequestStatus,
  type RfqRecord,
  type RfqStatus,
  type SupplierRecord,
  type TaskStatus,
  type VendorInvoiceRecord,
  type VendorInvoiceStatus,
} from "./data";
import styles from "./pengeluaran.module.css";

function DrawerShell({
  open,
  onOpenChange,
  title,
  description,
  wide = false,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className={`drawer ${wide ? styles.drawerWide : ""}`}
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
      : status === "Perlu ditinjau"
        ? styles.pillWarning
        : styles.pillNeutral;
  return <span className={`${styles.pill} ${cls}`}>{status}</span>;
}

export function RequestPriorityPill({
  priority,
}: {
  priority: RequestPriority;
}) {
  const cls =
    priority === "Mendesak"
      ? styles.pillDanger
      : priority === "Tinggi"
        ? styles.pillWarning
        : styles.pillNeutral;
  return <span className={`${styles.pill} ${cls}`}>{priority}</span>;
}

export function RequestStatusPill({ status }: { status: RequestStatus }) {
  const cls =
    status === "Menunggu verifikasi"
      ? styles.pillWarning
      : status === "Terverifikasi"
        ? styles.pillInfo
        : status === "Sudah dibuat RFQ"
          ? styles.pillSuccess
          : styles.pillNeutral;
  return <span className={`${styles.pill} ${cls}`}>{status}</span>;
}

export function RfqStatusPill({ status }: { status: RfqStatus }) {
  const cls =
    status === "Menunggu penawaran" || status === "Perlu evaluasi"
      ? styles.pillWarning
      : status === "Pemasok terpilih"
        ? styles.pillInfo
        : styles.pillSuccess;
  return <span className={`${styles.pill} ${cls}`}>{status}</span>;
}

export function PoStatusPill({ status }: { status: PoStatus }) {
  const cls =
    status === "Menunggu persetujuan"
      ? styles.pillWarning
      : status === "Perlu revisi"
        ? styles.pillDanger
        : status === "Disetujui"
          ? styles.pillInfo
          : styles.pillSuccess;
  return <span className={`${styles.pill} ${cls}`}>{status}</span>;
}

export function QcStatusPill({ status }: { status: QcStatus }) {
  const cls =
    status === "Menunggu Inspeksi"
      ? styles.pillWarning
      : status === "Lolos QC"
        ? styles.pillSuccess
        : styles.pillDanger;
  return <span className={`${styles.pill} ${cls}`}>{status}</span>;
}

export function VendorInvoiceStatusPill({
  status,
}: {
  status: VendorInvoiceStatus;
}) {
  const cls =
    status === "Perlu pencocokan"
      ? styles.pillWarning
      : status === "Selisih ditahan" || status === "Lewat jatuh tempo"
        ? styles.pillDanger
        : status === "Siap dicatat utang" || status === "Siap dibayar"
          ? styles.pillInfo
          : styles.pillSuccess;
  return <span className={`${styles.pill} ${cls}`}>{status}</span>;
}

export function SuppliersDrawer({
  open,
  onOpenChange,
  suppliers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: readonly SupplierRecord[];
}) {
  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Daftar Pemasok Terkualifikasi"
      description="Direktori pemasok bahan baku dan kemasan beserta status kualifikasi, masa berlaku dokumen legalitas, dan profil risiko pasokan."
    >
      <div className={styles.drawerStack}>
        {suppliers.map((sup) => (
          <div className={styles.supplierCard} key={sup.id}>
            <div className={styles.supplierCardTop}>
              <div>
                <strong style={{ color: "#081e50" }}>{sup.name}</strong>
                <div style={{ fontSize: 12, color: "#52658a" }}>
                  {sup.code} · {sup.city} · NPWP {sup.npwp}
                </div>
              </div>
              <span
                className={`${styles.pill} ${
                  sup.qualificationStatus === "Terkualifikasi"
                    ? styles.pillSuccess
                    : styles.pillWarning
                }`}
              >
                {sup.qualificationStatus}
              </span>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span>Izin Berlaku s.d.</span>
                <strong>{sup.legalValidUntil}</strong>
              </div>
              <div className={styles.metaItem}>
                <span>Termin &amp; Risiko</span>
                <strong>
                  Net {sup.paymentTermsDays} hari · Risiko {sup.riskLevel}
                </strong>
              </div>
              <div className={styles.metaItem}>
                <span>Skor Kualitas</span>
                <strong>{sup.rating.toFixed(1)} / 5,0</strong>
              </div>
              <div className={styles.metaItem}>
                <span>Ketepatan Pengiriman</span>
                <strong>{sup.onTimeRatePercent}% tepat waktu</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DrawerShell>
  );
}

const MATERIAL_CATALOG = [
  {
    id: "mat_fresh_milk",
    name: "Fresh Milk (Susu Segar Mentah)",
    unit: "L" as const,
    availableStock: 40_000,
    minimumStock: 50_000,
  },
  {
    id: "mat_milk_powder",
    name: "Milk Powder (Susu Bubuk Full Cream)",
    unit: "kg" as const,
    availableStock: 9_800,
    minimumStock: 12_000,
  },
  {
    id: "mat_cartons",
    name: "Packaging Cartons (Karton Aseptik 250ml)",
    unit: "pcs" as const,
    availableStock: 1_200_000,
    minimumStock: 1_500_000,
  },
];

export function CreateRequestDrawer({
  open,
  onOpenChange,
  user,
  onCreateRequest,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onCreateRequest: (input: {
    materialId: string;
    materialName: string;
    quantity: number;
    unit: "L" | "kg" | "pcs";
    availableStock: number;
    minimumStock: number;
    productionRef: string;
    requiredDateLabel: string;
    priority: RequestPriority;
    purpose: string;
  }) => void;
}) {
  const canCreate = can(user, "requests:write");
  const [materialId, setMaterialId] = useState(MATERIAL_CATALOG[0].id);
  const [quantityInput, setQuantityInput] = useState("25000");
  const [productionRef, setProductionRef] = useState("WO-261116-0192");
  const [requiredDateLabel, setRequiredDateLabel] = useState("24 Nov 2026");
  const [priority, setPriority] = useState<RequestPriority>("Tinggi");
  const [purpose, setPurpose] = useState(
    "Kebutuhan bahan baku tambahan untuk jadwal produksi UHT pekan keempat November.",
  );
  const [error, setError] = useState<string | null>(null);

  const selectedMat =
    MATERIAL_CATALOG.find((m) => m.id === materialId) ?? MATERIAL_CATALOG[0];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate) return;
    const qty = Number(quantityInput.replaceAll(/[^0-9]/g, ""));
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Masukkan kuantitas bahan baku yang valid.");
      return;
    }
    if (!productionRef.trim()) {
      setError("Masukkan nomor referensi perintah produksi.");
      return;
    }
    if (!purpose.trim()) {
      setError("Masukkan alasan kebutuhan bahan baku.");
      return;
    }
    setError(null);
    onCreateRequest({
      materialId: selectedMat.id,
      materialName: selectedMat.name,
      quantity: qty,
      unit: selectedMat.unit,
      availableStock: selectedMat.availableStock,
      minimumStock: selectedMat.minimumStock,
      productionRef: productionRef.trim(),
      requiredDateLabel,
      priority,
      purpose: purpose.trim(),
    });
    onOpenChange(false);
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Buat Permintaan Pembelian (FPBB)"
      description="Formulir pengajuan kebutuhan bahan baku dari unit Produksi untuk diverifikasi oleh Gudang."
    >
      <div className={styles.drawerStack}>
        {!canCreate && (
          <div className={styles.drawerNotice} role="status">
            Pengajuan FPBB baru diotorisasi untuk peran{" "}
            <strong>Produksi (PRODUCTION)</strong>. Akun Anda saat ini hanya
            memiliki akses peninjauan dokumen.
          </div>
        )}
        <form onSubmit={handleSubmit} className={styles.drawerForm}>
          <label>
            Bahan Baku
            <select
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              disabled={!canCreate}
            >
              {MATERIAL_CATALOG.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} (Stok: {formatQty(m.availableStock, m.unit)} / Min:{" "}
                  {formatQty(m.minimumStock, m.unit)})
                </option>
              ))}
            </select>
          </label>
          <label>
            Kuantitas Diminta ({selectedMat.unit})
            <input
              type="number"
              min={1}
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              disabled={!canCreate}
              required
            />
          </label>
          <label>
            Nomor Perintah Produksi
            <input
              type="text"
              value={productionRef}
              onChange={(e) => setProductionRef(e.target.value)}
              disabled={!canCreate}
              required
            />
          </label>
          <label>
            Tanggal Dibutuhkan
            <input
              type="text"
              value={requiredDateLabel}
              onChange={(e) => setRequiredDateLabel(e.target.value)}
              disabled={!canCreate}
              required
            />
          </label>
          <label>
            Prioritas Kebutuhan
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as RequestPriority)}
              disabled={!canCreate}
            >
              <option value="Mendesak">Mendesak</option>
              <option value="Tinggi">Tinggi</option>
              <option value="Normal">Normal</option>
            </select>
          </label>
          <label>
            Alasan &amp; Catatan Kebutuhan
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              disabled={!canCreate}
              required
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
              disabled={!canCreate}
            >
              Simpan Permintaan (FPBB)
            </button>
          </div>
        </form>
      </div>
    </DrawerShell>
  );
}

export function RequestDetailDrawer({
  request,
  onOpenChange,
  user,
  onVerifyRequest,
  onStartCreateRfq,
}: {
  request: PurchaseRequestRecord | null;
  onOpenChange: (open: boolean) => void;
  user: User;
  onVerifyRequest: (
    requestId: string,
    outcome: "Terverifikasi" | "Stok mencukupi",
    note: string,
  ) => void;
  onStartCreateRfq: (request: PurchaseRequestRecord) => void;
}) {
  const [verifyOutcome, setVerifyOutcome] = useState<
    "Terverifikasi" | "Stok mencukupi"
  >("Terverifikasi");
  const [verifyNote, setVerifyNote] = useState(
    "Stok fisik gudang di bawah batas minimum; seluruh kuantitas perlu dibeli melalui Purchasing.",
  );

  if (!request) return null;

  const canVerify = can(user, "requests:verify");
  const canCreateRfq = can(user, "rfqs:write");
  const isBelowMin = request.availableStock < request.minimumStock;

  return (
    <DrawerShell
      open={!!request}
      onOpenChange={onOpenChange}
      title={`${request.number} — Permintaan Pembelian`}
      description={`Referensi Produksi ${request.productionRef} · Gudang ${request.warehouseName}`}
    >
      <div className={styles.drawerStack}>
        <div className={styles.drawerSection}>
          <div className={styles.supplierCardTop}>
            <h3>Informasi Permintaan (FPBB)</h3>
            <RequestStatusPill status={request.status} />
          </div>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span>Nomor FPBB</span>
              <strong>{request.number}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Prioritas</span>
              <div>
                <RequestPriorityPill priority={request.priority} />
              </div>
            </div>
            <div className={styles.metaItem}>
              <span>Bahan Baku</span>
              <strong>{request.materialName}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Kuantitas Diminta</span>
              <strong>{formatQty(request.quantity, request.unit)}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Tanggal Dibutuhkan</span>
              <strong>{request.requiredDateLabel}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Referensi Produksi</span>
              <strong>{request.productionRef}</strong>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#36476a" }}>
            <strong>Alasan Kebutuhan:</strong> {request.purpose}
          </p>
        </div>

        <div className={styles.drawerSection}>
          <h3>Posisi Stok Gudang ({request.warehouseName})</h3>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span>Saldo Tersedia (Lolos QC)</span>
              <strong>{formatQty(request.availableStock, request.unit)}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Batas Minimum Aman</span>
              <strong>{formatQty(request.minimumStock, request.unit)}</strong>
            </div>
          </div>
          {isBelowMin ? (
            <div className={styles.drawerWarningAlert}>
              <strong>Indikasi Stok Kritis:</strong> Saldo tersedia berada di
              bawah batas minimum ({formatQty(request.minimumStock, request.unit)}
              ). Pengadaan bahan baku diperlukan.
            </div>
          ) : (
            <div className={styles.drawerNotice}>
              Saldo gudang saat ini berada di atas batas minimum.
            </div>
          )}
          <p style={{ margin: 0, fontSize: 13, color: "#36476a" }}>
            <strong>Catatan Verifikasi:</strong> {request.verificationNote}
          </p>
        </div>

        {request.status === "Menunggu verifikasi" && (
          <div className={styles.drawerSection}>
            <h3>Tindakan Verifikasi Stok Gudang (UC-03)</h3>
            {!canVerify && (
              <div className={styles.drawerNotice} role="status">
                Verifikasi stok FPBB diotorisasi untuk peran{" "}
                <strong>Gudang (WAREHOUSE)</strong>.
              </div>
            )}
            <div className={styles.drawerForm}>
              <label>
                Hasil Pemeriksaan Stok
                <select
                  value={verifyOutcome}
                  onChange={(e) =>
                    setVerifyOutcome(
                      e.target.value as "Terverifikasi" | "Stok mencukupi",
                    )
                  }
                  disabled={!canVerify}
                >
                  <option value="Terverifikasi">
                    Perlu Dibeli — Teruskan FPBB ke Purchasing
                  </option>
                  <option value="Stok mencukupi">
                    Stok Mencukupi — Penuhi dari Gudang Tanpa Pembelian
                  </option>
                </select>
              </label>
              <label>
                Catatan Gudang
                <textarea
                  value={verifyNote}
                  onChange={(e) => setVerifyNote(e.target.value)}
                  disabled={!canVerify}
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
                  disabled={!canVerify}
                  onClick={() => {
                    onVerifyRequest(
                      request.id,
                      verifyOutcome,
                      verifyNote.trim() ||
                        "Telah diverifikasi oleh Gudang Bahan Baku.",
                    );
                    onOpenChange(false);
                  }}
                >
                  Simpan Verifikasi Stok
                </button>
              </div>
            </div>
          </div>
        )}

        {request.status === "Terverifikasi" && (
          <>
            {!canCreateRfq && (
              <div className={styles.drawerNotice} role="status">
                Pembuatan RFQ dari FPBB terverifikasi diotorisasi untuk peran{" "}
                <strong>Purchasing (PURCHASING)</strong>.
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
                onClick={() => {
                  onOpenChange(false);
                  onStartCreateRfq(request);
                }}
              >
                Buat RFQ dari FPBB Ini
              </button>
            </div>
          </>
        )}

        {(request.status === "Sudah dibuat RFQ" ||
          request.status === "Stok mencukupi") && (
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

export function CreateRfqDrawer({
  open,
  onOpenChange,
  user,
  verifiedRequests,
  suppliers,
  initialRequestId,
  onCreateRfq,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  verifiedRequests: readonly PurchaseRequestRecord[];
  suppliers: readonly SupplierRecord[];
  initialRequestId?: string;
  onCreateRfq: (input: {
    requestId: string;
    dueDateLabel: string;
    invitedSupplierIds: string[];
  }) => void;
}) {
  const canCreate = can(user, "rfqs:write");
  const [selectedReqId, setSelectedReqId] = useState(
    initialRequestId || verifiedRequests[0]?.id || "",
  );
  const [dueDateLabel, setDueDateLabel] = useState("20 Nov 2026");

  const activeReqId =
    verifiedRequests.some((r) => r.id === selectedReqId)
      ? selectedReqId
      : verifiedRequests[0]?.id ?? "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate || !activeReqId) return;
    onCreateRfq({
      requestId: activeReqId,
      dueDateLabel,
      invitedSupplierIds: suppliers.slice(0, 2).map((s) => s.id),
    });
    onOpenChange(false);
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Buat Request for Quotation (RFQ)"
      description="Terbitkan permintaan penawaran harga kepada pemasok terkualifikasi atas dasar FPBB yang telah diverifikasi."
    >
      <div className={styles.drawerStack}>
        {!canCreate && (
          <div className={styles.drawerNotice} role="status">
            Pembuatan RFQ baru diotorisasi untuk peran{" "}
            <strong>Purchasing (PURCHASING)</strong>.
          </div>
        )}
        {verifiedRequests.length === 0 ? (
          <div className={styles.drawerWarningAlert}>
            Belum ada FPBB berstatus <strong>Terverifikasi</strong> yang menunggu
            pembuatan RFQ. Verifikasi stok FPBB terlebih dahulu pada tab
            Permintaan Pembelian.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.drawerForm}>
            <label>
              Dasar Permintaan Pembelian (FPBB Terverifikasi)
              <select
                value={activeReqId}
                onChange={(e) => setSelectedReqId(e.target.value)}
                disabled={!canCreate}
              >
                {verifiedRequests.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.number} — {r.materialName} (
                    {formatQty(r.quantity, r.unit)})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Batas Waktu Penawaran Pemasok
              <input
                type="text"
                value={dueDateLabel}
                onChange={(e) => setDueDateLabel(e.target.value)}
                disabled={!canCreate}
                required
              />
            </label>
            <div className={styles.drawerSection}>
              <h3>Pemasok Diundang</h3>
              <p style={{ margin: 0, fontSize: 13, color: "#36476a" }}>
                Undangan RFQ akan dikirimkan kepada pemasok terkualifikasi dalam
                daftar vendor aktif Ultrajaya.
              </p>
            </div>
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
                disabled={!canCreate}
              >
                Simpan &amp; Kirim RFQ
              </button>
            </div>
          </form>
        )}
      </div>
    </DrawerShell>
  );
}

export function RfqDetailDrawer({
  rfq,
  onOpenChange,
  user,
  suppliers,
  onRecordOffer,
  onSelectWinningOffer,
  onCreatePoFromRfq,
}: {
  rfq: RfqRecord | null;
  onOpenChange: (open: boolean) => void;
  user: User;
  suppliers: readonly SupplierRecord[];
  onRecordOffer: (
    rfqId: string,
    offer: {
      supplierId: string;
      unitPrice: number;
      leadTimeDays: number;
      evaluationNotes: string;
    },
  ) => void;
  onSelectWinningOffer: (
    rfqId: string,
    offerId: string,
    awardReason: string,
  ) => void;
  onCreatePoFromRfq: (rfqId: string) => void;
}) {
  const [quoteSupplierId, setQuoteSupplierId] = useState("sup_kemasan_sentosa");
  const [quoteUnitPrice, setQuoteUnitPrice] = useState("124");
  const [quoteLeadDays, setQuoteLeadDays] = useState("3");
  const [quoteNotes, setQuoteNotes] = useState(
    "Kapasitas cetak tersedia, pengiriman 3 hari kerja, harga sedikit di atas PT Kemas Prima.",
  );

  const [chosenOfferId, setChosenOfferId] = useState<string>("");
  const [awardReason, setAwardReason] = useState(
    "Dipilih berdasarkan kombinasi terbaik antara kualitas spesifikasi bahan baku, ketepatan waktu pengiriman (lead time), legalitas aktif, dan harga yang kompetitif.",
  );

  if (!rfq) return null;

  const canWriteRfq = can(user, "rfqs:write");
  const canWritePo = can(user, "orders:write");

  const effectiveChosenOfferId =
    rfq.offers.some((o) => o.id === chosenOfferId)
      ? chosenOfferId
      : rfq.selectedOfferId || rfq.offers[0]?.id || "";

  return (
    <DrawerShell
      open={!!rfq}
      onOpenChange={onOpenChange}
      wide
      title={`${rfq.number} — Perbandingan Penawaran Vendor`}
      description={`Dasar ${rfq.requestNumber} · ${rfq.materialName} (${formatQty(rfq.quantity, rfq.unit)})`}
    >
      <div className={styles.drawerStack}>
        <div className={styles.drawerSection}>
          <div className={styles.supplierCardTop}>
            <h3>Ringkasan Dokumen RFQ</h3>
            <RfqStatusPill status={rfq.status} />
          </div>
          <div className={styles.metaGrid3}>
            <div className={styles.metaItem}>
              <span>Nomor RFQ</span>
              <strong>{rfq.number}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Referensi FPBB</span>
              <strong>{rfq.requestNumber}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Batas Penawaran</span>
              <strong>{rfq.dueDateLabel}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Bahan Baku</span>
              <strong>{rfq.materialName}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Kuantitas Tender</span>
              <strong>{formatQty(rfq.quantity, rfq.unit)}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Penawaran Masuk</span>
              <strong>{rfq.offers.length} pemasok</strong>
            </div>
          </div>
        </div>

        <div className={styles.drawerSection}>
          <h3>
            Perbandingan Penawaran Pemasok (Side-by-Side: Harga, Lead Time &amp;
            Catatan Evaluasi)
          </h3>
          <div className={styles.offersComparisonGrid}>
            {rfq.offers.map((offer) => (
              <article
                key={offer.id}
                className={`${styles.offerCard} ${
                  offer.isSelected ? styles.offerCardSelected : ""
                }`}
              >
                <div className={styles.offerCardHeader}>
                  <div>
                    <div className={styles.offerVendorName}>
                      {offer.supplierName}
                    </div>
                    <div className={styles.offerQuoteNum}>
                      {offer.quotationNumber}
                    </div>
                  </div>
                  {offer.isSelected ? (
                    <span className={`${styles.pill} ${styles.pillSuccess}`}>
                      Terpilih
                    </span>
                  ) : (
                    <span
                      className={`${styles.pill} ${
                        offer.qualificationStatus === "Terkualifikasi"
                          ? styles.pillInfo
                          : styles.pillWarning
                      }`}
                    >
                      {offer.qualificationStatus}
                    </span>
                  )}
                </div>

                <div className={styles.offerPriceHighlight}>
                  <span className={styles.offerUnitPrice}>
                    {formatRupiahFull(offer.unitPrice)} / {rfq.unit}
                  </span>
                  <span className={styles.offerTotalPrice}>
                    Total: {formatRupiahFull(offer.totalPrice)}
                  </span>
                </div>

                <div className={styles.offerSpecsList}>
                  <div className={styles.offerSpecRow}>
                    <span>Lead Time Pengiriman</span>
                    <strong>{offer.leadTimeDays} hari kerja</strong>
                  </div>
                  <div className={styles.offerSpecRow}>
                    <span>Termin Pembayaran</span>
                    <strong>{offer.paymentTerms}</strong>
                  </div>
                  <div className={styles.offerSpecRow}>
                    <span>Skor Evaluasi Total</span>
                    <strong>{offer.overallScore.toFixed(1)} / 100</strong>
                  </div>
                  <div className={styles.offerSpecRow}>
                    <span>Kualitas · Pengiriman · Harga</span>
                    <strong>
                      {offer.qualityScore} · {offer.deliveryScore} ·{" "}
                      {offer.priceScore}
                    </strong>
                  </div>
                  <div className={styles.offerSpecRow}>
                    <span>Risiko Pasokan</span>
                    <strong>{offer.riskLevel}</strong>
                  </div>
                </div>

                <div className={styles.offerNotesBox}>
                  <strong>Catatan Evaluasi:</strong> {offer.evaluationNotes}
                </div>
              </article>
            ))}
          </div>

          {rfq.awardReason && (
            <div className={styles.drawerNotice}>
              <strong>Dasar Pemilihan Pemasok (UC-05):</strong>{" "}
              {rfq.awardReason}
            </div>
          )}
        </div>

        {rfq.status === "Menunggu penawaran" && (
          <div className={styles.drawerSection}>
            <h3>Catat Penawaran Pemasok Masuk (UC-04)</h3>
            {!canWriteRfq && (
              <div className={styles.drawerNotice} role="status">
                Pencatatan penawaran pemasok diotorisasi untuk peran{" "}
                <strong>Purchasing (PURCHASING)</strong>.
              </div>
            )}
            <div className={styles.drawerForm}>
              <label>
                Pemasok Penawar
                <select
                  value={quoteSupplierId}
                  onChange={(e) => setQuoteSupplierId(e.target.value)}
                  disabled={!canWriteRfq}
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.qualificationStatus})
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.metaGrid}>
                <label>
                  Harga Satuan (Rp / {rfq.unit})
                  <input
                    type="number"
                    min={1}
                    value={quoteUnitPrice}
                    onChange={(e) => setQuoteUnitPrice(e.target.value)}
                    disabled={!canWriteRfq}
                  />
                </label>
                <label>
                  Lead Time Pengiriman (Hari)
                  <input
                    type="number"
                    min={1}
                    value={quoteLeadDays}
                    onChange={(e) => setQuoteLeadDays(e.target.value)}
                    disabled={!canWriteRfq}
                  />
                </label>
              </div>
              <label>
                Catatan Evaluasi Awal
                <textarea
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  disabled={!canWriteRfq}
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
                  disabled={!canWriteRfq}
                  onClick={() => {
                    const price = Math.max(1, Number(quoteUnitPrice) || 124);
                    const lead = Math.max(1, Number(quoteLeadDays) || 3);
                    onRecordOffer(rfq.id, {
                      supplierId: quoteSupplierId,
                      unitPrice: price,
                      leadTimeDays: lead,
                      evaluationNotes:
                        quoteNotes.trim() ||
                        "Penawaran masuk telah dicatat oleh Purchasing.",
                    });
                    onOpenChange(false);
                  }}
                >
                  Simpan Penawaran &amp; Lanjut Evaluasi
                </button>
              </div>
            </div>
          </div>
        )}

        {rfq.status === "Perlu evaluasi" && (
          <div className={styles.drawerSection}>
            <h3>Evaluasi &amp; Pilih Pemasok Pemenang (UC-05)</h3>
            {!canWriteRfq && (
              <div className={styles.drawerNotice} role="status">
                Evaluasi dan pemilihan pemasok diotorisasi untuk peran{" "}
                <strong>Purchasing (PURCHASING)</strong>.
              </div>
            )}
            <div className={styles.drawerForm}>
              <label>
                Pemasok Terpilih
                <select
                  value={effectiveChosenOfferId}
                  onChange={(e) => setChosenOfferId(e.target.value)}
                  disabled={!canWriteRfq}
                >
                  {rfq.offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.supplierName} — {formatRupiahFull(o.unitPrice)}/
                      {rfq.unit} (Lead time {o.leadTimeDays} hari · Skor{" "}
                      {o.overallScore.toFixed(1)})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Alasan &amp; Dasar Pemilihan (Multi-Kriteria)
                <textarea
                  value={awardReason}
                  onChange={(e) => setAwardReason(e.target.value)}
                  disabled={!canWriteRfq}
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
                  disabled={!canWriteRfq || !effectiveChosenOfferId}
                  onClick={() => {
                    onSelectWinningOffer(
                      rfq.id,
                      effectiveChosenOfferId,
                      awardReason.trim(),
                    );
                    onOpenChange(false);
                  }}
                >
                  Simpan Pemasok Terpilih
                </button>
              </div>
            </div>
          </div>
        )}

        {rfq.status === "Pemasok terpilih" && (
          <>
            {!canWritePo && (
              <div className={styles.drawerNotice} role="status">
                Penerbitan Purchase Order dari hasil RFQ diotorisasi untuk peran{" "}
                <strong>Purchasing (PURCHASING)</strong>.
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
                disabled={!canWritePo}
                onClick={() => {
                  onCreatePoFromRfq(rfq.id);
                  onOpenChange(false);
                }}
              >
                Buat Purchase Order (PO)
              </button>
            </div>
          </>
        )}

        {rfq.status === "PO diterbitkan" && (
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

export function CreatePoDrawer({
  open,
  onOpenChange,
  user,
  rfqsReadyForPo,
  suppliers,
  onCreatePo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  rfqsReadyForPo: readonly RfqRecord[];
  suppliers: readonly SupplierRecord[];
  onCreatePo: (input: {
    rfqId?: string;
    supplierId: string;
    materialName: string;
    quantity: number;
    unit: "L" | "kg" | "pcs";
    unitPrice: number;
    paymentTerms: string;
    deliveryTerms: string;
  }) => void;
}) {
  const canCreate = can(user, "orders:write");
  const defaultRfq = rfqsReadyForPo[0];
  const winningOffer =
    defaultRfq?.offers.find((o) => o.isSelected) ?? defaultRfq?.offers[0];

  const [rfqId, setRfqId] = useState(defaultRfq?.id ?? "");
  const [supplierId, setSupplierId] = useState(
    winningOffer?.supplierId ?? suppliers[0]?.id ?? "sup_kss",
  );
  const [materialName, setMaterialName] = useState(
    defaultRfq?.materialName ?? "Fresh Milk (Susu Segar Mentah)",
  );
  const [quantityInput, setQuantityInput] = useState(
    String(defaultRfq?.quantity ?? 25000),
  );
  const [unit, setUnit] = useState<"L" | "kg" | "pcs">(
    defaultRfq?.unit ?? "L",
  );
  const [unitPriceInput, setUnitPriceInput] = useState(
    String(winningOffer?.unitPrice ?? 8000),
  );
  const [paymentTerms, setPaymentTerms] = useState(
    winningOffer?.paymentTerms ?? "Net 14 Hari",
  );
  const [deliveryTerms, setDeliveryTerms] = useState(
    "Franco Gudang Bandung RM",
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate) return;
    const qty = Math.max(1, Number(quantityInput) || 1);
    const price = Math.max(1, Number(unitPriceInput) || 1);
    onCreatePo({
      rfqId: rfqId || undefined,
      supplierId,
      materialName: materialName.trim() || "Bahan Baku Produksi",
      quantity: qty,
      unit,
      unitPrice: price,
      paymentTerms,
      deliveryTerms,
    });
    onOpenChange(false);
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Buat Purchase Order (PO)"
      description="Susun Purchase Order resmi berdasarkan hasil evaluasi RFQ dan ajukan ke alur persetujuan berjenjang (UC-06 & UC-07)."
    >
      <div className={styles.drawerStack}>
        {!canCreate && (
          <div className={styles.drawerNotice} role="status">
            Pembuatan Purchase Order baru diotorisasi untuk peran{" "}
            <strong>Purchasing (PURCHASING)</strong>.
          </div>
        )}
        <form onSubmit={handleSubmit} className={styles.drawerForm}>
          {rfqsReadyForPo.length > 0 && (
            <label>
              Referensi RFQ Terpilih
              <select
                value={rfqId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setRfqId(nextId);
                  const found = rfqsReadyForPo.find((r) => r.id === nextId);
                  if (found) {
                    const win =
                      found.offers.find((o) => o.isSelected) ?? found.offers[0];
                    setMaterialName(found.materialName);
                    setQuantityInput(String(found.quantity));
                    setUnit(found.unit);
                    if (win) {
                      setSupplierId(win.supplierId);
                      setUnitPriceInput(String(win.unitPrice));
                      setPaymentTerms(win.paymentTerms);
                    }
                  }
                }}
                disabled={!canCreate}
              >
                {rfqsReadyForPo.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.number} ({r.requestNumber}) — {r.materialName}
                  </option>
                ))}
                <option value="">Input manual berdasarkan kontrak</option>
              </select>
            </label>
          )}
          <label>
            Pemasok
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              disabled={!canCreate}
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </label>
          <label>
            Bahan Baku
            <input
              type="text"
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
              disabled={!canCreate}
              required
            />
          </label>
          <div className={styles.metaGrid}>
            <label>
              Kuantitas ({unit})
              <input
                type="number"
                min={1}
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                disabled={!canCreate}
                required
              />
            </label>
            <label>
              Harga Satuan (Rp)
              <input
                type="number"
                min={1}
                value={unitPriceInput}
                onChange={(e) => setUnitPriceInput(e.target.value)}
                disabled={!canCreate}
                required
              />
            </label>
          </div>
          <div className={styles.metaGrid}>
            <label>
              Termin Pembayaran
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                disabled={!canCreate}
                required
              />
            </label>
            <label>
              Syarat Pengiriman
              <input
                type="text"
                value={deliveryTerms}
                onChange={(e) => setDeliveryTerms(e.target.value)}
                disabled={!canCreate}
                required
              />
            </label>
          </div>
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
              disabled={!canCreate}
            >
              Simpan &amp; Ajukan Persetujuan PO
            </button>
          </div>
        </form>
      </div>
    </DrawerShell>
  );
}

export function PoDetailDrawer({
  po,
  onOpenChange,
  user,
  onApprovePo,
  onRequestRevisionPo,
  onResubmitRevisedPo,
  onSendPoToVendor,
}: {
  po: PurchaseOrderRecord | null;
  onOpenChange: (open: boolean) => void;
  user: User;
  onApprovePo: (poId: string, note: string) => void;
  onRequestRevisionPo: (poId: string, reason: string) => void;
  onResubmitRevisedPo: (poId: string, note: string) => void;
  onSendPoToVendor: (poId: string) => void;
}) {
  const [decisionNote, setDecisionNote] = useState(
    "Harga sesuai hasil evaluasi RFQ dan masuk dalam pagu anggaran kuartal berjalan.",
  );

  if (!po) return null;

  const isCreator = user.id === po.createdByUserId;
  const canApprove = can(user, "approvals:decide") && !isCreator;
  const canWritePo = can(user, "orders:write");

  return (
    <DrawerShell
      open={!!po}
      onOpenChange={onOpenChange}
      wide
      title={`${po.number} — ${po.supplierName}`}
      description={`Purchase Order tanggal ${po.dateLabel} · Revisi ${po.revision} · Referensi ${po.requestNumber}`}
    >
      <div className={styles.drawerStack}>
        <div className={styles.drawerSection}>
          <div className={styles.supplierCardTop}>
            <h3>Informasi Purchase Order</h3>
            <PoStatusPill status={po.status} />
          </div>
          <div className={styles.metaGrid3}>
            <div className={styles.metaItem}>
              <span>Nomor PO</span>
              <strong>{po.number}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Total Nilai PO</span>
              <strong>{formatRupiahFull(po.totalAmount)}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Tahap Persetujuan</span>
              <strong>{po.approvalStageLabel}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Ref. FPBB / RFQ</span>
              <strong>
                {po.requestNumber} · {po.rfqNumber}
              </strong>
            </div>
            <div className={styles.metaItem}>
              <span>Termin &amp; Pengiriman</span>
              <strong>
                {po.paymentTerms} · {po.deliveryTerms}
              </strong>
            </div>
            <div className={styles.metaItem}>
              <span>Disusun Oleh</span>
              <strong>{po.createdByName}</strong>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#36476a" }}>
            {po.notes}
          </p>
        </div>

        <div className={styles.drawerSection}>
          <h3>Rincian Baris Barang PO</h3>
          <div className={styles.miniTableWrap}>
            <table className={styles.miniTable}>
              <thead>
                <tr>
                  <th scope="col">Bahan Baku</th>
                  <th scope="col">Kuantitas</th>
                  <th scope="col">Harga Satuan</th>
                  <th scope="col">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {po.lines.map((line) => (
                  <tr key={line.id}>
                    <td>
                      <strong>{line.materialName}</strong>
                    </td>
                    <td className={styles.tabular}>
                      {formatQty(line.quantity, line.unit)}
                    </td>
                    <td className={styles.tabular}>
                      {formatRupiahFull(line.unitPrice)} / {line.unit}
                    </td>
                    <td className={styles.tabular}>
                      <strong>{formatRupiahFull(line.totalPrice)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.drawerSection}>
          <h3>Jejak Persetujuan Berjenjang (Approval Log — UC-07)</h3>
          <ul className={styles.timelineList}>
            {po.approvalSteps.map((step) => (
              <li className={styles.timelineItem} key={step.id}>
                <div>
                  <strong style={{ color: "#081e50", fontSize: 13.5 }}>
                    Tahap {step.sequence}: {step.roleTitle} ({step.actorName})
                  </strong>
                  <div style={{ fontSize: 12, color: "#52658a", marginTop: 2 }}>
                    {step.timestampLabel} — {step.note}
                  </div>
                </div>
                <span
                  className={`${styles.pill} ${
                    step.status === "Disetujui"
                      ? styles.pillSuccess
                      : step.status === "Menunggu"
                        ? styles.pillWarning
                        : step.status === "Perlu revisi"
                          ? styles.pillDanger
                          : styles.pillNeutral
                  }`}
                >
                  {step.status}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {po.status === "Menunggu persetujuan" && (
          <div className={styles.drawerSection}>
            <h3>Keputusan Pejabat Penyetuju (UC-07)</h3>
            {!canApprove && (
              <div className={styles.drawerNotice} role="status">
                {isCreator ? (
                  <>
                    <strong>Pemisahan Tugas (Segregation of Duties):</strong>{" "}
                    Pembuat PO tidak diizinkan menyetujui PO yang dibuatnya
                    sendiri.
                  </>
                ) : (
                  <>
                    Persetujuan PO diotorisasi untuk peran{" "}
                    <strong>Pejabat Penyetuju (APPROVER)</strong> sesuai jenjang
                    nilai otorisasi.
                  </>
                )}
              </div>
            )}
            <div className={styles.drawerForm}>
              <label>
                Catatan Persetujuan / Alasan Penolakan
                <textarea
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  disabled={!canApprove}
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
                  className={styles.secondaryButton}
                  disabled={!canApprove}
                  onClick={() => {
                    onRequestRevisionPo(
                      po.id,
                      decisionNote.trim() || "Perlu penyesuaian dokumen PO.",
                    );
                    onOpenChange(false);
                  }}
                >
                  Tolak &amp; Minta Revisi
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={!canApprove}
                  onClick={() => {
                    onApprovePo(
                      po.id,
                      decisionNote.trim() || "Disetujui sesuai kebijakan PO.",
                    );
                    onOpenChange(false);
                  }}
                >
                  Setujui PO
                </button>
              </div>
            </div>
          </div>
        )}

        {po.status === "Perlu revisi" && (
          <div className={styles.drawerSection}>
            <h3>Revisi &amp; Pengajuan Ulang PO (UC-06)</h3>
            {!canWritePo && (
              <div className={styles.drawerNotice} role="status">
                Revisi Purchase Order diotorisasi untuk peran{" "}
                <strong>Purchasing (PURCHASING)</strong>.
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
                disabled={!canWritePo}
                onClick={() => {
                  onResubmitRevisedPo(
                    po.id,
                    "Dokumen kualifikasi dan jadwal pengiriman bertahap telah diperbarui; diajukan ulang untuk persetujuan.",
                  );
                  onOpenChange(false);
                }}
              >
                Simpan Revisi &amp; Ajukan Ulang
              </button>
            </div>
          </div>
        )}

        {po.status === "Disetujui" && (
          <>
            {!canWritePo && (
              <div className={styles.drawerNotice} role="status">
                Pengiriman PO resmi ke pemasok diotorisasi untuk peran{" "}
                <strong>Purchasing (PURCHASING)</strong>.
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
                disabled={!canWritePo}
                onClick={() => {
                  onSendPoToVendor(po.id);
                  onOpenChange(false);
                }}
              >
                Kirim PO ke Pemasok
              </button>
            </div>
          </>
        )}

        {po.status === "Dikirim ke pemasok" && (
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

export function RecordReceiptDrawer({
  open,
  onOpenChange,
  user,
  eligibleOrders,
  onRecordReceipt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  eligibleOrders: readonly PurchaseOrderRecord[];
  onRecordReceipt: (input: {
    poId: string;
    receivedQty: number;
    deliveryNoteNumber: string;
    batchNumber: string;
    storageLocation: string;
  }) => void;
}) {
  const canReceive = can(user, "receipts:write");
  const [selectedPoId, setSelectedPoId] = useState(
    eligibleOrders[0]?.id ?? "",
  );
  const [receivedQtyInput, setReceivedQtyInput] = useState("2000");
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState(
    "SJ-VENDOR-261116-01",
  );
  const [batchNumber, setBatchNumber] = useState("BATCH-261116-A");
  const [storageLocation, setStorageLocation] = useState(
    "Bandung RM / Dermaga Karantina QC",
  );
  const [error, setError] = useState<string | null>(null);

  const activePo =
    eligibleOrders.find((p) => p.id === selectedPoId) ?? eligibleOrders[0];
  const firstLine = activePo?.lines[0];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canReceive || !activePo || !firstLine) return;
    const qty = Number(receivedQtyInput.replaceAll(/[^0-9]/g, ""));
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Masukkan kuantitas barang diterima yang valid.");
      return;
    }
    if (qty > firstLine.quantity) {
      setError(
        `Kuantitas diterima tidak boleh melebihi kuantitas pesanan PO (${formatQty(firstLine.quantity, firstLine.unit)}).`,
      );
      return;
    }
    setError(null);
    onRecordReceipt({
      poId: activePo.id,
      receivedQty: qty,
      deliveryNoteNumber: deliveryNoteNumber.trim() || "SJ-261116",
      batchNumber: batchNumber.trim() || "BATCH-261116",
      storageLocation: storageLocation.trim() || "Bandung RM",
    });
    onOpenChange(false);
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Catat Penerimaan Barang (GRN)"
      description="Catat penerimaan fisik bahan baku dari pemasok berdasarkan Purchase Order yang telah disetujui (UC-08). Barang yang baru diterima berstatus Menunggu Inspeksi QC."
    >
      <div className={styles.drawerStack}>
        {!canReceive && (
          <div className={styles.drawerNotice} role="status">
            Pencatatan penerimaan barang fisik (GRN) diotorisasi untuk peran{" "}
            <strong>Gudang (WAREHOUSE)</strong>.
          </div>
        )}
        {eligibleOrders.length === 0 ? (
          <div className={styles.drawerWarningAlert}>
            Tidak ada PO berstatus Disetujui / Dikirim ke pemasok yang siap
            menerima barang.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.drawerForm}>
            <label>
              Referensi Purchase Order (PO)
              <select
                value={activePo?.id ?? ""}
                onChange={(e) => setSelectedPoId(e.target.value)}
                disabled={!canReceive}
              >
                {eligibleOrders.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.number} — {po.supplierName} (
                    {po.lines[0]?.materialName ?? "Bahan Baku"})
                  </option>
                ))}
              </select>
            </label>
            {firstLine && (
              <div className={styles.drawerSection}>
                <h3>Rincian Pesanan PO</h3>
                <div className={styles.metaGrid}>
                  <div className={styles.metaItem}>
                    <span>Bahan Baku</span>
                    <strong>{firstLine.materialName}</strong>
                  </div>
                  <div className={styles.metaItem}>
                    <span>Kuantitas Dipesan (PO)</span>
                    <strong>
                      {formatQty(firstLine.quantity, firstLine.unit)}
                    </strong>
                  </div>
                </div>
              </div>
            )}
            <div className={styles.metaGrid}>
              <label>
                Kuantitas Fisik Diterima ({firstLine?.unit ?? "unit"})
                <input
                  type="number"
                  min={1}
                  max={firstLine?.quantity}
                  value={receivedQtyInput}
                  onChange={(e) => setReceivedQtyInput(e.target.value)}
                  disabled={!canReceive}
                  required
                />
              </label>
              <label>
                Nomor Surat Jalan Pemasok
                <input
                  type="text"
                  value={deliveryNoteNumber}
                  onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                  disabled={!canReceive}
                  required
                />
              </label>
            </div>
            <div className={styles.metaGrid}>
              <label>
                Nomor Batch / Lot
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  disabled={!canReceive}
                  required
                />
              </label>
              <label>
                Lokasi Penyimpanan Sementara
                <input
                  type="text"
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  disabled={!canReceive}
                  required
                />
              </label>
            </div>
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
                disabled={!canReceive}
              >
                Simpan Penerimaan (GRN)
              </button>
            </div>
          </form>
        )}
      </div>
    </DrawerShell>
  );
}

function ReceiptInspectionForm({
  receipt,
  canInspect,
  onOpenChange,
  onCompleteInspection,
}: {
  receipt: GoodsReceiptRecord;
  canInspect: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleteInspection: (
    receiptId: string,
    acceptedQty: number,
    heldQty: number,
    qcNotes: string,
  ) => void;
}) {
  const firstLine = receipt.lines[0];
  const defaultReceived = firstLine?.receivedQty ?? 0;

  const [acceptedInput, setAcceptedInput] = useState<string>(
    String(defaultReceived),
  );
  const [heldInput, setHeldInput] = useState<string>("0");
  const [qcNotesInput, setQcNotesInput] = useState(
    "Hasil uji laboratorium dan pemeriksaan fisik memenuhi standar spesifikasi mutu Ultrajaya.",
  );
  const [error, setError] = useState<string | null>(null);

  function handleInspectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canInspect || !firstLine) return;
    const acc = Number(acceptedInput);
    const held = Number(heldInput);
    if (
      !Number.isFinite(acc) ||
      !Number.isFinite(held) ||
      acc < 0 ||
      held < 0
    ) {
      setError("Masukkan kuantitas lolos QC dan ditahan yang valid.");
      return;
    }
    if (acc + held !== firstLine.receivedQty) {
      setError(
        `Jumlah Lolos QC (${acc}) + Ditahan (${held}) harus sama dengan jumlah fisik diterima (${formatQty(firstLine.receivedQty, firstLine.unit)}).`,
      );
      return;
    }
    setError(null);
    onCompleteInspection(
      receipt.id,
      acc,
      held,
      qcNotesInput.trim() || "Inspeksi QC selesai.",
    );
    onOpenChange(false);
  }

  return (
    <div className={styles.drawerSection}>
      <h3>Formulir Tinjau Inspeksi QC (UC-09)</h3>
      <div className={styles.drawerNotice} role="status">
        <strong>Batasan Sistem (UC-09):</strong> Petugas QC hanya berwenang
        mencatat hasil uji kualitas serta memisahkan kuantitas Lolos QC dan
        Ditahan (tidak dapat mengubah harga PO).
        {!canInspect && (
          <>
            {" "}
            Penyelesaian inspeksi diotorisasi untuk peran{" "}
            <strong>Quality Control (QC)</strong>.
          </>
        )}
      </div>
      <form onSubmit={handleInspectSubmit} className={styles.drawerForm}>
        <div className={styles.metaGrid}>
          <label>
            Kuantitas Lolos QC ({firstLine?.unit ?? "unit"})
            <input
              type="number"
              min={0}
              max={firstLine?.receivedQty ?? 0}
              value={acceptedInput}
              onChange={(e) => {
                const val = Number(e.target.value);
                setAcceptedInput(e.target.value);
                if (
                  firstLine &&
                  Number.isFinite(val) &&
                  val >= 0 &&
                  val <= firstLine.receivedQty
                ) {
                  setHeldInput(String(firstLine.receivedQty - val));
                }
              }}
              disabled={!canInspect}
              required
            />
          </label>
          <label>
            Kuantitas Ditahan / Ditolak QC ({firstLine?.unit ?? "unit"})
            <input
              type="number"
              min={0}
              max={firstLine?.receivedQty ?? 0}
              value={heldInput}
              onChange={(e) => {
                const val = Number(e.target.value);
                setHeldInput(e.target.value);
                if (
                  firstLine &&
                  Number.isFinite(val) &&
                  val >= 0 &&
                  val <= firstLine.receivedQty
                ) {
                  setAcceptedInput(String(firstLine.receivedQty - val));
                }
              }}
              disabled={!canInspect}
              required
            />
          </label>
        </div>
        <label>
          Catatan Hasil Inspeksi &amp; Tindak Lanjut
          <textarea
            value={qcNotesInput}
            onChange={(e) => setQcNotesInput(e.target.value)}
            disabled={!canInspect}
            required
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
            disabled={!canInspect}
          >
            Simpan Hasil Inspeksi QC
          </button>
        </div>
      </form>
    </div>
  );
}

export function ReceiptDetailDrawer({
  receipt,
  onOpenChange,
  user,
  onCompleteInspection,
}: {
  receipt: GoodsReceiptRecord | null;
  onOpenChange: (open: boolean) => void;
  user: User;
  onCompleteInspection: (
    receiptId: string,
    acceptedQty: number,
    heldQty: number,
    qcNotes: string,
  ) => void;
}) {
  if (!receipt) return null;

  const canInspect = can(user, "inspections:write");

  const totalOrdered = receipt.lines.reduce((s, l) => s + l.orderedQty, 0);
  const totalReceived = receipt.lines.reduce((s, l) => s + l.receivedQty, 0);
  const totalAccepted = receipt.lines.reduce((s, l) => s + l.acceptedQty, 0);
  const totalHeld = receipt.lines.reduce((s, l) => s + l.heldQty, 0);
  const unit = receipt.lines[0]?.unit ?? "kg";
  const isPartialDelivery = totalReceived < totalOrdered;

  return (
    <DrawerShell
      open={!!receipt}
      onOpenChange={onOpenChange}
      wide
      title={`${receipt.number} — ${receipt.supplierName}`}
      description={`Referensi ${receipt.poNumber} · Surat Jalan ${receipt.deliveryNoteNumber} · Tanggal ${receipt.dateLabel}`}
    >
      <div className={styles.drawerStack}>
        <div className={styles.drawerSection}>
          <div className={styles.supplierCardTop}>
            <h3>Ringkasan Bukti Penerimaan Barang (GRN)</h3>
            <QcStatusPill status={receipt.qcStatus} />
          </div>
          <div className={styles.metaGrid3}>
            <div className={styles.metaItem}>
              <span>No. Penerimaan</span>
              <strong>{receipt.number}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Linked PO</span>
              <strong>{receipt.poNumber}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Pemasok</span>
              <strong>{receipt.supplierName}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Surat Jalan Vendor</span>
              <strong>{receipt.deliveryNoteNumber}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Gudang Penerima</span>
              <strong>{receipt.warehouseName}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Petugas QC</span>
              <strong>{receipt.qcInspector ?? "Menunggu penugasan QC"}</strong>
            </div>
          </div>
          {isPartialDelivery && (
            <div className={styles.drawerWarningAlert}>
              <strong>Pengiriman Bertahap (Partial Delivery):</strong> Diterima{" "}
              {formatQty(totalReceived, unit)} dari total pesanan PO{" "}
              {formatQty(totalOrdered, unit)} (
              {Math.round((totalReceived / Math.max(1, totalOrdered)) * 100)}%).
              Sisa pesanan {formatQty(totalOrdered - totalReceived, unit)} tetap
              terbuka pada PO.
            </div>
          )}
        </div>

        <div className={styles.drawerSection}>
          <h3>
            Rincian Kuantitas per Baris Barang (Dipesan · Diterima · Lolos QC ·
            Ditahan)
          </h3>
          <div className={styles.miniTableWrap}>
            <table className={styles.miniTable}>
              <thead>
                <tr>
                  <th scope="col">Bahan Baku &amp; Batch</th>
                  <th scope="col">Dipesan (PO)</th>
                  <th scope="col">Diterima (GRN)</th>
                  <th scope="col">Lolos QC (Diterima)</th>
                  <th scope="col">Ditahan (QC Hold)</th>
                </tr>
              </thead>
              <tbody>
                {receipt.lines.map((line) => (
                  <tr
                    key={line.id}
                    className={line.heldQty > 0 ? styles.discrepancyRow : ""}
                  >
                    <td>
                      <strong>{line.materialName}</strong>
                      <span className={styles.cellSub}>
                        Batch {line.batchNumber} · {line.storageLocation}
                      </span>
                      {line.holdReason && (
                        <span
                          className={styles.cellSub}
                          style={{ color: "#b42336", fontWeight: 600 }}
                        >
                          Alasan tahan: {line.holdReason}
                        </span>
                      )}
                    </td>
                    <td className={styles.tabular}>
                      {formatQty(line.orderedQty, line.unit)}
                    </td>
                    <td className={styles.tabular}>
                      <strong>{formatQty(line.receivedQty, line.unit)}</strong>
                      {line.receivedQty < line.orderedQty && (
                        <span className={styles.cellSub}>
                          Sisa PO:{" "}
                          {formatQty(
                            line.orderedQty - line.receivedQty,
                            line.unit,
                          )}
                        </span>
                      )}
                    </td>
                    <td className={styles.tabular}>
                      {receipt.qcStatus === "Menunggu Inspeksi" ? (
                        <span style={{ color: "#92580a", fontWeight: 600 }}>
                          Menunggu uji
                        </span>
                      ) : (
                        <strong style={{ color: "#0e6b43" }}>
                          {formatQty(line.acceptedQty, line.unit)}
                        </strong>
                      )}
                    </td>
                    <td className={styles.tabular}>
                      {receipt.qcStatus === "Menunggu Inspeksi" ? (
                        <span style={{ color: "#52658a" }}>0 {line.unit}</span>
                      ) : line.heldQty > 0 ? (
                        <strong style={{ color: "#b42336" }}>
                          {formatQty(line.heldQty, line.unit)}
                        </strong>
                      ) : (
                        <span style={{ color: "#0e6b43" }}>0 {line.unit}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalHeld > 0 && (
            <div className={styles.drawerDangerAlert}>
              <strong>Karantina QC &amp; Tindak Lanjut Pemasok:</strong> Sebanyak{" "}
              {formatQty(totalHeld, unit)} ditahan di area karantina dan tidak
              masuk ke stok siap produksi. Hanya{" "}
              {formatQty(totalAccepted, unit)} yang layak dibayar pada saat
              3-way matching faktur pemasok.
            </div>
          )}
        </div>

        <div className={styles.drawerSection}>
          <h3>Parameter Pemeriksaan Kualitas (QC)</h3>
          <div className={styles.miniTableWrap}>
            <table className={styles.miniTable}>
              <thead>
                <tr>
                  <th scope="col">Parameter Uji</th>
                  <th scope="col">Hasil Pemeriksaan</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {receipt.qcChecks.map((chk) => (
                  <tr key={chk.parameter}>
                    <td>
                      <strong>{chk.parameter}</strong>
                    </td>
                    <td>{chk.result}</td>
                    <td>
                      <span
                        className={
                          chk.passed ? styles.matchOkTag : styles.discrepancyTag
                        }
                      >
                        {chk.passed ? "Memenuhi" : "Ditahan / Tidak Sesuai"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#36476a" }}>
            <strong>Catatan QC:</strong> {receipt.qcNotes}
          </p>
        </div>

        {receipt.qcStatus === "Menunggu Inspeksi" ? (
          <ReceiptInspectionForm
            key={receipt.id}
            receipt={receipt}
            canInspect={canInspect}
            onOpenChange={onOpenChange}
            onCompleteInspection={onCompleteInspection}
          />
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

function InvoicePaymentForm({
  invoice,
  canPay,
  onOpenChange,
  onProcessPayment,
}: {
  invoice: VendorInvoiceRecord;
  canPay: boolean;
  onOpenChange: (open: boolean) => void;
  onProcessPayment: (
    invoiceId: string,
    paidAmount: number,
    bankAccount: string,
    bankRef: string,
  ) => void;
}) {
  const [paymentInput, setPaymentInput] = useState(
    String(invoice.remainingAmount),
  );
  const [bankAccount, setBankAccount] = useState(
    "Bank BCA - Operasional (1101)",
  );
  const [bankRef, setBankRef] = useState("TRX-BCA-261116-901");
  const [error, setError] = useState<string | null>(null);

  function handlePaySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canPay) return;
    const raw = paymentInput.trim()
      ? Number(paymentInput.replaceAll(/[^0-9]/g, ""))
      : invoice.remainingAmount;
    if (!Number.isFinite(raw) || raw <= 0 || raw > invoice.remainingAmount) {
      setError(
        `Nominal pembayaran harus antara Rp1 hingga ${formatRupiahFull(invoice.remainingAmount)} (tidak boleh melebihi saldo terutang).`,
      );
      return;
    }
    setError(null);
    onProcessPayment(
      invoice.id,
      raw,
      bankAccount,
      bankRef.trim() || "TRX-BCA-261116",
    );
    onOpenChange(false);
  }

  return (
    <div className={styles.drawerSection}>
      <h3>Proses Pembayaran Pemasok (UC-12)</h3>
      {!canPay && (
        <div className={styles.drawerNotice} role="status">
          Otorisasi dan pencatatan pembayaran pemasok hanya diizinkan untuk
          peran <strong>Treasury / Keuangan (TREASURY)</strong>.
        </div>
      )}
      <form onSubmit={handlePaySubmit} className={styles.drawerForm}>
        <div className={styles.metaGrid}>
          <label>
            Nominal Pembayaran (Rp) — Maks:{" "}
            {formatRupiahFull(invoice.remainingAmount)}
            <input
              type="number"
              min={1}
              max={invoice.remainingAmount}
              value={paymentInput}
              onChange={(e) => setPaymentInput(e.target.value)}
              disabled={!canPay}
              required
            />
          </label>
          <label>
            Rekening Bank Pengeluaran
            <select
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              disabled={!canPay}
            >
              <option value="Bank BCA - Operasional (1101)">
                Bank BCA - Operasional (1101)
              </option>
              <option value="Bank Mandiri - Giro Utama (1102)">
                Bank Mandiri - Giro Utama (1102)
              </option>
            </select>
          </label>
        </div>
        <label>
          Nomor Referensi Transfer / Bukti Bank
          <input
            type="text"
            value={bankRef}
            onChange={(e) => setBankRef(e.target.value)}
            disabled={!canPay}
            required
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
            disabled={!canPay}
          >
            Proses Pembayaran
          </button>
        </div>
      </form>
    </div>
  );
}

export function InvoiceDetailDrawer({
  invoice,
  onOpenChange,
  user,
  onMatchInvoice,
  onResolveDiscrepancy,
  onRecordPayable,
  onProcessPayment,
}: {
  invoice: VendorInvoiceRecord | null;
  onOpenChange: (open: boolean) => void;
  user: User;
  onMatchInvoice: (invoiceId: string) => void;
  onResolveDiscrepancy: (invoiceId: string, resolutionNote: string) => void;
  onRecordPayable: (invoiceId: string) => void;
  onProcessPayment: (
    invoiceId: string,
    paidAmount: number,
    bankAccount: string,
    bankRef: string,
  ) => void;
}) {
  const [resolutionNote, setResolutionNote] = useState(
    "Nota potongan (Debit Memo) senilai Rp4.000.000 telah disepakati dengan PT Sumber Pangan atas 180 kg susu bubuk yang ditahan QC dan koreksi harga Rp400/kg pada Skim Grade A. Tagihan disesuaikan menjadi nilai layak bayar Rp156.000.000.",
  );

  if (!invoice) return null;

  const canMatchOrResolve = can(user, "invoices:write");
  const canRecordAp =
    can(user, "invoices:write") || can(user, "journals:post");
  const canPay = can(user, "payments:write");

  const totalPoQty = invoice.lines.reduce((s, l) => s + l.poOrderedQty, 0);
  const totalGrnRecv = invoice.lines.reduce((s, l) => s + l.grnReceivedQty, 0);
  const totalGrnAcc = invoice.lines.reduce((s, l) => s + l.grnAcceptedQty, 0);
  const totalGrnHeld = invoice.lines.reduce((s, l) => s + l.grnHeldQty, 0);
  const totalBilledQty = invoice.lines.reduce(
    (s, l) => s + l.invoiceBilledQty,
    0,
  );
  const totalPoValue = invoice.lines.reduce(
    (s, l) => s + l.poOrderedQty * l.poUnitPrice,
    0,
  );
  const unit = invoice.lines[0]?.unit ?? "kg";
  const hasDiscrepancies = invoice.lines.some(
    (l) => l.discrepancyType !== "NONE",
  );

  return (
    <DrawerShell
      open={!!invoice}
      onOpenChange={onOpenChange}
      wide
      title={`${invoice.number} — ${invoice.supplierName}`}
      description={`Faktur Pemasok ${invoice.supplierInvoiceNumber} · Jatuh Tempo ${invoice.dueDateLabel}`}
    >
      <div className={styles.drawerStack}>
        <div className={styles.drawerSection}>
          <div className={styles.supplierCardTop}>
            <h3>Ringkasan Tagihan &amp; Saldo Utang</h3>
            <VendorInvoiceStatusPill status={invoice.status} />
          </div>
          <div className={styles.metaGrid3}>
            <div className={styles.metaItem}>
              <span>Total Tagihan Faktur</span>
              <strong>{formatRupiahFull(invoice.totalAmount)}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Nilai Layak Bayar (QC)</span>
              <strong style={{ color: "#0e6b43" }}>
                {formatRupiahFull(invoice.eligibleAmount)}
              </strong>
            </div>
            <div className={styles.metaItem}>
              <span>Nilai Selisih Ditahan</span>
              <strong
                style={{
                  color: invoice.heldAmount > 0 ? "#b42336" : "#081e50",
                }}
              >
                {formatRupiahFull(invoice.heldAmount)}
              </strong>
            </div>
            <div className={styles.metaItem}>
              <span>Telah Dibayar</span>
              <strong>{formatRupiahFull(invoice.paidAmount)}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Saldo Terutang Saat Ini</span>
              <strong>{formatRupiahFull(invoice.remainingAmount)}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Jurnal AP / Bukti Bayar</span>
              <strong>
                {invoice.apJournalNumber ?? "Belum dijurnal"}
                {invoice.lastPaymentNumber
                  ? ` · ${invoice.lastPaymentNumber}`
                  : ""}
              </strong>
            </div>
          </div>
        </div>

        <div className={styles.drawerSection}>
          <h3>
            Perbandingan Tiga Dokumen (3-Way Matching: PO · Bukti Penerimaan ·
            Invoice)
          </h3>
          <div className={styles.threeWayGrid}>
            <article className={styles.threeWayCard}>
              <span className={styles.threeWayStepLabel}>
                1. Purchase Order (PO)
              </span>
              <span className={styles.threeWayDocNum}>{invoice.poNumber}</span>
              <div className={styles.threeWayDetail}>
                Dipesan: <strong>{formatQty(totalPoQty, unit)}</strong>
                <br />
                Pemasok: {invoice.supplierName}
              </div>
              <div className={styles.threeWayTotal}>
                <span>Nilai Pesanan PO</span>
                <strong>{formatRupiahFull(totalPoValue)}</strong>
              </div>
            </article>

            <article
              className={`${styles.threeWayCard} ${
                totalGrnHeld > 0 ? styles.threeWayCardDiscrepancy : ""
              }`}
            >
              <span className={styles.threeWayStepLabel}>
                2. Bukti Penerimaan (GRN &amp; QC)
              </span>
              <span className={styles.threeWayDocNum}>{invoice.grnNumber}</span>
              <div className={styles.threeWayDetail}>
                Diterima fisik: {formatQty(totalGrnRecv, unit)}
                <br />
                Lolos QC:{" "}
                <strong style={{ color: "#0e6b43" }}>
                  {formatQty(totalGrnAcc, unit)}
                </strong>
                {totalGrnHeld > 0 && (
                  <>
                    <br />
                    Ditahan QC:{" "}
                    <strong style={{ color: "#b42336" }}>
                      {formatQty(totalGrnHeld, unit)}
                    </strong>
                  </>
                )}
              </div>
              <div className={styles.threeWayTotal}>
                <span>Nilai Barang Lolos QC</span>
                <strong style={{ color: "#0e6b43" }}>
                  {formatRupiahFull(invoice.eligibleAmount)}
                </strong>
              </div>
            </article>

            <article
              className={`${styles.threeWayCard} ${
                hasDiscrepancies && invoice.heldAmount > 0
                  ? styles.threeWayCardDiscrepancy
                  : ""
              }`}
            >
              <span className={styles.threeWayStepLabel}>
                3. Invoice Vendor
              </span>
              <span className={styles.threeWayDocNum}>{invoice.number}</span>
              <div className={styles.threeWayDetail}>
                Ditagih: <strong>{formatQty(totalBilledQty, unit)}</strong>
                <br />
                Jatuh tempo: {invoice.dueDateLabel}
              </div>
              <div className={styles.threeWayTotal}>
                <span>Total Ditagih Pemasok</span>
                <strong
                  style={{
                    color: invoice.heldAmount > 0 ? "#b42336" : "#081e50",
                  }}
                >
                  {formatRupiahFull(invoice.totalAmount)}
                </strong>
              </div>
            </article>
          </div>
        </div>

        <div className={styles.drawerSection}>
          <h3>Rincian Pencocokan &amp; Evaluasi Selisih per Baris Barang</h3>
          <div className={styles.miniTableWrap}>
            <table className={styles.miniTable}>
              <thead>
                <tr>
                  <th scope="col">Bahan Baku</th>
                  <th scope="col">Kuantitas (PO · Lolos QC · Invoice)</th>
                  <th scope="col">Harga Satuan (PO · Invoice)</th>
                  <th scope="col">Subtotal (Layak · Ditagih)</th>
                  <th scope="col">Status &amp; Selisih Baris</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line) => {
                  const isMismatch = line.discrepancyType !== "NONE";
                  return (
                    <tr
                      key={line.id}
                      className={isMismatch ? styles.discrepancyRow : ""}
                    >
                      <td>
                        <strong>{line.materialName}</strong>
                      </td>
                      <td className={styles.tabular}>
                        PO: {formatQty(line.poOrderedQty, line.unit)}
                        <br />
                        Lolos QC:{" "}
                        <strong>
                          {formatQty(line.grnAcceptedQty, line.unit)}
                        </strong>
                        <br />
                        Invoice:{" "}
                        <strong
                          style={{
                            color:
                              line.invoiceBilledQty !== line.grnAcceptedQty
                                ? "#b42336"
                                : "#081e50",
                          }}
                        >
                          {formatQty(line.invoiceBilledQty, line.unit)}
                        </strong>
                      </td>
                      <td className={styles.tabular}>
                        PO: {formatRupiahFull(line.poUnitPrice)}/{line.unit}
                        <br />
                        Invoice:{" "}
                        <strong
                          style={{
                            color:
                              line.invoiceUnitPrice !== line.poUnitPrice
                                ? "#b42336"
                                : "#081e50",
                          }}
                        >
                          {formatRupiahFull(line.invoiceUnitPrice)}/{line.unit}
                        </strong>
                      </td>
                      <td className={styles.tabular}>
                        Layak: {formatRupiahFull(line.eligibleSubtotal)}
                        <br />
                        Ditagih:{" "}
                        <strong>{formatRupiahFull(line.billedSubtotal)}</strong>
                      </td>
                      <td>
                        {isMismatch ? (
                          <div>
                            <span className={styles.discrepancyTag}>
                              {line.discrepancyType === "QUANTITY"
                                ? "Selisih Kuantitas"
                                : line.discrepancyType === "PRICE"
                                  ? "Selisih Harga"
                                  : "Selisih Kuantitas & Harga"}{" "}
                              ({formatRupiahCompact(line.discrepancyAmount)})
                            </span>
                            <div
                              style={{
                                fontSize: 11.5,
                                color: "#8f1d2c",
                                lineHeight: 1.4,
                              }}
                            >
                              {line.discrepancyNote}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className={styles.matchOkTag}>
                              Cocok 3-Way
                            </span>
                            <div
                              style={{
                                fontSize: 11.5,
                                color: "#36476a",
                                marginTop: 2,
                              }}
                            >
                              {line.discrepancyNote}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#36476a" }}>
            <strong>Ringkasan Pencocokan:</strong> {invoice.matchingSummary}
          </p>
        </div>

        {invoice.status === "Perlu pencocokan" && (
          <div className={styles.drawerSection}>
            <h3>Tindakan Pencocokan 3 Dokumen (UC-10)</h3>
            {!canMatchOrResolve && (
              <div className={styles.drawerNotice} role="status">
                Tindakan <strong>Cocokkan Dokumen</strong> diotorisasi untuk
                peran <strong>Utang Usaha (AP)</strong>.
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
                disabled={!canMatchOrResolve}
                onClick={() => {
                  onMatchInvoice(invoice.id);
                  onOpenChange(false);
                }}
              >
                Cocokkan Dokumen
              </button>
            </div>
          </div>
        )}

        {invoice.status === "Selisih ditahan" && (
          <div className={styles.drawerSection}>
            <h3>Tinjau Selisih &amp; Penyelesaian Penahanan Tagihan (UC-10)</h3>
            <div className={styles.drawerDangerAlert}>
              <strong>Kontrol Pembayaran (Invariant #6):</strong> Tagihan
              berstatus <strong>Selisih ditahan (On Hold)</strong> diblokir dari
              pembayaran baru sampai selisih kuantitas/harga senilai{" "}
              {formatRupiahFull(invoice.heldAmount)} diklarifikasi melalui Nota
              Potongan (Debit Memo) pemasok.
            </div>
            {!canMatchOrResolve && (
              <div className={styles.drawerNotice} role="status">
                Tindakan <strong>Tinjau Selisih</strong> dan pelepasan penahanan
                tagihan diotorisasi untuk peran{" "}
                <strong>Utang Usaha (AP)</strong>.
              </div>
            )}
            <div className={styles.drawerForm}>
              <label>
                Keputusan Klarifikasi &amp; Nota Potongan Pemasok
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  disabled={!canMatchOrResolve}
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
                  disabled={!canMatchOrResolve}
                  onClick={() => {
                    onResolveDiscrepancy(
                      invoice.id,
                      resolutionNote.trim() ||
                        "Selisih telah dikoreksi sesuai kuantitas lolos QC dan harga PO.",
                    );
                    onOpenChange(false);
                  }}
                >
                  Tinjau Selisih &amp; Terbitkan Debit Memo
                </button>
              </div>
            </div>
          </div>
        )}

        {invoice.status === "Siap dicatat utang" && (
          <div className={styles.drawerSection}>
            <h3>Pengakuan Utang Usaha &amp; Jurnal Akuntansi (UC-11)</h3>
            <p style={{ margin: 0, fontSize: 13, color: "#36476a" }}>
              Dokumen telah dinyatakan <strong>Cocok</strong> pada 3-way
              matching. Pencatatan utang akan membukukan saldo utang usaha
              sebesar {formatRupiahFull(invoice.remainingAmount)} dan membentuk
              jurnal pengakuan persediaan bahan baku terhadap utang usaha.
            </p>
            {!canRecordAp && (
              <div className={styles.drawerNotice} role="status">
                Tindakan <strong>Catat Utang</strong> diotorisasi untuk peran{" "}
                <strong>Utang Usaha (AP)</strong> atau{" "}
                <strong>Akuntansi (ACCOUNTING)</strong>.
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
                disabled={!canRecordAp}
                onClick={() => {
                  onRecordPayable(invoice.id);
                  onOpenChange(false);
                }}
              >
                Catat Utang
              </button>
            </div>
          </div>
        )}

        {(invoice.status === "Siap dibayar" ||
          invoice.status === "Lewat jatuh tempo") && (
          <InvoicePaymentForm
            key={invoice.id}
            invoice={invoice}
            canPay={canPay}
            onOpenChange={onOpenChange}
            onProcessPayment={onProcessPayment}
          />
        )}

        {invoice.status === "Lunas" && (
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
