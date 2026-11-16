import { z } from "zod";
export const idSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const moneySchema = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);
export const quantitySchema = z
  .string()
  .regex(
    /^(0|[1-9]\d*)(\.\d{1,3})?$/,
    "Use a nonnegative decimal with up to three places.",
  );
export const instantSchema = z.iso.datetime();
export type Id = string;
/** IDR minor units, integer; divide by 100 for rupiah. All calculations must remain safe integers. */
export type Money = z.infer<typeof moneySchema>;
/** Exact decimal string, up to 3 places. Services use scaled integers/decimal arithmetic, never float totals. */
export type Quantity = z.infer<typeof quantitySchema>;
export type Unit = "L" | "kg" | "pcs";
export interface Entity {
  id: Id;
  createdAt: string;
  updatedAt: string;
  version: number;
}
export type DocumentType =
  | "FPBB"
  | "RFQ"
  | "QUOTE"
  | "EVAL"
  | "PO"
  | "GRN"
  | "QC"
  | "INV"
  | "PAY"
  | "JRN"
  | "SO"
  | "DO"
  | "CINV"
  | "ARINV"
  | "RCPT"
  | "RET"
  | "CN"
  | "CRN"
  | "WROFF"
  | "WRO"
  | "BREC";
export interface DocumentReference {
  type: DocumentType;
  id: Id;
  number: string;
}
export interface Document extends Entity {
  number: string;
  createdBy: Id;
  references: DocumentReference[];
}
export interface Material extends Entity {
  code: string;
  name: string;
  unit: Unit;
  minimum: Quantity;
  active: boolean;
}
export interface Warehouse extends Entity {
  code: string;
  name: string;
  active: boolean;
}
export interface Supplier extends Entity {
  code: string;
  name: string;
  email: string;
  active: boolean;
  taxId?: string;
}
export interface MaterialLine {
  id: Id;
  materialId: Id;
  quantity: Quantity;
  unit: Unit;
}
export type RequestStatus =
  "DRAFT" | "SUBMITTED" | "VERIFIED" | "REJECTED" | "CANCELLED";
export interface MaterialRequest extends Document {
  warehouseId: Id;
  requiredOn: string;
  purpose: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: RequestStatus;
  lines: MaterialLine[];
  verification?: VerificationResult;
}
export interface VerificationResult {
  verifiedBy: Id;
  verifiedAt: string;
  outcome: "VERIFIED" | "REJECTED";
  reason: string;
  availableStock: Quantity;
}
export interface Rfq extends Document {
  requestIds: Id[];
  supplierIds: Id[];
  dueOn: string;
  lines: MaterialLine[];
  status: "DRAFT" | "SENT" | "CLOSED" | "CANCELLED";
}
export interface PriceLine extends MaterialLine {
  unitPrice: Money;
  total: Money;
}
export interface Quotation extends Document {
  rfqId: Id;
  supplierId: Id;
  validUntil: string;
  leadDays: number;
  lines: PriceLine[];
  total: Money;
  status: "RECEIVED" | "EVALUATED" | "WITHDRAWN";
}
export interface SupplierEvaluation extends Document {
  rfqId: Id;
  quotationIds: Id[];
  selectedQuotationId: Id;
  criteria: { name: string; weight: number; scores: Record<Id, number> }[];
  reason: string;
  status: "DRAFT" | "FINAL";
}
export type OrderStatus =
  | "DRAFT"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "OPEN"
  | "PARTIALLY_RECEIVED"
  | "CLOSED"
  | "REJECTED"
  | "CANCELLED";
export interface PurchaseOrder extends Document {
  supplierId: Id;
  requestIds: Id[];
  quotationId: Id;
  warehouseId: Id;
  revision: number;
  status: OrderStatus;
  lines: PriceLine[];
  total: Money;
  approvalSteps: ApprovalStep[];
  issuedAt?: string;
  issuedBy?: Id;
}
export interface ApprovalStep {
  id: Id;
  sequence: number;
  assignedUserId: Id;
  authorityPolicyId: Id;
  title?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  decision?: ApprovalDecision;
}
export interface ApprovalDecision {
  id: Id;
  stepId: Id;
  actorId: Id;
  decidedAt: string;
  decision: "APPROVED" | "REJECTED";
  reason: string;
  documentRevision: number;
}
export interface ReceiptLine extends MaterialLine {
  purchaseOrderLineId: Id;
  batch: string;
  location: string;
  receivedQuantity: Quantity;
}
export interface GoodsReceipt extends Document {
  purchaseOrderId: Id;
  warehouseId: Id;
  supplierDeliveryNumber: string;
  receivedAt: string;
  status: "RECORDED" | "PARTIALLY_INSPECTED" | "INSPECTED";
  lines: ReceiptLine[];
}
export interface QcResult extends Document {
  goodsReceiptId: Id;
  receiptLineId: Id;
  inspectorId: Id;
  inspectedAt: string;
  accepted: Quantity;
  held: Quantity;
  rejected: Quantity;
  tests: {
    name: string;
    result: string;
    outcome: "ACCEPTED" | "HELD" | "REJECTED";
  }[];
  status: "PENDING" | "HELD" | "COMPLETED";
}
export interface StockBalance {
  materialId: Id;
  warehouseId: Id;
  physical: Quantity;
  qcHeld: Quantity;
  rejected: Quantity;
  reserved: Quantity;
  available: Quantity;
  asOf: string;
}
export interface InvoiceLine extends PriceLine {
  purchaseOrderLineId: Id;
  receiptLineIds: Id[];
}
export interface Invoice extends Document {
  supplierId: Id;
  supplierInvoiceNumber: string;
  purchaseOrderId: Id;
  receiptIds: Id[];
  issuedOn: string;
  dueOn: string;
  lines: InvoiceLine[];
  total: Money;
  status: "DRAFT" | "MATCHING" | "HELD" | "MATCHED" | "POSTED" | "VOIDED";
  match?: MatchingResult;
}
export interface MatchingResult {
  id: Id;
  invoiceId: Id;
  matchedBy: Id;
  matchedAt: string;
  policyId: Id;
  status: "MATCHED" | "HELD";
  eligible: Money;
  held: Money;
  checks: { code: string; outcome: "PASS" | "HOLD"; reason: string }[];
}
export interface PayableBalance {
  invoiceId: Id;
  recognized: Money;
  paid: Money;
  outstanding: Money;
  held: Money;
  eligibleUnpaid: Money;
  asOf: string;
}
export interface Payment extends Document {
  paidOn: string;
  bankReference: string;
  method: "BANK_TRANSFER" | "GIRO" | "CASH";
  amount: Money;
  status: "DRAFT" | "AUTHORIZED" | "POSTED" | "REVERSED";
  allocations: PaymentAllocation[];
  reversalOf?: Id;
}
export interface PaymentAllocation {
  id: Id;
  paymentId: Id;
  invoiceId: Id;
  amount: Money;
}
export interface JournalLine {
  id: Id;
  accountId: Id;
  debit: Money;
  credit: Money;
  description: string;
  document?: DocumentReference;
}
export interface JournalEntry extends Document {
  postingDate: string;
  status: "DRAFT" | "REVIEWED" | "POSTED" | "REVERSED";
  lines: JournalLine[];
  postedBy?: Id;
  postedAt?: string;
  reversalOf?: Id;
  description?: string;
}
export interface Account extends Entity {
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  active: boolean;
}
export interface AuditEvent {
  readonly id: Id;
  readonly actorId: Id;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: Id;
  readonly occurredAt: string;
  readonly details: Readonly<Record<string, unknown>>;
}

/* Revenue Cycle Contracts */

export interface Customer extends Entity {
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId?: string;
  creditLimit: Money;
  creditTermsDays: number;
  creditStatus: "ACTIVE" | "BLOCKED" | "PENDING_REVIEW";
  active: boolean;
}

export interface CreditDecision extends Entity {
  customerId: Id;
  decisionType: "ACTIVATE" | "SET_LIMIT" | "SUSPEND" | "OVERRIDE";
  limitAmount: Money;
  reason: string;
  decidedBy: Id;
  decidedAt: string;
}

export interface SalesOrderLine {
  id: Id;
  salesOrderId: Id;
  itemCode: string;
  itemName: string;
  quantity: Quantity;
  unit: Unit;
  unitPrice: Money;
  total: Money;
}

export type SalesOrderStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "STOCK_VERIFIED"
  | "CREDIT_APPROVED"
  | "RELEASED"
  | "DELIVERED"
  | "INVOICED"
  | "CANCELLED"
  | "REJECTED";

export interface SalesOrder extends Document {
  customerId: Id;
  orderDate: string;
  status: SalesOrderStatus;
  lines: SalesOrderLine[];
  subtotal: Money;
  discountRate: number;
  discountAmount: Money;
  taxAmount: Money;
  total: Money;
  specialDiscountApproved: boolean;
  specialDiscountApprovedBy?: Id;
  specialDiscountApprovedAt?: string;
  stockVerified: boolean;
  stockVerifiedBy?: Id;
  stockVerifiedAt?: string;
  stockNotes?: string;
  creditApproved: boolean;
  creditApprovedBy?: Id;
  creditApprovedAt?: string;
  creditExposureAtApproval?: Money;
}

export interface DeliveryEvidence extends Entity {
  salesOrderId: Id;
  deliveryOrderNumber: string;
  deliveredQuantity: Quantity;
  recipientName: string;
  signedAt: string;
  signedDoRef: string;
  verifiedBy: Id;
  verifiedAt: string;
  notes?: string;
}

export interface CustomerInvoiceLine {
  id: Id;
  customerInvoiceId: Id;
  salesOrderLineId: Id;
  description: string;
  quantity: Quantity;
  unit: Unit;
  unitPrice: Money;
  total: Money;
}

export type CustomerInvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "WRITTEN_OFF"
  | "VOIDED";

export interface CustomerInvoice extends Document {
  customerId: Id;
  salesOrderId: Id;
  deliveryEvidenceId?: Id;
  issuedOn: string;
  dueOn: string;
  lines: CustomerInvoiceLine[];
  subtotal: Money;
  taxAmount: Money;
  total: Money;
  paidAmount: Money;
  outstandingBalance: Money;
  status: CustomerInvoiceStatus;
  eFakturNumber?: string;
  eFakturStatus: "DRAFT" | "EXPORTED" | "SIMULATED";
}

export interface CustomerReceipt extends Document {
  customerId: Id;
  receivedOn: string;
  bankReference: string;
  paymentMethod: "BANK_TRANSFER" | "GIRO";
  amount: Money;
  allocatedAmount: Money;
  unallocatedAmount: Money;
  status: "RECORDED" | "TREASURY_VALIDATED" | "SETTLED" | "REVERSED";
  bankEvidenceRef?: string;
  treasuryValidatedBy?: Id;
  treasuryValidatedAt?: string;
  allocations: CustomerReceiptAllocation[];
}

export interface CustomerReceiptAllocation {
  id: Id;
  receiptId: Id;
  customerInvoiceId: Id;
  amount: Money;
  createdAt: string;
}

export interface ReturnClaim extends Document {
  customerId: Id;
  customerInvoiceId: Id;
  claimDate: string;
  reason: string;
  completenessChecked: boolean;
  completenessCheckedBy?: Id;
  physicalInspectionStatus: "PENDING" | "ACCEPTED" | "REJECTED";
  acceptedQuantity?: Quantity;
  physicalInspectedBy?: Id;
  inspectionNotes?: string;
  famAuthorized: boolean;
  famAuthorizedBy?: Id;
  famAuthorizedAt?: string;
  status:
    | "SUBMITTED"
    | "VERIFIED"
    | "INSPECTED"
    | "AUTHORIZED"
    | "CREDIT_NOTE_ISSUED"
    | "REJECTED";
  creditNoteId?: Id;
}

export interface CreditNote extends Document {
  customerId: Id;
  returnClaimId: Id;
  customerInvoiceId: Id;
  amount: Money;
  status: "ISSUED" | "APPLIED" | "VOIDED";
  issuedBy: Id;
  issuedAt: string;
}

export interface WriteOffRequest extends Document {
  customerId: Id;
  customerInvoiceId: Id;
  amount: Money;
  reason: string;
  submittedBy: Id;
  submittedAt: string;
  famAuthorized: boolean;
  famAuthorizedBy?: Id;
  famAuthorizedAt?: string;
  journalId?: Id;
  status: "PENDING" | "AUTHORIZED" | "RECORDED" | "REJECTED";
}

export interface BankReconciliation extends Document {
  periodMonth: string;
  statementBalance: Money;
  bookBalance: Money;
  unreconciledDifference: Money;
  status: "DRAFT" | "PREPARED" | "FAM_APPROVED" | "REJECTED";
  preparedBy?: Id;
  preparedAt?: string;
  famApprovedBy?: Id;
  famApprovedAt?: string;
  notes?: string;
  items: BankReconciliationItem[];
}

export interface BankReconciliationItem extends Entity {
  reconciliationId: Id;
  transactionType:
    | "DEPOSIT_IN_TRANSIT"
    | "OUTSTANDING_CHECK"
    | "BANK_FEE"
    | "INTEREST"
    | "RECEIPT"
    | "PAYMENT";
  reference: string;
  amount: Money;
  matched: boolean;
  details: string;
}

export interface ArAgingReport {
  customerId: Id;
  customerCode: string;
  customerName: string;
  creditLimit: Money;
  totalOutstanding: Money;
  current: Money;
  days1To30: Money;
  days31To60: Money;
  days61To90: Money;
  days90Plus: Money;
  invoiceCount: number;
}

export interface RevenueSummaryReport {
  period: string;
  grossRevenue: Money;
  discounts: Money;
  creditNotes: Money;
  badDebtWriteOffs: Money;
  netRevenue: Money;
  orderCount: number;
  invoiceCount: number;
}

export interface BankReconciliationSummary {
  period: string;
  statementBalance: Money;
  bookBalance: Money;
  unreconciledDifference: Money;
  status: string;
  isBalanced: boolean;
  itemCount: number;
}

// Additive revenue contracts re-export
export * from "./revenue";

