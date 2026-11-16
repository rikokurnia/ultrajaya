import Link from "next/link";
import {
  Clock,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { procurementService } from "../service";
import { formatCurrency, formatDate } from "@/shared/format";
import { PoDetailPanel } from "../components/po-detail-panel";

export async function ApprovalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ selected?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const selectedId = resolvedParams.selected;

  const user = await requireUser("/procurement/approvals");

  const pendingOrdersPage = await procurementService.listOrders(user, {
    status: "AWAITING_APPROVAL",
    limit: 50,
  });

  const decidedOrdersPage = await procurementService.listOrders(user, {
    limit: 50,
  });
  const decidedOrders = decidedOrdersPage.items.filter(
    (o) => o.status === "APPROVED" || o.status === "REJECTED" || o.status === "OPEN",
  );

  const selectedOrder =
    (selectedId ? pendingOrdersPage.items.find((o) => o.id === selectedId) : null) ||
    (selectedId ? decidedOrders.find((o) => o.id === selectedId) : null) ||
    pendingOrdersPage.items[0] ||
    decidedOrders[0] ||
    null;

  return (
    <div className="flex flex-col gap-5">
      {/* Demo Policy Banner */}
      <div className="card p-4 border border-[#d6e7fa] bg-[#f0f6fd] rounded-xl text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <span className="w-8 h-8 rounded-lg bg-[#0755c9] text-white flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck size={18} />
          </span>
          <div>
            <strong className="text-[#102b55] text-sm block font-bold">
              Multilevel Approval Delegation &amp; Expenditure Policy (Demo Configuration)
            </strong>
            <p className="text-[#52658a] mt-0.5">
              • <strong>Tier 1 (&le; Rp50M):</strong> Procurement Manager sign-off. <br />
              • <strong>Tier 2 (&le; Rp250M):</strong> Procurement Manager + Finance Manager dual authorization. <br />
              • <strong>Tier 3 (&gt; Rp250M):</strong> Procurement Manager + Finance Manager + Executive Director. <br />
              • <strong>PO Splitting Safeguard:</strong> Day-volume to same vendor &gt; Rp100M requires mandatory Director escalation.
            </p>
          </div>
        </div>
        <span className="badge badge-warning text-xs py-1 px-3 whitespace-nowrap font-semibold self-start md:self-center">
          Enforced Rules
        </span>
      </div>

      {/* Main Approval Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Queue Items */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="card p-5 border border-[#d6e7fa] bg-white shadow-sm rounded-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#eef5fc] pb-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#102b55]">
                  Approval Queue
                </h2>
                <p className="text-xs text-[#52658a] mt-0.5">
                  Purchase orders awaiting executive authorization decisions.
                </p>
              </div>
              <span className="badge badge-warning text-xs font-bold py-1 px-3">
                {pendingOrdersPage.items.length} Pending
              </span>
            </div>

            {/* Pending List */}
            <div className="flex flex-col gap-3">
              {pendingOrdersPage.items.length === 0 ? (
                <div className="text-center py-12 text-[#52658a] text-xs">
                  All purchase order approval queues are currently cleared.
                </div>
              ) : (
                pendingOrdersPage.items.map((order) => {
                  const isSelected = selectedOrder?.id === order.id;
                  const isCreator = user.id === order.createdBy;

                  return (
                    <div
                      key={order.id}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#0755c9] bg-[#edf5ff] shadow-xs"
                          : "border-[#d6e7fa] bg-white hover:border-[#99bdf2]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/procurement/approvals?selected=${order.id}`}
                              className="text-sm font-bold text-[#0755c9] hover:underline"
                            >
                              {order.number}
                            </Link>
                            <span className="badge badge-warning text-[10px] py-0 px-2 font-semibold flex items-center gap-1">
                              <Clock size={11} /> Awaiting {order.approvalStage}
                            </span>
                          </div>
                          <span className="text-xs text-[#102b55] font-semibold block mt-1">
                            {order.supplierName}
                          </span>
                          <span className="text-[11px] text-[#52658a]">
                            Submitted by {order.creatorName || "Requester"} •{" "}
                            {formatDate(order.createdAt)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-mono font-bold text-[#102b55] block">
                            {formatCurrency(order.total)}
                          </span>
                          <span className="text-[11px] text-[#52658a]">
                            Revision {order.revision}
                          </span>
                        </div>
                      </div>

                      {/* Segregation of Duties Self-Approval Notice */}
                      {isCreator && (
                        <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 flex items-center gap-2">
                          <ShieldAlert size={14} className="text-blue-700 shrink-0" />
                          <span>
                            <strong>Creator Self-Approval Denied:</strong> As the creator, you cannot approve this PO. An independent assigned approver must review.
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#d6e7fa]/60 text-xs">
                        <span className="text-[#52658a]">
                          Terms: {order.paymentTerms || "Net 30 Days"}
                        </span>
                        <Link
                          href={`/procurement/approvals?selected=${order.id}`}
                          className="text-[#0755c9] font-semibold hover:underline flex items-center gap-1"
                        >
                          Review details <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* History of Completed / Decided Approvals */}
          <div className="card p-5 border border-[#d6e7fa] bg-white shadow-sm rounded-xl flex flex-col gap-3">
            <h3 className="text-base font-bold text-[#102b55]">
              Recently Decided Approvals
            </h3>
            <div className="table-scroll border border-[#d6e7fa] rounded-lg overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#f5f9ff] text-[#52658a] font-semibold border-b border-[#d6e7fa]">
                  <tr>
                    <th className="py-2 px-3">PO number</th>
                    <th className="py-2 px-3">Supplier</th>
                    <th className="py-2 px-3 text-right">Value</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf5ff]">
                  {decidedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-[#52658a]">
                        No decided orders yet.
                      </td>
                    </tr>
                  ) : (
                    decidedOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-[#fafcff]">
                        <td className="py-2 px-3 font-semibold text-[#0755c9]">
                          {ord.number}
                        </td>
                        <td className="py-2 px-3 font-medium text-[#102b55]">
                          {ord.supplierName}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-[#102b55]">
                          {formatCurrency(ord.total)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {ord.status === "APPROVED" && (
                            <span className="badge badge-success text-[10px] py-0 px-2 font-semibold">
                              Approved
                            </span>
                          )}
                          {ord.status === "OPEN" && (
                            <span className="badge badge-info text-[10px] py-0 px-2 font-semibold">
                              Open • Issued
                            </span>
                          )}
                          {ord.status === "REJECTED" && (
                            <span className="badge badge-danger text-[10px] py-0 px-2 font-semibold">
                              Rejected
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Link
                            href={`/procurement/approvals?selected=${ord.id}`}
                            className="text-[#0755c9] font-semibold hover:underline"
                          >
                            Inspect
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Detail Panel for the Selected Order */}
        <div className="lg:col-span-5 sticky top-4">
          <PoDetailPanel order={selectedOrder} currentActor={user} />
        </div>
      </div>
    </div>
  );
}
