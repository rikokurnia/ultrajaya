import Link from "next/link";
import { Search, BookOpen, CheckCircle, RotateCcw, FileText } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { financeService } from "../server/finance-service";
import { formatCurrency, formatDate } from "@/shared/format";
import { CreateJournalButton, JournalActions } from "./components/journal-dialog";

export async function JournalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const search = resolvedParams.search || "";

  const user = await requireUser("/finance/journals");
  const accountsData = await financeService.getAccounts(user);
  const journalsData = await financeService.getJournals(user, { search });

  const accounts = accountsData.items;
  const journals = journalsData.items;

  // Aggregate metrics
  const postedJournals = journals.filter((j) => j.status === "POSTED");
  const totalVolume = postedJournals.reduce((acc, j) => acc + j.totalAmount, 0);

  return (
    <div className="flex flex-col gap-5">
      {/* SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 border border-[#d6e7fa] bg-white rounded-2xl flex items-center gap-4 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-[#ebf4ff] flex items-center justify-center text-[#0755c9] shrink-0">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#52658a]">Chart of Accounts</div>
            <div className="text-2xl font-bold text-[#102b55] tracking-tight">
              {accounts.length}
            </div>
            <div className="text-xs text-[#7485a3]">Standard Indonesian CoA</div>
          </div>
        </div>

        <div className="card p-5 border border-[#d6e7fa] bg-white rounded-2xl flex items-center gap-4 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-[#e6f9ed] flex items-center justify-center text-[#15803d] shrink-0">
            <CheckCircle size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#52658a]">Posted Journal Volume</div>
            <div className="text-2xl font-bold text-[#102b55] font-mono tracking-tight">
              {formatCurrency(totalVolume)}
            </div>
            <div className="text-xs text-[#7485a3]">{postedJournals.length} balanced entries</div>
          </div>
        </div>

        <div className="card p-5 border border-[#d6e7fa] bg-white rounded-2xl flex items-center gap-4 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-[#f0f7ff] flex items-center justify-center text-[#0284c7] shrink-0">
            <FileText size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#52658a]">Accounting Control</div>
            <div className="text-2xl font-bold text-[#0284c7] tracking-tight">
              100% Balanced
            </div>
            <div className="text-xs text-[#7485a3]">Debits == Credits invariant</div>
          </div>
        </div>
      </div>

      {/* JOURNALS LIST CARD */}
      <div className="card p-5 border border-[#d6e7fa] bg-white shadow-2xs rounded-2xl flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#102b55] tracking-tight">
              General Ledger Journals
            </h2>
            <p className="text-xs text-[#52658a]">
              Double-entry balanced accounting transactions and traceable reversals
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
                placeholder="Search journals..."
                className="pl-8.5 pr-3 py-1.5 h-8.5 text-xs border border-[#d6e7fa] rounded-lg w-48 sm:w-56 focus:outline-hidden focus:border-[#0755c9]"
              />
            </form>
            <CreateJournalButton accounts={accounts} />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#e2edfa]">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#f8fbff] text-[#52658a] font-semibold border-b border-[#e2edfa]">
              <tr>
                <th className="py-2.5 px-3">Journal Number</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Reference</th>
                <th className="py-2.5 px-3 text-right">Debits (Rp)</th>
                <th className="py-2.5 px-3 text-right">Credits (Rp)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf4fc]">
              {journals.map((j) => (
                <tr key={j.id} className="hover:bg-[#fbfdff]">
                  <td className="py-3 px-3 font-semibold text-[#0755c9]">
                    {j.number}
                  </td>
                  <td className="py-3 px-3 text-[#102b55] font-mono">
                    {formatDate(j.date)}
                  </td>
                  <td className="py-3 px-3 text-[#102b55] font-medium max-w-xs truncate">
                    {j.description}
                  </td>
                  <td className="py-3 px-3 text-[#52658a] font-mono text-[11px]">
                    {j.sourceDocumentRef || "-"}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-[#102b55]">
                    {formatCurrency(j.totalAmount)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-[#102b55]">
                    {formatCurrency(j.totalAmount)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {j.status === "POSTED" ? (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f9ed] text-[#15803d]">
                        POSTED
                      </span>
                    ) : j.status === "REVERSED" ? (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                        REVERSED
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fef9c3] text-[#854d0e]">
                        DRAFT
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <JournalActions journalId={j.id} status={j.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
