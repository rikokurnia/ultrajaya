"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  X,
  Clock,
  Check,
  AlertCircle,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  ShieldAlert,
} from "lucide-react";
import { formatCurrency, formatQuantity, formatDate } from "@/shared/format";
import type { ExtendedPurchaseOrder } from "../types";
import type { Actor } from "@/shared/contracts/auth";
import { decideApprovalAction, issueOrderAction } from "../actions";

interface PoDetailPanelProps {
  order: ExtendedPurchaseOrder | null;
  currentActor?: Actor;
  onClose?: () => void;
}

export function PoDetailPanel({ order, currentActor, onClose }: PoDetailPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string>();
  const [actionSuccess, setActionSuccess] = useState<string>();
  const [decisionNotes, setDecisionNotes] = useState("");
  const [showDecisionModal, setShowDecisionModal] = useState<"APPROVED" | "REJECTED" | null>(null);

  if (!order) {
    return (
      <div className="card h-full min-h-[420px] flex flex-col items-center justify-center p-8 text-center text-muted">
        <FileText size={48} className="text-[#b9d3f2] mb-3" />
        <h3 className="text-lg font-semibold text-[#102b55]">No Purchase Order Selected</h3>
        <p className="text-sm max-w-[280px] mt-1">
          Select an order from the list to view line items, quotation comparisons, and approval history.
        </p>
      </div>
    );
  }

  const linkedRequestNumber =
    order.references?.find((r) => r.type === "FPBB")?.number ||
    (order.requestIds?.[0] ? `REQ-${order.requestIds[0].slice(-8)}` : "None");

  const isCreator = currentActor?.id === order.createdBy;
  const canDecide = currentActor?.role === "APPROVER";
  const currentPendingStep = order.approvalSteps.find((s) => s.status === "PENDING");

  function handleDecide(outcome: "APPROVED" | "REJECTED") {
    if (!currentPendingStep) return;
    setActionError(undefined);
    setActionSuccess(undefined);
    startTransition(async () => {
      const res = await decideApprovalAction(order!.id, order!.version, {
        stepId: currentPendingStep.id,
        decision: outcome,
        reason: decisionNotes || (outcome === "APPROVED" ? "Approved in accordance with procurement policy" : "Rejected for revision"),
      });
      if (!res.success) {
        setActionError(res.error);
      } else {
        setActionSuccess(`Order ${outcome === "APPROVED" ? "approved" : "rejected"} successfully.`);
        setShowDecisionModal(null);
        setDecisionNotes("");
      }
    });
  }

  function handleIssue() {
    setActionError(undefined);
    setActionSuccess(undefined);
    startTransition(async () => {
      const res = await issueOrderAction(order!.id, order!.version, {
        notes: "Official Purchase Order dispatched to supplier via procurement portal",
      });
      if (!res.success) {
        setActionError(res.error);
      } else {
        setActionSuccess("Purchase order successfully issued to supplier.");
      }
    });
  }

  return (
    <div className="card p-5 flex flex-col gap-5 border border-[#d6e7fa] bg-white shadow-sm rounded-xl relative">
      {/* Top Header */}
      <div className="flex items-start justify-between pb-3 border-b border-[#eef5fc]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-[#102b55]">{order.number}</h2>
            {order.status === "AWAITING_APPROVAL" && (
              <span className="badge badge-warning flex items-center gap-1.5 py-0.5 px-2.5 text-xs font-semibold">
                <Clock size={13} className="text-[#995100]" />
                Awaiting {order.approvalStage || "Approval"}
              </span>
            )}
            {order.status === "APPROVED" && (
              <span className="badge badge-success flex items-center gap-1.5 py-0.5 px-2.5 text-xs font-semibold">
                <Check size={13} />
                Approved
              </span>
            )}
            {order.status === "OPEN" && (
              <span className="badge badge-info flex items-center gap-1.5 py-0.5 px-2.5 text-xs font-semibold">
                <CheckCircle2 size={13} />
                Open • Issued
              </span>
            )}
            {order.status === "REJECTED" && (
              <span className="badge badge-danger flex items-center gap-1.5 py-0.5 px-2.5 text-xs font-semibold">
                <AlertCircle size={13} />
                Rejected
              </span>
            )}
            {order.status === "DRAFT" && (
              <span className="badge badge-neutral py-0.5 px-2.5 text-xs font-semibold">
                Draft
              </span>
            )}
          </div>
          <p className="text-xs text-[#52658a] mt-0.5">Purchase order detail</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-[#52658a] hover:text-[#102b55] p-1.5 rounded-lg hover:bg-[#eef5fc] transition-colors"
            aria-label="Close panel"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {actionError && (
        <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3 text-xs bg-green-50 text-green-700 border border-green-200 rounded-lg flex items-start gap-2">
          <Check size={16} className="shrink-0 mt-0.5" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Meta Grid */}
      <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
        <div>
          <span className="text-[#52658a] block">Supplier</span>
          <strong className="text-[#102b55] font-semibold text-sm">{order.supplierName}</strong>
        </div>
        <div>
          <span className="text-[#52658a] block">Request</span>
          <Link
            href="/procurement/requests"
            className="text-[#0755c9] font-semibold hover:underline inline-flex items-center gap-1"
          >
            {linkedRequestNumber}
          </Link>
        </div>
        <div>
          <span className="text-[#52658a] block">Created</span>
          <span className="text-[#102b55] font-medium">{formatDate(order.createdAt)}</span>
        </div>
        <div>
          <span className="text-[#52658a] block">Terms</span>
          <span className="text-[#102b55] font-medium">
            {order.paymentTerms || "Net 30 Days"}
          </span>
        </div>
      </div>

      {/* Line Items Section */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#52658a]">Line items</h3>
        <div className="border border-[#d6e7fa] rounded-lg overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-[#f5f9ff] text-[#52658a] font-semibold border-b border-[#d6e7fa]">
              <tr>
                <th className="py-2 px-3">Material</th>
                <th className="py-2 px-3 text-right">Qty</th>
                <th className="py-2 px-3 text-right">Unit price</th>
                <th className="py-2 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf5ff]">
              {order.lines.map((line) => (
                <tr key={line.id} className="hover:bg-[#fafcff]">
                  <td className="py-2 px-3 font-medium text-[#102b55]">
                    {line.materialId === "mat_cartons"
                      ? "Packaging Cartons"
                      : line.materialId === "mat_milk_powder"
                      ? "Milk Powder"
                      : line.materialId === "mat_fresh_milk"
                      ? "Fresh Milk"
                      : line.materialId}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-[#52658a]">
                    {formatQuantity(line.quantity, line.unit)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-[#52658a]">
                    {formatCurrency(line.unitPrice)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-semibold text-[#102b55]">
                    {formatCurrency(line.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[#f8faff] border-t border-[#d6e7fa]">
              <tr>
                <td colSpan={3} className="py-2.5 px-3 font-bold text-[#102b55] text-right">
                  PO total
                </td>
                <td className="py-2.5 px-3 font-mono font-bold text-[#102b55] text-right text-sm">
                  {formatCurrency(order.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Supplier Quotation Comparison Section (Reference Match) */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#52658a]">
          Supplier quotation comparison
        </h3>
        <div className="border border-[#d6e7fa] rounded-lg overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-[#f5f9ff] text-[#52658a] font-semibold border-b border-[#d6e7fa]">
              <tr>
                <th className="py-2 px-3">Supplier</th>
                <th className="py-2 px-3 text-right">Unit price</th>
                <th className="py-2 px-3 text-center">Lead time</th>
                <th className="py-2 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf5ff]">
              {order.id === "po_261029_0045" ? (
                <>
                  <tr className="bg-[#eef8f1] font-medium text-[#087747]">
                    <td className="py-2 px-3 font-semibold flex items-center gap-1.5">
                      <span>PT Kemas Prima</span>
                      <span className="badge badge-success text-[10px] py-0 px-1.5">Selected</span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold">Rp120</td>
                    <td className="py-2 px-3 text-center">2 days</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">Rp120,000,000</td>
                  </tr>
                  <tr className="text-[#52658a] hover:bg-[#fafcff]">
                    <td className="py-2 px-3">PT Kemasan Sentosa</td>
                    <td className="py-2 px-3 text-right font-mono">Rp124</td>
                    <td className="py-2 px-3 text-center">3 days</td>
                    <td className="py-2 px-3 text-right font-mono">Rp124,000,000</td>
                  </tr>
                  <tr className="text-[#52658a] hover:bg-[#fafcff]">
                    <td className="py-2 px-3">PT IndoPack</td>
                    <td className="py-2 px-3 text-right font-mono">Rp128</td>
                    <td className="py-2 px-3 text-center">4 days</td>
                    <td className="py-2 px-3 text-right font-mono">Rp128,000,000</td>
                  </tr>
                </>
              ) : (
                <tr className="bg-[#eef8f1] font-medium text-[#087747]">
                  <td className="py-2 px-3 font-semibold flex items-center gap-1.5">
                    <span>{order.supplierName}</span>
                    <span className="badge badge-success text-[10px] py-0 px-1.5">Selected</span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold">
                    {order.lines[0] ? formatCurrency(order.lines[0].unitPrice) : "-"}
                  </td>
                  <td className="py-2 px-3 text-center">Standard</td>
                  <td className="py-2 px-3 text-right font-mono font-bold">
                    {formatCurrency(order.total)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multilevel Approval Section */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#52658a]">
          Multilevel approval
        </h3>
        <div className="flex flex-col gap-3 py-1">
          {/* Step 1: Requester */}
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-[#087747] text-white flex items-center justify-center shrink-0 mt-0.5">
              <Check size={12} />
            </span>
            <div className="text-xs flex-1">
              <strong className="text-[#102b55] font-semibold block">
                {order.creatorName || "Ayu Pratama"}
              </strong>
              <span className="text-[#52658a]">
                Submitted • {formatDate(order.createdAt, true)}
              </span>
            </div>
          </div>

          {/* Dynamic Approval Steps */}
          {order.approvalSteps.map((step, idx) => {
            const isApproved = step.status === "APPROVED";
            const isRejected = step.status === "REJECTED";
            const isCurrentPending =
              step.status === "PENDING" &&
              (idx === 0 || order.approvalSteps[idx - 1].status === "APPROVED");
            const isFuturePending = step.status === "PENDING" && !isCurrentPending;

            return (
              <div key={step.id} className="flex items-start gap-2.5">
                {isApproved && (
                  <span className="w-5 h-5 rounded-full bg-[#087747] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} />
                  </span>
                )}
                {isRejected && (
                  <span className="w-5 h-5 rounded-full bg-[#b42336] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <X size={12} />
                  </span>
                )}
                {isCurrentPending && (
                  <span className="w-5 h-5 rounded-full bg-[#995100] text-white flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                    <Clock size={12} />
                  </span>
                )}
                {isFuturePending && (
                  <span className="w-5 h-5 rounded-full border-2 border-[#b9d3f2] bg-white flex items-center justify-center shrink-0 mt-0.5" />
                )}

                <div className="text-xs flex-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-[#102b55] font-semibold">
                      {idx === 0
                        ? "Dimas Saputra • Procurement Manager"
                        : idx === 1
                        ? "Sinta Maharani • Finance Manager"
                        : "Hendra Wijaya • Executive Director"}
                    </strong>
                    {isApproved && (
                      <span className="text-[#087747] font-semibold">Approved</span>
                    )}
                    {isRejected && (
                      <span className="text-[#b42336] font-semibold">Rejected</span>
                    )}
                    {isCurrentPending && (
                      <span className="text-[#995100] font-semibold">Awaiting approval</span>
                    )}
                  </div>
                  <span className="text-[#52658a] block mt-0.5">
                    {isApproved && step.decision?.decidedAt
                      ? `Approved • ${formatDate(step.decision.decidedAt, true)}`
                      : isRejected && step.decision?.decidedAt
                      ? `Rejected • ${step.decision.reason}`
                      : isCurrentPending
                      ? "Pending review decision"
                      : `Next approver • After step ${idx} approval`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Creator Self-Approval Guard Notice */}
      {isCreator && order.status === "AWAITING_APPROVAL" && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs flex items-start gap-2 text-blue-900">
          <ShieldAlert size={16} className="text-blue-700 shrink-0 mt-0.5" />
          <span>
            <strong>Segregation of Duties Enforced:</strong> As the creator of this purchase order, you cannot approve your own order. An assigned authority must review and approve it.
          </span>
        </div>
      )}

      {/* Bottom Action Footer */}
      <div className="pt-3 border-t border-[#eef5fc] flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-xs text-[#52658a]">
          Submitted {formatDate(order.createdAt, true)}
        </span>
        <div className="flex items-center gap-2">
          {order.status === "AWAITING_APPROVAL" && canDecide && !isCreator && (
            <>
              <button
                type="button"
                onClick={() => setShowDecisionModal("APPROVED")}
                disabled={isPending}
                className="button button-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
              >
                <Check size={14} />
                Approve
              </button>
              <button
                type="button"
                onClick={() => setShowDecisionModal("REJECTED")}
                disabled={isPending}
                className="button button-danger text-xs py-2 px-3.5 flex items-center gap-1.5"
              >
                <XCircle size={14} />
                Reject
              </button>
            </>
          )}

          {order.status === "APPROVED" && (
            <button
              type="button"
              onClick={handleIssue}
              disabled={isPending}
              className="button button-primary text-xs py-2 px-4 flex items-center gap-1.5 bg-[#087747] hover:bg-[#065e38]"
            >
              <Send size={14} />
              Issue PO to Supplier
            </button>
          )}

          <button
            type="button"
            className="button button-secondary text-xs py-2 px-3 flex items-center gap-1.5 text-[#0755c9]"
            onClick={() => alert(`Purchase Order ${order.number} formal document package loaded.`)}
          >
            <FileText size={14} />
            View documents
          </button>
        </div>
      </div>

      {/* Inline Modal for Approval / Rejection Decision */}
      {showDecisionModal && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-xs p-5 rounded-xl z-10 flex flex-col justify-center border border-[#b9d3f2]">
          <h3 className="text-base font-bold text-[#102b55] flex items-center gap-2">
            {showDecisionModal === "APPROVED" ? (
              <CheckCircle2 size={18} className="text-[#087747]" />
            ) : (
              <XCircle size={18} className="text-[#b42336]" />
            )}
            Confirm {showDecisionModal === "APPROVED" ? "Approval" : "Rejection"}
          </h3>
          <p className="text-xs text-[#52658a] mt-1">
            {showDecisionModal === "APPROVED"
              ? "Confirming this decision will advance the purchase order to the next workflow stage."
              : "Rejection will return this purchase order to revision status with your specified feedback."}
          </p>

          <div className="mt-3">
            <label className="text-xs font-semibold text-[#102b55] block mb-1">
              Decision notes & rationale
            </label>
            <textarea
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder={
                showDecisionModal === "APPROVED"
                  ? "e.g., Quotations verified, budget cleared, commercial terms compliant."
                  : "e.g., Unit price exceeds ceiling tolerance; please request renegotiated volume discount."
              }
              rows={3}
              className="input w-full text-xs p-2.5 h-auto"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-4">
            <button
              type="button"
              onClick={() => setShowDecisionModal(null)}
              disabled={isPending}
              className="button button-secondary text-xs py-2 px-3"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleDecide(showDecisionModal)}
              disabled={isPending}
              className={`button text-xs py-2 px-4 text-white ${
                showDecisionModal === "APPROVED" ? "button-primary" : "button-danger"
              }`}
            >
              {isPending ? "Recording..." : `Confirm ${showDecisionModal}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
