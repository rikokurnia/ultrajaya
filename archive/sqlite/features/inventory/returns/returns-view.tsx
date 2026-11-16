"use client";

import { useState } from "react";
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Search,
  FileCheck2,
  Check,
} from "lucide-react";
import styles from "../inventory.module.css";
import { formatQuantity, formatDate, statusLabel } from "@/shared/format";
import { inspectReturnAction } from "../actions";
import { ReturnClaimView, WarehouseRecord } from "../types";

interface ReturnsViewProps {
  returns: ReturnClaimView[];
  warehouses: WarehouseRecord[];
  canWrite: boolean;
}

export function ReturnsView({ returns, warehouses, canWrite }: ReturnsViewProps) {
  const [search, setSearch] = useState("");
  const [selectedClaim, setSelectedClaim] = useState<ReturnClaimView | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [inspectedQty, setInspectedQty] = useState("");
  const [acceptedQty, setAcceptedQty] = useState("");
  const [damagedQty, setDamagedQty] = useState("");
  const [rejectedQty, setRejectedQty] = useState("");

  const [formWorking, setFormWorking] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const filteredReturns = returns.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.number.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      r.materialName.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q)
    );
  });

  function openInspectionModal(claim: ReturnClaimView) {
    setSelectedClaim(claim);
    const qty = parseFloat(claim.claimedQuantity).toFixed(3);
    setInspectedQty(qty);
    setAcceptedQty(qty);
    setDamagedQty("0.000");
    setRejectedQty("0.000");
    setIsModalOpen(true);
  }

  async function handleInspectSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setFormWorking(true);

    const formData = new FormData(e.currentTarget);
    const res = await inspectReturnAction(formData);
    setFormWorking(false);

    if (res.success) {
      setFormSuccess(res.message || "Return inspection recorded!");
      setTimeout(() => {
        setIsModalOpen(false);
        window.location.reload();
      }, 1000);
    } else {
      setFormError(res.error || "Failed to inspect return.");
    }
  }

  return (
    <div className={styles.container}>
      {/* KPI Stats */}
      <div className={styles.kpisGrid}>
        <div className="card kpi">
          <span className="icon-tile">
            <RotateCcw size={26} aria-hidden />
          </span>
          <div>
            <h2>Total Return Claims</h2>
            <strong>{returns.length}</strong>
            <p>From sales & customers</p>
          </div>
        </div>

        <div className="card kpi">
          <span className="icon-tile" style={{ background: "#e0f8eb", color: "#087747" }}>
            <CheckCircle2 size={26} aria-hidden />
          </span>
          <div>
            <h2>Inspected & Authorized</h2>
            <strong>
              {returns.filter((r) => r.inspection?.status === "INSPECTED" || r.status === "INSPECTED").length}
            </strong>
            <p>Condition classified</p>
          </div>
        </div>

        <div className="card kpi">
          <span className="icon-tile" style={{ background: "#e8f5ff", color: "#0755c9" }}>
            <FileCheck2 size={26} aria-hidden />
          </span>
          <div>
            <h2>Restored to Available</h2>
            <strong>
              {returns.reduce(
                (acc, r) => acc + (parseFloat(r.inspection?.acceptedQuantity || "0") > 0 ? 1 : 0),
                0,
              )}{" "}
              claims
            </strong>
            <p>Resaleable goods restocked</p>
          </div>
        </div>

        <div className="card kpi">
          <span className="icon-tile" style={{ background: "#ffebee", color: "#b42336" }}>
            <AlertTriangle size={26} aria-hidden />
          </span>
          <div>
            <h2>Damaged / Quarantined</h2>
            <strong>
              {returns.reduce(
                (acc, r) => acc + (parseFloat(r.inspection?.damagedQuantity || "0") > 0 ? 1 : 0),
                0,
              )}{" "}
              claims
            </strong>
            <p>Scrap quarantined for disposal</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBar}>
          <Search size={16} aria-hidden />
          <input
            type="text"
            placeholder="Search return number, customer, material..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <section className={styles.stockCard}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>Customer Physical Returns & Quality Inspection</h2>
            <p className={styles.cardSubtitle}>
              Classify physical return condition. Eligible accepted items return to available stock; damaged items are quarantined. Findings expose FAM credit-note eligibility.
            </p>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Return Number</th>
                <th scope="col">Customer</th>
                <th scope="col">Material</th>
                <th scope="col">Claimed</th>
                <th scope="col">Accepted (Restocked)</th>
                <th scope="col">Damaged (Quarantine)</th>
                <th scope="col">Condition</th>
                <th scope="col">Findings & Notes</th>
                <th scope="col">Credit Note / Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReturns.map((r) => {
                const insp = r.inspection;
                const hasInspection = !!insp;

                return (
                  <tr key={r.id}>
                    <td>
                      <strong className="font-mono text-blue-700 text-xs">
                        {r.number}
                      </strong>
                    </td>
                    <td>
                      <strong>{r.customerName}</strong>
                    </td>
                    <td>
                      <div>
                        <strong>{r.materialName}</strong>
                        <div className="text-xs text-slate-500 font-mono">{r.materialCode}</div>
                      </div>
                    </td>
                    <td className={styles.numeric}>
                      {formatQuantity(r.claimedQuantity, r.unit)}
                    </td>
                    <td className={`${styles.numeric} text-emerald-700 font-bold`}>
                      {hasInspection
                        ? formatQuantity(insp.acceptedQuantity, r.unit)
                        : "-"}
                    </td>
                    <td className={`${styles.numeric} text-rose-700 font-bold`}>
                      {hasInspection && parseFloat(insp.damagedQuantity) > 0
                        ? formatQuantity(insp.damagedQuantity, r.unit)
                        : "-"}
                    </td>
                    <td>
                      {hasInspection ? (
                        <span className="badge badge-neutral text-xs">
                          {insp.conditionClassification}
                        </span>
                      ) : (
                        <span className="badge badge-warning text-xs">
                          Pending Inspection
                        </span>
                      )}
                    </td>
                    <td className="text-xs max-w-xs">
                      {hasInspection ? (
                        <div>
                          <p className="font-medium text-slate-800">{insp.findings}</p>
                          <span className="text-slate-500 block mt-0.5">
                            Inspected by {insp.inspectorName} on {formatDate(insp.inspectedAt, true)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">{r.reason}</span>
                      )}
                    </td>
                    <td>
                      {insp?.creditNoteNumber ? (
                        <div>
                          <span className="badge badge-success text-xs flex items-center gap-1">
                            <Check size={12} />
                            Authorized
                          </span>
                          <span className="text-xs font-mono text-slate-600 block mt-0.5">
                            {insp.creditNoteNumber}
                          </span>
                        </div>
                      ) : (
                        <span className="badge badge-info text-xs">
                          {statusLabel(r.status)}
                        </span>
                      )}
                    </td>
                    <td>
                      {canWrite && !hasInspection && (
                        <button
                          type="button"
                          className="button button-primary text-xs py-1.5 px-3 flex items-center gap-1"
                          onClick={() => openInspectionModal(r)}
                        >
                          <FileCheck2 size={13} />
                          Inspect Return
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredReturns.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-slate-500">
                    No return claims found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Inspect Return Modal */}
      {isModalOpen && selectedClaim && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Inspect Physical Return Goods</h3>
                <p className={styles.cardSubtitle}>
                  Claim: {selectedClaim.number} • Customer: {selectedClaim.customerName}
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

            <form onSubmit={handleInspectSubmit} className={styles.container}>
              <input type="hidden" name="returnClaimId" value={selectedClaim.id} />
              <input type="hidden" name="materialId" value={selectedClaim.materialId} />
              <input type="hidden" name="claimedQuantity" value={selectedClaim.claimedQuantity} />
              <input type="hidden" name="unit" value={selectedClaim.unit} />

              <div className={styles.formGrid}>
                <div className="field">
                  <label htmlFor="warehouseId">Receiving Warehouse</label>
                  <select id="warehouseId" name="warehouseId" className="input" required>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="conditionClassification">Physical Condition Classification</label>
                  <select
                    id="conditionClassification"
                    name="conditionClassification"
                    className="input"
                    defaultValue="RESALEABLE"
                    required
                  >
                    <option value="RESALEABLE">Resaleable / Sealed (Return to stock)</option>
                    <option value="DAMAGED_SCRAP">Damaged Packaging / Scrap (Quarantine)</option>
                    <option value="CUSTOMER_MISUSE">Customer Misuse / Ineligible</option>
                    <option value="INCOMPLETE">Incomplete / Short count</option>
                  </select>
                </div>

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
                </div>

                <div className="field">
                  <label htmlFor="acceptedQuantity">Accepted / Resaleable (Return to Available)</label>
                  <input
                    id="acceptedQuantity"
                    name="acceptedQuantity"
                    value={acceptedQty}
                    onChange={(e) => setAcceptedQty(e.target.value)}
                    required
                    className="input font-mono text-emerald-700 font-bold"
                  />
                </div>

                <div className="field">
                  <label htmlFor="damagedQuantity">Damaged / Scrap (Quarantine Discard)</label>
                  <input
                    id="damagedQuantity"
                    name="damagedQuantity"
                    value={damagedQty}
                    onChange={(e) => setDamagedQty(e.target.value)}
                    required
                    className="input font-mono text-rose-700 font-bold"
                  />
                </div>

                <div className="field">
                  <label htmlFor="rejectedQuantity">Customer Fault / Ineligible (No Stock Movement)</label>
                  <input
                    id="rejectedQuantity"
                    name="rejectedQuantity"
                    value={rejectedQty}
                    onChange={(e) => setRejectedQty(e.target.value)}
                    required
                    className="input font-mono text-slate-500"
                  />
                </div>

                <div className={`${styles.formFull} field`}>
                  <label htmlFor="findings">Inspection Findings & Defect Description</label>
                  <textarea
                    id="findings"
                    name="findings"
                    rows={2}
                    placeholder="Describe packaging condition, seal integrity, lot verification..."
                    required
                    className="input py-2"
                  />
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
