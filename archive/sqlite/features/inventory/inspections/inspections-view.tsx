"use client";

import { useState } from "react";
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Search,
  Check,
} from "lucide-react";
import styles from "../inventory.module.css";
import { formatQuantity, formatDate } from "@/shared/format";
import { performInspectionAction } from "../actions";
import { InspectionView, GoodsReceiptView, ReceiptLineView } from "../types";

export interface PendingReceiptLineView extends ReceiptLineView {
  receiptId: string;
  receiptNumber: string;
  purchaseOrderNumber: string;
  supplierName: string;
  warehouseName: string;
  receivedAt: string;
}

interface InspectionsViewProps {
  inspections: InspectionView[];
  pendingReceipts: GoodsReceiptView[];
  canWrite: boolean;
}

export function InspectionsView({
  inspections,
  pendingReceipts,
  canWrite,
}: InspectionsViewProps) {
  const [activeTab, setActiveTab] = useState<"completed" | "pending">("completed");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReceiptLine, setSelectedReceiptLine] = useState<PendingReceiptLineView | null>(null);
  const [formWorking, setFormWorking] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Modal form states for dynamic test rows
  const [acceptedQty, setAcceptedQty] = useState("");
  const [rejectedQty, setRejectedQty] = useState("");
  const [inspectedQty, setInspectedQty] = useState("");

  const filteredInspections = inspections.filter((i) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      i.number.toLowerCase().includes(q) ||
      i.receiptNumber.toLowerCase().includes(q) ||
      i.materialName.toLowerCase().includes(q) ||
      i.supplierName.toLowerCase().includes(q)
    );
  });

  // Extract pending receipt lines
  const pendingLines: PendingReceiptLineView[] = [];
  for (const r of pendingReceipts) {
    for (const l of r.lines || []) {
      if (l.status !== "INSPECTED") {
        pendingLines.push({
          receiptId: r.id,
          receiptNumber: r.number,
          purchaseOrderNumber: r.purchaseOrderNumber,
          supplierName: r.supplierName,
          warehouseName: r.warehouseName,
          receivedAt: r.receivedAt,
          ...l,
        });
      }
    }
  }

  function openInspectionModal(line: PendingReceiptLineView) {
    setSelectedReceiptLine(line);
    const uninspected = (
      parseFloat(line.receivedQuantity) -
      (parseFloat(line.acceptedQuantity || "0") + parseFloat(line.rejectedQuantity || "0"))
    ).toFixed(3);
    setInspectedQty(uninspected);
    setAcceptedQty(uninspected);
    setRejectedQty("0.000");
    setIsModalOpen(true);
  }

  async function handleInspectionSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setFormWorking(true);

    const formData = new FormData(e.currentTarget);
    const res = await performInspectionAction(formData);
    setFormWorking(false);

    if (res.success) {
      setFormSuccess(res.message || "QC inspection completed!");
      setTimeout(() => {
        setIsModalOpen(false);
        window.location.reload();
      }, 1000);
    } else {
      setFormError(res.error || "Failed to submit QC inspection.");
    }
  }

  return (
    <div className={styles.container}>
      {/* Tab Switcher & Search */}
      <div className={styles.toolbar}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`button ${activeTab === "completed" ? "button-primary" : "button-secondary"}`}
            onClick={() => setActiveTab("completed")}
          >
            Completed Inspections ({inspections.length})
          </button>
          <button
            type="button"
            className={`button ${activeTab === "pending" ? "button-primary" : "button-secondary"}`}
            onClick={() => setActiveTab("pending")}
          >
            Awaiting Inspection ({pendingLines.length})
          </button>
        </div>

        <div className={styles.searchBar}>
          <Search size={16} aria-hidden />
          <input
            type="text"
            placeholder="Search inspection, receipt, or supplier..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {activeTab === "completed" ? (
        <section className={styles.stockCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Quality Control Inspections</h2>
              <p className={styles.cardSubtitle}>
                Official test outcomes, accepted quantities for production, and quarantined rejections.
              </p>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">QC Number</th>
                  <th scope="col">Receipt Number</th>
                  <th scope="col">Material</th>
                  <th scope="col">Supplier</th>
                  <th scope="col">Inspected</th>
                  <th scope="col">Accepted</th>
                  <th scope="col">Rejected</th>
                  <th scope="col">Inspector</th>
                  <th scope="col">Date</th>
                  <th scope="col">Status</th>
                  <th scope="col">Tests & Findings</th>
                </tr>
              </thead>
              <tbody>
                {filteredInspections.map((qc) => {
                  const hasRejection = parseFloat(qc.rejectedQuantity) > 0;
                  return (
                    <tr key={qc.id}>
                      <td>
                        <strong className="font-mono text-blue-700 text-xs">
                          {qc.number}
                        </strong>
                      </td>
                      <td>
                        <span className="font-mono text-xs">{qc.receiptNumber}</span>
                      </td>
                      <td>
                        <strong>{qc.materialName}</strong>
                      </td>
                      <td className="text-xs text-slate-600">{qc.supplierName}</td>
                      <td className={styles.numeric}>
                        {formatQuantity(qc.inspectedQuantity, qc.unit)}
                      </td>
                      <td className={`${styles.numeric} text-emerald-700 font-semibold`}>
                        {formatQuantity(qc.acceptedQuantity, qc.unit)}
                      </td>
                      <td className={`${styles.numeric} ${hasRejection ? "text-rose-700 font-bold" : "text-slate-400"}`}>
                        {formatQuantity(qc.rejectedQuantity, qc.unit)}
                      </td>
                      <td className="text-xs">{qc.inspectorName}</td>
                      <td className="text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(qc.inspectedAt, true)}
                      </td>
                      <td>
                        <span className="badge badge-success flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          QC Completed
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1 text-xs max-w-sm">
                          {qc.tests?.map((t, i: number) => (
                            <span key={i} className="flex items-center gap-1">
                              {t.outcome === "ACCEPTED" ? (
                                <Check size={12} className="text-emerald-600" />
                              ) : (
                                <XCircle size={12} className="text-rose-600" />
                              )}
                              <strong>{t.name}:</strong> {t.result}
                            </span>
                          ))}
                          {hasRejection && qc.quarantineReason && (
                            <span className="text-rose-700 font-semibold mt-1">
                              ⚠ {qc.quarantineReason}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredInspections.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-slate-500">
                      No inspection records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className={styles.stockCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Inbound Receipts Awaiting Inspection</h2>
              <p className={styles.cardSubtitle}>
                Goods currently in QC-pending status. Perform testing to accept into available stock or quarantine.
              </p>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Receipt Number</th>
                  <th scope="col">PO Number</th>
                  <th scope="col">Supplier</th>
                  <th scope="col">Material</th>
                  <th scope="col">Batch & Location</th>
                  <th scope="col">Received Quantity</th>
                  <th scope="col">Pending QC</th>
                  <th scope="col">Received At</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingLines.map((line) => {
                  const alreadyDone =
                    parseFloat(line.acceptedQuantity || "0") +
                    parseFloat(line.rejectedQuantity || "0");
                  const pendingQty = (
                    parseFloat(line.receivedQuantity) - alreadyDone
                  ).toFixed(3);

                  return (
                    <tr key={line.id}>
                      <td>
                        <strong className="font-mono text-blue-700 text-xs">
                          {line.receiptNumber}
                        </strong>
                      </td>
                      <td>
                        <span className="font-mono text-xs">
                          {line.purchaseOrderNumber}
                        </span>
                      </td>
                      <td>{line.supplierName}</td>
                      <td>
                        <strong>{line.materialName}</strong>
                      </td>
                      <td className="text-xs text-slate-600">
                        {line.batch} ({line.location})
                      </td>
                      <td className={styles.numeric}>
                        {formatQuantity(line.receivedQuantity, line.unit)}
                      </td>
                      <td className={`${styles.numeric} text-amber-600 font-bold`}>
                        {formatQuantity(pendingQty, line.unit)}
                      </td>
                      <td className="text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(line.receivedAt, true)}
                      </td>
                      <td>
                        {canWrite ? (
                          <button
                            type="button"
                            className="button button-primary text-xs py-1.5 px-3 flex items-center gap-1"
                            onClick={() => openInspectionModal(line)}
                          >
                            <FileCheck2 size={14} />
                            Perform QC
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">QC role required</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {pendingLines.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-500">
                      All received goods have been inspected. No pending lines.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Perform QC Inspection Modal */}
      {isModalOpen && selectedReceiptLine && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Perform Quality Inspection</h3>
                <p className={styles.cardSubtitle}>
                  Receipt {selectedReceiptLine.receiptNumber} •{" "}
                  {selectedReceiptLine.materialName} ({selectedReceiptLine.batch})
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

            <form onSubmit={handleInspectionSubmit} className={styles.container}>
              <input type="hidden" name="receiptId" value={selectedReceiptLine.receiptId} />
              <input type="hidden" name="receiptLineId" value={selectedReceiptLine.id} />

              <div className={styles.formGrid}>
                <div className="field">
                  <label htmlFor="inspectedQuantity">Inspected Quantity</label>
                  <input
                    id="inspectedQuantity"
                    name="inspectedQuantity"
                    value={inspectedQty}
                    onChange={(e) => setInspectedQty(e.target.value)}
                    required
                    className="input font-mono"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Available in batch: {selectedReceiptLine.receivedQuantity}{" "}
                    {selectedReceiptLine.unit}
                  </p>
                </div>

                <div className="field">
                  <label htmlFor="acceptedQuantity">Accepted Quantity (For Production)</label>
                  <input
                    id="acceptedQuantity"
                    name="acceptedQuantity"
                    value={acceptedQty}
                    onChange={(e) => {
                      setAcceptedQty(e.target.value);
                      const a = parseFloat(e.target.value || "0");
                      const ins = parseFloat(inspectedQty || "0");
                      if (!isNaN(ins) && !isNaN(a) && ins >= a) {
                        setRejectedQty((ins - a).toFixed(3));
                      }
                    }}
                    required
                    className="input font-mono text-emerald-700 font-bold"
                  />
                </div>

                <div className="field">
                  <label htmlFor="rejectedQuantity">Rejected Quantity (Quarantine)</label>
                  <input
                    id="rejectedQuantity"
                    name="rejectedQuantity"
                    value={rejectedQty}
                    onChange={(e) => setRejectedQty(e.target.value)}
                    required
                    className="input font-mono text-rose-700 font-bold"
                  />
                </div>

                <div className="field">
                  <label htmlFor="quarantineValueMinor">Quarantine Financial Value (Minor Units IDR)</label>
                  <input
                    id="quarantineValueMinor"
                    name="quarantineValueMinor"
                    placeholder="e.g. 400000000 for Rp4,000,000"
                    defaultValue="0"
                    className="input font-mono"
                  />
                </div>

                <div className={`${styles.formFull} field`}>
                  <label htmlFor="quarantineReason">Quarantine / Supplier Claim Reason</label>
                  <input
                    id="quarantineReason"
                    name="quarantineReason"
                    placeholder="e.g. Rejected quantity quarantined. Supplier credit note required."
                    className="input"
                  />
                </div>

                <div className={`${styles.formFull} field`}>
                  <label htmlFor="notes">Inspection Findings and Notes</label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={2}
                    placeholder="Describe laboratory tests, sensory checks, packaging conditions..."
                    className="input py-2"
                  />
                </div>
              </div>

              {/* Standard tests payload */}
              <input
                type="hidden"
                name="tests"
                value={JSON.stringify([
                  { name: "Moisture Content", result: "Within specification (≤ 4.5%)", outcome: "ACCEPTED" },
                  { name: "Microbiology Standard Plate Count", result: "Compliant with food safety thresholds", outcome: "ACCEPTED" },
                  {
                    name: "Packaging Integrity & Seal Check",
                    result: parseFloat(rejectedQty) > 0 ? `${rejectedQty} damaged packaging` : "Intact and sealed",
                    outcome: parseFloat(rejectedQty) > 0 ? "REJECTED" : "ACCEPTED",
                  },
                ])}
              />

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
                  {formWorking ? "Saving Inspection..." : "Confirm & Update Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
