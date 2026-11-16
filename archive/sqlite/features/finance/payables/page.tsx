import Link from "next/link";
import { Search, AlertTriangle, CheckCircle, Clock, CreditCard } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { financeService } from "../server/finance-service";
import { formatCurrency, formatDate } from "@/shared/format";

export async function PayablesPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const search = resolvedParams.search || "";

  const user = await requireUser("/finance/payables");
  const payablesData = await financeService.getPayables(user, { search });
  const items = payablesData.items;

  // Aggregate metrics
  const totalRecognized = items.reduce((acc, p) => acc + p.recognized, 0);
  const totalPaid = items.reduce((acc, p) => acc + p.paid, 0);
  const totalOutstanding = items.reduce((acc, p) => acc + p.outstanding, 0);
  const totalHeld = items.reduce((acc, p) => acc + p.held, 0);
  const totalEligible = items.reduce((acc, p) => acc + p.eligibleUnpaid, 0);

  return (
    <div className="flex flex-col gap-5">
      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border border-[#d6e7fa] bg-white rounded-2xl flex flex-col gap-1 shadow-2xs">
          <div className="text-xs font-semibold text-[#52658a]">Total Recognized</div>
          <div className="text-2xl font-bold text-[#102b55] font-mono">
            {formatCurrency(totalRecognized)}
          </div>
          <div className="text-xs text-[#7485a3]">{items.length} total payables</div>
        </div>

        <div className="card p-5 border border-[#d6e7fa] bg-white rounded-2xl flex flex-col gap-1 shadow-2xs">
          <div className="text-xs font-semibold text-[#52658a]">Total Outstanding</div>
          <div className="text-2xl font-bold text-[#102b55] font-mono">
            {formatCurrency(totalOutstanding)}
          </div>
          <div className="text-xs text-[#7485a3]">Unpaid obligations</div>
        </div>

        <div className="card p-5 border border-[#d6e7fa] bg-white rounded-2xl flex flex-col gap-1 shadow-2xs">
          <div className="text-xs font-semibold text-[#52658a]">Eligible for Payment</div>
          <div className="text-2xl font-bold text-[#087747] font-mono">
            {formatCurrency(totalEligible)}
          </div>
          <div className="text-xs text-[#7485a3]">QC-accepted value approved</div>
        </div>

        <div className="card p-5 border border-[#fed7d7] bg-[#fff8f6] rounded-2xl flex flex-col gap-1 shadow-2xs">
          <div className="text-xs font-semibold text-[#b42336] flex items-center gap-1.5">
            <AlertTriangle size={14} />
            <span>Disputed / Held</span>
          </div>
          <div className="text-2xl font-bold text-[#b42336] font-mono">
            {formatCurrency(totalHeld)}
          </div>
          <div className="text-xs text-[#7485a3]">Blocked under Invariant 6</div>
        </div>
      </div>

      {/* PAYABLES TABLE */}
      <div className="card p-5 border border-[#d6e7fa] bg-white shadow-2xs rounded-2xl flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#102b55] tracking-tight">
              Payable Balances
            </h2>
            <p className="text-xs text-[#52658a]">
              Track recognized invoices, payments made, and payment eligibility
            </p>
          </div>

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
              className="pl-8.5 pr-3 py-1.5 h-8.5 text-xs border border-[#d6e7fa] rounded-lg w-52 sm:w-64 focus:outline-hidden focus:border-[#0755c9]"
            />
          </form>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#e2edfa]">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#f8fbff] text-[#52658a] font-semibold border-b border-[#e2edfa]">
              <tr>
                <th className="py-2.5 px-3">Invoice</th>
                <th className="py-2.5 px-3">Supplier</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3 text-right">Recognized</th>
                <th className="py-2.5 px-3 text-right">Paid</th>
                <th className="py-2.5 px-3 text-right">Eligible Unpaid</th>
                <th className="py-2.5 px-3 text-right">Held</th>
                <th className="py-2.5 px-3 text-right">Outstanding</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf4fc]">
              {items.map((p) => {
                const isHeld = p.status === "HELD" || p.held > 0;
                return (
                  <tr key={p.invoiceId} className="hover:bg-[#fbfdff]">
                    <td className="py-3 px-3 font-semibold text-[#0755c9]">
                      <Link
                        href={`/finance/invoices?selected=${p.invoiceId}`}
                        className="hover:underline"
                      >
                        {p.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-[#102b55] font-medium">
                      {p.supplierName}
                    </td>
                    <td className="py-3 px-3 text-[#52658a] font-mono">
                      {formatDate(p.dueOn)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#102b55]">
                      {formatCurrency(p.recognized)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#52658a]">
                      {formatCurrency(p.paid)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-[#087747]">
                      {formatCurrency(p.eligibleUnpaid)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#b42336] font-semibold">
                      {p.held > 0 ? formatCurrency(p.held) : "-"}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#102b55]">
                      {formatCurrency(p.outstanding)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isHeld ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fff4e5] text-[#b45309] border border-[#fde68a]">
                          HELD
                        </span>
                      ) : p.outstanding === 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f9ed] text-[#15803d]">
                          SETTLED
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ebf4ff] text-[#0755c9]">
                          ELIGIBLE
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isHeld ? (
                        <button
                          disabled
                          title="Held invoices are strictly blocked from receiving payments under Invariant 6"
                          className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                        >
                          Blocked
                        </button>
                      ) : p.eligibleUnpaid > 0 ? (
                        <Link
                          href={`/finance/payments?invoiceId=${p.invoiceId}`}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-[#0755c9] text-white hover:bg-[#1675e8] inline-block"
                        >
                          Pay
                        </Link>
                      ) : (
                        <span className="text-[11px] text-[#7485a3]">None</span>
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
