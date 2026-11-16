"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X, AlertCircle } from "lucide-react";
import { createOrderAction } from "../actions";
import type { Supplier, ExtendedMaterialRequest } from "../types";

interface OrderDialogProps {
  suppliers: Supplier[];
  verifiedRequests: ExtendedMaterialRequest[];
}

export function OrderDialog({ suppliers, verifiedRequests }: OrderDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [requestId, setRequestId] = useState(verifiedRequests[0]?.id || "");
  const [deliveryTerms, setDeliveryTerms] = useState("Franco Gudang Bandung");
  const [paymentTerms, setPaymentTerms] = useState("Net 30 Days");

  // Initial line item from linked request or default
  const [materialId, setMaterialId] = useState("mat_cartons");
  const [quantity, setQuantity] = useState("1000000.000");
  const [unit, setUnit] = useState<"L" | "kg" | "pcs">("pcs");
  const [unitPriceRupiah, setUnitPriceRupiah] = useState("120"); // In whole rupiah for friendly UX, multiplied by 100 for minor units

  function handleRequestChange(newReqId: string) {
    setRequestId(newReqId);
    const selectedReq = verifiedRequests.find((r) => r.id === newReqId);
    if (selectedReq?.lines[0]) {
      const line = selectedReq.lines[0];
      setMaterialId(line.materialId);
      setQuantity(line.quantity);
      setUnit(line.unit);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);

    const priceMinor = Math.round(parseFloat(unitPriceRupiah) * 100);
    if (isNaN(priceMinor) || priceMinor <= 0) {
      setError("Enter a valid unit price greater than zero.");
      return;
    }

    startTransition(async () => {
      const res = await createOrderAction({
        supplierId,
        requestIds: requestId ? [requestId] : [],
        warehouseId: "wh_bandung_rm",
        deliveryTerms,
        paymentTerms,
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
          className="button button-primary flex items-center gap-2 py-2 px-4 text-xs font-semibold"
        >
          <Plus size={16} />
          Create PO
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="drawer max-w-lg">
          <div className="flex items-center justify-between pb-3 border-b border-[#d6e7fa]">
            <div>
              <Dialog.Title className="text-lg font-bold text-[#102b55]">
                New Purchase Order
              </Dialog.Title>
              <Dialog.Description className="text-xs text-[#52658a]">
                Generate an authorized purchase order linked to verified material requests.
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

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4 text-xs">
            <div className="field">
              <label htmlFor="po-supplier" className="font-semibold text-[#102b55]">
                Supplier
              </label>
              <select
                id="po-supplier"
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

            <div className="field">
              <label htmlFor="po-request" className="font-semibold text-[#102b55]">
                Linked Material Request (Verified)
              </label>
              <select
                id="po-request"
                className="input"
                value={requestId}
                onChange={(e) => handleRequestChange(e.target.value)}
                required
              >
                {verifiedRequests.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.number} — {r.purpose.slice(0, 45)}...
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label htmlFor="po-delivery-terms" className="font-semibold text-[#102b55]">
                  Delivery Terms
                </label>
                <input
                  id="po-delivery-terms"
                  type="text"
                  className="input"
                  value={deliveryTerms}
                  onChange={(e) => setDeliveryTerms(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="po-payment-terms" className="font-semibold text-[#102b55]">
                  Payment Terms
                </label>
                <input
                  id="po-payment-terms"
                  type="text"
                  className="input"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="p-3 bg-[#f5f9ff] border border-[#d6e7fa] rounded-lg flex flex-col gap-3">
              <span className="font-bold text-[#102b55] uppercase text-[11px] tracking-wider">
                Line Item Details
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label htmlFor="po-mat-id" className="text-[#52658a]">
                    Material
                  </label>
                  <select
                    id="po-mat-id"
                    className="input"
                    value={materialId}
                    onChange={(e) => {
                      setMaterialId(e.target.value);
                      if (e.target.value === "mat_cartons") {
                        setUnit("pcs");
                        setUnitPriceRupiah("120");
                      } else if (e.target.value === "mat_milk_powder") {
                        setUnit("kg");
                        setUnitPriceRupiah("20000");
                      } else {
                        setUnit("L");
                        setUnitPriceRupiah("8000");
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
                    <label htmlFor="po-qty" className="text-[#52658a]">
                      Quantity
                    </label>
                    <input
                      id="po-qty"
                      type="text"
                      className="input"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="po-unit" className="text-[#52658a]">
                      Unit
                    </label>
                    <input
                      id="po-unit"
                      type="text"
                      className="input bg-[#edf5ff]"
                      value={unit}
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className="field">
                <label htmlFor="po-price-rupiah" className="text-[#52658a]">
                  Unit Price (Rupiah per {unit})
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#52658a]">Rp</span>
                  <input
                    id="po-price-rupiah"
                    type="number"
                    step="any"
                    className="input font-mono"
                    value={unitPriceRupiah}
                    onChange={(e) => setUnitPriceRupiah(e.target.value)}
                    required
                  />
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
                {isPending ? "Generating..." : "Generate Purchase Order"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
