"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X, AlertCircle, Award, FileSpreadsheet } from "lucide-react";
import { createRfqAction, recordQuotationAction, evaluateSuppliersAction } from "../actions";
import type { Supplier, ExtendedMaterialRequest, RfqDetail } from "../types";

export function CreateRfqDialog({
  verifiedRequests,
  suppliers,
}: {
  verifiedRequests: ExtendedMaterialRequest[];
  suppliers: Supplier[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const [requestId, setRequestId] = useState(verifiedRequests[0]?.id || "");
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>(
    suppliers.slice(0, 3).map((s) => s.id),
  );
  const [dueOn, setDueOn] = useState("2026-11-01");

  function toggleSupplier(id: string) {
    if (selectedSuppliers.includes(id)) {
      if (selectedSuppliers.length > 1) {
        setSelectedSuppliers(selectedSuppliers.filter((s) => s !== id));
      }
    } else {
      setSelectedSuppliers([...selectedSuppliers, id]);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requestId) {
      setError("Select at least one verified material request.");
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const res = await createRfqAction({
        requestIds: [requestId],
        supplierIds: selectedSuppliers,
        dueOn,
      });
      if (!res.success) {
        setError(res.error);
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="button button-primary flex items-center gap-2 py-2 px-4 text-xs font-semibold"
        >
          <Plus size={16} />
          Create RFQ
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="drawer max-w-lg">
          <div className="flex items-center justify-between pb-3 border-b border-[#d6e7fa]">
            <div>
              <Dialog.Title className="text-lg font-bold text-[#102b55]">
                New Request for Quotation (RFQ)
              </Dialog.Title>
              <Dialog.Description className="text-xs text-[#52658a]">
                Solicit price quotations and delivery lead times from qualified suppliers.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="icon-button text-[#52658a] hover:text-[#102b55]"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {error && (
            <div className="p-3 my-2 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-4 text-xs">
            <div className="field">
              <label htmlFor="rfq-req" className="font-semibold text-[#102b55]">
                Source Verified Material Request
              </label>
              <select
                id="rfq-req"
                className="input"
                value={requestId}
                onChange={(e) => setRequestId(e.target.value)}
                required
              >
                {verifiedRequests.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.number} — {r.purpose.slice(0, 40)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="rfq-due" className="font-semibold text-[#102b55]">
                Quotation Submission Deadline (Due Date)
              </label>
              <input
                id="rfq-due"
                type="date"
                className="input"
                value={dueOn}
                onChange={(e) => setDueOn(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <span className="font-semibold text-[#102b55] block mb-1">
                Invited Qualified Suppliers
              </span>
              <div className="flex flex-col gap-2 p-3 bg-[#f5f9ff] border border-[#d6e7fa] rounded-lg">
                {suppliers.map((s) => {
                  const checked = selectedSuppliers.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-2.5 cursor-pointer hover:text-[#0755c9]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSupplier(s.id)}
                      />
                      <span className="font-medium text-[#102b55]">{s.name}</span>
                      <span className="text-[#52658a] text-[11px]">({s.code})</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#d6e7fa] mt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={isPending}
                  className="button button-secondary text-xs py-2 px-3.5"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isPending}
                className="button button-primary text-xs py-2 px-4"
              >
                {isPending ? "Issuing..." : "Issue RFQ to Suppliers"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function RecordQuotationDialog({
  rfq,
  suppliers,
}: {
  rfq: RfqDetail;
  suppliers: Supplier[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const [supplierId, setSupplierId] = useState(rfq.supplierIds[0] || suppliers[0]?.id || "");
  const [validUntil, setValidUntil] = useState("2026-11-15");
  const [leadDays, setLeadDays] = useState(2);
  const [unitPriceRupiah, setUnitPriceRupiah] = useState("120");

  const materialId = rfq.lines[0]?.materialId || "mat_cartons";
  const quantity = rfq.lines[0]?.quantity || "1000000.000";
  const unit = rfq.lines[0]?.unit || "pcs";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const priceMinor = Math.round(parseFloat(unitPriceRupiah) * 100);
    if (isNaN(priceMinor) || priceMinor <= 0) {
      setError("Please enter a valid price.");
      return;
    }

    startTransition(async () => {
      const res = await recordQuotationAction({
        rfqId: rfq.id,
        supplierId,
        validUntil,
        leadDays: Number(leadDays),
        lines: [
          {
            materialId,
            quantity,
            unit,
            unitPrice: priceMinor,
          },
        ],
      });
      if (!res.success) {
        setError(res.error);
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="button button-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 border border-[#99bdf2] text-[#0755c9]"
        >
          <FileSpreadsheet size={14} />
          Record Supplier Quotation
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="drawer max-w-lg">
          <div className="flex items-center justify-between pb-3 border-b border-[#d6e7fa]">
            <div>
              <Dialog.Title className="text-lg font-bold text-[#102b55]">
                Record Quotation — {rfq.number}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-[#52658a]">
                Enter formal quotation received from vendor.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="icon-button text-[#52658a] hover:text-[#102b55]"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {error && (
            <div className="p-3 my-2 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-4 text-xs">
            <div className="field">
              <label htmlFor="quote-sup" className="font-semibold text-[#102b55]">
                Supplier
              </label>
              <select
                id="quote-sup"
                className="input"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label htmlFor="quote-valid" className="font-semibold text-[#102b55]">
                  Quote Validity Until
                </label>
                <input
                  id="quote-valid"
                  type="date"
                  className="input"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="quote-lead" className="font-semibold text-[#102b55]">
                  Promised Lead Time (Days)
                </label>
                <input
                  id="quote-lead"
                  type="number"
                  min="1"
                  max="120"
                  className="input font-mono"
                  value={leadDays}
                  onChange={(e) => setLeadDays(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="quote-price" className="font-semibold text-[#102b55]">
                Offered Unit Price (Rupiah per {unit})
              </label>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#52658a]">Rp</span>
                <input
                  id="quote-price"
                  type="number"
                  step="any"
                  className="input font-mono"
                  value={unitPriceRupiah}
                  onChange={(e) => setUnitPriceRupiah(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#d6e7fa] mt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={isPending}
                  className="button button-secondary text-xs py-2 px-3.5"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isPending}
                className="button button-primary text-xs py-2 px-4"
              >
                {isPending ? "Saving..." : "Record Quotation"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function EvaluateSuppliersDialog({ rfq }: { rfq: RfqDetail }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const [selectedQuoteId, setSelectedQuoteId] = useState(rfq.quotations[0]?.id || "");
  const [reason, setReason] = useState(
    "Selected winning supplier based on superior quality rating, verified lead time capability, and competitive pricing.",
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedQuoteId) {
      setError("Please select the winning quotation.");
      return;
    }
    setError(undefined);

    startTransition(async () => {
      const res = await evaluateSuppliersAction({
        rfqId: rfq.id,
        selectedQuotationId: selectedQuoteId,
        criteria: [
          {
            name: "Quality & Specifications Compliance",
            weight: 25,
            scores: { [selectedQuoteId]: 95 },
          },
          {
            name: "Manufacturing Capacity",
            weight: 15,
            scores: { [selectedQuoteId]: 90 },
          },
          {
            name: "Delivery & Lead Time Reliability",
            weight: 20,
            scores: { [selectedQuoteId]: 96 },
          },
          {
            name: "Commercial Terms & Price",
            weight: 20,
            scores: { [selectedQuoteId]: 98 },
          },
          {
            name: "Qualification & Legal Validity",
            weight: 10,
            scores: { [selectedQuoteId]: 100 },
          },
          {
            name: "Supply Chain & Financial Risk",
            weight: 10,
            scores: { [selectedQuoteId]: 92 },
          },
        ],
        reason,
      });
      if (!res.success) {
        setError(res.error);
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="button button-primary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-[#087747] hover:bg-[#065e38]"
        >
          <Award size={14} />
          Evaluate & Award
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="drawer max-w-lg">
          <div className="flex items-center justify-between pb-3 border-b border-[#d6e7fa]">
            <div>
              <Dialog.Title className="text-lg font-bold text-[#102b55]">
                Supplier Evaluation & Award — {rfq.number}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-[#52658a]">
                Formal multi-criteria evaluation of submitted quotations.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="icon-button text-[#52658a] hover:text-[#102b55]"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {error && (
            <div className="p-3 my-2 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-4 text-xs">
            <div className="field">
              <label htmlFor="eval-quote" className="font-semibold text-[#102b55]">
                Select Winning Quotation
              </label>
              <select
                id="eval-quote"
                className="input"
                value={selectedQuoteId}
                onChange={(e) => setSelectedQuoteId(e.target.value)}
                required
              >
                {rfq.quotations.map((q) => {
                  const sup = rfq.suppliers.find((s) => s.id === q.supplierId);
                  return (
                    <option key={q.id} value={q.id}>
                      {q.number} — {sup?.name || "Supplier"} ({q.leadDays} days, Rp
                      {Math.round(q.total / 100).toLocaleString()})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="p-3 bg-[#f5f9ff] border border-[#d6e7fa] rounded-lg text-xs">
              <span className="font-bold text-[#102b55] block mb-2 uppercase text-[11px] tracking-wider">
                Evaluation Criteria Matrix (Weighted Total: 100%)
              </span>
              <ul className="space-y-1.5 text-[#52658a]">
                <li className="flex justify-between">
                  <span>Quality & Specifications:</span>
                  <span className="font-semibold text-[#102b55]">25%</span>
                </li>
                <li className="flex justify-between">
                  <span>Delivery & Lead Time Reliability:</span>
                  <span className="font-semibold text-[#102b55]">20%</span>
                </li>
                <li className="flex justify-between">
                  <span>Commercial & Price Competitiveness:</span>
                  <span className="font-semibold text-[#102b55]">20%</span>
                </li>
                <li className="flex justify-between">
                  <span>Manufacturing Capacity:</span>
                  <span className="font-semibold text-[#102b55]">15%</span>
                </li>
                <li className="flex justify-between">
                  <span>Qualification & Legal Validity:</span>
                  <span className="font-semibold text-[#102b55]">10%</span>
                </li>
                <li className="flex justify-between">
                  <span>Supply Risk & Redundancy:</span>
                  <span className="font-semibold text-[#102b55]">10%</span>
                </li>
              </ul>
            </div>

            <div className="field">
              <label htmlFor="eval-reason" className="font-semibold text-[#102b55]">
                Selection Rationale & Award Justification
              </label>
              <textarea
                id="eval-reason"
                className="input h-24 py-2"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#d6e7fa] mt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={isPending}
                  className="button button-secondary text-xs py-2 px-3.5"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isPending}
                className="button button-primary text-xs py-2 px-4 bg-[#087747]"
              >
                {isPending ? "Finalizing..." : "Finalize & Award"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
