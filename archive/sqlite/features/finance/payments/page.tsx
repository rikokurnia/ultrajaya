import Link from "next/link";
import { Search, CreditCard, RotateCcw, CheckCircle, ArrowDownRight } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { financeService } from "../server/finance-service";
import { formatCurrency, formatDate } from "@/shared/format";
import { RecordPaymentButton, ReversePaymentButton } from "./components/payment-dialog";

export async function PaymentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; invoiceId?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const search = resolvedParams.search || "";
  const initialInvoiceId = resolvedParams.invoiceId;

  const user = await requireUser("/finance/payments");
  const paymentsData = await financeService.getPayments(user, { search });
  const payablesData = await financeService.getPayables(user);

  const payments = paymentsData.items;
  const eligiblePayables = payablesData.items;

  // Aggregate metrics
  const postedPayments = payments.filter((p) => p.status === "POSTED");
  const totalDisbursed = postedPayments.reduce((acc, p) => acc + p.amount, 0);
  const reversedCount = payments.filter((p) => p.status === "REVERSED").length;

  return (
    <div className="flex flex-col gap-5">
      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 border border-[#d6e7fa] bg-white rounded-2xl flex items-center gap-4 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-[#ebf4ff] flex items-center justify-center text-[#0755c9] shrink-0">
            <CreditCard size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#52658a]">Total Disbursed</div>
            <div className="text-2xl font-bold text-[#102b55] font-mono tracking-tight">
              {formatCurrency(totalDisbursed)}
            </div>
            <div className="text-xs text-[#7485a3]">{postedPayments.length} posted transfers</div>
          </div>
        </div>

        <div className="card p-5 border border-[#d6e7fa] bg-white rounded-2xl flex items-center gap-4 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-[#e6f9ed] flex items-center justify-center text-[#15803d] shrink-0">
            <CheckCircle size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#52658a]">Successful Transfers</div>
            <div className="text-2xl font-bold text-[#15803d] tracking-tight">
              {postedPayments.length}
            </div>
            <div className="text-xs text-[#7485a3]">100% reconciled</div>
          </div>
        </div>

        <div className="card p-5 border border-[#d6e7fa] bg-white rounded-2xl flex items-center gap-4 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-[#fff8f6] flex items-center justify-center text-[#b42336] shrink-0">
            <RotateCcw size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#52658a]">Traceable Reversals</div>
            <div className="text-2xl font-bold text-[#b42336] tracking-tight">
              {reversedCount}
            </div>
            <div className="text-xs text-[#7485a3]">Audited & documented</div>
          </div>
        </div>
      </div>

      {/* PAYMENTS TABLE CARD */}
      <div className="card p-5 border border-[#d6e7fa] bg-white shadow-2xs rounded-2xl flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#102b55] tracking-tight">
              Payment Transactions
            </h2>
            <p className="text-xs text-[#52658a]">
              Treasury outgoing bank transfers and invoice allocations
            </p>
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
                placeholder="Search payments..."
                className="pl-8.5 pr-3 py-1.5 h-8.5 text-xs border border-[#d6e7fa] rounded-lg w-48 sm:w-56 focus:outline-hidden focus:border-[#0755c9]"
              />
            </form>
            <RecordPaymentButton eligiblePayables={eligiblePayables} />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#e2edfa]">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#f8fbff] text-[#52658a] font-semibold border-b border-[#e2edfa]">
              <tr>
                <th className="py-2.5 px-3">Payment Number</th>
                <th className="py-2.5 px-3">Paid Date</th>
                <th className="py-2.5 px-3">Bank Reference</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3">Allocated Invoices</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf4fc]">
              {payments.map((p) => {
                const isPosted = p.status === "POSTED";
                return (
                  <tr key={p.id} className="hover:bg-[#fbfdff]">
                    <td className="py-3 px-3 font-semibold text-[#0755c9]">
                      {p.number}
                    </td>
                    <td className="py-3 px-3 text-[#102b55]">
                      {formatDate(p.paidOn)}
                    </td>
                    <td className="py-3 px-3 text-[#52658a] font-mono">
                      {p.bankReference}
                    </td>
                    <td className="py-3 px-3 text-[#52658a]">
                      {p.method}
                    </td>
                    <td className="py-3 px-3 text-[#102b55] font-medium">
                      {p.invoicesSummary || p.allocationsSummary || "Invoice allocation"}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#102b55]">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isPosted ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f9ed] text-[#15803d]">
                          POSTED
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                          REVERSED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isPosted && (
                        <ReversePaymentButton
                          paymentId={p.id}
                          paymentNumber={p.number}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
