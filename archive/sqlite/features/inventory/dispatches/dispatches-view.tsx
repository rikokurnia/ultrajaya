"use client";

import { useState } from "react";
import {
  Truck,
  CheckCircle2,
  Clock,
  Upload,
  Download,
  Search,
  FileCheck,
  Check,
  ShieldAlert,
} from "lucide-react";
import styles from "../inventory.module.css";
import { formatQuantity, statusLabel } from "@/shared/format";
import {
  reserveStockAction,
  createDispatchAction,
  uploadSignedDOAction,
} from "../actions";
import { DeliveryOrderView, SalesOrderView, WarehouseRecord } from "../types";

interface DispatchesViewProps {
  dispatches: DeliveryOrderView[];
  salesOrders: SalesOrderView[];
  warehouses: WarehouseRecord[];
  canWrite: boolean;
}

export function DispatchesView({
  dispatches,
  salesOrders,
  warehouses,
  canWrite,
}: DispatchesViewProps) {
  const [activeTab, setActiveTab] = useState<"dispatches" | "salesOrders">("dispatches");
  const [search, setSearch] = useState("");
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedSo, setSelectedSo] = useState<SalesOrderView | null>(null);
  const [selectedDispatch, setSelectedDispatch] = useState<DeliveryOrderView | null>(null);

  const [formWorking, setFormWorking] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const filteredDispatches = dispatches.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.number.toLowerCase().includes(q) ||
      d.salesOrderNumber.toLowerCase().includes(q) ||
      d.customerName.toLowerCase().includes(q) ||
      d.carrier3pl.toLowerCase().includes(q)
    );
  });

  const filteredSalesOrders = salesOrders.filter((so) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      so.number.toLowerCase().includes(q) ||
      so.customer_name?.toLowerCase().includes(q)
    );
  });

  async function handleReserveSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setFormWorking(true);

    const formData = new FormData(e.currentTarget);
    const res = await reserveStockAction(formData);
    setFormWorking(false);

    if (res.success) {
      setFormSuccess(res.message || "Stock reserved successfully.");
      setTimeout(() => {
        setShowReserveModal(false);
        window.location.reload();
      }, 1000);
    } else {
      setFormError(res.error || "Failed to reserve stock.");
    }
  }

  async function handleDispatchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setFormWorking(true);

    const formData = new FormData(e.currentTarget);
    const res = await createDispatchAction(formData);
    setFormWorking(false);

    if (res.success) {
      setFormSuccess(res.message || "Delivery Order created!");
      setTimeout(() => {
        setShowDispatchModal(false);
        window.location.reload();
      }, 1000);
    } else {
      setFormError(res.error || "Failed to create delivery order.");
    }
  }

  async function handleUploadSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setFormWorking(true);

    const formData = new FormData(e.currentTarget);
    const res = await uploadSignedDOAction(formData);
    setFormWorking(false);

    if (res.success) {
      setFormSuccess(res.message || "Evidence uploaded!");
      setTimeout(() => {
        setShowUploadModal(false);
        window.location.reload();
      }, 1000);
    } else {
      setFormError(res.error || "Failed to upload signed DO evidence.");
    }
  }

  return (
    <div className={styles.container}>
      {/* KPI Stats */}
      <div className={styles.kpisGrid}>
        <div className="card kpi">
          <span className="icon-tile">
            <Truck size={26} aria-hidden />
          </span>
          <div>
            <h2>Total Dispatches</h2>
            <strong>{dispatches.length}</strong>
            <p>Delivery Orders issued</p>
          </div>
        </div>

        <div className="card kpi">
          <span className="icon-tile" style={{ background: "#e0f8eb", color: "#087747" }}>
            <CheckCircle2 size={26} aria-hidden />
          </span>
          <div>
            <h2>Delivered with Evidence</h2>
            <strong>
              {dispatches.filter((d) => d.status === "DELIVERED").length}
            </strong>
            <p>Signed DO attachments verified</p>
          </div>
        </div>

        <div className="card kpi">
          <span className="icon-tile" style={{ background: "#e8f5ff", color: "#0755c9" }}>
            <Clock size={26} aria-hidden />
          </span>
          <div>
            <h2>In Transit / Dispatched</h2>
            <strong>
              {dispatches.filter((d) => d.status === "DISPATCHED").length}
            </strong>
            <p>Assigned to 3PL carriers</p>
          </div>
        </div>

        <div className="card kpi">
          <span className="icon-tile" style={{ background: "#fff2db", color: "#995100" }}>
            <FileCheck size={26} aria-hidden />
          </span>
          <div>
            <h2>Active Sales Orders</h2>
            <strong>{salesOrders.length}</strong>
            <p>Fulfillment & allocation</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`button ${activeTab === "dispatches" ? "button-primary" : "button-secondary"}`}
            onClick={() => setActiveTab("dispatches")}
          >
            Delivery Orders ({dispatches.length})
          </button>
          <button
            type="button"
            className={`button ${activeTab === "salesOrders" ? "button-primary" : "button-secondary"}`}
            onClick={() => setActiveTab("salesOrders")}
          >
            Sales Orders & Reservations ({salesOrders.length})
          </button>
        </div>

        <div className={styles.searchBar}>
          <Search size={16} aria-hidden />
          <input
            type="text"
            placeholder="Search DO, SO, customer, carrier..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {activeTab === "dispatches" ? (
        <section className={styles.stockCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Outbound Dispatches (Delivery Orders)</h2>
              <p className={styles.cardSubtitle}>
                3PL carrier tracking, vehicle details, delivered quantities, and protected signed DO evidence.
              </p>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">DO Number</th>
                  <th scope="col">Sales Order</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Warehouse</th>
                  <th scope="col">3PL Carrier</th>
                  <th scope="col">Tracking / Vehicle</th>
                  <th scope="col">Items</th>
                  <th scope="col">Status</th>
                  <th scope="col">Signed Evidence</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDispatches.map((d) => {
                  const hasEvidence = d.attachments && d.attachments.length > 0;
                  return (
                    <tr key={d.id}>
                      <td>
                        <strong className="font-mono text-blue-700 text-xs">
                          {d.number}
                        </strong>
                      </td>
                      <td>
                        <span className="font-mono text-xs">{d.salesOrderNumber}</span>
                      </td>
                      <td>
                        <strong>{d.customerName}</strong>
                      </td>
                      <td className="text-xs text-slate-600">{d.warehouseName}</td>
                      <td>
                        <span className="badge badge-neutral text-xs">
                          {d.carrier3pl}
                        </span>
                      </td>
                      <td className="text-xs text-slate-600">
                        {d.trackingNumber ? (
                          <div>
                            <span className="font-mono font-semibold">{d.trackingNumber}</span>
                            {d.vehicleNumber && <div>{d.vehicleNumber} ({d.driverName})</div>}
                          </div>
                        ) : (
                          d.vehicleNumber || "-"
                        )}
                      </td>
                      <td>
                        <div className="flex flex-col text-xs">
                          {d.lines?.map((l, i: number) => (
                            <span key={i}>
                              {formatQuantity(l.quantity, l.unit)} {l.materialName}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            d.status === "DELIVERED"
                              ? "badge-success"
                              : d.status === "DISPATCHED"
                                ? "badge-info"
                                : "badge-neutral"
                          }`}
                        >
                          {statusLabel(d.status)}
                        </span>
                      </td>
                      <td>
                        {hasEvidence ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`/api/inventory/attachments/${d.attachments[0].id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="button button-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                            >
                              <Download size={13} />
                              Signed DO
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 font-semibold">
                            Pending Evidence
                          </span>
                        )}
                      </td>
                      <td>
                        {canWrite && d.status !== "DELIVERED" && (
                          <button
                            type="button"
                            className="button button-primary text-xs py-1 px-2.5 flex items-center gap-1"
                            onClick={() => {
                              setSelectedDispatch(d);
                              setShowUploadModal(true);
                            }}
                          >
                            <Upload size={13} />
                            Upload Evidence
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredDispatches.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-slate-500">
                      No delivery orders found.
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
              <h2 className={styles.cardTitle}>Sales Order Stock Reservations</h2>
              <p className={styles.cardSubtitle}>
                Verify availability against approved Sales Orders. Reserve finished goods atomically before dispatch.
              </p>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">SO Number</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Credit Status</th>
                  <th scope="col">SO Status</th>
                  <th scope="col">Lines & Allocation</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSalesOrders.map((so) => {
                  const isCreditApproved = so.credit_status === "APPROVED";
                  return (
                    <tr key={so.id}>
                      <td>
                        <strong className="font-mono text-blue-700 text-xs">
                          {so.number}
                        </strong>
                      </td>
                      <td>
                        <strong>{so.customer_name}</strong>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            isCreditApproved ? "badge-success" : "badge-danger"
                          } flex items-center gap-1`}
                        >
                          {isCreditApproved ? <Check size={12} /> : <ShieldAlert size={12} />}
                          {so.credit_status}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-info text-xs">
                          {statusLabel(so.status)}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1 text-xs">
                          {so.lines?.map((l) => {
                            const ordered = parseFloat(l.quantity);
                            const reserved = parseFloat(l.reservedQuantity || "0");
                            const dispatched = parseFloat(l.dispatchedQuantity || "0");
                            return (
                              <div
                                key={l.id}
                                className="p-2 bg-slate-50 rounded border border-slate-200"
                              >
                                <strong>{l.materialName}</strong>: {ordered} {l.unit} ordered
                                <div className="text-slate-600 mt-0.5">
                                  Reserved: <span className="font-semibold text-blue-700">{reserved} {l.unit}</span> •
                                  Dispatched: <span className="font-semibold text-emerald-700">{dispatched} {l.unit}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {canWrite && isCreditApproved && (
                            <>
                              <button
                                type="button"
                                className="button button-secondary text-xs py-1.5 px-2.5"
                                onClick={() => {
                                  setSelectedSo(so);
                                  setShowReserveModal(true);
                                }}
                              >
                                Reserve Stock
                              </button>
                              <button
                                type="button"
                                className="button button-primary text-xs py-1.5 px-2.5 flex items-center gap-1"
                                onClick={() => {
                                  setSelectedSo(so);
                                  setShowDispatchModal(true);
                                }}
                              >
                                <Truck size={13} />
                                Create DO
                              </button>
                            </>
                          )}
                          {!isCreditApproved && (
                            <span className="text-xs text-rose-600 font-semibold">
                              Blocked by Credit Hold
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Reserve Stock Modal */}
      {showReserveModal && selectedSo && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Reserve Stock for SO</h3>
                <p className={styles.cardSubtitle}>
                  Atomic allocation prevents overselling. Order: {selectedSo.number} ({selectedSo.customer_name})
                </p>
              </div>
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setShowReserveModal(false)}
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

            <form onSubmit={handleReserveSubmit} className={styles.container}>
              <input type="hidden" name="salesOrderId" value={selectedSo.id} />
              <input
                type="hidden"
                name="salesOrderLineId"
                value={selectedSo.lines?.[0]?.id || ""}
              />
              <input
                type="hidden"
                name="materialId"
                value={selectedSo.lines?.[0]?.materialId || ""}
              />

              <div className="field">
                <label htmlFor="warehouseId">Source Warehouse</label>
                <select id="warehouseId" name="warehouseId" className="input" required>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="reserveQty">Quantity to Reserve</label>
                <input
                  id="reserveQty"
                  name="quantity"
                  defaultValue="1000.000"
                  required
                  className="input font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setShowReserveModal(false)}
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
                  {formWorking ? "Reserving..." : "Confirm Reservation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Delivery Order Modal */}
      {showDispatchModal && selectedSo && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Issue Delivery Order (DO)</h3>
                <p className={styles.cardSubtitle}>
                  Fulfill reserved stock against {selectedSo.number} ({selectedSo.customer_name})
                </p>
              </div>
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setShowDispatchModal(false)}
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

            <form onSubmit={handleDispatchSubmit} className={styles.container}>
              <input type="hidden" name="salesOrderId" value={selectedSo.id} />

              <div className={styles.formGrid}>
                <div className="field">
                  <label htmlFor="warehouseId">Fulfillment Warehouse</label>
                  <select id="warehouseId" name="warehouseId" className="input" required>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="carrier3pl">3PL Logistics Carrier</label>
                  <input
                    id="carrier3pl"
                    name="carrier3pl"
                    defaultValue="Dakota Logistics"
                    required
                    className="input"
                  />
                </div>

                <div className="field">
                  <label htmlFor="trackingNumber">Carrier Tracking / AWB</label>
                  <input
                    id="trackingNumber"
                    name="trackingNumber"
                    placeholder="e.g. DKT-JKT-9901"
                    className="input"
                  />
                </div>

                <div className="field">
                  <label htmlFor="vehicleNumber">Vehicle Number</label>
                  <input
                    id="vehicleNumber"
                    name="vehicleNumber"
                    placeholder="e.g. B 9821 UJ"
                    className="input"
                  />
                </div>

                <div className="field">
                  <label htmlFor="driverName">Driver Name</label>
                  <input
                    id="driverName"
                    name="driverName"
                    placeholder="e.g. Budi Santoso"
                    className="input"
                  />
                </div>

                <div className="field">
                  <label htmlFor="dispatchQty">Dispatch Quantity</label>
                  <input
                    id="dispatchQty"
                    defaultValue="1000.000"
                    className="input font-mono"
                    readOnly
                  />
                </div>
              </div>

              <input
                type="hidden"
                name="lines"
                value={JSON.stringify([
                  {
                    salesOrderLineId: selectedSo.lines?.[0]?.id,
                    materialId: selectedSo.lines?.[0]?.materialId,
                    quantity: "1000.000",
                    unit: selectedSo.lines?.[0]?.unit || "pcs",
                  },
                ])}
              />

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setShowDispatchModal(false)}
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
                  {formWorking ? "Dispatching..." : "Confirm & Dispatch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Signed Evidence Modal */}
      {showUploadModal && selectedDispatch && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Attach Signed Delivery Order Evidence</h3>
                <p className={styles.cardSubtitle}>
                  DO: {selectedDispatch.number} • Customer: {selectedDispatch.customerName}
                </p>
              </div>
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setShowUploadModal(false)}
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

            <form onSubmit={handleUploadSubmit} className={styles.container}>
              <input type="hidden" name="dispatchId" value={selectedDispatch.id} />

              <div className="field">
                <label htmlFor="evidenceFile">Select Signed DO Document (PDF, PNG, JPG)</label>
                <input
                  type="file"
                  id="evidenceFile"
                  name="file"
                  accept="application/pdf,image/png,image/jpeg"
                  required
                  className="input py-2"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Protected storage. File validated with magic bytes and stored outside public access. Max 10MB.
                </p>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setShowUploadModal(false)}
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
                  {formWorking ? "Uploading..." : "Upload & Mark Delivered"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
