"use client";

import { useState } from "react";
import {
  Plus,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  FileText,
  DollarSign,
  Download,
} from "lucide-react";
import {
  registerCustomerAction,
  updateCustomerCreditAction,
  createSalesOrderAction,
  authorizeSpecialDiscountAction,
  approveOrderCreditAction,
  issueCustomerInvoiceAction,
  recordCustomerReceiptAction,
  validateAndSettleReceiptAction,
  verifyReturnClaimCompletenessAction,
  authorizeReturnClaimAction,
  issueCreditNoteAction,
  submitWriteOffRequestAction,
  authorizeWriteOffAction,
  recordWriteOffJournalAction,
} from "../../actions";
import { formatCurrency } from "@/shared/format";

export function RegisterCustomerDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    const res = await registerCustomerAction({
      code: form.get("code") as string,
      name: form.get("name") as string,
      email: form.get("email") as string,
      phone: form.get("phone") as string,
      address: form.get("address") as string,
      npwp: form.get("npwp") as string,
      standardPaymentTermsDays: Number(form.get("terms") || 30),
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
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0755c9] text-white hover:bg-[#1675e8] shadow-sm"
      >
        <Plus size={14} />
        <span>Register Customer</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#d6e7fa] shadow-2xl max-w-md w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#e2edfa] pb-3">
              <h3 className="text-base font-bold text-[#102b55]">Register New Customer</h3>
              <button onClick={() => setOpen(false)} className="text-xs font-bold text-[#7485a3]">✕</button>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded-lg text-xs">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-[#52658a] mb-1 block">Customer Code</label>
                <input name="code" required placeholder="e.g. CUST-ULTRA-01" className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#52658a] mb-1 block">Customer Name</label>
                <input name="name" required placeholder="e.g. PT Ultra Jaya Abadi" className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#52658a] mb-1 block">Email</label>
                  <input name="email" type="email" required placeholder="billing@ultra.co.id" className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#52658a] mb-1 block">Phone</label>
                  <input name="phone" required placeholder="021-5551234" className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#52658a] mb-1 block">NPWP (16-digit)</label>
                  <input name="npwp" defaultValue="01.234.567.8-012.000" className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 font-mono" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#52658a] mb-1 block">Payment Terms (Days)</label>
                  <input name="terms" type="number" defaultValue={30} className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 font-mono" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#52658a] mb-1 block">Billing Address</label>
                <input name="address" required placeholder="Jl. Industri No. 12, Jakarta" className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e2edfa]">
                <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#d6e7fa] text-[#52658a]">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#0755c9] text-white disabled:opacity-50">
                  {loading ? "Registering..." : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function UpdateCreditDialog({
  customerId,
  customerName,
  currentLimit,
}: {
  customerId: string;
  customerName: string;
  currentLimit: number;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const decisionType = form.get("decisionType") as any;
    const limitRupiah = Number(form.get("limit"));
    const reason = form.get("reason") as string;

    await updateCustomerCreditAction({
      customerId,
      decisionType,
      limitAmount: limitRupiah * 100,
      reason,
    });
    setLoading(false);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-2 py-0.5 rounded text-[11px] font-semibold text-[#0755c9] hover:bg-[#ebf4ff]"
      >
        Manage Credit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#d6e7fa] shadow-2xl max-w-md w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#e2edfa] pb-3">
              <h3 className="text-base font-bold text-[#102b55]">
                Manage Credit • {customerName}
              </h3>
              <button onClick={() => setOpen(false)} className="text-xs font-bold text-[#7485a3]">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-[#52658a] mb-1 block">Decision Type</label>
                <select name="decisionType" className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2">
                  <option value="SET_LIMIT">Set / Adjust Credit Limit</option>
                  <option value="ACTIVATE">Activate Credit Account</option>
                  <option value="SUSPEND">Suspend Credit Account</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#52658a] mb-1 block">Limit Amount (Rp)</label>
                <input
                  name="limit"
                  type="number"
                  defaultValue={currentLimit / 100}
                  className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#52658a] mb-1 block">Credit Assessment Reason</label>
                <textarea
                  name="reason"
                  required
                  rows={2}
                  placeholder="Justification for credit decision..."
                  className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e2edfa]">
                <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#d6e7fa] text-[#52658a]">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#0755c9] text-white disabled:opacity-50">
                  {loading ? "Saving..." : "Save Credit Decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function CreateSalesOrderDialog({
  customers,
}: {
  customers: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const customerId = form.get("customerId") as string;
    const discountRate = Number(form.get("discountRate") || 0);
    const quantity = form.get("quantity") as string;
    const unitPriceRupiah = Number(form.get("unitPrice") || 25000);

    const res = await createSalesOrderAction({
      customerId,
      warehouseId: "wh_bandung_rm",
      orderedAt: "2026-10-29",
      requestedDeliveryDate: "2026-11-05",
      discountRate,
      lines: [
        {
          materialId: "mat_fresh_milk",
          quantity,
          unit: "L",
          unitPrice: unitPriceRupiah * 100,
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
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0755c9] text-white hover:bg-[#1675e8] shadow-sm"
      >
        <Plus size={14} />
        <span>Create Sales Order</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#d6e7fa] shadow-2xl max-w-md w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#e2edfa] pb-3">
              <h3 className="text-base font-bold text-[#102b55]">Create Sales Order</h3>
              <button onClick={() => setOpen(false)} className="text-xs font-bold text-[#7485a3]">✕</button>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded-lg text-xs">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-[#52658a] mb-1 block">Customer</label>
                <select name="customerId" className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2">
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#52658a] mb-1 block">Quantity (L)</label>
                  <input name="quantity" defaultValue="1000" className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 font-mono" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#52658a] mb-1 block">Price (Rp/L)</label>
                  <input name="unitPrice" defaultValue="25000" className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 font-mono" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#52658a] mb-1 block">Discount Rate (%)</label>
                <input name="discountRate" type="number" step="0.1" defaultValue="3.0" className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 font-mono" />
                <span className="text-[11px] text-[#7485a3] mt-0.5 block">
                  Discounts &gt; 5% require FAM special authorization under policy.
                </span>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e2edfa]">
                <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#d6e7fa] text-[#52658a]">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#0755c9] text-white disabled:opacity-50">
                  {loading ? "Creating..." : "Submit Sales Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function AuthorizeDiscountButton({ salesOrderId }: { salesOrderId: string }) {
  const [loading, setLoading] = useState(false);
  const handleAuth = async () => {
    setLoading(true);
    await authorizeSpecialDiscountAction(salesOrderId);
    setLoading(false);
  };
  return (
    <button
      onClick={handleAuth}
      disabled={loading}
      className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#fef9c3] text-[#854d0e] hover:bg-[#fef08a]"
    >
      {loading ? "Authorizing..." : "Authorize FAM Discount"}
    </button>
  );
}

export function ApproveCreditButton({ salesOrderId }: { salesOrderId: string }) {
  const [loading, setLoading] = useState(false);
  const handleApprove = async () => {
    setLoading(true);
    await approveOrderCreditAction(salesOrderId);
    setLoading(false);
  };
  return (
    <button
      onClick={handleApprove}
      disabled={loading}
      className="px-2.5 py-1 rounded text-xs font-semibold bg-[#e6f9ed] text-[#15803d] hover:bg-[#cbf4d8] shadow-2xs"
    >
      {loading ? "Approving..." : "Approve Credit Release"}
    </button>
  );
}

export function IssueInvoiceDialog({
  salesOrders,
}: {
  salesOrders: { id: string; number: string; customerName: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const salesOrderId = form.get("salesOrderId") as string;
    const deliveryOrderId = form.get("deliveryOrderId") as string;

    const res = await issueCustomerInvoiceAction({
      salesOrderId,
      deliveryOrderId,
      issuedOn: "2026-10-29",
      dueOn: "2026-11-28",
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
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0755c9] text-white hover:bg-[#1675e8] shadow-sm"
      >
        <Plus size={14} />
        <span>Issue Customer Invoice</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#d6e7fa] shadow-2xl max-w-md w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#e2edfa] pb-3">
              <h3 className="text-base font-bold text-[#102b55]">Issue AR Invoice & Draft e-Faktur</h3>
              <button onClick={() => setOpen(false)} className="text-xs font-bold text-[#7485a3]">✕</button>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded-lg text-xs">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-[#52658a] mb-1 block">Approved Sales Order</label>
                <select name="salesOrderId" className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2">
                  {salesOrders.map((so) => (
                    <option key={so.id} value={so.id}>{so.number} - {so.customerName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#52658a] mb-1 block">Delivered Delivery Order (Signed DO)</label>
                <input
                  name="deliveryOrderId"
                  required
                  defaultValue="do_261028_0015"
                  className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 font-mono"
                />
                <span className="text-[11px] text-[#7485a3] mt-0.5 block">
                  Delivery Order must be in DELIVERED state with signed proof attached.
                </span>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                <strong>e-Faktur Integrity Note:</strong> Invoicing generates a simulated draft e-Faktur with NSFP counter. External DJP submission is truthfully marked as draft/simulated without claiming live server submission.
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e2edfa]">
                <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#d6e7fa] text-[#52658a]">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#0755c9] text-white disabled:opacity-50">
                  {loading ? "Issuing..." : "Issue AR Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function RecordReceiptDialog({
  customers,
  openInvoices,
}: {
  customers: { id: string; name: string }[];
  openInvoices: { id: string; number: string; total: number; balance: number }[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const customerId = form.get("customerId") as string;
    const invoiceId = form.get("invoiceId") as string;
    const bankReference = form.get("bankReference") as string;
    const amountRupiah = Number(form.get("amount") || 10000000);
    const amountMinor = amountRupiah * 100;

    const res = await recordCustomerReceiptAction({
      customerId,
      receivedOn: "2026-10-29",
      bankReference,
      paymentMethod: "BANK_TRANSFER",
      amount: amountMinor,
      bankEvidenceRef: `SLIP-${bankReference}.pdf`,
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
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0755c9] text-white hover:bg-[#1675e8] shadow-sm"
      >
        <Plus size={14} />
        <span>Record Incoming Payment Evidence</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#d6e7fa] shadow-2xl max-w-md w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#e2edfa] pb-3">
              <h3 className="text-base font-bold text-[#102b55]">Record Customer Payment Evidence</h3>
              <button onClick={() => setOpen(false)} className="text-xs font-bold text-[#7485a3]">✕</button>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded-lg text-xs">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-[#52658a] mb-1 block">Customer</label>
                <select name="customerId" className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2">
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#52658a] mb-1 block">Target Customer Invoice</label>
                <select name="invoiceId" className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2">
                  {openInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.number} (Balance: {formatCurrency(inv.balance)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#52658a] mb-1 block">Bank Ref / Transfer ID</label>
                  <input name="bankReference" required placeholder="BCA-IN-99881" className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 font-mono" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#52658a] mb-1 block">Amount (Rp)</label>
                  <input name="amount" type="number" defaultValue="10000000" className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 font-mono" />
                </div>
              </div>
              <p className="text-[11px] text-[#52658a]">
                AR records the payment evidence proposal. Treasury must validate bank slip evidence before final settlement is recognized.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e2edfa]">
                <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#d6e7fa] text-[#52658a]">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#0755c9] text-white disabled:opacity-50">
                  {loading ? "Recording..." : "Record Evidence"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function SettleReceiptButton({ receiptId }: { receiptId: string }) {
  const [loading, setLoading] = useState(false);
  const handleSettle = async () => {
    setLoading(true);
    await validateAndSettleReceiptAction(receiptId);
    setLoading(false);
  };
  return (
    <button
      onClick={handleSettle}
      disabled={loading}
      className="px-2.5 py-1 rounded text-xs font-semibold bg-[#e6f9ed] text-[#15803d] hover:bg-[#cbf4d8] shadow-2xs"
    >
      {loading ? "Settling..." : "Treasury Settle"}
    </button>
  );
}

export function VerifyReturnClaimButton({ claimId }: { claimId: string }) {
  const [loading, setLoading] = useState(false);
  const handleVerify = async () => {
    setLoading(true);
    await verifyReturnClaimCompletenessAction(claimId);
    setLoading(false);
  };
  return (
    <button
      onClick={handleVerify}
      disabled={loading}
      className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#f0f7ff] text-[#0755c9] hover:bg-[#dbeafe]"
    >
      {loading ? "Verifying..." : "Verify Completeness"}
    </button>
  );
}

export function AuthorizeReturnClaimButton({ claimId }: { claimId: string }) {
  const [loading, setLoading] = useState(false);
  const handleAuth = async () => {
    const amountStr = prompt("Enter authorized credit amount in Rupiah:", "2500000");
    if (!amountStr) return;
    setLoading(true);
    await authorizeReturnClaimAction(claimId, Number(amountStr) * 100);
    setLoading(false);
  };
  return (
    <button
      onClick={handleAuth}
      disabled={loading}
      className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#fef9c3] text-[#854d0e] hover:bg-[#fef08a]"
    >
      {loading ? "Authorizing..." : "Authorize FAM Claim"}
    </button>
  );
}

export function IssueCreditNoteButton({ claimId }: { claimId: string }) {
  const [loading, setLoading] = useState(false);
  const handleIssue = async () => {
    setLoading(true);
    await issueCreditNoteAction(claimId);
    setLoading(false);
  };
  return (
    <button
      onClick={handleIssue}
      disabled={loading}
      className="px-2.5 py-1 rounded text-xs font-semibold bg-[#0755c9] text-white hover:bg-[#1675e8]"
    >
      {loading ? "Issuing..." : "Issue Credit Note"}
    </button>
  );
}

export function SubmitWriteOffDialog({
  customers,
  invoices,
}: {
  customers: { id: string; name: string }[];
  invoices: { id: string; number: string; balance: number }[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const customerId = form.get("customerId") as string;
    const invoiceId = form.get("invoiceId") as string;
    const amountRupiah = Number(form.get("amount") || 1000000);
    const reason = form.get("reason") as string;

    await submitWriteOffRequestAction({
      customerId,
      invoiceId,
      amount: amountRupiah * 100,
      reason,
    });
    setLoading(false);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0755c9] text-white hover:bg-[#1675e8] shadow-sm"
      >
        <Plus size={14} />
        <span>Submit Write-Off Request</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#d6e7fa] shadow-2xl max-w-md w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#e2edfa] pb-3">
              <h3 className="text-base font-bold text-[#102b55]">Submit Bad-Debt Write-Off</h3>
              <button onClick={() => setOpen(false)} className="text-xs font-bold text-[#7485a3]">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-[#52658a] mb-1 block">Customer</label>
                <select name="customerId" className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2">
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#52658a] mb-1 block">Overdue Invoice</label>
                <select name="invoiceId" className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2">
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.number} (Balance: {formatCurrency(inv.balance)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#52658a] mb-1 block">Write-Off Amount (Rp)</label>
                <input name="amount" type="number" defaultValue="15000000" className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 font-mono" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#52658a] mb-1 block">Default / Insolvency Justification</label>
                <textarea name="reason" required rows={2} placeholder="Legal demand letters sent; customer insolvency confirmed..." className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e2edfa]">
                <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#d6e7fa] text-[#52658a]">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#0755c9] text-white disabled:opacity-50">
                  {loading ? "Submitting..." : "Submit to FAM"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function AuthorizeWriteOffButton({ requestId }: { requestId: string }) {
  const [loading, setLoading] = useState(false);
  const handleAuth = async () => {
    setLoading(true);
    await authorizeWriteOffAction(requestId);
    setLoading(false);
  };
  return (
    <button
      onClick={handleAuth}
      disabled={loading}
      className="px-2.5 py-1 rounded text-xs font-semibold bg-[#fef9c3] text-[#854d0e] hover:bg-[#fef08a]"
    >
      {loading ? "Authorizing..." : "Authorize FAM Write-Off"}
    </button>
  );
}

export function PostWriteOffJournalButton({ requestId }: { requestId: string }) {
  const [loading, setLoading] = useState(false);
  const handlePost = async () => {
    setLoading(true);
    await recordWriteOffJournalAction(requestId);
    setLoading(false);
  };
  return (
    <button
      onClick={handlePost}
      disabled={loading}
      className="px-2.5 py-1 rounded text-xs font-semibold bg-[#e6f9ed] text-[#15803d] hover:bg-[#cbf4d8]"
    >
      {loading ? "Posting..." : "Post Accounting GL"}
    </button>
  );
}
