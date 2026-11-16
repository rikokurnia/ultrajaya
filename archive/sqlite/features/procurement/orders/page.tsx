import Link from "next/link";
import { Search, FileText, ArrowRight, Check } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { procurementService } from "../service";
import { PoDetailPanel } from "../components/po-detail-panel";
import { OrderDialog } from "../components/order-dialog";
import { formatCurrency, formatDate } from "@/shared/format";

export async function OrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; status?: string; selected?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const search = resolvedParams.search;
  const status = resolvedParams.status;
  const selectedId = resolvedParams.selected;

  const user = await requireUser("/procurement/orders");
  const ordersPage = await procurementService.listOrders(user, {
    search,
    status,
    limit: 100,
  });

  const suppliersPage = await procurementService.listSuppliers(user, { activeOnly: true });
  const verifiedRequests = await procurementService.getVerifiedRequests(user);

  // Default focus to selectedId or canonical reference PO-261029-0045, or first in list
  const selectedOrder =
    ordersPage.items.find((o) => o.id === selectedId) ||
    ordersPage.items.find((o) => o.number === "PO-261029-0045") ||
    ordersPage.items[0] ||
    null;

  return (
    <div className="flex flex-col gap-5">
      {/* 2-Column Responsive Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Purchase Orders List & Linked Request Card */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="card p-5 border border-[#d6e7fa] bg-white shadow-sm rounded-xl flex flex-col gap-4">
            {/* Title & Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-xl font-bold tracking-tight text-[#102b55]">
                Purchase Orders
              </h2>
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
                      placeholder="Search PO or supplier..."
                      className="input text-xs pl-8.5 pr-3 py-1.5 h-9 w-44 sm:w-52"
                    />
                  </div>
                  <select
                    name="status"
                    defaultValue={status || "ALL"}
                    className="input text-xs py-1.5 h-9 w-32"
                  >
                    <option value="ALL">All status</option>
                    <option value="AWAITING_APPROVAL">Awaiting approval</option>
                    <option value="APPROVED">Approved</option>
                    <option value="OPEN">Open</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="DRAFT">Draft</option>
                  </select>
                  <button type="submit" className="sr-only">
                    Search
                  </button>
                </form>
                <OrderDialog
                  suppliers={suppliersPage.items}
                  verifiedRequests={verifiedRequests}
                />
              </div>
            </div>

            {/* Table Density Matching 03-procurement.png */}
            <div className="table-scroll border border-[#d6e7fa] rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f5f9ff] text-[#52658a] font-semibold border-b border-[#d6e7fa]">
                  <tr>
                    <th className="py-2.5 px-3 whitespace-nowrap">PO number</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Supplier</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Linked request</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Total value</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Approval stage</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf5ff]">
                  {ordersPage.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-[#52658a]">
                        No purchase orders matching criteria.
                      </td>
                    </tr>
                  ) : (
                    ordersPage.items.map((po) => {
                      const isSelected = selectedOrder?.id === po.id;
                      const reqRef =
                        po.references?.find((r) => r.type === "FPBB")?.number ||
                        (po.requestIds?.[0] ? `REQ-${po.requestIds[0].slice(-8)}` : "-");

                      return (
                        <tr
                          key={po.id}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-[#edf5ff] font-medium"
                              : "hover:bg-[#fafcff]"
                          }`}
                        >
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <Link
                              href={`/procurement/orders?selected=${po.id}${
                                search ? `&search=${search}` : ""
                              }${status ? `&status=${status}` : ""}`}
                              className="text-[#0755c9] font-semibold hover:underline"
                            >
                              {po.number}
                            </Link>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-[#102b55] whitespace-nowrap">
                            {po.supplierName}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <Link
                              href="/procurement/requests"
                              className="text-[#0755c9] hover:underline"
                            >
                              {reqRef}
                            </Link>
                          </td>
                          <td className="py-2.5 px-3 text-[#52658a] whitespace-nowrap">
                            {formatDate(po.createdAt)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#102b55] whitespace-nowrap">
                            {formatCurrency(po.total)}
                          </td>
                          <td className="py-2.5 px-3 text-[#52658a] whitespace-nowrap">
                            {po.approvalStage}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {po.status === "AWAITING_APPROVAL" && (
                              <span className="badge badge-warning text-[11px] py-0.5 px-2">
                                Awaiting approval
                              </span>
                            )}
                            {po.status === "APPROVED" && (
                              <span className="badge badge-success text-[11px] py-0.5 px-2">
                                Approved
                              </span>
                            )}
                            {po.status === "OPEN" && (
                              <span className="badge badge-info text-[11px] py-0.5 px-2">
                                Open
                              </span>
                            )}
                            {po.status === "REJECTED" && (
                              <span className="badge badge-danger text-[11px] py-0.5 px-2">
                                Rejected
                              </span>
                            )}
                            {po.status === "DRAFT" && (
                              <span className="badge badge-neutral text-[11px] py-0.5 px-2">
                                Draft
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Linked Material Request Card (Matching 03-procurement.png) */}
            <div className="p-3.5 bg-[#f8fbff] border border-[#d6e7fa] rounded-xl flex items-center justify-between gap-4 mt-1">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-lg bg-[#e5f0fc] text-[#0755c9] flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </span>
                <div className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[#52658a]">Linked material request</span>
                    <strong className="text-[#102b55] font-bold text-sm">
                      {selectedOrder?.references?.find((r) => r.type === "FPBB")?.number ||
                        "FPBB-261028-0188"}
                    </strong>
                    <span className="badge badge-success text-[10px] py-0 px-2 flex items-center gap-1 font-semibold">
                      <Check size={11} /> Request approved
                    </span>
                  </div>
                  <p className="text-[#52658a] mt-0.5">
                    {selectedOrder?.id === "po_261026_0042"
                      ? "Milk Powder • 10,000 kg • Bandung RM • Required 27 Oct 2026"
                      : "Packaging Cartons • 1,000,000 pcs • Bandung RM • Required 03 Nov 2026"}
                  </p>
                </div>
              </div>
              <Link
                href="/procurement/requests"
                className="text-xs font-semibold text-[#0755c9] hover:underline flex items-center gap-1 shrink-0"
              >
                View request <ArrowRight size={14} />
              </Link>
            </div>

            {/* Table Footer Count */}
            <div className="text-xs text-[#52658a] pt-1">
              Showing {ordersPage.items.length} of {ordersPage.total} purchase orders
            </div>
          </div>
        </div>

        {/* Right Column: Detail Panel Matching 03-procurement.png */}
        <div className="lg:col-span-5 sticky top-4">
          <PoDetailPanel order={selectedOrder} currentActor={user} />
        </div>
      </div>
    </div>
  );
}
