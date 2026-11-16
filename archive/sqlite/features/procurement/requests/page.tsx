import { Search, ClipboardList, CheckCircle2, Clock } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { procurementService } from "../service";
import { CreateRequestDialog, VerifyRequestDialog } from "../components/request-dialog";
import { formatQuantity } from "@/shared/format";
import { KpiCard } from "@/components/ui";

export async function RequestsPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; status?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const search = resolvedParams.search;
  const status = resolvedParams.status;

  const user = await requireUser("/procurement/requests");
  const requestsPage = await procurementService.listRequests(user, {
    search,
    status,
    limit: 100,
  });

  const canWrite = can(user, "requests:write");
  const canVerify = can(user, "requests:verify");

  const pendingCount = requestsPage.items.filter((r) => r.status === "SUBMITTED").length;
  const verifiedCount = requestsPage.items.filter((r) => r.status === "VERIFIED").length;
  const rejectedCount = requestsPage.items.filter((r) => r.status === "REJECTED").length;

  return (
    <div className="flex flex-col gap-5">
      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Pending Warehouse Verification"
          value={pendingCount}
          hint="Requisitions awaiting stock verification"
          icon={<Clock size={20} className="text-[#995100]" />}
        />
        <KpiCard
          label="Verified for Purchasing"
          value={verifiedCount}
          hint="Stock insufficient; cleared for RFQ / PO"
          icon={<CheckCircle2 size={20} className="text-[#087747]" />}
        />
        <KpiCard
          label="Closed Without Purchase"
          value={rejectedCount}
          hint="Sufficient warehouse stock on hand"
          icon={<ClipboardList size={20} className="text-[#52658a]" />}
        />
      </div>

      {/* Main Table Card */}
      <div className="card p-5 border border-[#d6e7fa] bg-white shadow-sm rounded-xl flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#102b55]">
              Material Requests (FPBB)
            </h2>
            <p className="text-xs text-[#52658a] mt-0.5">
              Production material requisitions, stock verification, and purchasing clearances.
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
                  placeholder="Search FPBB or purpose..."
                  className="input text-xs pl-8.5 pr-3 py-1.5 h-9 w-44 sm:w-56"
                />
              </div>
              <select
                name="status"
                defaultValue={status || "ALL"}
                className="input text-xs py-1.5 h-9 w-32"
              >
                <option value="ALL">All status</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="VERIFIED">Verified</option>
                <option value="REJECTED">Closed (No PO)</option>
                <option value="DRAFT">Draft</option>
              </select>
              <button type="submit" className="sr-only">
                Search
              </button>
            </form>
            {canWrite && <CreateRequestDialog />}
          </div>
        </div>

        {/* Requests Table */}
        <div className="table-scroll border border-[#d6e7fa] rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f5f9ff] text-[#52658a] font-semibold border-b border-[#d6e7fa]">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">FPBB number</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Production ref</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Material & Qty</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Required date</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Priority</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Warehouse verification</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf5ff]">
              {requestsPage.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-[#52658a]">
                    No material requests found.
                  </td>
                </tr>
              ) : (
                requestsPage.items.map((req) => {
                  const line = req.lines[0];
                  return (
                    <tr key={req.id} className="hover:bg-[#fafcff]">
                      <td className="py-2.5 px-3 font-semibold text-[#0755c9] whitespace-nowrap">
                        {req.number}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[#102b55] whitespace-nowrap">
                        {req.productionReference || "-"}
                      </td>
                      <td className="py-2.5 px-3 text-[#102b55] whitespace-nowrap">
                        {line ? (
                          <span>
                            <strong>
                              {line.materialId === "mat_cartons"
                                ? "Packaging Cartons"
                                : line.materialId === "mat_milk_powder"
                                ? "Milk Powder"
                                : line.materialId === "mat_fresh_milk"
                                ? "Fresh Milk"
                                : line.materialId}
                            </strong>{" "}
                            • {formatQuantity(line.quantity, line.unit)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[#52658a] whitespace-nowrap">
                        {req.requiredOn}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {req.priority === "URGENT" && (
                          <span className="badge badge-danger text-[10px] py-0.5 px-2">
                            Urgent
                          </span>
                        )}
                        {req.priority === "HIGH" && (
                          <span className="badge badge-warning text-[10px] py-0.5 px-2">
                            High
                          </span>
                        )}
                        {req.priority === "NORMAL" && (
                          <span className="badge badge-neutral text-[10px] py-0.5 px-2">
                            Normal
                          </span>
                        )}
                        {req.priority === "LOW" && (
                          <span className="badge badge-neutral text-[10px] py-0.5 px-2">
                            Low
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {req.status === "SUBMITTED" && (
                          <span className="badge badge-warning text-[11px] py-0.5 px-2 flex items-center gap-1">
                            <Clock size={11} /> Submitted
                          </span>
                        )}
                        {req.status === "VERIFIED" && (
                          <span className="badge badge-success text-[11px] py-0.5 px-2 flex items-center gap-1">
                            <CheckCircle2 size={11} /> Verified
                          </span>
                        )}
                        {req.status === "REJECTED" && (
                          <span className="badge badge-neutral text-[11px] py-0.5 px-2">
                            Closed (No PO)
                          </span>
                        )}
                        {req.status === "DRAFT" && (
                          <span className="badge badge-neutral text-[11px] py-0.5 px-2">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[#52658a] text-[11px] max-w-[260px] truncate">
                        {req.verification ? (
                          <span title={req.verification.reason}>
                            On hand: {req.verification.availableStock} •{" "}
                            {req.verification.reason}
                          </span>
                        ) : (
                          <span className="italic text-[#7485a3]">Awaiting stock check</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {req.status === "SUBMITTED" && canVerify ? (
                          <VerifyRequestDialog request={req} />
                        ) : (
                          <span className="text-[#7485a3] text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-[#52658a] pt-1">
          Showing {requestsPage.items.length} of {requestsPage.total} material requests
        </div>
      </div>
    </div>
  );
}
