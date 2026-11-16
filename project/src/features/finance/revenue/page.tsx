import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { Card, StatusBadge, Button } from "@/components/ui";
import { REVENUE_SUBVIEWS } from "./subviews";
import {
  ShieldCheck,
  ShieldAlert,
  Workflow,
  ArrowRight,
  Lock,
  Users,
  CreditCard,
  FileText,
  DollarSign,
  RotateCcw,
  AlertOctagon,
  Download,
} from "lucide-react";
import { financeService } from "../server/finance-service";
import { formatCurrency, formatDate } from "@/shared/format";
import {
  RegisterCustomerDialog,
  UpdateCreditDialog,
  CreateSalesOrderDialog,
  AuthorizeDiscountButton,
  ApproveCreditButton,
  IssueInvoiceDialog,
  RecordReceiptDialog,
  SettleReceiptButton,
  VerifyReturnClaimButton,
  AuthorizeReturnClaimButton,
  IssueCreditNoteButton,
  SubmitWriteOffDialog,
  AuthorizeWriteOffButton,
  PostWriteOffJournalButton,
} from "./components/revenue-dialogs";

export async function RevenuePage({ subview }: { subview?: string }) {
  const user = await getCurrentUser();
  if (!user) return null;

  // Filter subviews by read permission
  const authorizedSubviews = REVENUE_SUBVIEWS.filter((s) =>
    can(user, s.readPermission),
  );

  // If user has page permission (revenue:read) but no subviews
  if (authorizedSubviews.length === 0) {
    return (
      <Card className="placeholder-card">
        <div className="section-heading">
          <div>
            <h2>Revenue Operations</h2>
            <p>Access restricted by subview permissions.</p>
          </div>
          <StatusBadge status="ACCESS_RESTRICTED" tone="warning" />
        </div>
        <p className="text-muted text-sm my-4">
          Your role ({user.role}) has workspace route access, but no specific
          revenue subview permissions are assigned.
        </p>
      </Card>
    );
  }

  // Determine active subview
  const activeSubview =
    authorizedSubviews.find((s) => s.id === subview) || authorizedSubviews[0];

  const requestedUnauthorized =
    subview && !authorizedSubviews.some((s) => s.id === subview);

  const canWrite =
    activeSubview.writePermission && can(user, activeSubview.writePermission);

  // Fetch relevant operational data based on active subview
  const customers = can(user, "customers:read")
    ? await financeService.getCustomers(user)
    : [];

  const salesOrders = can(user, "sales_orders:read")
    ? await financeService.getSalesOrders(user)
    : [];

  const customerInvoices = can(user, "customer_invoices:read")
    ? await financeService.getCustomerInvoices(user)
    : [];

  const receipts = can(user, "receipts_incoming:read")
    ? await financeService.getCustomerReceipts(user)
    : [];

  const returnClaims = can(user, "returns:read")
    ? await financeService.getReturnClaims(user)
    : [];

  const creditNotes = can(user, "returns:read")
    ? await financeService.getCreditNotes(user)
    : [];

  const writeOffs = can(user, "writeoffs:read")
    ? await financeService.getWriteOffRequests(user)
    : [];

  return (
    <div className="flex flex-col gap-5">
      {/* Subview Navigation Pills */}
      <div className="flex flex-wrap gap-2 border-b border-[#d6e7fa] pb-3">
        {REVENUE_SUBVIEWS.map((s) => {
          const isPermitted = authorizedSubviews.some((auth) => auth.id === s.id);
          const isActive = activeSubview.id === s.id;

          if (!isPermitted) {
            return (
              <span
                key={s.id}
                className="px-3 py-1.5 text-xs text-gray-400 rounded-lg bg-gray-100 flex items-center gap-1 cursor-not-allowed select-none"
                title="Not authorized for this subview"
              >
                <Lock size={12} aria-hidden />
                {s.label}
              </span>
            );
          }

          return (
            <Link
              key={s.id}
              href={`/finance/revenue?subview=${s.id}`}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                isActive
                  ? "bg-[#0755c9] text-white shadow-xs"
                  : "bg-white text-[#102b55] hover:bg-[#f0f7ff] border border-[#d6e7fa]"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      {requestedUnauthorized && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
          <ShieldAlert size={16} />
          <span>
            You do not have permission to access the requested subview ({subview}).
            Showing authorized subview ({activeSubview.label}).
          </span>
        </div>
      )}

      {/* SUBVIEW 1: CUSTOMERS & CREDIT */}
      {activeSubview.id === "customers" && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4 border border-[#d6e7fa] bg-white rounded-xl shadow-2xs">
              <div className="text-xs text-[#52658a]">Registered Customers</div>
              <div className="text-2xl font-bold text-[#102b55]">{customers.length}</div>
            </div>
            <div className="card p-4 border border-[#d6e7fa] bg-white rounded-xl shadow-2xs">
              <div className="text-xs text-[#52658a]">Active Accounts</div>
              <div className="text-2xl font-bold text-[#087747]">
                {customers.filter((c) => c.creditStatus === "ACTIVE").length}
              </div>
            </div>
            <div className="card p-4 border border-[#d6e7fa] bg-white rounded-xl shadow-2xs">
              <div className="text-xs text-[#52658a]">Total Approved Credit Limit</div>
              <div className="text-2xl font-bold text-[#0755c9] font-mono">
                {formatCurrency(customers.reduce((acc, c) => acc + c.creditLimit, 0))}
              </div>
            </div>
          </div>

          <div className="card p-5 border border-[#d6e7fa] bg-white rounded-2xl flex flex-col gap-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#102b55]">Customer Credit Master Data</h3>
                <p className="text-xs text-[#52658a]">Credit limits, exposure evaluations, and terms</p>
              </div>
              {can(user, "customers:write") && <RegisterCustomerDialog />}
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#e2edfa]">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f8fbff] text-[#52658a] font-semibold border-b border-[#e2edfa]">
                  <tr>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-3">NPWP</th>
                    <th className="py-2.5 px-3 text-right">Payment Terms</th>
                    <th className="py-2.5 px-3 text-right">Credit Limit</th>
                    <th className="py-2.5 px-3 text-right">Current Exposure</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf4fc]">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-[#fbfdff]">
                      <td className="py-3 px-3 font-semibold text-[#0755c9]">{c.code}</td>
                      <td className="py-3 px-3 font-medium text-[#102b55]">{c.name}</td>
                      <td className="py-3 px-3 font-mono text-[#52658a]">{c.npwp || "-"}</td>
                      <td className="py-3 px-3 text-right font-mono text-[#52658a]">{c.standardPaymentTermsDays} days</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-[#102b55]">{formatCurrency(c.creditLimit)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#0755c9]">{formatCurrency(c.activeExposure)}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${c.creditStatus === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          {c.creditStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {can(user, "credit:write") && (
                          <UpdateCreditDialog
                            customerId={c.id}
                            customerName={c.name}
                            currentLimit={c.creditLimit}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 2: SALES ORDERS */}
      {activeSubview.id === "sales-orders" && (
        <div className="flex flex-col gap-5">
          <div className="card p-5 border border-[#d6e7fa] bg-white rounded-2xl flex flex-col gap-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#102b55]">Commercial Sales Orders</h3>
                <p className="text-xs text-[#52658a]">Order entry, discount thresholds, and workflow progression</p>
              </div>
              {can(user, "sales_orders:write") && (
                <CreateSalesOrderDialog
                  customers={customers.map((c) => ({ id: c.id, name: c.name }))}
                />
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#e2edfa]">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f8fbff] text-[#52658a] font-semibold border-b border-[#e2edfa]">
                  <tr>
                    <th className="py-2.5 px-3">SO Number</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Total Amount</th>
                    <th className="py-2.5 px-3 text-center">Discount</th>
                    <th className="py-2.5 px-3 text-center">Credit Status</th>
                    <th className="py-2.5 px-3 text-center">Order Status</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf4fc]">
                  {salesOrders.map((so) => (
                    <tr key={so.id} className="hover:bg-[#fbfdff]">
                      <td className="py-3 px-3 font-semibold text-[#0755c9]">{so.number}</td>
                      <td className="py-3 px-3 font-medium text-[#102b55]">{so.customerName}</td>
                      <td className="py-3 px-3 text-[#52658a] font-mono">{formatDate(so.orderedAt)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#102b55]">{formatCurrency(so.total)}</td>
                      <td className="py-3 px-3 text-center font-mono">
                        {so.discountRate > 0 ? `${so.discountRate}%` : "0%"}
                        {so.discountRate > 5 && (
                          <span className="block text-[10px] text-amber-600 font-semibold">
                            {so.specialDiscountApproved ? "FAM Approved" : "Needs FAM"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${so.creditStatus === "APPROVED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {so.creditStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f0f4f9] text-[#52658a]">
                          {so.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {so.discountRate > 5 && !so.specialDiscountApproved && can(user, "discounts:authorize") && (
                          <AuthorizeDiscountButton salesOrderId={so.id} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 3: CREDIT DECISIONS */}
      {activeSubview.id === "credit-decisions" && (
        <div className="flex flex-col gap-5">
          <div className="p-4 bg-[#f8fbff] border border-[#d6e7fa] rounded-xl text-xs space-y-1">
            <div className="font-bold text-[#102b55]">Credit Exposure Governance:</div>
            <p className="text-[#52658a]">
              <code>Exposure = Outstanding AR Invoices + Unbilled Released Orders - Unallocated Receipts</code>
            </p>
            <p className="text-[#7485a3]">
              Orders are strictly held in PENDING credit status until reviewed by the Credit Manager. Approval confirms exposure does not exceed the customer limit.
            </p>
          </div>

          <div className="card p-5 border border-[#d6e7fa] bg-white rounded-2xl flex flex-col gap-4 shadow-2xs">
            <div>
              <h3 className="text-base font-bold text-[#102b55]">Orders Awaiting Credit Release</h3>
              <p className="text-xs text-[#52658a]">Credit evaluation and release queue</p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#e2edfa]">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f8fbff] text-[#52658a] font-semibold border-b border-[#e2edfa]">
                  <tr>
                    <th className="py-2.5 px-3">SO Number</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3 text-right">Order Total</th>
                    <th className="py-2.5 px-3 text-center">Credit Status</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf4fc]">
                  {salesOrders.map((so) => (
                    <tr key={so.id} className="hover:bg-[#fbfdff]">
                      <td className="py-3 px-3 font-semibold text-[#0755c9]">{so.number}</td>
                      <td className="py-3 px-3 font-medium text-[#102b55]">{so.customerName}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#102b55]">{formatCurrency(so.total)}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${so.creditStatus === "APPROVED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {so.creditStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {so.creditStatus === "PENDING" && can(user, "sales_orders:approve") ? (
                          <ApproveCreditButton salesOrderId={so.id} />
                        ) : (
                          <span className="text-emerald-700 text-xs font-semibold">Approved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 4: CUSTOMER INVOICES */}
      {activeSubview.id === "invoices" && (
        <div className="flex flex-col gap-5">
          <div className="card p-5 border border-[#d6e7fa] bg-white rounded-2xl flex flex-col gap-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#102b55]">Accounts Receivable Invoices</h3>
                <p className="text-xs text-[#52658a]">Issued customer invoices with simulated draft e-Fakturs</p>
              </div>
              {can(user, "customer_invoices:write") && (
                <IssueInvoiceDialog
                  salesOrders={salesOrders.map((so) => ({
                    id: so.id,
                    number: so.number,
                    customerName: so.customerName,
                  }))}
                />
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#e2edfa]">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f8fbff] text-[#52658a] font-semibold border-b border-[#e2edfa]">
                  <tr>
                    <th className="py-2.5 px-3">Invoice Number</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Issued Date</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3 text-right">Total (Rp)</th>
                    <th className="py-2.5 px-3">Draft e-Faktur</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf4fc]">
                  {customerInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#fbfdff]">
                      <td className="py-3 px-3 font-semibold text-[#0755c9]">{inv.number}</td>
                      <td className="py-3 px-3 font-medium text-[#102b55]">{inv.customerName}</td>
                      <td className="py-3 px-3 text-[#52658a] font-mono">{formatDate(inv.issuedOn)}</td>
                      <td className="py-3 px-3 text-[#52658a] font-mono">{formatDate(inv.dueOn)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#102b55]">{formatCurrency(inv.total)}</td>
                      <td className="py-3 px-3">
                        <div className="font-mono text-xs text-[#0755c9]">{inv.eFakturNumber || "-"}</div>
                        <span className="inline-block text-[10px] text-[#7485a3]">Draft / Simulated</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 5: INCOMING RECEIPTS */}
      {activeSubview.id === "receipts" && (
        <div className="flex flex-col gap-5">
          <div className="card p-5 border border-[#d6e7fa] bg-white rounded-2xl flex flex-col gap-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#102b55]">Incoming Customer Receipts</h3>
                <p className="text-xs text-[#52658a]">Payment evidence recorded by AR and validated by Treasury</p>
              </div>
              {can(user, "receipts_incoming:write") && (
                <RecordReceiptDialog
                  customers={customers.map((c) => ({ id: c.id, name: c.name }))}
                  openInvoices={customerInvoices.map((i) => ({
                    id: i.id,
                    number: i.number,
                    total: i.total,
                    balance: i.balance,
                  }))}
                />
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#e2edfa]">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f8fbff] text-[#52658a] font-semibold border-b border-[#e2edfa]">
                  <tr>
                    <th className="py-2.5 px-3">Receipt Number</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Received On</th>
                    <th className="py-2.5 px-3">Bank Ref</th>
                    <th className="py-2.5 px-3 text-right">Amount (Rp)</th>
                    <th className="py-2.5 px-3">Evidence Ref</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Treasury Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf4fc]">
                  {receipts.map((r) => (
                    <tr key={r.id} className="hover:bg-[#fbfdff]">
                      <td className="py-3 px-3 font-semibold text-[#0755c9]">{r.number}</td>
                      <td className="py-3 px-3 font-medium text-[#102b55]">{r.customerName}</td>
                      <td className="py-3 px-3 text-[#52658a] font-mono">{formatDate(r.receivedOn)}</td>
                      <td className="py-3 px-3 font-mono text-[#52658a]">{r.bankReference}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#102b55]">{formatCurrency(r.amount)}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#0755c9]">{r.bankEvidenceRef}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${r.status === "SETTLED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {r.status === "RECORDED" && can(user, "receipts:settle") ? (
                          <SettleReceiptButton receiptId={r.id} />
                        ) : (
                          <span className="text-[11px] text-gray-400">Validated</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 6: RETURNS & CREDIT NOTES */}
      {activeSubview.id === "returns" && (
        <div className="flex flex-col gap-5">
          <div className="card p-5 border border-[#d6e7fa] bg-white rounded-2xl flex flex-col gap-4 shadow-2xs">
            <div>
              <h3 className="text-base font-bold text-[#102b55]">Return Claims & Credit Governance</h3>
              <p className="text-xs text-[#52658a]">Completeness verification, FAM managerial authorization, and Credit Note issuance</p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#e2edfa]">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f8fbff] text-[#52658a] font-semibold border-b border-[#e2edfa]">
                  <tr>
                    <th className="py-2.5 px-3">Claim Number</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">SO Ref</th>
                    <th className="py-2.5 px-3">Claimed Qty</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3 text-right">Credit Amount</th>
                    <th className="py-2.5 px-3 text-center">Claim Status</th>
                    <th className="py-2.5 px-3 text-center">Workflow Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf4fc]">
                  {returnClaims.map((rc) => (
                    <tr key={rc.id} className="hover:bg-[#fbfdff]">
                      <td className="py-3 px-3 font-semibold text-[#0755c9]">{rc.number}</td>
                      <td className="py-3 px-3 font-medium text-[#102b55]">{rc.customerName}</td>
                      <td className="py-3 px-3 font-mono text-[#52658a]">{rc.salesOrderNumber || "-"}</td>
                      <td className="py-3 px-3 font-mono">{rc.claimedQuantity} {rc.unit}</td>
                      <td className="py-3 px-3 text-[#52658a] max-w-xs truncate">{rc.reason}</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-[#102b55]">{formatCurrency(rc.creditAmount)}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                          {rc.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {rc.status === "SUBMITTED" && can(user, "returns:write") && (
                          <VerifyReturnClaimButton claimId={rc.id} />
                        )}
                        {rc.status === "INSPECTED" && can(user, "returns:authorize") && (
                          <AuthorizeReturnClaimButton claimId={rc.id} />
                        )}
                        {rc.status === "AUTHORIZED" && can(user, "credit_notes:write") && (
                          <IssueCreditNoteButton claimId={rc.id} />
                        )}
                        {rc.status === "CREDITED" && (
                          <span className="text-emerald-700 font-semibold text-[11px]">Credited</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Issued Credit Notes Table */}
            <div className="mt-4 pt-4 border-t border-[#e2edfa]">
              <h4 className="text-sm font-bold text-[#102b55] mb-2">Issued AR Credit Notes</h4>
              <div className="overflow-x-auto rounded-xl border border-[#e2edfa]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#f8fbff] text-[#52658a] font-semibold border-b border-[#e2edfa]">
                    <tr>
                      <th className="py-2.5 px-3">Credit Note</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Return Claim</th>
                      <th className="py-2.5 px-3 text-right">Amount (Rp)</th>
                      <th className="py-2.5 px-3">Issued Date</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf4fc]">
                    {creditNotes.map((cn) => (
                      <tr key={cn.id}>
                        <td className="py-2.5 px-3 font-semibold text-[#0755c9]">{cn.number}</td>
                        <td className="py-2.5 px-3 text-[#102b55]">{cn.customerName}</td>
                        <td className="py-2.5 px-3 font-mono text-[#52658a]">{cn.returnClaimNumber}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#102b55]">{formatCurrency(cn.amount)}</td>
                        <td className="py-2.5 px-3 text-[#52658a]">{formatDate(cn.issuedAt)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            {cn.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 7: BAD DEBT WRITE-OFFS */}
      {activeSubview.id === "write-offs" && (
        <div className="flex flex-col gap-5">
          <div className="card p-5 border border-[#d6e7fa] bg-white rounded-2xl flex flex-col gap-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#102b55]">Bad-Debt Write-Off Workflow</h3>
                <p className="text-xs text-[#52658a]">AR recommendation, FAM authorization, and GL recognition</p>
              </div>
              {can(user, "writeoffs:recommend") && (
                <SubmitWriteOffDialog
                  customers={customers.map((c) => ({ id: c.id, name: c.name }))}
                  invoices={customerInvoices.map((i) => ({
                    id: i.id,
                    number: i.number,
                    balance: i.balance,
                  }))}
                />
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#e2edfa]">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f8fbff] text-[#52658a] font-semibold border-b border-[#e2edfa]">
                  <tr>
                    <th className="py-2.5 px-3">Request Number</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Target Invoice</th>
                    <th className="py-2.5 px-3 text-right">Amount (Rp)</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Workflow Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf4fc]">
                  {writeOffs.map((wro) => (
                    <tr key={wro.id} className="hover:bg-[#fbfdff]">
                      <td className="py-3 px-3 font-semibold text-[#0755c9]">{wro.number}</td>
                      <td className="py-3 px-3 font-medium text-[#102b55]">{wro.customerName}</td>
                      <td className="py-3 px-3 font-mono text-[#52658a]">{wro.invoiceNumber}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#b42336]">{formatCurrency(wro.amount)}</td>
                      <td className="py-3 px-3 text-[#52658a] max-w-xs truncate">{wro.reason}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                          {wro.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {wro.status === "SUBMITTED" && can(user, "writeoffs:authorize") && (
                          <AuthorizeWriteOffButton requestId={wro.id} />
                        )}
                        {wro.status === "AUTHORIZED" && can(user, "write_offs:post_journal") && (
                          <PostWriteOffJournalButton requestId={wro.id} />
                        )}
                        {wro.status === "POSTED" && (
                          <span className="text-emerald-700 font-semibold text-[11px]">GL Recognized</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
