import type { Actor } from "../contracts/auth";
import type {
  Id,
  Money,
  Quantity,
  DocumentType,
  DocumentReference,
} from "../contracts/domain";
import type {
  CustomerCreditProfile,
  SalesOrder,
  SalesOrderStatus,
  StockReservation,
  StockVerificationResult,
  DeliveryOrderStatus,
  SignedDeliveryEvidence,
  CustomerInvoiceStatus,
  ReceivableBalance,
  IncomingReceipt,
  IncomingReceiptStatus,
  ReturnClaimStatus,
  ReturnInspectionResult,
  CreditNote,
  BadDebtWriteOff,
  WriteOffStatus,
  BankReconciliation,
} from "../contracts/revenue";
import type { MutationContext } from "./interfaces";

// ============================================================================
// 1. FINANCE-TO-INVENTORY SERVICE INTERFACE
// Implemented by Agent 4 (Inventory), Consumed by Agent 5 (Finance)
// ============================================================================

export interface StockVerificationItemInput {
  materialId: Id;
  quantity: Quantity;
}

export interface StockReservationInput {
  salesOrderId: Id;
  salesOrderLineId: Id;
  warehouseId: Id;
  materialId: Id;
  quantity: Quantity;
}

export interface DispatchEligibilityResult {
  salesOrderId: Id;
  eligible: boolean;
  reservedStockAvailable: boolean;
  creditApproved: boolean;
  reason?: string;
}

export interface ReturnInspectionInput {
  returnClaimId: Id;
  returnClaimLineId: Id;
  acceptedQuantity: Quantity;
  rejectedQuantity: Quantity;
  finding: ReturnInspectionResult["finding"];
  restockWarehouseId?: Id;
  notes?: string;
}

export interface FinanceToInventoryService {
  /** Verify physical stock availability across designated warehouse before SO credit approval */
  verifyStockForSalesOrder(
    actor: Actor,
    input: {
      salesOrderId: Id;
      warehouseId: Id;
      items: StockVerificationItemInput[];
    },
  ): Promise<StockVerificationResult>;

  /** Reserve stock for an approved sales order to guarantee allocation */
  createStockReservation(
    context: MutationContext,
    input: StockReservationInput,
  ): Promise<StockReservation>;

  /** Release active reservation if order is cancelled or rejected */
  releaseStockReservation(
    context: MutationContext,
    reservationId: Id,
  ): Promise<void>;

  /** Check whether a sales order has sufficient reserved stock and valid credit to dispatch */
  checkDispatchEligibility(
    actor: Actor,
    salesOrderId: Id,
  ): Promise<DispatchEligibilityResult>;

  /** Record physical QC inspection results for customer return claims */
  recordReturnInspection(
    context: MutationContext,
    input: ReturnInspectionInput,
  ): Promise<ReturnInspectionResult>;
}

// ============================================================================
// 2. INVENTORY-TO-FINANCE SERVICE INTERFACE
// Implemented by Agent 5 (Finance), Consumed by Agent 4 (Inventory)
// ============================================================================

export interface SalesOrderDeliveryStatus {
  salesOrderId: Id;
  orderedQuantity: Quantity;
  dispatchedQuantity: Quantity;
  remainingQuantity: Quantity;
  fullyDispatched: boolean;
}

export interface InventoryToFinanceService {
  /** Fetch approved sales order details to initialize picking and dispatch */
  getApprovedSalesOrder(
    actor: Actor,
    salesOrderId: Id,
  ): Promise<SalesOrder | null>;

  /** Verify that customer credit is active and not suspended before warehouse dispatch */
  checkCustomerCreditStatus(
    actor: Actor,
    customerId: Id,
  ): Promise<CustomerCreditProfile>;

  /** Query current delivery progress against sales order lines */
  getSalesOrderDeliveryProgress(
    actor: Actor,
    salesOrderId: Id,
  ): Promise<SalesOrderDeliveryStatus>;

  /** Retrieve confirmed signed delivery evidence required before AR invoice generation */
  getSignedDeliveryOrderEvidence(
    actor: Actor,
    deliveryOrderId: Id,
  ): Promise<SignedDeliveryEvidence | null>;

  /** Retrieve technical QC inspection findings for customer return claim */
  getReturnFindings(
    actor: Actor,
    returnClaimId: Id,
  ): Promise<ReturnInspectionResult | null>;
}

// ============================================================================
// 3. DASHBOARD REVENUE READ MODEL
// Implemented by Agent 5 (Finance) & Agent 4 (Inventory), Consumed by Agent 2 (Dashboard)
// ============================================================================

export interface PendingCreditApprovalSummary {
  salesOrderId: Id;
  orderNumber: string;
  customerName: string;
  total: Money;
  submittedAt: string;
}

export interface PendingDispatchSummary {
  salesOrderId: Id;
  orderNumber: string;
  customerName: string;
  warehouseName: string;
  approvedAt: string;
}

export interface OverdueReceivableSummary {
  totalOverdueAmount: Money;
  overdueInvoicesCount: number;
  oldestOverdueDays: number;
}

export interface RevenueKpis {
  status: "READY" | "UNAVAILABLE";
  grossRevenue: Money;
  netRevenue: Money;
  collectionsTotal: Money;
  returnsTotal: Money;
  asOf: string;
}

export interface DashboardRevenueReadModel {
  getPendingCreditApprovals(
    actor: Actor,
  ): Promise<{ count: number; totalValue: Money; items: PendingCreditApprovalSummary[] }>;

  getPendingDispatches(
    actor: Actor,
  ): Promise<{ count: number; items: PendingDispatchSummary[] }>;

  getOverdueReceivables(
    actor: Actor,
    asOfDate: string,
  ): Promise<OverdueReceivableSummary>;

  getRevenueKpis(
    actor: Actor,
    period: { start: string; end: string },
  ): Promise<RevenueKpis>;
}

// ============================================================================
// 4. REPORTS REVENUE READ MODEL
// Implemented by Agent 5 (Finance) & Agent 4 (Inventory), Consumed by Agent 6 (Reports)
// ============================================================================

export interface CustomerAgingSummaryReport {
  cutoffDate: string;
  items: ReceivableBalance[];
  totals: {
    current: Money;
    bucket1_30: Money;
    bucket31_60: Money;
    bucket61_90: Money;
    bucket90_plus: Money;
    totalOutstanding: Money;
  };
}

export interface SalesRevenueSummaryReport {
  period: { start: string; end: string };
  ordersCount: number;
  invoicesCount: number;
  grossSales: Money;
  discountTotal: Money;
  netSales: Money;
  taxTotal: Money;
  totalInvoiced: Money;
}

export interface IncomingReceiptsReport {
  period: { start: string; end: string };
  receipts: IncomingReceipt[];
  totalCollected: Money;
  unallocatedTotal: Money;
}

export interface AdjustmentsReport {
  period: { start: string; end: string };
  creditNotes: CreditNote[];
  writeOffs: BadDebtWriteOff[];
  totalCreditNotes: Money;
  totalWrittenOff: Money;
}

export interface DocumentTraceNode {
  type: DocumentType;
  id: Id;
  number: string;
  status: string;
  date: string;
  amount?: Money;
  partyName: string; // Supplier or Customer
  references: DocumentReference[];
}

export interface ReportsRevenueReadModel {
  getCustomerAgingSummary(
    actor: Actor,
    cutoffDate: string,
  ): Promise<CustomerAgingSummaryReport>;

  getSalesRevenueReport(
    actor: Actor,
    period: { start: string; end: string },
  ): Promise<SalesRevenueSummaryReport>;

  getIncomingReceiptsReport(
    actor: Actor,
    period: { start: string; end: string },
  ): Promise<IncomingReceiptsReport>;

  getAdjustmentsReport(
    actor: Actor,
    period: { start: string; end: string },
  ): Promise<AdjustmentsReport>;

  getBankReconciliationReport(
    actor: Actor,
    accountId: Id,
    period: { start: string; end: string },
  ): Promise<BankReconciliation | null>;

  getDocumentTraceability(
    actor: Actor,
    query: { searchTerm: string; documentType?: DocumentType },
  ): Promise<DocumentTraceNode[]>;
}

// ============================================================================
// 5. STATUS TRANSITIONS AND VALIDATORS
// ============================================================================

export const SALES_ORDER_TRANSITIONS: Record<
  SalesOrderStatus,
  readonly SalesOrderStatus[]
> = {
  DRAFT: ["PENDING_VALIDATION", "CANCELLED"],
  PENDING_VALIDATION: ["PENDING_STOCK_VERIFICATION", "REJECTED", "CANCELLED"],
  PENDING_STOCK_VERIFICATION: ["PENDING_CREDIT_APPROVAL", "REJECTED", "CANCELLED"],
  PENDING_CREDIT_APPROVAL: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["PARTIALLY_DISPATCHED", "DISPATCHED", "CANCELLED"],
  PARTIALLY_DISPATCHED: ["DISPATCHED", "COMPLETED"],
  DISPATCHED: ["COMPLETED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export const DELIVERY_ORDER_TRANSITIONS: Record<
  DeliveryOrderStatus,
  readonly DeliveryOrderStatus[]
> = {
  DRAFT: ["PICKED"],
  PICKED: ["DISPATCHED"],
  DISPATCHED: ["DELIVERED", "RETURNED_PARTIAL"],
  DELIVERED: ["RETURNED_PARTIAL"],
  RETURNED_PARTIAL: [],
};

export const CUSTOMER_INVOICE_TRANSITIONS: Record<
  CustomerInvoiceStatus,
  readonly CustomerInvoiceStatus[]
> = {
  DRAFT: ["ISSUED", "VOIDED"],
  ISSUED: ["PARTIALLY_PAID", "PAID", "OVERDUE", "WRITTEN_OFF", "VOIDED"],
  PARTIALLY_PAID: ["PAID", "OVERDUE", "WRITTEN_OFF"],
  PAID: [],
  OVERDUE: ["PARTIALLY_PAID", "PAID", "WRITTEN_OFF"],
  WRITTEN_OFF: [],
  VOIDED: [],
};

export const INCOMING_RECEIPT_TRANSITIONS: Record<
  IncomingReceiptStatus,
  readonly IncomingReceiptStatus[]
> = {
  SUBMITTED: ["AR_VERIFIED", "REJECTED"],
  AR_VERIFIED: ["TREASURY_VALIDATED", "REJECTED"],
  TREASURY_VALIDATED: ["POSTED", "REJECTED"],
  POSTED: [],
  REJECTED: [],
};

export const RETURN_CLAIM_TRANSITIONS: Record<
  ReturnClaimStatus,
  readonly ReturnClaimStatus[]
> = {
  CLAIMED: ["INSPECTED", "REJECTED"],
  INSPECTED: ["CREDIT_APPROVED", "REJECTED"],
  CREDIT_APPROVED: ["COMPLETED"],
  COMPLETED: [],
  REJECTED: [],
};

export const WRITE_OFF_TRANSITIONS: Record<
  WriteOffStatus,
  readonly WriteOffStatus[]
> = {
  PENDING_FAM_APPROVAL: ["APPROVED", "REJECTED"],
  APPROVED: ["POSTED"],
  POSTED: [],
  REJECTED: [],
};

// ============================================================================
// 6. ERROR CLASSES
// ============================================================================

export class InsufficientStockError extends Error {
  constructor(materialId: string, requested: string, available: string) {
    super(
      `Insufficient available stock for material ${materialId}. Requested: ${requested}, Available: ${available}.`,
    );
    this.name = "InsufficientStockError";
  }
}

export class CreditLimitExceededError extends Error {
  constructor(customerId: string, orderTotal: number, availableCredit: number) {
    super(
      `Credit limit exceeded for customer ${customerId}. Order total: Rp${(orderTotal / 100).toLocaleString()}, Available credit: Rp${(availableCredit / 100).toLocaleString()}.`,
    );
    this.name = "CreditLimitExceededError";
  }
}

export class CreditAccountSuspendedError extends Error {
  constructor(customerId: string, status: string) {
    super(`Customer ${customerId} credit account is not active (current status: ${status}).`);
    this.name = "CreditAccountSuspendedError";
  }
}

export class SignedEvidenceRequiredError extends Error {
  constructor(deliveryOrderId: string) {
    super(
      `Customer invoice cannot be issued without verified signed delivery order evidence for DO ${deliveryOrderId}.`,
    );
    this.name = "SignedEvidenceRequiredError";
  }
}

export class InvalidRevenueStatusTransitionError extends Error {
  constructor(entityName: string, currentStatus: string, targetStatus: string) {
    super(
      `Invalid ${entityName} status transition from ${currentStatus} to ${targetStatus}.`,
    );
    this.name = "InvalidRevenueStatusTransitionError";
  }
}

export class PaymentOverAllocationError extends Error {
  constructor(receiptAmount: number, allocatedAmount: number) {
    super(
      `Allocated amount (Rp${(allocatedAmount / 100).toLocaleString()}) cannot exceed receipt amount (Rp${(receiptAmount / 100).toLocaleString()}).`,
    );
    this.name = "PaymentOverAllocationError";
  }
}
