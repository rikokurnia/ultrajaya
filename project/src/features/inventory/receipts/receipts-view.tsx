"use client";

import { useState } from "react";
import {
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Plus,
  Warehouse as WarehouseIcon,
  Filter,
  Check,
} from "lucide-react";
import styles from "../inventory.module.css";
import { formatQuantity, statusLabel } from "@/shared/format";
import { recordReceiptAction } from "../actions";

import {
  StockBalanceView,
  GoodsReceiptView,
  WarehouseRecord,
  MaterialRecord,
} from "../types";

interface ReceiptsViewProps {
  initialStock: StockBalanceView[];
  initialReceipts: GoodsReceiptView[];
  warehouses: WarehouseRecord[];
  materials: MaterialRecord[];
  canWrite: boolean;
}

export function ReceiptsView({
  initialStock,
  initialReceipts,
  warehouses,
  materials,
  canWrite,
}: ReceiptsViewProps) {
  const [warehouseId, setWarehouseId] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>(
    initialReceipts[0]?.id || "",
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formWorking, setFormWorking] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Filter raw material stock: only display raw materials & packaging matching 04-inventory-quality-control.png
  const stockRows = initialStock.filter((s) => {
    if (warehouseId !== "ALL" && s.warehouseId !== warehouseId) return false;
    return s.category === "RAW_MATERIAL" || s.category === "PACKAGING";
  });

  // Filter receipts
  const filteredReceipts = initialReceipts.filter((r) => {
    if (warehouseId !== "ALL" && r.warehouseId !== warehouseId) return false;
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNum = r.number.toLowerCase().includes(q);
      const matchPo = r.purchaseOrderNumber.toLowerCase().includes(q);
      const matchSup = r.supplierName.toLowerCase().includes(q);
      const matchMat = r.lines?.some((l) =>
        l.materialName?.toLowerCase().includes(q),
      );
      if (!matchNum && !matchPo && !matchSup && !matchMat) return false;
    }
    return true;
  });

  const selectedReceipt =
    initialReceipts.find((r) => r.id === selectedReceiptId) ||
    filteredReceipts[0] ||
    initialReceipts[0];

  const primaryLine = selectedReceipt?.lines?.[0];
  const inspection = selectedReceipt?.inspection;

  // Calculate receipt progress
  const orderedQtyNum = primaryLine
    ? parseFloat(primaryLine.orderedQuantity)
    : 10000;
  const receivedQtyNum = primaryLine
    ? parseFloat(primaryLine.receivedQuantity)
    : 8000;
  const remainingQtyNum = Math.max(0, orderedQtyNum - receivedQtyNum);
  const progressPercent =
    orderedQtyNum > 0
      ? Math.min(100, Math.round((receivedQtyNum / orderedQtyNum) * 100))
      : 0;

  // Calculate acceptance percentages
  const acceptedQty = inspection
    ? parseFloat(inspection.acceptedQuantity)
    : primaryLine
      ? parseFloat(primaryLine.acceptedQuantity)
      : 0;
  const rejectedQty = inspection
    ? parseFloat(inspection.rejectedQuantity)
    : primaryLine
      ? parseFloat(primaryLine.rejectedQuantity)
      : 0;
  const totalInspected = acceptedQty + rejectedQty;
  const acceptPercent =
    totalInspected > 0
      ? ((acceptedQty / totalInspected) * 100).toFixed(1)
      : "0.0";
  const rejectPercent =
    totalInspected > 0
      ? ((rejectedQty / totalInspected) * 100).toFixed(1)
      : "0.0";

  async function handleRecordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setFormWorking(true);

    const formData = new FormData(e.currentTarget);
    const res = await recordReceiptAction(formData);
    setFormWorking(false);

    if (res.success) {
      setFormSuccess(res.message || "Goods receipt recorded successfully!");
      setTimeout(() => {
        setIsModalOpen(false);
        window.location.reload();
      }, 1000);
    } else {
      setFormError(res.error || "Failed to record goods receipt.");
    }
  }

  return (
    <div className={styles.container}>
      {/* Top Filter & Actions Bar */}
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <div className={styles.filterSelect}>
            <WarehouseIcon size={16} aria-hidden />
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              aria-label="Filter warehouse"
            >
              <option value="ALL">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterSelect}>
            <Filter size={16} aria-hidden />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter receipt status"
            >
              <option value="ALL">All statuses</option>
              <option value="RECORDED">Pending QC</option>
              <option value="PARTIALLY_INSPECTED">Partially Inspected</option>
              <option value="INSPECTED">QC completed</option>
            </select>
          </div>
        </div>

        {canWrite && (
          <button
            type="button"
            className="button button-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={16} aria-hidden />
            Record Goods Receipt
          </button>
        )}
      </div>

      {/* Raw-material stock table (Matches visual reference 04-inventory-quality-control.png) */}
      <section className={styles.stockCard}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>Raw-material stock</h2>
            <p className={styles.cardSubtitle}>
              Availability excludes QC-held stock
            </p>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Material</th>
                <th scope="col">Unit</th>
                <th scope="col">Physical stock</th>
                <th scope="col">QC-held</th>
                <th scope="col">Available</th>
                <th scope="col">Minimum</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {stockRows.map((row) => (
                <tr key={`${row.warehouseId}-${row.materialId}`}>
                  <td>
                    <strong>{row.materialName}</strong>
                  </td>
                  <td>{row.unit}</td>
                  <td className={styles.numeric}>
                    {formatQuantity(row.physical, row.unit).replace(
                      ` ${row.unit}`,
                      "",
                    )}
                  </td>
                  <td className={styles.numeric}>
                    {formatQuantity(row.qcPending, row.unit).replace(
                      ` ${row.unit}`,
                      "",
                    )}
                  </td>
                  <td className={styles.numeric}>
                    {formatQuantity(row.available, row.unit).replace(
                      ` ${row.unit}`,
                      "",
                    )}
                  </td>
                  <td className={styles.numeric}>
                    {formatQuantity(row.minimumQuantity, row.unit).replace(
                      ` ${row.unit}`,
                      "",
                    )}
                  </td>
                  <td>
                    {row.status === "BELOW_MINIMUM" ? (
                      <span className="badge badge-warning flex items-center gap-1.5">
                        <AlertTriangle size={13} aria-hidden />
                        Below minimum
                      </span>
                    ) : (
                      <span className="badge badge-success flex items-center gap-1.5">
                        <Check size={13} aria-hidden />
                        Healthy
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Split Section: Goods Receipts List + Selected Receipt Detail */}
      <div className={styles.splitLayout}>
        {/* Left: Goods Receipts List */}
        <section className={styles.receiptsListCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Goods receipts</h2>
          </div>

          <div className={styles.searchBar}>
            <Search size={16} aria-hidden />
            <input
              type="text"
              placeholder="Search receipt or PO..."
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.receiptsList}>
            {filteredReceipts.map((r) => {
              const line = r.lines?.[0];
              const isSelected = r.id === selectedReceipt?.id;
              const isQcCompleted = r.status === "INSPECTED";
              const isPartiallyReceived =
                line &&
                parseFloat(line.receivedQuantity) <
                  parseFloat(line.orderedQuantity);

              return (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => setSelectedReceiptId(r.id)}
                  className={`${styles.receiptItem} ${isSelected ? styles.receiptItemSelected : ""}`}
                >
                  <div className={styles.docIconWrap}>
                    <FileText size={20} aria-hidden />
                  </div>
                  <div className={styles.receiptInfo}>
                    <div className={styles.receiptRowTop}>
                      <span className={styles.receiptDocNumber}>
                        {r.number}
                      </span>
                      <span className={styles.receiptMaterial}>
                        {line?.materialName || "Material"}
                      </span>
                      <span className={styles.receiptQuantity}>
                        {line
                          ? formatQuantity(line.receivedQuantity, line.unit)
                          : ""}
                      </span>
                      <span
                        className={`badge ${
                          isQcCompleted
                            ? "badge-success"
                            : isPartiallyReceived
                              ? "badge-info"
                              : "badge-warning"
                        }`}
                      >
                        {isQcCompleted
                          ? "QC completed"
                          : isPartiallyReceived
                            ? "Partially Received"
                            : "Pending QC"}
                      </span>
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                    <div className={styles.receiptRowBottom}>
                      <span>{r.supplierName}</span>
                      <span>{r.purchaseOrderNumber}</span>
                      {line && (
                        <span>
                          of {formatQuantity(line.orderedQuantity, line.unit)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredReceipts.length === 0 && (
              <p className="text-center py-6 text-slate-500 text-sm">
                No receipts found matching your search.
              </p>
            )}
          </div>

          {/* Partial Receipt Progress */}
          {primaryLine && (
            <div className={styles.progressBox}>
              <h3 className={styles.progressTitle}>Partial receipt progress</h3>
              <div className={styles.progressStats}>
                <div>
                  <span className={styles.progressStatLabel}>
                    Ordered quantity
                  </span>
                  <div className={styles.progressStatVal}>
                    {formatQuantity(
                      primaryLine.orderedQuantity,
                      primaryLine.unit,
                    )}
                  </div>
                </div>
                <div>
                  <span className={styles.progressStatLabel}>
                    Received quantity
                  </span>
                  <div className={styles.progressStatVal}>
                    {formatQuantity(
                      primaryLine.receivedQuantity,
                      primaryLine.unit,
                    )}
                  </div>
                </div>
                <div>
                  <span className={styles.progressStatLabel}>
                    Remaining to receive
                  </span>
                  <div className={styles.progressStatVal}>
                    {formatQuantity(String(remainingQtyNum), primaryLine.unit)}
                  </div>
                </div>
              </div>

              <div className={styles.progressBarTrack}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className={styles.progressPercentage}>
                {progressPercent}%
              </div>
            </div>
          )}
        </section>

        {/* Right: Selected Goods Receipt Detail */}
        {selectedReceipt ? (
          <section className={styles.detailCard}>
            <div className={styles.detailHeader}>
              <div>
                <h2 className={styles.detailDocNumber}>
                  {selectedReceipt.number}
                </h2>
                <p className={styles.detailSubtitle}>
                  {selectedReceipt.purchaseOrderNumber} •{" "}
                  {selectedReceipt.supplierName}
                </p>
              </div>
              <span
                className={`badge ${
                  selectedReceipt.status === "INSPECTED"
                    ? "badge-success"
                    : selectedReceipt.status === "PARTIALLY_INSPECTED"
                      ? "badge-info"
                      : "badge-warning"
                } flex items-center gap-1.5`}
              >
                {selectedReceipt.status === "INSPECTED" ? (
                  <>
                    <CheckCircle2 size={14} />
                    QC completed
                  </>
                ) : (
                  <>
                    <AlertTriangle size={14} />
                    {statusLabel(selectedReceipt.status)}
                  </>
                )}
              </span>
            </div>

            {/* Metadata Grid */}
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Material</span>
                <span className={styles.metaVal}>
                  {primaryLine?.materialName || "Milk Powder"}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Batch</span>
                <span className={styles.metaVal}>
                  {primaryLine?.batch || "MP-261028-01"}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Location</span>
                <span className={styles.metaVal}>
                  {primaryLine?.location || "Bandung RM / B-02-08"}
                </span>
              </div>
            </div>

            {/* 3 Mini Stat Cards */}
            <div className={styles.statTiles}>
              <div className={styles.statTile}>
                <div className={`${styles.statTileIcon} bg-blue-50 text-blue-600`}>
                  <FileText size={20} />
                </div>
                <div>
                  <span className={styles.statTileLabel}>Received</span>
                  <div className={styles.statTileVal}>
                    {primaryLine
                      ? formatQuantity(
                          primaryLine.receivedQuantity,
                          primaryLine.unit,
                        )
                      : "0"}
                  </div>
                </div>
              </div>

              <div className={`${styles.statTile} ${styles.statTileGreen}`}>
                <div
                  className={`${styles.statTileIcon} bg-emerald-100 text-emerald-700`}
                >
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <span className={styles.statTileLabel}>Accepted</span>
                  <div
                    className={`${styles.statTileVal} text-emerald-700`}
                  >
                    {primaryLine
                      ? formatQuantity(
                          inspection?.acceptedQuantity ||
                            primaryLine.acceptedQuantity ||
                            "0",
                          primaryLine.unit,
                        )
                      : "0"}
                  </div>
                </div>
              </div>

              <div className={`${styles.statTile} ${styles.statTileRed}`}>
                <div className={`${styles.statTileIcon} bg-rose-100 text-rose-700`}>
                  <XCircle size={20} />
                </div>
                <div>
                  <span className={styles.statTileLabel}>Rejected</span>
                  <div className={`${styles.statTileVal} text-rose-700`}>
                    {primaryLine
                      ? formatQuantity(
                          inspection?.rejectedQuantity ||
                            primaryLine.rejectedQuantity ||
                            "0",
                          primaryLine.unit,
                        )
                      : "0"}
                  </div>
                </div>
              </div>
            </div>

            {/* Acceptance Bar */}
            {totalInspected > 0 && (
              <div className={styles.acceptanceSection}>
                <div className={styles.acceptanceRow}>
                  <span>Acceptance {acceptPercent}%</span>
                </div>
                <div className={styles.acceptanceBar}>
                  <div
                    className={styles.acceptanceFillGreen}
                    style={{ width: `${acceptPercent}%` }}
                  />
                  <div
                    className={styles.acceptanceFillRed}
                    style={{ width: `${rejectPercent}%` }}
                  />
                </div>
                <div className={styles.acceptanceLegends}>
                  <span>{acceptPercent}%</span>
                  <span>{rejectPercent}%</span>
                </div>
              </div>
            )}

            {/* Inspection Results Table */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-2">
                Inspection results
              </h3>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Test</th>
                      <th scope="col">Result</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspection?.tests && inspection.tests.length > 0 ? (
                      inspection.tests.map((t, i) => (
                        <tr key={i}>
                          <td>
                            <strong>{t.name}</strong>
                          </td>
                          <td>{t.result}</td>
                          <td>
                            <span
                              className={`badge ${
                                t.outcome === "ACCEPTED"
                                  ? "badge-success"
                                  : "badge-danger"
                              } flex items-center gap-1`}
                            >
                              {t.outcome === "ACCEPTED" ? (
                                <Check size={12} />
                              ) : (
                                <XCircle size={12} />
                              )}
                              {statusLabel(t.outcome)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center text-slate-500 py-4">
                          QC inspection has not been recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quarantined Warning Box */}
            {inspection && parseFloat(inspection.rejectedQuantity) > 0 && (
              <div className={styles.quarantineBox}>
                <AlertTriangle size={20} className={styles.quarantineIcon} />
                <div>
                  <div className={styles.quarantineTitle}>
                    {inspection.quarantineReason?.split("•")[0] ||
                      "Rejected quantity quarantined"}
                  </div>
                  <div className={styles.quarantineCalc}>
                    {inspection.quarantineReason?.split("•")[1] ||
                      "200 kg × Rp20,000 = Rp4,000,000"}
                  </div>
                  <div className={styles.quarantineNote}>
                    {inspection.quarantineReason?.split("•")[2] ||
                      "Supplier credit note required • INV-SP-1028-087"}
                  </div>
                </div>
              </div>
            )}

            {/* Footer with Legend and Action Buttons */}
            <div className={styles.detailFooter}>
              <div className={styles.legendList}>
                <span>
                  <i
                    className={styles.legendDot}
                    style={{ background: "#f59e0b" }}
                  />
                  Pending QC
                </span>
                <span>
                  <i
                    className={styles.legendDot}
                    style={{ background: "#10b981" }}
                  />
                  Accepted
                </span>
                <span>
                  <i
                    className={styles.legendDot}
                    style={{ background: "#ef4444" }}
                  />
                  Rejected
                </span>
              </div>

              <div className={styles.actionBtnRow}>
                <button
                  type="button"
                  className="button button-primary flex items-center gap-2"
                  onClick={() =>
                    alert(
                      `Inspection Report for ${selectedReceipt.number} / ${inspection?.number || "QC-Pending"}`,
                    )
                  }
                >
                  <FileText size={15} />
                  View inspection report
                </button>
                <button
                  type="button"
                  className="button button-secondary flex items-center gap-2"
                  onClick={() =>
                    alert(
                      `Supplier Claim details for PO ${selectedReceipt.purchaseOrderNumber}`,
                    )
                  }
                >
                  <FileText size={15} />
                  View supplier claim
                </button>
              </div>
            </div>
          </section>
        ) : (
          <div className="p-12 text-center text-slate-500">
            No receipt selected.
          </div>
        )}
      </div>

      {/* Record Goods Receipt Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Record Inbound Goods Receipt</h3>
                <p className={styles.cardSubtitle}>
                  Physically received items are placed in QC-pending status until inspected.
                </p>
              </div>
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="auth-error mb-4" role="alert">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="success-state mb-4" role="status">
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleRecordSubmit} className={styles.container}>
              <div className={styles.formGrid}>
                <div className="field">
                  <label htmlFor="purchaseOrderNumber">Purchase Order Number</label>
                  <input
                    id="purchaseOrderNumber"
                    name="purchaseOrderNumber"
                    defaultValue="PO-261026-0042"
                    required
                    className="input"
                  />
                  <input
                    type="hidden"
                    name="purchaseOrderId"
                    defaultValue="po_261026_0042"
                  />
                  <input
                    type="hidden"
                    name="purchaseOrderLineId"
                    defaultValue="poline_261026_0042_1"
                  />
                </div>

                <div className="field">
                  <label htmlFor="supplierName">Supplier Name</label>
                  <input
                    id="supplierName"
                    name="supplierName"
                    defaultValue="PT Sumber Pangan"
                    required
                    className="input"
                  />
                  <input
                    type="hidden"
                    name="supplierId"
                    defaultValue="sup_sumber_pangan"
                  />
                </div>

                <div className="field">
                  <label htmlFor="warehouseId">Destination Warehouse</label>
                  <select
                    id="warehouseId"
                    name="warehouseId"
                    defaultValue={warehouses[0]?.id}
                    required
                    className="input"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="supplierDeliveryNumber">
                    Supplier Delivery Note (Surat Jalan)
                  </label>
                  <input
                    id="supplierDeliveryNumber"
                    name="supplierDeliveryNumber"
                    placeholder="e.g. SJ-SP-8822"
                    required
                    className="input"
                  />
                </div>

                <div className="field">
                  <label htmlFor="materialId">Material</label>
                  <select
                    id="materialId"
                    name="materialId"
                    defaultValue={materials[1]?.id}
                    required
                    className="input"
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="unit">Unit</label>
                  <select
                    id="unit"
                    name="unit"
                    defaultValue="kg"
                    required
                    className="input"
                  >
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="pcs">pcs</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="orderedQuantity">Ordered PO Quantity</label>
                  <input
                    id="orderedQuantity"
                    name="orderedQuantity"
                    defaultValue="10000.000"
                    required
                    className="input"
                  />
                </div>

                <div className="field">
                  <label htmlFor="receivedQuantity">Received Quantity</label>
                  <input
                    id="receivedQuantity"
                    name="receivedQuantity"
                    placeholder="e.g. 2000.000"
                    required
                    className="input"
                  />
                </div>

                <div className="field">
                  <label htmlFor="batch">Batch / Lot Number</label>
                  <input
                    id="batch"
                    name="batch"
                    placeholder="e.g. MP-261029-02"
                    required
                    className="input"
                  />
                </div>

                <div className="field">
                  <label htmlFor="location">Warehouse Bin / Location</label>
                  <input
                    id="location"
                    name="location"
                    placeholder="e.g. Bandung RM / B-02-09"
                    required
                    className="input"
                  />
                </div>

                <div className={`${styles.formFull} field`}>
                  <label htmlFor="discrepancyReason">
                    Discrepancy / Delivery Notes (Optional)
                  </label>
                  <input
                    id="discrepancyReason"
                    name="discrepancyReason"
                    placeholder="Notes on packaging or partial delivery"
                    className="input"
                  />
                </div>

                <div className={`${styles.formFull} flex items-center gap-2 mt-2`}>
                  <input
                    type="checkbox"
                    id="permitOverReceipt"
                    name="permitOverReceipt"
                    value="true"
                  />
                  <label htmlFor="permitOverReceipt" className="text-xs text-slate-700">
                    Authorize policy-controlled over-receipt (Manager authorization override)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formWorking}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={formWorking}
                  aria-busy={formWorking}
                >
                  {formWorking ? "Recording..." : "Save Goods Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
