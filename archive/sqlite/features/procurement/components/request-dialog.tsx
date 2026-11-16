"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X, AlertCircle } from "lucide-react";
import { createRequestAction, verifyRequestAction } from "../actions";
import type { ExtendedMaterialRequest } from "../types";

export function CreateRequestDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const [productionReference, setProductionReference] = useState("WO-261029-PRD");
  const [priority, setPriority] = useState<"LOW" | "NORMAL" | "HIGH" | "URGENT">("NORMAL");
  const [requiredOn, setRequiredOn] = useState("2026-11-03");
  const [purpose, setPurpose] = useState("Production line replenishment");
  const [materialId, setMaterialId] = useState("mat_cartons");
  const [quantity, setQuantity] = useState("1000000.000");
  const [unit, setUnit] = useState<"L" | "kg" | "pcs">("pcs");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const res = await createRequestAction({
        warehouseId: "wh_bandung_rm",
        productionReference,
        priority,
        requiredOn,
        purpose,
        lines: [
          {
            materialId,
            quantity,
            unit,
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
          className="button button-primary flex items-center gap-2 py-2 px-4 text-xs font-semibold"
        >
          <Plus size={16} />
          New Material Request (FPBB)
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="drawer max-w-lg">
          <div className="flex items-center justify-between pb-3 border-b border-[#d6e7fa]">
            <div>
              <Dialog.Title className="text-lg font-bold text-[#102b55]">
                Create Material Request (FPBB)
              </Dialog.Title>
              <Dialog.Description className="text-xs text-[#52658a]">
                Production department material requisition request.
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
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label htmlFor="req-prod-ref" className="font-semibold text-[#102b55]">
                  Production Reference
                </label>
                <input
                  id="req-prod-ref"
                  type="text"
                  className="input"
                  value={productionReference}
                  onChange={(e) => setProductionReference(e.target.value)}
                  placeholder="e.g. WO-261029-A"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="req-priority" className="font-semibold text-[#102b55]">
                  Priority Level
                </label>
                <select
                  id="req-priority"
                  className="input"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as "LOW" | "NORMAL" | "HIGH" | "URGENT")}
                >
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label htmlFor="req-date" className="font-semibold text-[#102b55]">
                  Required Date
                </label>
                <input
                  id="req-date"
                  type="date"
                  className="input"
                  value={requiredOn}
                  onChange={(e) => setRequiredOn(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="req-wh" className="font-semibold text-[#102b55]">
                  Destination Warehouse
                </label>
                <input
                  id="req-wh"
                  type="text"
                  className="input bg-[#edf5ff]"
                  value="Bandung RM (wh_bandung_rm)"
                  readOnly
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="req-purpose" className="font-semibold text-[#102b55]">
                Purpose / Work Order Reason
              </label>
              <textarea
                id="req-purpose"
                className="input h-20 py-2"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Describe intended production batch or operational requirement..."
                required
              />
            </div>

            <div className="p-3 bg-[#f5f9ff] border border-[#d6e7fa] rounded-lg flex flex-col gap-3">
              <span className="font-bold text-[#102b55] uppercase text-[11px] tracking-wider">
                Requested Material & Quantity
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label htmlFor="req-mat" className="text-[#52658a]">
                    Material
                  </label>
                  <select
                    id="req-mat"
                    className="input"
                    value={materialId}
                    onChange={(e) => {
                      setMaterialId(e.target.value);
                      if (e.target.value === "mat_cartons") {
                        setUnit("pcs");
                      } else if (e.target.value === "mat_milk_powder") {
                        setUnit("kg");
                      } else {
                        setUnit("L");
                      }
                    }}
                  >
                    <option value="mat_cartons">Packaging Cartons (PK-001)</option>
                    <option value="mat_milk_powder">Milk Powder (RM-002)</option>
                    <option value="mat_fresh_milk">Fresh Milk (RM-001)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="field">
                    <label htmlFor="req-quantity" className="text-[#52658a]">
                      Quantity
                    </label>
                    <input
                      id="req-quantity"
                      type="text"
                      className="input"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="req-unit" className="text-[#52658a]">
                      Unit
                    </label>
                    <input
                      id="req-unit"
                      type="text"
                      className="input bg-[#edf5ff]"
                      value={unit}
                      readOnly
                    />
                  </div>
                </div>
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
                {isPending ? "Submitting..." : "Submit Material Request"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function VerifyRequestDialog({ request }: { request: ExtendedMaterialRequest }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const [availableStock, setAvailableStock] = useState("200000.000");
  const [outcome, setOutcome] = useState<"VERIFIED" | "REJECTED">("VERIFIED");
  const [reason, setReason] = useState(
    "Bandung RM available stock insufficient for planned run. Approved for purchasing RFQ.",
  );

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const res = await verifyRequestAction(request.id, request.version, {
        outcome,
        reason,
        availableStock,
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
          className="button button-secondary py-1 px-3 text-xs font-semibold text-[#0755c9] border border-[#99bdf2]"
        >
          Verify Stock
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="drawer max-w-lg">
          <div className="flex items-center justify-between pb-3 border-b border-[#d6e7fa]">
            <div>
              <Dialog.Title className="text-lg font-bold text-[#102b55]">
                Warehouse Verification — {request.number}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-[#52658a]">
                Verify physical stock on hand and determine purchasing requirement.
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

          <form onSubmit={handleVerify} className="flex flex-col gap-3.5 mt-4 text-xs">
            <div className="p-3 bg-[#f5f9ff] border border-[#d6e7fa] rounded-lg text-xs flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span className="text-[#52658a]">Requested Material:</span>
                <strong className="text-[#102b55]">
                  {request.lines[0]?.materialId} • {request.lines[0]?.quantity}{" "}
                  {request.lines[0]?.unit}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#52658a]">Production Reference:</span>
                <span className="text-[#102b55] font-medium">{request.productionReference || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#52658a]">Required Date:</span>
                <span className="text-[#102b55] font-medium">{request.requiredOn}</span>
              </div>
            </div>

            <div className="field">
              <label htmlFor="ver-stock" className="font-semibold text-[#102b55]">
                Available Warehouse Stock On Hand
              </label>
              <input
                id="ver-stock"
                type="text"
                className="input"
                value={availableStock}
                onChange={(e) => setAvailableStock(e.target.value)}
                placeholder="e.g. 200000.000"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="ver-outcome" className="font-semibold text-[#102b55]">
                Verification Outcome & Purchasing Decision
              </label>
              <select
                id="ver-outcome"
                className="input"
                value={outcome}
                onChange={(e) => {
                  const val = e.target.value as "VERIFIED" | "REJECTED";
                  setOutcome(val);
                  if (val === "REJECTED") {
                    setReason("Sufficient available stock in warehouse. Request closed without external purchase.");
                  } else {
                    setReason("Stock insufficient for planned run. Approved for purchasing RFQ.");
                  }
                }}
              >
                <option value="VERIFIED">Verified — External Purchase Required</option>
                <option value="REJECTED">Closed — Sufficient Stock On Hand (No Purchase Needed)</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="ver-reason" className="font-semibold text-[#102b55]">
                Explanation & Rationale
              </label>
              <textarea
                id="ver-reason"
                className="input h-20 py-2"
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
                className="button button-primary text-xs py-2 px-4"
              >
                {isPending ? "Recording..." : "Confirm Verification"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
