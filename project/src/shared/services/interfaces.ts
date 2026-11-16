import type { Actor } from "../contracts/auth";
import type {
  MaterialRequest,
  Rfq,
  Quotation,
  SupplierEvaluation,
  PurchaseOrder,
  ApprovalDecision,
  GoodsReceipt,
  QcResult,
  StockBalance,
  Invoice,
  MatchingResult,
  PayableBalance,
  Payment,
  JournalEntry,
  AuditEvent,
  Id,
} from "../contracts/domain";
/** Interfaces only. No business services are implemented by Agent 1. Actor must come from requirePermission, never request JSON. */
export interface Page<T> {
  items: T[];
  total: number;
  cursor?: string;
}
export interface Query {
  cursor?: string;
  limit?: number;
  search?: string;
}
export interface MutationContext {
  actor: Actor;
  expectedVersion: number;
  idempotencyKey: string;
}
/** Internal repositories are module-owned, server-only, called only after service authorization. */
export interface Repository<T extends { id: Id }> {
  find(id: Id): Promise<T | null>;
  list(query: Query): Promise<Page<T>>;
  insert(entity: T): Promise<void>;
  update(entity: T, expectedVersion: number): Promise<void>;
}
export interface ProcurementService {
  createRequest(
    context: MutationContext,
    input: unknown,
  ): Promise<MaterialRequest>;
  verifyRequest(
    context: MutationContext,
    id: Id,
    input: unknown,
  ): Promise<MaterialRequest>;
  createRfq(context: MutationContext, input: unknown): Promise<Rfq>;
  recordQuotation(context: MutationContext, input: unknown): Promise<Quotation>;
  evaluateSuppliers(
    context: MutationContext,
    input: unknown,
  ): Promise<SupplierEvaluation>;
  createOrder(context: MutationContext, input: unknown): Promise<PurchaseOrder>;
  decideApproval(
    context: MutationContext,
    orderId: Id,
    input: unknown,
  ): Promise<ApprovalDecision>;
  getOrder(actor: Actor, id: Id): Promise<PurchaseOrder | null>;
}
export interface InventoryService {
  stock(actor: Actor, warehouseId: Id): Promise<StockBalance[]>;
  receive(context: MutationContext, input: unknown): Promise<GoodsReceipt>;
  inspect(context: MutationContext, input: unknown): Promise<QcResult>;
  eligibleReceiptQuantity(actor: Actor, orderLineId: Id): Promise<string>;
}
export interface FinanceService {
  recordInvoice(context: MutationContext, input: unknown): Promise<Invoice>;
  matchInvoice(context: MutationContext, id: Id): Promise<MatchingResult>;
  payables(actor: Actor, query: Query): Promise<Page<PayableBalance>>;
  recordPayment(context: MutationContext, input: unknown): Promise<Payment>;
  postJournal(context: MutationContext, id: Id): Promise<JournalEntry>;
}
export interface AuditReader {
  list(
    actor: Actor,
    query: Query & { entityId?: Id },
  ): Promise<Page<AuditEvent>>;
}
export class ModuleNotImplementedError extends Error {
  constructor(module: string) {
    super(`${module} service is not implemented yet.`);
  }
}

// Re-export additive revenue interfaces and error classes
export * from "./revenue-interfaces";

