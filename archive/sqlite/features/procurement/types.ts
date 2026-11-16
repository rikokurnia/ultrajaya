import { z } from "zod";
import {
  idSchema,
  moneySchema,
  quantitySchema,
  type MaterialRequest,
  type PurchaseOrder,
  type Quotation,
  type Rfq,
  type Supplier as BaseSupplier,
  type SupplierEvaluation,
} from "@/shared/contracts/domain";

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must follow YYYY-MM-DD format.");

export const materialLineInputSchema = z.object({
  id: idSchema.optional(),
  materialId: idSchema,
  quantity: quantitySchema,
  unit: z.enum(["L", "kg", "pcs"] as const),
});

export const priceLineInputSchema = z.object({
  id: idSchema.optional(),
  materialId: idSchema,
  quantity: quantitySchema,
  unit: z.enum(["L", "kg", "pcs"] as const),
  unitPrice: moneySchema,
});

export const createRequestSchema = z.object({
  warehouseId: idSchema,
  productionReference: z.string().min(1).max(100),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"] as const).default("NORMAL"),
  requiredOn: dateStringSchema,
  purpose: z.string().min(1).max(500),
  lines: z.array(materialLineInputSchema).min(1, "At least one material line is required."),
});

export const verifyRequestSchema = z.object({
  outcome: z.enum(["VERIFIED", "REJECTED"] as const),
  reason: z.string().min(1, "Verification explanation is required.").max(500),
  availableStock: quantitySchema,
});

export const createRfqSchema = z.object({
  requestIds: z.array(idSchema).min(1, "At least one request must be linked."),
  supplierIds: z.array(idSchema).min(1, "Select at least one supplier."),
  dueOn: dateStringSchema,
  lines: z.array(materialLineInputSchema).min(1).optional(),
});

export const recordQuotationSchema = z.object({
  rfqId: idSchema,
  supplierId: idSchema,
  validUntil: dateStringSchema,
  leadDays: z.number().int().min(0).max(365),
  lines: z.array(priceLineInputSchema).min(1, "At least one priced line item is required."),
});

export const evaluateSuppliersSchema = z.object({
  rfqId: idSchema,
  selectedQuotationId: idSchema,
  criteria: z.array(
    z.object({
      name: z.string().min(1),
      weight: z.number().min(1).max(100),
      scores: z.record(z.string(), z.number().min(0).max(100)),
    }),
  ).min(1),
  reason: z.string().min(1, "Selection rationale is required.").max(1000),
});

export const createOrderSchema = z.object({
  supplierId: idSchema,
  quotationId: idSchema.optional(),
  requestIds: z.array(idSchema).min(1, "At least one material request must be linked."),
  warehouseId: idSchema,
  deliveryTerms: z.string().min(1).max(100).default("Franco Gudang"),
  paymentTerms: z.string().min(1).max(100).default("Net 30 Days"),
  lines: z.array(priceLineInputSchema).min(1, "At least one purchase order line item is required."),
});

export const decideApprovalSchema = z.object({
  stepId: idSchema,
  decision: z.enum(["APPROVED", "REJECTED"] as const),
  reason: z.string().min(1, "Approval decision notes are required.").max(500),
});

export const issueOrderSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const supplierInputSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(150),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
  address: z.string().max(300).optional(),
  taxId: z.string().max(50).optional(),
  qualificationStatus: z.enum(["QUALIFIED", "PENDING", "EXPIRED"] as const).default("QUALIFIED"),
  legalDocValidUntil: dateStringSchema.optional(),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"] as const).default("LOW"),
  active: z.boolean().default(true),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type VerifyRequestInput = z.infer<typeof verifyRequestSchema>;
export type CreateRfqInput = z.infer<typeof createRfqSchema>;
export type RecordQuotationInput = z.infer<typeof recordQuotationSchema>;
export type EvaluateSuppliersInput = z.infer<typeof evaluateSuppliersSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type DecideApprovalInput = z.infer<typeof decideApprovalSchema>;
export type IssueOrderInput = z.infer<typeof issueOrderSchema>;
export type SupplierInput = z.infer<typeof supplierInputSchema>;

export interface ExtendedMaterialRequest extends MaterialRequest {
  productionReference?: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  creatorName?: string;
}

export interface ExtendedPurchaseOrder extends PurchaseOrder {
  deliveryTerms: string;
  paymentTerms: string;
  supplierName: string;
  approvalStage: string;
  issuedAt?: string;
  issuedBy?: string;
  issuedNotes?: string;
  creatorName?: string;
}

export interface RfqDetail extends Rfq {
  requests: ExtendedMaterialRequest[];
  suppliers: Supplier[];
  quotations: Quotation[];
  evaluation?: SupplierEvaluation;
}

export interface ExtendedSupplier extends BaseSupplier {
  phone?: string;
  address?: string;
  qualificationStatus?: "QUALIFIED" | "PENDING" | "EXPIRED";
  legalDocValidUntil?: string;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
  rating?: string;
}

export type Supplier = ExtendedSupplier;

