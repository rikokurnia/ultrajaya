"use client";

import { useState } from "react";
import { Plus, RotateCcw, AlertTriangle, CreditCard, CheckCircle } from "lucide-react";
import { recordPaymentAction, reversePaymentAction } from "../../actions";
import { formatCurrency } from "@/shared/format";

export function RecordPaymentButton({
  eligiblePayables,
}: {
  eligiblePayables: {
    invoiceId: string;
    invoiceNumber: string;
    supplierName: string;
    eligibleUnpaid: number;
    held: number;
    status: string;
  }[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState(
    eligiblePayables[0]?.invoiceId || "",
  );

  const selectedPayable = eligiblePayables.find(
    (p) => p.invoiceId === selectedInvoiceId,
  );
  const isHeld = selectedPayable ? selectedPayable.held > 0 || selectedPayable.status === "HELD" : false;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const invoiceId = form.get("invoiceId") as string;
    const paidOn = form.get("paidOn") as string;
    const bankReference = form.get("bankReference") as string;
    const amountRupiah = Number(form.get("amount"));
    const amountMinor = amountRupiah * 100;

    const res = await recordPaymentAction({
      paidOn: `${paidOn}T10:00:00Z`,
      bankReference,
      method: "BANK_TRANSFER",
      amount: amountMinor,
      allocations: [{ invoiceId, amount: amountMinor }],
    });

    setLoading(false);
    if (!res.success) {
      setError(res.error);
    } else {
      setOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0755c9] text-white hover:bg-[#1675e8] shadow-sm transition-all"
      >
        <Plus size={14} />
        <span>Record Payment</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#d6e7fa] shadow-2xl max-w-lg w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#e2edfa] pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="text-[#0755c9]" size={20} />
                <h3 className="text-base font-bold text-[#102b55]">
                  Authorize & Record Supplier Payment
                </h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-xs font-bold text-[#7485a3] hover:text-[#102b55]"
              >
                ✕ Close
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-[#52658a] mb-1 block">
                  Select Target Invoice
                </label>
                <select
                  name="invoiceId"
                  required
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 text-[#102b55]"
                >
                  {eligiblePayables.map((p) => (
                    <option key={p.invoiceId} value={p.invoiceId}>
                      {p.invoiceNumber} - {p.supplierName} (Eligible: {formatCurrency(p.eligibleUnpaid)})
                      {p.held > 0 ? " [HELD]" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {isHeld && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  <span>
                    <strong>Invariant 6 Warning:</strong> This invoice is currently HELD with a disputed discrepancy. Under policy, payments will be rejected by the server.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#52658a] mb-1 block">
                    Payment Date
                  </label>
                  <input
                    name="paidOn"
                    type="date"
                    required
                    defaultValue="2026-10-29"
                    className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 text-[#102b55]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#52658a] mb-1 block">
                    Bank Reference / TRX ID
                  </label>
                  <input
                    name="bankReference"
                    type="text"
                    required
                    placeholder="e.g. BCA-TRX-20261029-01"
                    className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 text-[#102b55]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#52658a] mb-1 block">
                  Payment Amount (Rp)
                </label>
                <input
                  name="amount"
                  type="number"
                  required
                  defaultValue={selectedPayable ? selectedPayable.eligibleUnpaid / 100 : 100000000}
                  className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 text-[#102b55] font-mono"
                />
                <span className="text-[11px] text-[#7485a3] mt-0.5 block">
                  Eligible balance: {selectedPayable ? formatCurrency(selectedPayable.eligibleUnpaid) : "-"}
                </span>
              </div>

              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-[#e2edfa]">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#d6e7fa] text-[#52658a]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#0755c9] text-white hover:bg-[#1675e8] disabled:opacity-50"
                >
                  {loading ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function ReversePaymentButton({
  paymentId,
  paymentNumber,
}: {
  paymentId: string;
  paymentNumber: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReverse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const reason = form.get("reason") as string;

    const res = await reversePaymentAction(paymentId, reason);
    setLoading(false);
    if (!res.success) {
      setError(res.error);
    } else {
      setOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-800 transition-colors"
      >
        <RotateCcw size={12} />
        <span>Reverse</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-red-200 shadow-2xl max-w-md w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#e2edfa] pb-3">
              <h3 className="text-base font-bold text-red-600">
                Reverse Payment {paymentNumber}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-xs font-bold text-[#7485a3]"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded-lg text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleReverse} className="flex flex-col gap-3">
              <p className="text-xs text-[#52658a]">
                Reversing this payment creates a traceable reversal record and restores the original payable outstanding balance.
              </p>

              <div>
                <label className="text-xs font-semibold text-[#52658a] mb-1 block">
                  Reversal Reason
                </label>
                <textarea
                  name="reason"
                  required
                  rows={3}
                  placeholder="State the financial or operational reason for reversing this payment..."
                  className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 text-[#102b55]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#e2edfa]">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#d6e7fa] text-[#52658a]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? "Reversing..." : "Confirm Reversal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
