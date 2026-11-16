import { Search, Award, Calendar, CheckCircle } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { procurementService } from "../service";
import {
  CreateRfqDialog,
  RecordQuotationDialog,
  EvaluateSuppliersDialog,
} from "../components/rfq-dialog";
import { formatCurrency, formatDate } from "@/shared/format";

export async function RfqsPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; status?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const search = resolvedParams.search;
  const status = resolvedParams.status;

  const user = await requireUser("/procurement/rfqs");
  const rfqsPage = await procurementService.listRfqs(user, {
    search,
    status,
    limit: 50,
  });

  const verifiedRequests = await procurementService.getVerifiedRequests(user);
  const suppliersPage = await procurementService.listSuppliers(user, { activeOnly: true });

  const canWrite = can(user, "rfqs:write");

  return (
    <div className="flex flex-col gap-5">
      {/* Top Action Bar */}
      <div className="card p-5 border border-[#d6e7fa] bg-white shadow-sm rounded-xl flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#102b55]">
              Requests for Quotation (RFQs) & Bids
            </h2>
            <p className="text-xs text-[#52658a] mt-0.5">
              Manage competitive bidding, supplier quotations, price comparisons, and sourcing evaluations.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <form method="GET" className="flex items-center gap-2">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7485a3]"
                />
                <input
                  name="search"
                  type="search"
                  defaultValue={search}
                  placeholder="Search RFQ number..."
                  className="input text-xs pl-8.5 pr-3 py-1.5 h-9 w-44 sm:w-56"
                />
              </div>
              <button type="submit" className="sr-only">
                Search
              </button>
            </form>
            {canWrite && (
              <CreateRfqDialog
                verifiedRequests={verifiedRequests}
                suppliers={suppliersPage.items}
              />
            )}
          </div>
        </div>

        {/* RFQ List & Comparative Quotation Tables */}
        <div className="flex flex-col gap-6 mt-2">
          {rfqsPage.items.length === 0 ? (
            <div className="text-center py-12 text-[#52658a]">
              No RFQs found. Click &quot;Create RFQ&quot; to initiate a supplier inquiry.
            </div>
          ) : (
            rfqsPage.items.map((rfq) => {
              const reqRef = rfq.requests[0]?.number || "Linked Request";
              const hasQuotes = rfq.quotations.length > 0;
              const hasEvaluation = !!rfq.evaluation;

              return (
                <div
                  key={rfq.id}
                  className="border border-[#d6e7fa] rounded-xl overflow-hidden bg-[#fafcff]"
                >
                  {/* RFQ Header Bar */}
                  <div className="bg-[#f0f6fd] p-4 border-b border-[#d6e7fa] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-lg bg-[#0755c9] text-white flex items-center justify-center font-bold text-xs">
                        RFQ
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-base font-bold text-[#102b55]">
                            {rfq.number}
                          </strong>
                          <span className="badge badge-info text-xs py-0.5 px-2">
                            {rfq.status}
                          </span>
                          {hasEvaluation && (
                            <span className="badge badge-success text-xs py-0.5 px-2 flex items-center gap-1">
                              <CheckCircle size={12} /> Awarded
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[#52658a]">
                          Source Requisition: <strong>{reqRef}</strong> • Created{" "}
                          {formatDate(rfq.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-1.5 text-[#52658a] bg-white border border-[#d6e7fa] px-3 py-1.5 rounded-lg">
                        <Calendar size={14} className="text-[#0755c9]" />
                        Due: <strong>{rfq.dueOn}</strong>
                      </span>
                      {canWrite && !hasEvaluation && (
                        <RecordQuotationDialog
                          rfq={rfq}
                          suppliers={suppliersPage.items}
                        />
                      )}
                      {canWrite && hasQuotes && !hasEvaluation && (
                        <EvaluateSuppliersDialog rfq={rfq} />
                      )}
                    </div>
                  </div>

                  {/* Body: Material Specs & Quotation Comparison */}
                  <div className="p-4 flex flex-col gap-4 bg-white">
                    {/* Material Spec Line */}
                    <div className="text-xs text-[#52658a] flex items-center gap-4 border-b border-[#f0f6fd] pb-3">
                      <span>
                        Target Material:{" "}
                        <strong className="text-[#102b55]">
                          {rfq.lines[0]?.materialId} • {rfq.lines[0]?.quantity}{" "}
                          {rfq.lines[0]?.unit}
                        </strong>
                      </span>
                      <span>
                        Invited Vendors:{" "}
                        <strong className="text-[#102b55]">
                          {rfq.suppliers.map((s) => s.name).join(", ")}
                        </strong>
                      </span>
                    </div>

                    {/* Quotation Comparison Matrix */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#52658a]">
                          Quotation Offers Comparison ({rfq.quotations.length} received)
                        </h4>
                      </div>

                      {rfq.quotations.length === 0 ? (
                        <div className="p-6 text-center text-xs text-[#7485a3] bg-[#f8fbff] rounded-lg border border-dashed border-[#b9d3f2]">
                          Awaiting quotations from invited vendors. Use &quot;Record Supplier Quotation&quot; to enter bids.
                        </div>
                      ) : (
                        <div className="table-scroll border border-[#d6e7fa] rounded-lg overflow-x-auto text-xs">
                          <table className="w-full text-left">
                            <thead className="bg-[#f5f9ff] text-[#52658a] font-semibold border-b border-[#d6e7fa]">
                              <tr>
                                <th className="py-2 px-3">Quotation #</th>
                                <th className="py-2 px-3">Supplier</th>
                                <th className="py-2 px-3">Valid until</th>
                                <th className="py-2 px-3 text-center">Lead time</th>
                                <th className="py-2 px-3 text-right">Offered unit price</th>
                                <th className="py-2 px-3 text-right">Total bid</th>
                                <th className="py-2 px-3 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#edf5ff]">
                              {rfq.quotations.map((q) => {
                                const sup = rfq.suppliers.find((s) => s.id === q.supplierId);
                                const isWinner = rfq.evaluation?.selectedQuotationId === q.id;
                                const line = q.lines[0];

                                return (
                                  <tr
                                    key={q.id}
                                    className={
                                      isWinner
                                        ? "bg-[#eef8f1] font-medium"
                                        : "hover:bg-[#fafcff]"
                                    }
                                  >
                                    <td className="py-2 px-3 font-semibold text-[#0755c9]">
                                      {q.number}
                                    </td>
                                    <td className="py-2 px-3 font-medium text-[#102b55]">
                                      {sup?.name || "Supplier"}
                                    </td>
                                    <td className="py-2 px-3 text-[#52658a]">
                                      {q.validUntil}
                                    </td>
                                    <td className="py-2 px-3 text-center text-[#52658a]">
                                      {q.leadDays} days
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-semibold text-[#102b55]">
                                      {line ? formatCurrency(line.unitPrice) : "-"}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-[#102b55]">
                                      {formatCurrency(q.total)}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      {isWinner ? (
                                        <span className="badge badge-success text-[11px] py-0 px-2 font-semibold">
                                          Awarded
                                        </span>
                                      ) : (
                                        <span className="badge badge-neutral text-[11px] py-0 px-2">
                                          {q.status}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Evaluation Rationale Callout if Finalized */}
                      {rfq.evaluation && (
                        <div className="p-3 bg-[#eef8f1] border border-[#b2e2be] rounded-lg text-xs text-[#087747] flex items-start gap-2.5 mt-1">
                          <Award size={18} className="shrink-0 mt-0.5" />
                          <div>
                            <strong>Award Decision &amp; Rationale ({rfq.evaluation.number}):</strong>
                            <p className="mt-0.5 text-xs text-[#102b55]">
                              {rfq.evaluation.reason}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
