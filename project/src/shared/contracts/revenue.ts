import { z } from "zod";
import type {
  Entity,
  Document,
  DocumentReference,
  Id,
  Money,
  Quantity,
  Unit,
} from "./domain";
const idSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const moneySchema = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);

// ============================================================================
// 1. CUSTOMER & CREDIT CONTRACTS
// ============================================================================

export type CustomerCreditStatus =
  | "PENDING_ACTIVATION"
  | "ACTIVE"
  | "SUSPENDED"
  | "BLOCKED";

export interface CustomerCreditProfile {
  creditLimit: Money; // IDR minor units
  paymentTermDays: number; // e.g. 30, 45, 60 days
  status: CustomerCreditStatus;
  utilizedCredit: Money;
  availableCredit: Money;
  activatedBy?: Id;
  activatedAt?: string;
  notes?: string;
}

export interface Customer extends Entity {
  code: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  taxId?: string; // NPWP
  creditProfile: CustomerCreditProfile;
  active: boolean;
}

export const customerInputSchema = z.object({
  code: z.string().trim().min(2).max(50),
  name: z.string().trim().min(2).max(150),
  email: z.string().email().max(254),
  phone: z.string().trim().max(50).optional(),
  address: z.string().trim().max(500).optional(),
  taxId: z.string().trim().max(50).optional(),
});

export const creditActivationSchema = z.object({
  customerId: idSchema,
  creditLimit: moneySchema,
  paymentTermDays: z.number().int().min(0).max(365),
  status: z.enum(["ACTIVE", "SUSPENDED", "BLOCKED"]),
  notes: z.string().trim().max(500).optional(),
});

// ============================================================================
// 2. SALES ORDER & LINES
// ============================================================================

export type SalesOrderStatus =
  | "DRAFT"
  | "PENDING_VALIDATION"
  | "PENDING_STOCK_VERIFICATION"
  | "PENDING_CREDIT_APPROVAL"
  | "APPROVED"
  | "PARTIALLY_DISPATCHED"
  | "DISPATCHED"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export interface SalesOrderLine {
  id: Id;
  salesOrderId: Id;
  materialId: Id;
  quantity: Quantity;
  unit: Unit;
  unitPrice: Money;
  discountBps: number; // basis points (100 bps = 1%)
  total: Money;
  reservedQuantity: Quantity;
  dispatchedQuantity: Quantity;
  returnedQuantity: Quantity;
}

export interface SalesOrderValidation {
  validatedBy: Id;
  validatedAt: string;
  discountApprovedBy?: Id;
  discountApprovedAt?: string;
  notes?: string;
}

export interface SalesOrderCreditApproval {
  creditManagerId: Id;
  decidedAt: string;
  outcome: "APPROVED" | "REJECTED";
  reason?: string;
}

export interface SalesOrder extends Document {
  customerId: Id;
  warehouseId: Id;
  orderDate: string; // YYYY-MM-DD
  deliveryAddress: string;
  lines: SalesOrderLine[];
  subtotal: Money;
  discountTotal: Money;
  taxTotal: Money;
  total: Money;
  status: SalesOrderStatus;
  validation?: SalesOrderValidation;
  stockVerification?: StockVerificationResult;
  creditApproval?: SalesOrderCreditApproval;
}

// ============================================================================
// 3. STOCK VERIFICATION & RESERVATION (Finance <-> Inventory)
// ============================================================================

export type StockReservationStatus = "ACTIVE" | "CONSUMED" | "RELEASED";

export interface StockReservation extends Entity {
  salesOrderId: Id;
  salesOrderLineId: Id;
  warehouseId: Id;
  materialId: Id;
  quantity: Quantity;
  status: StockReservationStatus;
  expiresAt: string;
}

export interface StockVerificationItemResult {
  materialId: Id;
  requestedQuantity: Quantity;
  availableStock: Quantity;
  sufficient: boolean;
  reservationId?: Id;
}

export interface StockVerificationResult {
  verifiedBy: Id;
  verifiedAt: string;
  outcome: "SUFFICIENT" | "INSUFFICIENT";
  items: StockVerificationItemResult[];
  reason?: string;
}

// ============================================================================
// 4. DELIVERY ORDER & SIGNED EVIDENCE (Inventory -> Finance)
// ============================================================================

export type DeliveryOrderStatus =
  | "DRAFT"
  | "PICKED"
  | "DISPATCHED"
  | "DELIVERED"
  | "RETURNED_PARTIAL";

export interface DeliveryOrderLine {
  id: Id;
  deliveryOrderId: Id;
  salesOrderLineId: Id;
  materialId: Id;
  quantity: Quantity;
  unit: Unit;
  batch?: string;
}

export interface SignedDeliveryEvidence {
  recipientName: string;
  recipientPhone?: string;
  receivedAt: string; // ISO 8601 UTC
  evidenceRef: string; // Document / receipt URI or physical slip ID
  verifiedByWarehouse: Id;
  verifiedAt: string;
  notes?: string;
}

export interface DeliveryOrder extends Document {
  salesOrderId: Id;
  customerId: Id;
  warehouseId: Id;
  dispatchedAt: string;
  dispatchedBy: Id;
  status: DeliveryOrderStatus;
  lines: DeliveryOrderLine[];
  signedEvidence?: SignedDeliveryEvidence;
}

// ============================================================================
// 5. CUSTOMER INVOICE & RECEIVABLES (AR)
// ============================================================================

export type CustomerInvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "WRITTEN_OFF"
  | "VOIDED";

export interface CustomerInvoiceLine {
  id: Id;
  customerInvoiceId: Id;
  salesOrderLineId: Id;
  deliveryOrderLineId: Id;
  materialId: Id;
  quantity: Quantity;
  unit: Unit;
  unitPrice: Money;
  total: Money;
}

export interface CustomerInvoice extends Document {
  customerId: Id;
  salesOrderId: Id;
  deliveryOrderId: Id;
  issuedOn: string; // YYYY-MM-DD
  dueOn: string; // YYYY-MM-DD
  lines: CustomerInvoiceLine[];
  subtotal: Money;
  taxTotal: Money;
  total: Money;
  status: CustomerInvoiceStatus;
  signedDoVerified: boolean;
}

export type AgingBucket = "CURRENT" | "1_30" | "31_60" | "61_90" | "90_PLUS";

export interface ReceivableBalance {
  customerInvoiceId: Id;
  customerId: Id;
  total: Money;
  received: Money;
  credited: Money; // Credit note deductions
  writtenOff: Money; // Bad debt write-offs
  outstanding: Money;
  asOf: string;
  dueOn: string;
  agingBucket: AgingBucket;
}

// ============================================================================
// 6. INCOMING RECEIPTS & ALLOCATION (AR & Treasury)
// ============================================================================

export type IncomingReceiptStatus =
  | "SUBMITTED"
  | "AR_VERIFIED"
  | "TREASURY_VALIDATED"
  | "POSTED"
  | "REJECTED";

export interface IncomingReceiptAllocation {
  id: Id;
  receiptId: Id;
  customerInvoiceId: Id;
  amount: Money;
}

export interface IncomingReceipt extends Document {
  customerId: Id;
  receivedOn: string; // YYYY-MM-DD
  bankReference: string;
  paymentMethod: "BANK_TRANSFER" | "CASH" | "GIRO";
  amount: Money;
  evidenceRef?: string; // Payment slip reference submitted to AR
  arVerifiedBy?: Id;
  arVerifiedAt?: string;
  treasuryValidatedBy?: Id;
  treasuryValidatedAt?: string;
  status: IncomingReceiptStatus;
  allocations: IncomingReceiptAllocation[];
}

// ============================================================================
// 7. RETURN CLAIMS & INSPECTIONS (AR / Warehouse / QC)
// ============================================================================

export type ReturnClaimStatus =
  | "CLAIMED"
  | "INSPECTED"
  | "CREDIT_APPROVED"
  | "COMPLETED"
  | "REJECTED";

export interface ReturnClaimLine {
  id: Id;
  returnClaimId: Id;
  deliveryOrderLineId: Id;
  customerInvoiceLineId?: Id;
  materialId: Id;
  claimedQuantity: Quantity;
  unit: Unit;
  reason: string;
}

export interface ReturnInspectionResult {
  inspectorId: Id; // Warehouse or QC
  inspectedAt: string;
  acceptedQuantity: Quantity; // Restocked into warehouse
  rejectedQuantity: Quantity; // Scrapped / rejected
  finding:
    | "DAMAGED_IN_TRANSIT"
    | "WRONG_ITEM"
    | "EXPIRED"
    | "CUSTOMER_REJECT"
    | "DEFECT_FREE";
  restockWarehouseId?: Id;
  notes?: string;
}

export interface ReturnClaim extends Document {
  customerId: Id;
  salesOrderId: Id;
  deliveryOrderId: Id;
  claimedAt: string;
  reason: string;
  lines: ReturnClaimLine[];
  inspection?: ReturnInspectionResult;
  status: ReturnClaimStatus;
}

// ============================================================================
// 8. CREDIT NOTE (Credit Manager / FAM)
// ============================================================================

export type CreditNoteStatus = "DRAFT" | "APPROVED" | "POSTED" | "VOIDED";

export interface CreditNoteLine {
  id: Id;
  creditNoteId: Id;
  customerInvoiceLineId?: Id;
  returnClaimLineId?: Id;
  materialId: Id;
  quantity: Quantity;
  amount: Money;
}

export interface CreditNote extends Document {
  customerId: Id;
  customerInvoiceId: Id;
  returnClaimId?: Id;
  issuedOn: string; // YYYY-MM-DD
  amount: Money;
  reason: string;
  approvedBy: Id; // Credit Manager or FAM
  status: CreditNoteStatus;
  lines: CreditNoteLine[];
}

// ============================================================================
// 9. BAD DEBT WRITE-OFF (AR recommendation -> FAM approval)
// ============================================================================

export type WriteOffStatus =
  | "PENDING_FAM_APPROVAL"
  | "APPROVED"
  | "POSTED"
  | "REJECTED";

export interface BadDebtWriteOff extends Document {
  customerId: Id;
  customerInvoiceId: Id;
  amount: Money;
  reason: string;
  arRecommendedBy: Id;
  arRecommendedAt: string;
  famApprovedBy?: Id;
  famApprovedAt?: string;
  status: WriteOffStatus;
}

// ============================================================================
// 10. BANK RECONCILIATION (Accounting preparation -> FAM approval)
// ============================================================================

export type BankReconciliationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "FAM_APPROVED"
  | "REJECTED";

export interface BankStatementLine {
  id: Id;
  transactionDate: string; // YYYY-MM-DD
  reference: string;
  description: string;
  amount: Money;
  type: "DEPOSIT" | "WITHDRAWAL";
  matchedDocumentRef?: DocumentReference;
}

export interface BankReconciliation extends Document {
  accountId: Id; // Cash/Bank GL Account
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  statementOpeningBalance: Money;
  statementClosingBalance: Money;
  bookClosingBalance: Money;
  reconciledBalance: Money;
  unreconciledDifference: Money;
  status: BankReconciliationStatus;
  preparedBy: Id; // Accounting
  approvedBy?: Id; // FAM
  approvedAt?: string;
  matchedTransactionsCount: number;
  unmatchedTransactionsCount: number;
}
