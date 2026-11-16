"use client";

import { useState } from "react";
import { Plus, Eye, AlertTriangle, FileText, CheckCircle } from "lucide-react";
import { recordSupplierInvoiceAction, requestCreditNoteAction } from "../../actions";

export function InvoiceActionButtons({
  invoiceId,
  invoiceNumber,
  isHeld,
}: {
  invoiceId: string;
  invoiceNumber: string;
  isHeld: boolean;
}) {
  const [showDocs, setShowDocs] = useState(false);
  const [creditNoteRequested, setCreditNoteRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeDocTab, setActiveDocTab] = useState<"PO" | "GR" | "INV">("INV");

  const handleRequestCreditNote = async () => {
    setLoading(true);
    try {
      const res = await requestCreditNoteAction(invoiceId);
      if (res.success) {
        setCreditNoteRequested(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2.5">
        <button
          onClick={handleRequestCreditNote}
          disabled={loading || creditNoteRequested}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#0755c9] to-[#1675e8] text-white shadow-sm hover:opacity-95 transition-all disabled:opacity-50"
        >
          {creditNoteRequested ? "Credit note requested" : "Request credit note"}
        </button>

        <button
          onClick={() => setShowDocs(true)}
          className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#d6e7fa] bg-white text-[#0755c9] hover:bg-[#f0f7ff] transition-all"
        >
          View documents
        </button>
      </div>

      {/* Document Viewer Modal */}
      {showDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#d6e7fa] shadow-2xl max-w-2xl w-full p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-[#e2edfa] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="text-[#0755c9]" size={20} />
                <h3 className="text-base font-bold text-[#102b55]">
                  Document Audit View • {invoiceNumber}
                </h3>
              </div>
              <button
                onClick={() => setShowDocs(false)}
                className="text-xs font-bold text-[#7485a3] hover:text-[#102b55] px-2 py-1"
              >
                ✕ Close
              </button>
            </div>

            <div className="flex gap-2 border-b border-[#e2edfa] pb-2">
              <button
                onClick={() => setActiveDocTab("INV")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  activeDocTab === "INV"
                    ? "bg-[#0755c9] text-white"
                    : "bg-[#f5f9ff] text-[#52658a]"
                }`}
              >
                Supplier Invoice
              </button>
              <button
                onClick={() => setActiveDocTab("GR")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  activeDocTab === "GR"
                    ? "bg-[#0755c9] text-white"
                    : "bg-[#f5f9ff] text-[#52658a]"
                }`}
              >
                Goods Receipt & QC
              </button>
              <button
                onClick={() => setActiveDocTab("PO")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  activeDocTab === "PO"
                    ? "bg-[#0755c9] text-white"
                    : "bg-[#f5f9ff] text-[#52658a]"
                }`}
              >
                Purchase Order
              </button>
            </div>

            <div className="bg-[#f8fbff] border border-[#d6e7fa] rounded-xl p-4 text-xs font-mono space-y-2">
              {activeDocTab === "INV" && (
                <>
                  <div className="flex justify-between font-bold text-sm text-[#102b55]">
                    <span>INVOICE: {invoiceNumber}</span>
                    <span className="text-amber-600">STATUS: PARTIAL HOLD</span>
                  </div>
                  <div>Supplier: PT Sumber Pangan (ID: sup_sumber_pangan)</div>
                  <div>Billed Quantity: 8,000 kg @ Rp 20,000/kg</div>
                  <div className="font-bold text-[#102b55]">Total Billed: Rp 160,000,000</div>
                  <div className="text-red-600">
                    Discrepancy: 200 kg unaccepted (Rp 4,000,000 held under Invariant 6)
                  </div>
                </>
              )}
              {activeDocTab === "GR" && (
                <>
                  <div className="flex justify-between font-bold text-sm text-[#102b55]">
                    <span>RECEIPT: GRN-261028-0068</span>
                    <span className="text-emerald-600">QC INSPECTED</span>
                  </div>
                  <div>Warehouse: Bandung RM (wh_bandung_rm)</div>
                  <div>Physically Delivered: 8,000 kg</div>
                  <div className="text-emerald-700 font-bold">QC Accepted: 7,800 kg (Rp 156,000,000 value)</div>
                  <div className="text-red-600 font-bold">QC Rejected: 200 kg (Damaged bags detected)</div>
                </>
              )}
              {activeDocTab === "PO" && (
                <>
                  <div className="flex justify-between font-bold text-sm text-[#102b55]">
                    <span>PURCHASE ORDER: PO-261026-0042</span>
                    <span className="text-blue-600">APPROVED</span>
                  </div>
                  <div>Material: RM-002 Milk Powder (mat_milk_powder)</div>
                  <div>Ordered: 10,000 kg @ Rp 20,000/kg</div>
                  <div className="font-bold text-[#102b55]">PO Total: Rp 200,000,000</div>
                </>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowDocs(false)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-[#0755c9] text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function RecordInvoiceButton({
  suppliers,
}: {
  suppliers: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const supplierId = form.get("supplierId") as string;
    const supplierInvoiceNumber = form.get("supplierInvoiceNumber") as string;
    const purchaseOrderId = form.get("purchaseOrderId") as string;
    const issuedOn = form.get("issuedOn") as string;
    const dueOn = form.get("dueOn") as string;
    const quantity = form.get("quantity") as string;
    const unitPrice = Number(form.get("unitPrice")) * 100; // to minor units

    const res = await recordSupplierInvoiceAction({
      supplierId,
      supplierInvoiceNumber,
      purchaseOrderId,
      issuedOn,
      dueOn,
      lines: [
        {
          purchaseOrderLineId: "pol_auto",
          materialId: "mat_milk_powder",
          quantity,
          unit: "kg",
          unitPrice,
        },
      ],
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
        <span>Register Invoice</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#d6e7fa] shadow-2xl max-w-lg w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#e2edfa] pb-3">
              <h3 className="text-base font-bold text-[#102b55]">
                Register Supplier Invoice
              </h3>
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
                  Supplier
                </label>
                <select
                  name="supplierId"
                  required
                  className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 text-[#102b55]"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#52658a] mb-1 block">
                  Supplier Invoice Number
                </label>
                <input
                  name="supplierInvoiceNumber"
                  type="text"
                  required
                  placeholder="e.g. INV-SP-2026-99"
                  className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 text-[#102b55]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#52658a] mb-1 block">
                  Purchase Order Ref
                </label>
                <input
                  name="purchaseOrderId"
                  type="text"
                  required
                  defaultValue="po_sp_1028_044"
                  className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 text-[#102b55]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#52658a] mb-1 block">
                    Issued Date
                  </label>
                  <input
                    name="issuedOn"
                    type="date"
                    required
                    defaultValue="2026-10-29"
                    className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 text-[#102b55]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#52658a] mb-1 block">
                    Due Date
                  </label>
                  <input
                    name="dueOn"
                    type="date"
                    required
                    defaultValue="2026-11-28"
                    className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 text-[#102b55]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#52658a] mb-1 block">
                    Quantity (kg)
                  </label>
                  <input
                    name="quantity"
                    type="text"
                    required
                    defaultValue="100"
                    className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 text-[#102b55]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#52658a] mb-1 block">
                    Unit Price (Rp/kg)
                  </label>
                  <input
                    name="unitPrice"
                    type="number"
                    required
                    defaultValue="20000"
                    className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 text-[#102b55]"
                  />
                </div>
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
                  {loading ? "Registering..." : "Submit Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
