"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { requirePermission } from "@/lib/auth/session";
import { financeService } from "./server/finance-service";
import type { Id, Money, Quantity, Unit } from "@/shared/contracts/domain";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

// ==========================================
// PURCHASING FINANCE ACTIONS
// ==========================================

export async function recordSupplierInvoiceAction(input: {
  supplierId: Id;
  supplierInvoiceNumber: string;
  purchaseOrderId: Id;
  receiptIds?: Id[];
  issuedOn: string;
  dueOn: string;
  lines: {
    purchaseOrderLineId: Id;
    materialId: Id;
    quantity: Quantity;
    unit: Unit;
    unitPrice: Money;
  }[];
}): Promise<ActionResult> {
  try {
    const actor = await requirePermission("invoices:write");
    const result = await financeService.recordInvoice(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      input,
    );
    revalidatePath("/finance/invoices");
    revalidatePath("/finance/payables");
    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to record supplier invoice.") };
  }
}

export async function runMatchingAction(invoiceId: Id): Promise<ActionResult> {
  try {
    const actor = await requirePermission("invoices:match");
    const result = await financeService.runMatching(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      invoiceId,
    );
    revalidatePath("/finance/invoices");
    revalidatePath("/finance/payables");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to run 3-way matching.") };
  }
}

export async function requestCreditNoteAction(invoiceId: Id): Promise<ActionResult> {
  try {
    const actor = await requirePermission("invoices:write");
    // Marks simulated credit note request
    revalidatePath("/finance/invoices");
    return {
      success: true,
      data: { invoiceId, requestedAt: new Date().toISOString(), message: "Credit note request submitted to supplier." },
    };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to request credit note.") };
  }
}

export async function recordPaymentAction(input: {
  paidOn: string;
  bankReference: string;
  method?: "BANK_TRANSFER";
  amount: Money;
  allocations: { invoiceId: Id; amount: Money }[];
}): Promise<ActionResult> {
  try {
    const actor = await requirePermission("payments:write");
    const result = await financeService.recordPayment(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      input,
    );
    revalidatePath("/finance/payments");
    revalidatePath("/finance/payables");
    revalidatePath("/finance/invoices");
    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to record payment.") };
  }
}

export async function reversePaymentAction(paymentId: Id, reason: string): Promise<ActionResult> {
  try {
    const actor = await requirePermission("payments:write");
    const result = await financeService.reversePayment(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      paymentId,
      reason,
    );
    revalidatePath("/finance/payments");
    revalidatePath("/finance/payables");
    revalidatePath("/finance/invoices");
    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to reverse payment.") };
  }
}

export async function recordJournalAction(input: {
  date: string;
  description: string;
  sourceDocumentRef?: string;
  lines: {
    accountId: Id;
    description: string;
    debit: Money;
    credit: Money;
  }[];
}): Promise<ActionResult> {
  try {
    const actor = await requirePermission("journals:write");
    const result = await financeService.recordJournal(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      input,
    );
    revalidatePath("/finance/journals");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to record journal entry.") };
  }
}

export async function postJournalAction(journalId: Id): Promise<ActionResult> {
  try {
    const actor = await requirePermission("journals:post");
    const result = await financeService.postJournal(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      journalId,
    );
    revalidatePath("/finance/journals");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to post journal entry.") };
  }
}

export async function reverseJournalAction(journalId: Id, reason: string): Promise<ActionResult> {
  try {
    const actor = await requirePermission("journals:write");
    const result = await financeService.reverseJournal(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      journalId,
      reason,
    );
    revalidatePath("/finance/journals");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to reverse journal entry.") };
  }
}

// ==========================================
// REVENUE CYCLE ACTIONS
// ==========================================

export async function registerCustomerAction(input: {
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  npwp?: string;
  standardPaymentTermsDays?: number;
}): Promise<ActionResult> {
  try {
    const actor = await requirePermission("customers:write");
    const result = await financeService.registerCustomer(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      input,
    );
    revalidatePath("/finance/revenue");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to register customer.") };
  }
}

export async function updateCustomerCreditAction(input: {
  customerId: Id;
  decisionType: "ACTIVATE" | "SUSPEND" | "SET_LIMIT" | "OVERRIDE_EXPOSURE";
  limitAmount?: Money;
  reason: string;
}): Promise<ActionResult> {
  try {
    const actor = await requirePermission("credit:write");
    const result = await financeService.updateCustomerCredit(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      input,
    );
    revalidatePath("/finance/revenue");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to update customer credit.") };
  }
}

export async function createSalesOrderAction(input: {
  customerId: Id;
  warehouseId: Id;
  orderedAt: string;
  requestedDeliveryDate: string;
  discountRate?: number;
  lines: {
    materialId: Id;
    quantity: Quantity;
    unit: Unit;
    unitPrice: Money;
  }[];
}): Promise<ActionResult> {
  try {
    const actor = await requirePermission("orders:write");
    const result = await financeService.createSalesOrder(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      input,
    );
    revalidatePath("/finance/revenue");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to create sales order.") };
  }
}

export async function authorizeSpecialDiscountAction(salesOrderId: Id): Promise<ActionResult> {
  try {
    const actor = await requirePermission("discounts:authorize");
    const result = await financeService.authorizeSpecialDiscount(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      salesOrderId,
    );
    revalidatePath("/finance/revenue");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to authorize special discount.") };
  }
}

export async function approveOrderCreditAction(salesOrderId: Id): Promise<ActionResult> {
  try {
    const actor = await requirePermission("credit:approve");
    const result = await financeService.approveOrderCredit(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      salesOrderId,
    );
    revalidatePath("/finance/revenue");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to approve order credit.") };
  }
}

export async function issueCustomerInvoiceAction(input: {
  salesOrderId: Id;
  deliveryOrderId: Id;
  issuedOn: string;
  dueOn: string;
}): Promise<ActionResult> {
  try {
    const actor = await requirePermission("customer_invoices:write");
    const result = await financeService.issueCustomerInvoice(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      input,
    );
    revalidatePath("/finance/revenue");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to issue customer invoice.") };
  }
}

export async function recordCustomerReceiptAction(input: {
  customerId: Id;
  receivedOn: string;
  bankReference: string;
  paymentMethod: "BANK_TRANSFER" | "GIRO" | "VIRTUAL_ACCOUNT";
  amount: Money;
  bankEvidenceRef: string;
  allocations: {
    invoiceId: Id;
    amount: Money;
  }[];
}): Promise<ActionResult> {
  try {
    const actor = await requirePermission("receipts:write");
    const result = await financeService.recordCustomerReceipt(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      input,
    );
    revalidatePath("/finance/revenue");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to record customer receipt.") };
  }
}

export async function validateAndSettleReceiptAction(receiptId: Id): Promise<ActionResult> {
  try {
    const actor = await requirePermission("receipts:settle");
    const result = await financeService.validateAndSettleReceipt(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      receiptId,
    );
    revalidatePath("/finance/revenue");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to validate and settle receipt.") };
  }
}

export async function verifyReturnClaimCompletenessAction(claimId: Id): Promise<ActionResult> {
  try {
    const actor = await requirePermission("returns:write");
    const result = await financeService.verifyReturnClaimCompleteness(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      claimId,
    );
    revalidatePath("/finance/revenue");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to verify return claim.") };
  }
}

export async function authorizeReturnClaimAction(claimId: Id, creditAmount: Money): Promise<ActionResult> {
  try {
    const actor = await requirePermission("returns:authorize");
    const result = await financeService.authorizeReturnClaim(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      claimId,
      creditAmount,
    );
    revalidatePath("/finance/revenue");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to authorize return claim.") };
  }
}

export async function issueCreditNoteAction(claimId: Id): Promise<ActionResult> {
  try {
    const actor = await requirePermission("credit_notes:write");
    const result = await financeService.issueCreditNote(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      claimId,
    );
    revalidatePath("/finance/revenue");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to issue credit note.") };
  }
}

export async function submitWriteOffRequestAction(input: {
  customerId: Id;
  invoiceId: Id;
  amount: Money;
  reason: string;
}): Promise<ActionResult> {
  try {
    const actor = await requirePermission("write_offs:write");
    const result = await financeService.submitWriteOffRequest(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      input,
    );
    revalidatePath("/finance/revenue");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to submit write-off request.") };
  }
}

export async function authorizeWriteOffAction(requestId: Id): Promise<ActionResult> {
  try {
    const actor = await requirePermission("write_offs:authorize");
    const result = await financeService.authorizeWriteOff(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      requestId,
    );
    revalidatePath("/finance/revenue");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to authorize write-off.") };
  }
}

export async function recordWriteOffJournalAction(requestId: Id): Promise<ActionResult> {
  try {
    const actor = await requirePermission("write_offs:post_journal");
    const result = await financeService.recordWriteOffJournal(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      requestId,
    );
    revalidatePath("/finance/revenue");
    revalidatePath("/finance/journals");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to record write-off journal.") };
  }
}

export async function prepareBankReconciliationAction(input: {
  period: string;
  statementClosingBalance: Money;
  items: {
    transactionDate: string;
    description: string;
    statementAmount: Money;
    bookAmount: Money;
    difference: Money;
    status: "MATCHED" | "OUTSTANDING" | "DISCREPANCY";
  }[];
}): Promise<ActionResult> {
  try {
    const actor = await requirePermission("reconciliation:write");
    const result = await financeService.prepareBankReconciliation(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      input,
    );
    revalidatePath("/finance/revenue");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to prepare bank reconciliation.") };
  }
}

export async function approveBankReconciliationAction(reconciliationId: Id): Promise<ActionResult> {
  try {
    const actor = await requirePermission("reconciliation:approve");
    const result = await financeService.approveBankReconciliation(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      reconciliationId,
    );
    revalidatePath("/finance/revenue");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, "Failed to approve bank reconciliation.") };
  }
}
