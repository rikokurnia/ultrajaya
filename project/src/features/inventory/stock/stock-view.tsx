"use client";

import { useState } from "react";
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  ShieldCheck,
  Search,
  Warehouse as WarehouseIcon,
  Filter,
  Check,
} from "lucide-react";
import styles from "../inventory.module.css";
import { formatQuantity, formatDate } from "@/shared/format";
import { verifyRequestStockAction } from "../actions";

import {
  StockBalanceView,
  WarehouseRecord,
  StockMovementView,
} from "../types";

interface VerificationOutcomeDetail {
  materialId: string;
  outcome: "VERIFIED" | "REJECTED";
  availableStock: string;
  requestedQuantity: string;
  reason: string;
}

interface VerificationResultData {
  requestId: string;
  overallOutcome: "VERIFIED" | "REJECTED";
  verifiedBy: string;
  verifiedAt: string;
  details: VerificationOutcomeDetail[];
}

interface StockViewProps {
  initialStock: StockBalanceView[];
  warehouses: WarehouseRecord[];
  movements: StockMovementView[];
  canVerify: boolean;
}

export function StockView({
  initialStock,
  warehouses,
  movements,
  canVerify,
}: StockViewProps) {
  const [warehouseId, setWarehouseId] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [showMovements, setShowMovements] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyWorking, setVerifyWorking] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerificationResultData | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Filter stock
  const filteredStock = initialStock.filter((s) => {
    if (warehouseId !== "ALL" && s.warehouseId !== warehouseId) return false;
    if (categoryFilter !== "ALL" && s.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = s.materialName.toLowerCase().includes(q);
      const matchCode = s.materialCode.toLowerCase().includes(q);
      if (!matchName && !matchCode) return false;
    }
    return true;
  });

  // Calculate high-level KPIs
  const belowMinCount = initialStock.filter(
    (s) => s.status === "BELOW_MINIMUM",
  ).length;
  const qcPendingCount = initialStock.filter(
    (s) => parseFloat(s.qcPending) > 0,
  ).length;

  async function handleVerifySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setVerifyError(null);
    setVerifyResult(null);
    setVerifyWorking(true);

    const formData = new FormData(e.currentTarget);
    const res = await verifyRequestStockAction(formData);
    setVerifyWorking(false);

    if (res.success) {
      setVerifyResult((res.data as unknown) as VerificationResultData);
    } else {
      setVerifyError(res.error || "Failed to verify stock.");
    }
  }

  return (
    <div className={styles.container}>
      {/* KPI Cards */}
      <div className={styles.kpisGrid}>
        <div className="card kpi">
          <span className="icon-tile">
            <Package size={26} aria-hidden />
          </span>
          <div>
            <h2>Total Managed Items</h2>
            <strong>{initialStock.length}</strong>
            <p>Raw, packaging & finished</p>
          </div>
        </div>

        <div className="card kpi">
          <span className="icon-tile" style={{ background: "#fff2db", color: "#995100" }}>
            <AlertTriangle size={26} aria-hidden />
          </span>
          <div>
            <h2>Below Minimum</h2>
            <strong style={{ color: belowMinCount > 0 ? "#995100" : "inherit" }}>
              {belowMinCount}
            </strong>
            <p>Requires reorder / replenishment</p>
          </div>
        </div>

        <div className="card kpi">
          <span className="icon-tile" style={{ background: "#e8f5ff", color: "#0755c9" }}>
            <Clock size={26} aria-hidden />
          </span>
          <div>
            <h2>In QC Inspection</h2>
            <strong>{qcPendingCount} items</strong>
            <p>Quarantined awaiting decision</p>
          </div>
        </div>

        <div className="card kpi">
          <span className="icon-tile" style={{ background: "#e0f8eb", color: "#087747" }}>
            <CheckCircle2 size={26} aria-hidden />
          </span>
          <div>
            <h2>Operational Warehouses</h2>
            <strong>{warehouses.length}</strong>
            <p>Active facility storage</p>
          </div>
        </div>
      </div>

      {/* Minimum Stock Warning Banner */}
      {belowMinCount > 0 && (
        <div
          role="alert"
          className="flex items-center justify-between p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
            <div>
              <strong className="block text-sm font-bold">
                Stock Replenishment Warning ({belowMinCount} items below safety threshold)
              </strong>
              <p className="text-xs text-amber-800 mt-0.5">
                Available inventory is currently below configured minimum safety thresholds. Expedite purchasing or production.
              </p>
            </div>
          </div>
          <span className="badge badge-warning text-xs font-semibold">Action Required</span>
        </div>
      )}

      {/* Filter and Actions Bar */}
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <div className={styles.filterSelect}>
            <WarehouseIcon size={16} aria-hidden />
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              aria-label="Filter by warehouse"
            >
              <option value="ALL">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterSelect}>
            <Filter size={16} aria-hidden />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="ALL">All Categories</option>
              <option value="RAW_MATERIAL">Raw Materials</option>
              <option value="PACKAGING">Packaging</option>
              <option value="FINISHED_GOOD">Finished Goods</option>
            </select>
          </div>

          <div className={styles.searchBar}>
            <Search size={16} aria-hidden />
            <input
              type="text"
              placeholder="Search code or material name..."
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canVerify && (
            <button
              type="button"
              className="button button-secondary flex items-center gap-1.5"
              onClick={() => setShowVerifyModal(true)}
            >
              <ShieldCheck size={16} />
              FPBB Stock Verification
            </button>
          )}

          <button
            type="button"
            className="button button-secondary flex items-center gap-1.5"
            onClick={() => setShowMovements(!showMovements)}
          >
            <History size={16} />
            {showMovements ? "Hide History" : "Transaction History"}
          </button>
        </div>
      </div>

      {/* Main Stock Balances Table */}
      <section className={styles.stockCard}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>Inventory Stock Balances</h2>
            <p className={styles.cardSubtitle}>
              Formula: Available = Physical - QC-Pending - Rejected - Reserved (Strictly non-overlapping categories)
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {filteredStock.length} items listed
          </span>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Material / Product</th>
                <th scope="col">Category</th>
                <th scope="col">Warehouse</th>
                <th scope="col">Unit</th>
                <th scope="col">Physical</th>
                <th scope="col">QC-Pending</th>
                <th scope="col">Accepted</th>
                <th scope="col">Rejected</th>
                <th scope="col">Reserved</th>
                <th scope="col">Available</th>
                <th scope="col">Minimum</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStock.map((row) => (
                <tr key={`${row.warehouseId}-${row.materialId}`}>
                  <td className="font-mono text-xs font-semibold text-slate-600">
                    {row.materialCode}
                  </td>
                  <td>
                    <strong>{row.materialName}</strong>
                  </td>
                  <td>
                    <span className="badge badge-neutral text-xs">
                      {row.category.replace("_", " ")}
                    </span>
                  </td>
                  <td className="text-xs text-slate-600">{row.warehouseName}</td>
                  <td>{row.unit}</td>
                  <td className={styles.numeric}>
                    {formatQuantity(row.physical, row.unit).replace(
                      ` ${row.unit}`,
                      "",
                    )}
                  </td>
                  <td className={`${styles.numeric} text-amber-600`}>
                    {formatQuantity(row.qcPending, row.unit).replace(
                      ` ${row.unit}`,
                      "",
                    )}
                  </td>
                  <td className={`${styles.numeric} text-emerald-700`}>
                    {formatQuantity(row.accepted, row.unit).replace(
                      ` ${row.unit}`,
                      "",
                    )}
                  </td>
                  <td className={`${styles.numeric} text-rose-700`}>
                    {formatQuantity(row.rejected, row.unit).replace(
                      ` ${row.unit}`,
                      "",
                    )}
                  </td>
                  <td className={`${styles.numeric} text-blue-700`}>
                    {formatQuantity(row.reserved, row.unit).replace(
                      ` ${row.unit}`,
                      "",
                    )}
                  </td>
                  <td className={`${styles.numeric} font-bold text-navy`}>
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
              {filteredStock.length === 0 && (
                <tr>
                  <td colSpan={13} className="text-center py-8 text-slate-500">
                    No stock records match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Transaction History Ledger */}
      {showMovements && (
        <section className={styles.stockCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Inventory Movement Ledger (Audit Trail)</h2>
              <p className={styles.cardSubtitle}>
                Immutable record of physical receipts, quality transitions, sales reservations, and returns.
              </p>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Date & Time</th>
                  <th scope="col">Reference</th>
                  <th scope="col">Material</th>
                  <th scope="col">Movement Type</th>
                  <th scope="col">From Bucket</th>
                  <th scope="col">To Bucket</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Batch / Location</th>
                  <th scope="col">Actor</th>
                  <th scope="col">Notes</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(m.occurredAt, true)}
                    </td>
                    <td>
                      <span className="font-mono font-bold text-blue-700 text-xs">
                        {m.referenceId}
                      </span>
                    </td>
                    <td>
                      <strong>{m.materialName}</strong>
                    </td>
                    <td>
                      <span className="badge badge-info text-xs">
                        {m.movementType}
                      </span>
                    </td>
                    <td className="text-xs font-mono">{m.fromBucket}</td>
                    <td className="text-xs font-mono text-emerald-700 font-semibold">
                      {m.toBucket}
                    </td>
                    <td className={`${styles.numeric} font-semibold`}>
                      {formatQuantity(m.quantity, m.unit)}
                    </td>
                    <td className="text-xs text-slate-600">
                      {m.batch ? `${m.batch} (${m.location})` : "-"}
                    </td>
                    <td className="text-xs">{m.actorName}</td>
                    <td className="text-xs text-slate-600 max-w-xs truncate">
                      {m.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Warehouse FPBB Stock Verification Modal */}
      {showVerifyModal && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Warehouse FPBB Stock Verification</h3>
                <p className={styles.cardSubtitle}>
                  Inspect physical and available inventory against production Material Request lines.
                </p>
              </div>
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setShowVerifyModal(false)}
              >
                ✕
              </button>
            </div>

            {verifyError && (
              <div className="auth-error mb-4" role="alert">
                {verifyError}
              </div>
            )}

            {verifyResult ? (
              <div className="flex flex-col gap-4">
                <div
                  className={`p-4 rounded-xl border flex items-center gap-3 ${
                    verifyResult.overallOutcome === "VERIFIED"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-rose-50 border-rose-200 text-rose-900"
                  }`}
                >
                  {verifyResult.overallOutcome === "VERIFIED" ? (
                    <CheckCircle2 size={24} className="text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle size={24} className="text-rose-600 flex-shrink-0" />
                  )}
                  <div>
                    <strong className="block text-sm font-bold">
                      Verification Outcome: {verifyResult.overallOutcome}
                    </strong>
                    <p className="text-xs mt-0.5">
                      Request ID: {verifyResult.requestId} • Verified on{" "}
                      {formatDate(verifyResult.verifiedAt, true)}
                    </p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th scope="col">Material</th>
                        <th scope="col">Requested</th>
                        <th scope="col">Available Stock</th>
                        <th scope="col">Outcome</th>
                        <th scope="col">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verifyResult.details.map((d, i: number) => {
                        const mat = initialStock.find((s) => s.materialId === d.materialId);
                        return (
                          <tr key={i}>
                            <td>{mat?.materialName || d.materialId}</td>
                            <td className={styles.numeric}>{d.requestedQuantity}</td>
                            <td className={styles.numeric}>{d.availableStock}</td>
                            <td>
                              <span
                                className={`badge ${
                                  d.outcome === "VERIFIED" ? "badge-success" : "badge-danger"
                                }`}
                              >
                                {d.outcome}
                              </span>
                            </td>
                            <td className="text-xs text-slate-600">{d.reason}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => {
                      setShowVerifyModal(false);
                      setVerifyResult(null);
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleVerifySubmit} className={styles.container}>
                <div className="field">
                  <label htmlFor="requestId">Material Request / FPBB Reference</label>
                  <input
                    id="requestId"
                    name="requestId"
                    defaultValue="fpbb_261028_0188"
                    required
                    className="input"
                  />
                </div>

                <div className="field">
                  <label htmlFor="warehouseId">Warehouse</label>
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

                <input
                  type="hidden"
                  name="items"
                  value={JSON.stringify([
                    { materialId: initialStock[0]?.materialId || "mat_fresh_milk", requestedQuantity: "25000.000" },
                    { materialId: initialStock[1]?.materialId || "mat_milk_powder", requestedQuantity: "5000.000" },
                  ])}
                />

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                  <p className="font-semibold text-slate-800 mb-1">Items to verify against current balances:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Fresh Milk: 25,000 L requested (Available: 40,000 L)</li>
                    <li>Milk Powder: 5,000 kg requested (Available: 16,000 kg)</li>
                  </ul>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setShowVerifyModal(false)}
                    disabled={verifyWorking}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={verifyWorking}
                    aria-busy={verifyWorking}
                  >
                    {verifyWorking ? "Verifying..." : "Verify Stock Availability"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
