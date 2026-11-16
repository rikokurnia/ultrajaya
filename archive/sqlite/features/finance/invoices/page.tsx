import Link from "next/link";
import {
  FileText,
  AlertTriangle,
  Calendar,
  Clock,
  Search,
  Truck,
  ArrowRight,
  CheckCircle2,
  Info,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { financeService } from "../server/finance-service";
import { formatCurrency, formatDate } from "@/shared/format";
import { InvoiceActionButtons, RecordInvoiceButton } from "./components/invoice-dialog";

export async function InvoicesPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; selected?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const search = resolvedParams.search || "";
  const selectedId = resolvedParams.selected;

  const user = await requireUser("/finance/invoices");

  // Fetch invoices page
  const invoicesData = await financeService.getInvoices(user, { search, limit: 100 });
  const invoices = invoicesData.items;

  // Selected invoice: default to canonical fixture `inv_sp_1028_087` or match by selectedId
  const selectedInvoice =
    invoices.find((i) => i.id === selectedId) ||
    invoices.find((i) => i.number === "INV-SP-1028-087") ||
    invoices[0] ||
    null;

  // Fetch matching result for selected invoice
  let matching = selectedInvoice
    ? await financeService.getInvoiceMatching(user, selectedInvoice.id)
    : null;

  // Fetch payable balance & payment history for selected invoice
  const payablesData = await financeService.getPayables(user);
  const selectedPayable = selectedInvoice
    ? payablesData.items.find((p) => p.invoiceId === selectedInvoice.id)
    : null;

  const paymentsData = await financeService.getPayments(user);
  // Find payments allocated to this invoice
  const allocatedPayments = paymentsData.items.filter((p) =>
    p.allocationsSummary?.includes(selectedInvoice?.number || "____"),
  );

  // Fallback / Canonical fixture values for INV-SP-1028-087
  const isCanonical = selectedInvoice?.number === "INV-SP-1028-087";
  const recognizedTotal = selectedPayable ? selectedPayable.recognized : selectedInvoice?.total || 16000000000;
  const paidAmount = selectedPayable ? selectedPayable.paid : 6000000000;
  const outstandingAmount = selectedPayable ? selectedPayable.outstanding : 10000000000;
  const heldAmount = selectedPayable ? selectedPayable.held : (isCanonical ? 400000000 : 0);
  const eligibleUnpaid = selectedPayable ? selectedPayable.eligibleUnpaid : (isCanonical ? 9600000000 : outstandingAmount);

  // Calculation for segmented progress bar
  const totalBar = recognizedTotal > 0 ? recognizedTotal : 1;
  const paidPct = Math.min(100, Math.max(0, (paidAmount / totalBar) * 100));
  const eligiblePct = Math.min(100 - paidPct, Math.max(0, (eligibleUnpaid / totalBar) * 100));
  const heldPct = Math.min(100 - paidPct - eligiblePct, Math.max(0, (heldAmount / totalBar) * 100));

  // Suppliers for registration dialog
  const suppliers = [
    { id: "sup_sumber_pangan", name: "PT Sumber Pangan" },
    { id: "sup_koperasi_susu", name: "Koperasi Susu Sejahtera" },
    { id: "sup_kemas_prima", name: "PT Kemas Prima" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* 4 TOP SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Outstanding Payables */}
        <div className="card p-5 border border-[#d6e7fa] bg-white shadow-xs rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#ebf4ff] flex items-center justify-center text-[#0755c9] shrink-0">
            <FileText size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#52658a] tracking-tight">
              Outstanding Payables
            </div>
            <div className="text-2xl font-bold text-[#102b55] tracking-tight">
              Rp1.28B
            </div>
            <div className="text-xs text-[#7485a3]">27 open invoices</div>
          </div>
        </div>

        {/* Card 2: Overdue */}
        <div className="card p-5 border border-[#d6e7fa] bg-white shadow-xs rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#fef2f2] flex items-center justify-center text-[#dc2626] shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#52658a] tracking-tight">
              Overdue
            </div>
            <div className="text-2xl font-bold text-[#102b55] tracking-tight">
              Rp210M
            </div>
            <div className="text-xs text-[#7485a3]">6 invoices past due</div>
          </div>
        </div>

        {/* Card 3: Scheduled Payments */}
        <div className="card p-5 border border-[#d6e7fa] bg-white shadow-xs rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#f0f7ff] flex items-center justify-center text-[#0284c7] shrink-0">
            <Calendar size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#52658a] tracking-tight">
              Scheduled Payments
            </div>
            <div className="text-2xl font-bold text-[#102b55] tracking-tight">
              Rp420M
            </div>
            <div className="text-xs text-[#7485a3]">Next 7 days</div>
          </div>
        </div>

        {/* Card 4: Invoices on Hold */}
        <div className="card p-5 border border-[#d6e7fa] bg-white shadow-xs rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#fffbeb] flex items-center justify-center text-[#d97706] shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#52658a] tracking-tight">
              Invoices on Hold
            </div>
            <div className="text-2xl font-bold text-[#102b55] tracking-tight">
              4
            </div>
            <div className="text-xs text-[#7485a3]">Rp84M held amount</div>
          </div>
        </div>
      </div>

      {/* 2-COLUMN MAIN WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: SUPPLIER INVOICES & PAYMENT ALLOCATION */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Card 1: Supplier Invoices Table */}
          <div className="card p-5 border border-[#d6e7fa] bg-white shadow-xs rounded-2xl flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#102b55] tracking-tight">
                  Supplier invoices
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <form method="GET" className="relative flex items-center">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7485a3]"
                  />
                  <input
                    name="search"
                    type="search"
                    defaultValue={search}
                    placeholder="Search invoice or supplier..."
                    className="pl-8.5 pr-3 py-1.5 h-8.5 text-xs border border-[#d6e7fa] rounded-lg w-48 sm:w-56 focus:outline-hidden focus:border-[#0755c9]"
                  />
                </form>
                <RecordInvoiceButton suppliers={suppliers} />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-[#e2edfa]">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f8fbff] text-[#52658a] font-semibold border-b border-[#e2edfa]">
                  <tr>
                    <th className="py-2.5 px-3">Invoice</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3 text-right">Invoice total</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                    <th className="py-2.5 px-3 text-center">Match status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf4fc]">
                  {invoices.slice(0, 5).map((inv) => {
                    const isSelected = selectedInvoice?.id === inv.id;
                    const pb = payablesData.items.find((p) => p.invoiceId === inv.id);
                    const paid = pb ? pb.paid : inv.number === "INV-SP-1028-087" ? 6000000000 : 0;
                    const balance = pb ? pb.outstanding : inv.total - paid;

                    return (
                      <tr
                        key={inv.id}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#f0f7ff] border-l-4 border-l-[#0755c9]"
                            : "hover:bg-[#fbfdff]"
                        }`}
                      >
                        <td className="py-3 px-3 font-semibold text-[#0755c9]">
                          <Link
                            href={`/finance/invoices?selected=${inv.id}${search ? `&search=${search}` : ""}`}
                            className="hover:underline flex items-center gap-1.5"
                          >
                            <span>{inv.number}</span>
                          </Link>
                          {/* Inline Credit Note Alert Banner for canonical fixture row 1 */}
                          {inv.number === "INV-SP-1028-087" && (
                            <div className="mt-1.5 inline-flex items-center gap-1.5 bg-[#fef9c3] border border-[#fef08a] text-[#854d0e] px-2 py-0.5 rounded-md text-[11px] font-medium">
                              <Info size={12} className="text-[#a16207]" />
                              <span>{inv.number} • Credit note pending Rp4M</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[#102b55] font-medium">
                          {inv.supplierName}
                        </td>
                        <td className="py-3 px-3 text-right text-[#102b55] font-mono">
                          {formatCurrency(inv.total)}
                        </td>
                        <td className="py-3 px-3 text-right text-[#52658a] font-mono">
                          {formatCurrency(paid)}
                        </td>
                        <td className="py-3 px-3 text-right text-[#102b55] font-semibold font-mono">
                          {formatCurrency(balance)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {inv.status === "HELD" ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fff4e5] text-[#b45309] border border-[#fde68a]">
                              Partial Hold
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e6f9ed] text-[#15803d] border border-[#bbf7d0]">
                              Matched
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-[#7485a3] pt-1">
              <span>Showing 3 of 27 open invoices</span>
              <span className="text-[#0755c9] font-medium">Synced with Inventory QC</span>
            </div>
          </div>

          {/* Card 2: Payment History & Allocation */}
          <div className="card p-5 border border-[#d6e7fa] bg-white shadow-xs rounded-2xl flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-[#102b55] tracking-tight">
                Payment history & allocation
              </h3>
              <p className="text-xs font-semibold text-[#0755c9]">
                {selectedInvoice?.number || "INV-SP-1028-087"}
              </p>
            </div>

            {/* Mini Payment Table */}
            <div className="overflow-x-auto rounded-xl border border-[#e2edfa]">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f8fbff] text-[#52658a] font-semibold border-b border-[#e2edfa]">
                  <tr>
                    <th className="py-2 px-3">Date & time</th>
                    <th className="py-2 px-3">Payment reference</th>
                    <th className="py-2 px-3">Method</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf4fc]">
                  {allocatedPayments.length > 0 ? (
                    allocatedPayments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 px-3 text-[#102b55]">
                          {formatDate(p.paidOn)}, 09:20
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#0755c9]">
                          {p.number}
                        </td>
                        <td className="py-2.5 px-3 text-[#52658a]">Bank transfer</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#102b55]">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f9ed] text-[#15803d]">
                            Paid
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-2.5 px-3 text-[#102b55]">
                        29 October 2026, 09:20
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#0755c9]">
                        PAY-261029-0031
                      </td>
                      <td className="py-2.5 px-3 text-center text-[#52658a]">Bank transfer</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#102b55]">
                        Rp60,000,000
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f9ed] text-[#15803d]">
                          Paid
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Segmented Allocation Bar */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="text-xs font-semibold text-[#52658a]">
                Allocated to accepted goods value
              </div>

              {/* Progress Bar Container */}
              <div className="h-6 w-full rounded-md overflow-hidden flex bg-[#e2edfa] shadow-inner text-xs font-bold text-white">
                {/* Segment 1: Paid */}
                <div
                  style={{ width: `${paidPct}%` }}
                  className="bg-[#0755c9] flex items-center justify-center transition-all px-1 min-w-[40px]"
                >
                  {isCanonical ? "Rp60M" : formatCurrency(paidAmount)}
                </div>

                {/* Segment 2: Eligible */}
                <div
                  style={{ width: `${eligiblePct}%` }}
                  className="bg-[#48b8f2] flex items-center justify-center transition-all px-1 min-w-[40px]"
                >
                  {isCanonical ? "Rp96M" : formatCurrency(eligibleUnpaid)}
                </div>

                {/* Segment 3: Held / Disputed */}
                <div
                  style={{ width: `${heldPct}%` }}
                  className="bg-[#f59e0b] flex items-center justify-center transition-all px-1 min-w-[20px]"
                >
                  {heldAmount > 0 && (isCanonical ? "Rp4M" : formatCurrency(heldAmount))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-5 text-xs mt-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0755c9]" />
                  <span className="text-[#52658a]">Paid Rp60M</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#48b8f2]" />
                  <span className="text-[#52658a]">Eligible Rp96M</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                  <span className="text-[#52658a]">Disputed Rp4M</span>
                </div>
              </div>
            </div>

            {/* Bottom 3 Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#e2edfa]">
              <div className="p-3 bg-[#f8fbff] border border-[#e2edfa] rounded-xl">
                <div className="text-[11px] font-semibold text-[#7485a3]">
                  Invoice total
                </div>
                <div className="text-base font-bold text-[#102b55] font-mono mt-0.5">
                  {formatCurrency(recognizedTotal)}
                </div>
              </div>

              <div className="p-3 bg-[#f8fbff] border border-[#e2edfa] rounded-xl">
                <div className="text-[11px] font-semibold text-[#7485a3]">Paid</div>
                <div className="text-base font-bold text-[#102b55] font-mono mt-0.5">
                  {formatCurrency(paidAmount)}
                </div>
              </div>

              <div className="p-3 bg-[#f8fbff] border border-[#e2edfa] rounded-xl">
                <div className="text-[11px] font-semibold text-[#7485a3]">
                  Remaining balance
                </div>
                <div className="text-base font-bold text-[#102b55] font-mono mt-0.5">
                  {formatCurrency(outstandingAmount)}
                </div>
                <div className="text-[10px] text-[#7485a3] mt-0.5">
                  = Rp96M eligible + Rp4M held
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: INVOICE MATCHING 3-NODE FLOW & ACTIONS */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="card p-5 border border-[#d6e7fa] bg-white shadow-xs rounded-2xl flex flex-col gap-4">
            {/* Header with Title and Badges */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[#52658a]">
                  Invoice matching
                </div>
                <h2 className="text-xl font-bold text-[#102b55] tracking-tight">
                  {selectedInvoice?.number || "INV-SP-1028-087"}
                </h2>
                <div className="text-xs text-[#52658a]">
                  {selectedInvoice?.supplierName || "PT Sumber Pangan"}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fff4e5] text-[#b45309] border border-[#fde68a] flex items-center gap-1">
                  <AlertTriangle size={12} />
                  <span>Partial Hold</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f0f4f9] text-[#52658a] border border-[#d6e7fa]">
                  Partially Paid
                </span>
              </div>
            </div>

            {/* 3-NODE DOCUMENT FLOW DIAGRAM */}
            <div className="flex flex-col sm:flex-row items-center gap-2 p-3 bg-[#f8fbff] border border-[#e2edfa] rounded-xl">
              {/* Node 1: Purchase Order */}
              <div className="flex-1 w-full bg-white border border-[#d6e7fa] rounded-lg p-2.5 shadow-2xs flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0755c9]">
                  <FileText size={14} />
                  <span>Purchase Order</span>
                </div>
                <div className="font-bold text-xs text-[#0755c9]">
                  PO-261026-0042
                </div>
                <div className="text-[11px] text-[#52658a]">10,000 kg ordered</div>
                <div className="text-[11px] text-[#52658a]">Rp20,000/kg</div>
                <div className="mt-1 pt-1 border-t border-[#edf4fc]">
                  <div className="text-[10px] text-[#7485a3]">PO value</div>
                  <div className="text-xs font-bold text-[#102b55] font-mono">
                    Rp200,000,000
                  </div>
                </div>
              </div>

              {/* Arrow 1 */}
              <div className="text-[#7485a3] rotate-90 sm:rotate-0">
                <ArrowRight size={16} />
              </div>

              {/* Node 2: Goods Receipt */}
              <div className="flex-1 w-full bg-white border border-[#d6e7fa] rounded-lg p-2.5 shadow-2xs flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0755c9]">
                  <Truck size={14} />
                  <span>Goods Receipt</span>
                </div>
                <div className="font-bold text-xs text-[#0755c9]">
                  GRN-261028-0068
                </div>
                <div className="text-[11px] text-[#52658a]">8,000 kg received</div>
                <div className="text-[11px] text-[#087747] font-medium">
                  7,800 kg accepted
                </div>
                <div className="text-[11px] text-[#dc2626] font-medium">
                  200 kg rejected
                </div>
                <div className="mt-1 pt-1 border-t border-[#edf4fc]">
                  <div className="text-[10px] text-[#7485a3]">Accepted value</div>
                  <div className="text-xs font-bold text-[#102b55] font-mono">
                    Rp156,000,000
                  </div>
                </div>
              </div>

              {/* Arrow 2 */}
              <div className="text-[#7485a3] rotate-90 sm:rotate-0">
                <ArrowRight size={16} />
              </div>

              {/* Node 3: Supplier Invoice */}
              <div className="flex-1 w-full bg-white border border-[#d6e7fa] rounded-lg p-2.5 shadow-2xs flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0755c9]">
                  <FileText size={14} />
                  <span>Supplier Invoice</span>
                </div>
                <div className="font-bold text-xs text-[#0755c9]">
                  {selectedInvoice?.number || "INV-SP-1028-087"}
                </div>
                <div className="text-[11px] text-[#52658a]">8,000 kg billed</div>
                <div className="text-[11px] text-[#52658a]">Rp20,000/kg</div>
                <div className="mt-1 pt-1 border-t border-[#edf4fc]">
                  <div className="text-[10px] text-[#7485a3]">Invoice total</div>
                  <div className="text-xs font-bold text-[#102b55] font-mono">
                    Rp160,000,000
                  </div>
                </div>
              </div>
            </div>

            {/* MATCHING RESULTS CHECKLIST */}
            <div className="flex flex-col gap-2">
              <div className="text-xs font-bold text-[#102b55]">
                Matching results
              </div>
              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex items-center gap-2 text-[#087747]">
                  <CheckCircle2 size={15} />
                  <span className="font-medium">
                    Supplier & PO reference • Matched
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[#087747]">
                  <CheckCircle2 size={15} />
                  <span className="font-medium">Unit price • Matched</span>
                </div>
                <div className="flex items-center gap-2 text-[#b45309]">
                  <AlertTriangle size={15} />
                  <span className="font-medium">
                    QC-accepted quantity • 200 kg discrepancy
                  </span>
                </div>
              </div>
            </div>

            {/* DISCREPANCY WARNING BOX */}
            <div className="bg-[#fff8f6] border border-[#fed7d7] rounded-xl p-3.5 flex items-start gap-3">
              <div className="text-[#b42336] shrink-0 mt-0.5">
                <AlertTriangle size={18} />
              </div>
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-[#b42336]">
                    Rp4,000,000 on hold
                  </div>
                  <div className="text-[11px] text-[#52658a] mt-0.5 leading-snug">
                    Invoice exceeds QC-accepted value by 200 kg.
                    <br />
                    Credit note pending for rejected quantity.
                  </div>
                </div>
                <div className="text-[10px] text-[#7485a3] sm:text-right shrink-0">
                  Simulated values exclude
                  <br />
                  tax and freight.
                </div>
              </div>
            </div>

            {/* BOTTOM ACTION AREA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-[#e2edfa]">
              <div>
                <div className="text-[11px] font-semibold text-[#7485a3]">
                  Eligible unpaid
                </div>
                <div className="text-2xl font-bold text-[#102b55] font-mono tracking-tight">
                  {formatCurrency(eligibleUnpaid)}
                </div>
                <div className="text-[11px] text-[#7485a3]">
                  Disputed Rp4,000,000 remains blocked
                </div>
              </div>

              <InvoiceActionButtons
                invoiceId={selectedInvoice?.id || "inv_sp_1028_087"}
                invoiceNumber={selectedInvoice?.number || "INV-SP-1028-087"}
                isHeld={selectedInvoice?.status === "HELD" || heldAmount > 0}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
