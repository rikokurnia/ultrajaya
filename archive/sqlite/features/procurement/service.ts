import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { audit } from "@/server/auth-service";
import { nextDocumentNumber } from "@/server/document-number";
import {
  authorize,
  can,
  notCreator,
  AccessError,
} from "@/lib/auth/permissions";
import type { Actor } from "@/shared/contracts/auth";
import type {
  Id,
  MaterialRequest,
  PurchaseOrder,
  ApprovalDecision,
  ApprovalStep,
  Rfq,
  Quotation,
  SupplierEvaluation,
  PriceLine,
  MaterialLine,
  RequestStatus,
  OrderStatus,
} from "@/shared/contracts/domain";
import type {
  ProcurementService,
  MutationContext,
  Page,
  Query,
} from "@/shared/services/interfaces";
import {
  type Supplier,
  createRequestSchema,
  verifyRequestSchema,
  createRfqSchema,
  recordQuotationSchema,
  evaluateSuppliersSchema,
  createOrderSchema,
  decideApprovalSchema,
  issueOrderSchema,
  supplierInputSchema,
  type ExtendedMaterialRequest,
  type ExtendedPurchaseOrder,
  type RfqDetail,
} from "./types";
import {
  DEMO_POLICIES,
  getRequiredApprovalSteps,
} from "./policies";
import { exactQuantity } from "../dashboard/metrics";

interface SupplierDbRow {
  id: string;
  code: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  tax_id?: string | null;
  rating?: number | null;
  qualification_status: "QUALIFIED" | "PENDING" | "EXPIRED";
  legal_doc_valid_until?: string | null;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  active: number;
  created_at: string;
  updated_at: string;
  version: number;
}

interface MaterialRequestDbRow {
  id: string;
  number: string;
  warehouseId: string;
  productionReference: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  requiredOn: string;
  purpose: string;
  status: RequestStatus;
  revision: number;
  createdBy: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  verificationOutcome: string | null;
  verificationReason: string | null;
  verificationStock: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  creatorName: string | null;
}

interface RfqDbRow {
  id: string;
  number: string;
  dueOn: string;
  status: "OPEN" | "CLOSED" | "CANCELLED";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

interface QuotationDbRow {
  id: string;
  number: string;
  rfq_id?: string;
  supplier_id?: string;
  supplierId: string;
  validUntil: string;
  leadDays: number;
  total: number;
  status: "SUBMITTED" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

interface EvaluationDbRow {
  id: string;
  number: string;
  selectedQuotationId: string;
  criteriaJson: string;
  reason: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

interface PurchaseOrderDbRow {
  id: string;
  number: string;
  supplier_id: string;
  warehouse_id: string;
  rfq_id?: string | null;
  quotation_id?: string | null;
  delivery_terms?: string | null;
  payment_terms?: string | null;
  currency: string;
  total: number;
  status: OrderStatus;
  revision: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  version: number;
  issued_at?: string | null;
  issued_by?: string | null;
  supplierName?: string | null;
  supplierCode?: string | null;
  creatorName?: string | null;
  deliveryTerms?: string | null;
  paymentTerms?: string | null;
  quotationId?: string | null;
  issuedAt?: string | null;
  issuedBy?: string | null;
}

interface ApprovalStepDbRow {
  id: string;
  sequence: number;
  title: string;
  assignedUserId: string | null;
  assignedRole: string | null;
  authorityPolicyId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  decisionId: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionOutcome: "APPROVED" | "REJECTED" | null;
  decisionReason: string | null;
  documentRevision: number | null;
}

interface OrderLineWithPoRow {
  id: string;
  orderId: string;
  orderNumber: string;
  supplierId: string;
  warehouseId: string;
  materialId: string;
  quantity: string;
  unit: string;
  unitPrice: number;
  total: number;
}

/** Helper to compute line total from unit price (minor units) and decimal quantity string */
export function calculateLineTotal(unitPriceMinor: number, qtyStr: string): number {
  const scaledQty = exactQuantity(qtyStr);
  const totalMinorBig = (BigInt(unitPriceMinor) * scaledQty) / BigInt(1000);
  if (totalMinorBig > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Line total exceeds safe integer bounds.");
  }
  return Number(totalMinorBig);
}

/** Get current calendar day in Asia/Jakarta as YYYY-MM-DD */
export function getJakartaDate(at = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const get = (k: string) => parts.find((p) => p.type === k)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export class ProcurementDomainService implements ProcurementService {
  // =========================================================================
  // SUPPLIERS
  // =========================================================================

  async listSuppliers(actor: Actor, query: Query & { activeOnly?: boolean } = {}): Promise<Page<Supplier>> {
    authorize(actor, "suppliers:read");
    const sql = db();
    let whereClause = "WHERE 1=1";
    const params: unknown[] = [];

    if (query.activeOnly) {
      whereClause += " AND active = 1";
    }
    if (query.search) {
      whereClause += " AND (code LIKE ? OR name LIKE ? OR email LIKE ?)";
      const pattern = `%${query.search}%`;
      params.push(pattern, pattern, pattern);
    }

    const countRow = sql
      .prepare(`SELECT count(*) as total FROM suppliers ${whereClause}`)
      .get(...params) as { total: number };

    const limit = query.limit || 50;
    const rows = sql
      .prepare(
        `SELECT id, code, name, email, phone, address, tax_id, active, rating, qualification_status, legal_doc_valid_until, risk_level, created_at, updated_at, version FROM suppliers ${whereClause} ORDER BY name ASC LIMIT ?`,
      )
      .all(...params, limit) as SupplierDbRow[];

    return {
      items: rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        email: r.email,
        taxId: r.tax_id || undefined,
        active: !!r.active,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        version: r.version,
      })),
      total: countRow.total,
    };
  }

  async getSupplier(actor: Actor, id: Id): Promise<Supplier | null> {
    authorize(actor, "suppliers:read");
    const row = db()
      .prepare(
        "SELECT id, code, name, email, phone, address, tax_id, active, rating, qualification_status, legal_doc_valid_until, risk_level, created_at, updated_at, version FROM suppliers WHERE id = ?",
      )
      .get(id) as SupplierDbRow | undefined;

    if (!row) return null;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      email: row.email,
      taxId: row.tax_id || undefined,
      active: !!row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version,
    };
  }

  async createSupplier(context: MutationContext, input: unknown): Promise<Supplier> {
    authorize(context.actor, "suppliers:write");
    const parsed = supplierInputSchema.parse(input);
    const sql = db();
    const id = randomUUID();
    const now = new Date().toISOString();

    sql
      .prepare(
        `INSERT INTO suppliers (id, code, name, email, phone, address, tax_id, rating, qualification_status, legal_doc_valid_until, risk_level, active, created_at, updated_at, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, 5.0, ?, ?, ?, ?, ?, ?, 1)`,
      )
      .run(
        id,
        parsed.code,
        parsed.name,
        parsed.email,
        parsed.phone || null,
        parsed.address || null,
        parsed.taxId || null,
        parsed.qualificationStatus,
        parsed.legalDocValidUntil || null,
        parsed.riskLevel,
        parsed.active ? 1 : 0,
        now,
        now,
      );

    audit(context.actor, "supplier.created", "supplier", id, { code: parsed.code, name: parsed.name });

    return {
      id,
      code: parsed.code,
      name: parsed.name,
      email: parsed.email,
      taxId: parsed.taxId,
      active: parsed.active,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
  }

  // =========================================================================
  // MATERIAL REQUESTS (FPBB)
  // =========================================================================

  async listRequests(
    actor: Actor,
    query: Query & { status?: string; warehouseId?: string } = {},
  ): Promise<Page<ExtendedMaterialRequest>> {
    authorize(actor, "requests:read");
    const sql = db();
    let whereClause = "WHERE 1=1";
    const params: unknown[] = [];

    if (query.status && query.status !== "ALL") {
      whereClause += " AND r.status = ?";
      params.push(query.status);
    }
    if (query.warehouseId) {
      whereClause += " AND r.warehouse_id = ?";
      params.push(query.warehouseId);
    }
    if (query.search) {
      whereClause += " AND (r.number LIKE ? OR r.purpose LIKE ? OR r.production_reference LIKE ?)";
      const pattern = `%${query.search}%`;
      params.push(pattern, pattern, pattern);
    }

    const countRow = sql
      .prepare(`SELECT count(*) as total FROM material_requests r ${whereClause}`)
      .get(...params) as { total: number };

    const limit = query.limit || 50;
    const rows = sql
      .prepare(
        `SELECT r.id, r.number, r.warehouse_id as warehouseId, r.production_reference as productionReference,
                r.priority, r.required_on as requiredOn, r.purpose, r.status, r.created_by as createdBy,
                r.verified_by as verifiedBy, r.verified_at as verifiedAt, r.verification_outcome as verificationOutcome,
                r.verification_reason as verificationReason, r.verification_stock as verificationStock,
                r.created_at as createdAt, r.updated_at as updatedAt, r.version, u.name as creatorName
         FROM material_requests r
         LEFT JOIN users u ON u.id = r.created_by
         ${whereClause}
         ORDER BY r.created_at DESC
         LIMIT ?`,
      )
      .all(...params, limit) as MaterialRequestDbRow[];

    const items: ExtendedMaterialRequest[] = [];
    const getLinesStmt = sql.prepare(
      "SELECT id, material_id as materialId, quantity, unit FROM material_request_lines WHERE request_id = ?",
    );

    for (const r of rows) {
      const lines = getLinesStmt.all(r.id) as MaterialLine[];
      items.push({
        id: r.id,
        number: r.number,
        warehouseId: r.warehouseId,
        productionReference: r.productionReference,
        priority: r.priority,
        requiredOn: r.requiredOn,
        purpose: r.purpose,
        status: r.status as RequestStatus,
        createdBy: r.createdBy,
        creatorName: r.creatorName ?? undefined,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        version: r.version,
        references: [],
        lines,
        verification: r.verifiedBy
          ? {
              verifiedBy: r.verifiedBy,
              verifiedAt: r.verifiedAt ?? "",
              outcome: (r.verificationOutcome as "VERIFIED" | "REJECTED") ?? "VERIFIED",
              reason: r.verificationReason ?? "",
              availableStock: r.verificationStock ?? "0.000",
            }
          : undefined,
      });
    }

    return { items, total: countRow.total };
  }

  async getRequest(actor: Actor, id: Id): Promise<ExtendedMaterialRequest | null> {
    authorize(actor, "requests:read");
    const sql = db();
    const r = sql
      .prepare(
        `SELECT r.id, r.number, r.warehouse_id as warehouseId, r.production_reference as productionReference,
                r.priority, r.required_on as requiredOn, r.purpose, r.status, r.created_by as createdBy,
                r.verified_by as verifiedBy, r.verified_at as verifiedAt, r.verification_outcome as verificationOutcome,
                r.verification_reason as verificationReason, r.verification_stock as verificationStock,
                r.created_at as createdAt, r.updated_at as updatedAt, r.version, u.name as creatorName
         FROM material_requests r
         LEFT JOIN users u ON u.id = r.created_by
         WHERE r.id = ?`,
      )
      .get(id) as MaterialRequestDbRow | undefined;

    if (!r) return null;

    const lines = sql
      .prepare(
        "SELECT id, material_id as materialId, quantity, unit FROM material_request_lines WHERE request_id = ?",
      )
      .all(id) as MaterialLine[];

    return {
      id: r.id,
      number: r.number,
      warehouseId: r.warehouseId,
      productionReference: r.productionReference,
      priority: r.priority,
      requiredOn: r.requiredOn,
      purpose: r.purpose,
      status: r.status as RequestStatus,
      createdBy: r.createdBy,
      creatorName: r.creatorName ?? undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      version: r.version,
      references: [],
      lines,
      verification: r.verifiedBy
        ? {
            verifiedBy: r.verifiedBy,
            verifiedAt: r.verifiedAt ?? "",
            outcome: (r.verificationOutcome as "VERIFIED" | "REJECTED") ?? "VERIFIED",
            reason: r.verificationReason ?? "",
            availableStock: r.verificationStock ?? "0.000",
          }
        : undefined,
    };
  }

  async createRequest(context: MutationContext, input: unknown): Promise<MaterialRequest> {
    authorize(context.actor, "requests:write");
    const parsed = createRequestSchema.parse(input);
    const sql = db();

    return sql.transaction((): MaterialRequest => {
      const id = randomUUID();
      const number = nextDocumentNumber("FPBB");
      const now = new Date().toISOString();

      sql
        .prepare(
          `INSERT INTO material_requests (id, number, warehouse_id, production_reference, priority, required_on, purpose, status, created_by, created_at, updated_at, version)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?, ?, 1)`,
        )
        .run(
          id,
          number,
          parsed.warehouseId,
          parsed.productionReference,
          parsed.priority,
          parsed.requiredOn,
          parsed.purpose,
          context.actor.id,
          now,
          now,
        );

      const insertLineStmt = sql.prepare(
        "INSERT INTO material_request_lines (id, request_id, material_id, quantity, unit) VALUES (?, ?, ?, ?, ?)",
      );

      const lines: MaterialLine[] = [];
      for (const line of parsed.lines) {
        const lineId = line.id || randomUUID();
        insertLineStmt.run(lineId, id, line.materialId, line.quantity, line.unit);
        lines.push({
          id: lineId,
          materialId: line.materialId,
          quantity: line.quantity,
          unit: line.unit,
        });
      }

      audit(context.actor, "request.created", "material_request", id, {
        number,
        warehouseId: parsed.warehouseId,
        productionReference: parsed.productionReference,
        lineCount: lines.length,
      });

      return {
        id,
        number,
        warehouseId: parsed.warehouseId,
        requiredOn: parsed.requiredOn,
        purpose: parsed.purpose,
        status: "SUBMITTED" as RequestStatus,
        createdBy: context.actor.id,
        createdAt: now,
        updatedAt: now,
        version: 1,
        references: [],
        lines,
      };
    })();
  }

  async verifyRequest(context: MutationContext, id: Id, input: unknown): Promise<MaterialRequest> {
    authorize(context.actor, "requests:verify");
    const parsed = verifyRequestSchema.parse(input);
    const sql = db();

    sql.transaction(() => {
      const existing = sql
        .prepare("SELECT * FROM material_requests WHERE id = ?")
        .get(id) as { version: number; status: string; number: string } | undefined;

      if (!existing) throw new Error(`Material request ${id} not found.`);
      if (existing.version !== context.expectedVersion) {
        throw new Error(
          `Stale update rejected. Expected version ${context.expectedVersion}, found ${existing.version}.`,
        );
      }
      if (existing.status !== "SUBMITTED") {
        throw new Error(`Only SUBMITTED requests can be verified. Current status: ${existing.status}.`);
      }

      const now = new Date().toISOString();
      const newStatus = parsed.outcome === "VERIFIED" ? "VERIFIED" : "REJECTED";

      const res = sql
        .prepare(
          `UPDATE material_requests
           SET status = ?, verified_by = ?, verified_at = ?, verification_outcome = ?, verification_reason = ?, verification_stock = ?, updated_at = ?, version = version + 1
           WHERE id = ? AND version = ?`,
        )
        .run(
          newStatus,
          context.actor.id,
          now,
          parsed.outcome,
          parsed.reason,
          parsed.availableStock,
          now,
          id,
          context.expectedVersion,
        );

      if (res.changes === 0) {
        throw new Error("Concurrent update conflict during request verification.");
      }

      audit(context.actor, "request.verified", "material_request", id, {
        number: existing.number,
        outcome: parsed.outcome,
        reason: parsed.reason,
        availableStock: parsed.availableStock,
      });
    })();

    return (await this.getRequest(context.actor, id))!;
  }

  // =========================================================================
  // RFQs & QUOTATIONS
  // =========================================================================

  async listRfqs(actor: Actor, query: Query & { status?: string } = {}): Promise<Page<RfqDetail>> {
    authorize(actor, "rfqs:read");
    const sql = db();
    let whereClause = "WHERE 1=1";
    const params: unknown[] = [];

    if (query.status && query.status !== "ALL") {
      whereClause += " AND status = ?";
      params.push(query.status);
    }
    if (query.search) {
      whereClause += " AND number LIKE ?";
      params.push(`%${query.search}%`);
    }

    const countRow = sql
      .prepare(`SELECT count(*) as total FROM rfqs ${whereClause}`)
      .get(...params) as { total: number };

    const limit = query.limit || 50;
    const rfqRows = sql
      .prepare(
        `SELECT id, number, due_on as dueOn, status, created_by as createdBy, created_at as createdAt, updated_at as updatedAt, version
         FROM rfqs ${whereClause} ORDER BY created_at DESC LIMIT ?`,
      )
      .all(...params, limit) as RfqDbRow[];

    const items: RfqDetail[] = [];
    for (const r of rfqRows) {
      const detail = await this.getRfq(actor, r.id);
      if (detail) items.push(detail);
    }

    return { items, total: countRow.total };
  }

  async getRfq(actor: Actor, id: Id): Promise<RfqDetail | null> {
    authorize(actor, "rfqs:read");
    const sql = db();
    const rfq = sql
      .prepare(
        "SELECT id, number, due_on as dueOn, status, created_by as createdBy, created_at as createdAt, updated_at as updatedAt, version FROM rfqs WHERE id = ?",
      )
      .get(id) as RfqDbRow | undefined;

    if (!rfq) return null;

    const reqRows = sql
      .prepare("SELECT request_id FROM rfq_requests WHERE rfq_id = ?")
      .all(id) as { request_id: string }[];
    const requestIds = reqRows.map((r) => r.request_id);

    const supRows = sql
      .prepare("SELECT supplier_id FROM rfq_suppliers WHERE rfq_id = ?")
      .all(id) as { supplier_id: string }[];
    const supplierIds = supRows.map((r) => r.supplier_id);

    const lines = sql
      .prepare("SELECT id, material_id as materialId, quantity, unit FROM rfq_lines WHERE rfq_id = ?")
      .all(id) as MaterialLine[];

    // Fetch linked requests
    const requests: ExtendedMaterialRequest[] = [];
    for (const reqId of requestIds) {
      const req = await this.getRequest(actor, reqId);
      if (req) requests.push(req);
    }

    // Fetch suppliers
    const suppliers: Supplier[] = [];
    for (const sId of supplierIds) {
      const sup = await this.getSupplier(actor, sId);
      if (sup) suppliers.push(sup);
    }

    // Fetch quotations
    const qRows = sql
      .prepare(
        "SELECT id, number, supplier_id as supplierId, valid_until as validUntil, lead_days as leadDays, total, status, created_by as createdBy, created_at as createdAt, updated_at as updatedAt, version FROM quotations WHERE rfq_id = ?",
      )
      .all(id) as QuotationDbRow[];

    const quotations: Quotation[] = [];
    const getQLinesStmt = sql.prepare(
      "SELECT id, material_id as materialId, quantity, unit, unit_price as unitPrice, total FROM quotation_lines WHERE quotation_id = ?",
    );

    for (const q of qRows) {
      const qLines = getQLinesStmt.all(q.id) as PriceLine[];
      quotations.push({
        id: q.id,
        number: q.number,
        rfqId: id,
        supplierId: q.supplierId,
        validUntil: q.validUntil,
        leadDays: q.leadDays,
        total: q.total,
        status: (q.status === "SUBMITTED" ? "RECEIVED" : q.status === "ACCEPTED" ? "EVALUATED" : "WITHDRAWN") as Quotation["status"],
        createdBy: q.createdBy,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
        version: q.version,
        references: [{ type: "RFQ", id, number: rfq.number }],
        lines: qLines,
      });
    }

    // Fetch evaluation if exists
    const evalRow = sql
      .prepare(
        "SELECT id, number, selected_quotation_id as selectedQuotationId, criteria_json as criteriaJson, reason, status, created_by as createdBy, created_at as createdAt, updated_at as updatedAt, version FROM supplier_evaluations WHERE rfq_id = ?",
      )
      .get(id) as EvaluationDbRow | undefined;

    let evaluation: SupplierEvaluation | undefined;
    if (evalRow) {
      evaluation = {
        id: evalRow.id,
        number: evalRow.number,
        rfqId: id,
        quotationIds: quotations.map((q) => q.id),
        selectedQuotationId: evalRow.selectedQuotationId,
        criteria: JSON.parse(evalRow.criteriaJson),
        reason: evalRow.reason,
        status: (evalRow.status === "APPROVED" ? "FINAL" : "DRAFT") as SupplierEvaluation["status"],
        createdBy: evalRow.createdBy,
        createdAt: evalRow.createdAt,
        updatedAt: evalRow.updatedAt,
        version: evalRow.version,
        references: [{ type: "RFQ", id, number: rfq.number }],
      };
    }

    return {
      id: rfq.id,
      number: rfq.number,
      requestIds,
      supplierIds,
      dueOn: rfq.dueOn,
      status: (rfq.status === "OPEN" ? "SENT" : rfq.status) as Rfq["status"],
      createdBy: rfq.createdBy,
      createdAt: rfq.createdAt,
      updatedAt: rfq.updatedAt,
      version: rfq.version,
      references: requests.map((r) => ({ type: "FPBB", id: r.id, number: r.number })),
      lines,
      requests,
      suppliers,
      quotations,
      evaluation,
    };
  }

  async createRfq(context: MutationContext, input: unknown): Promise<Rfq> {
    authorize(context.actor, "rfqs:write");
    const parsed = createRfqSchema.parse(input);
    const sql = db();

    return sql.transaction((): Rfq => {
      // Validate that linked requests are verified
      const verifyStmt = sql.prepare("SELECT id, status, number FROM material_requests WHERE id = ?");
      const reqLinesStmt = sql.prepare(
        "SELECT material_id as materialId, quantity, unit FROM material_request_lines WHERE request_id = ?",
      );

      const aggregatedLines: MaterialLine[] = [];
      for (const reqId of parsed.requestIds) {
        const req = verifyStmt.get(reqId) as { id: string; status: string; number: string } | undefined;
        if (!req) throw new Error(`Material request ${reqId} not found.`);
        if (req.status !== "VERIFIED") {
          throw new Error(
            `Material request ${req.number} must be VERIFIED before creating RFQ. Current: ${req.status}`,
          );
        }
        if (!parsed.lines) {
          const lines = reqLinesStmt.all(reqId) as MaterialLine[];
          for (const l of lines) {
            aggregatedLines.push({ ...l, id: randomUUID() });
          }
        }
      }

      const rawLines = parsed.lines || aggregatedLines;
      if (!rawLines.length) {
        throw new Error("RFQ must contain at least one line item.");
      }

      const linesToUse: MaterialLine[] = rawLines.map((l) => ({
        id: l.id || randomUUID(),
        materialId: l.materialId,
        quantity: l.quantity,
        unit: l.unit,
      }));

      const id = randomUUID();
      const number = nextDocumentNumber("RFQ");
      const now = new Date().toISOString();

      sql
        .prepare(
          "INSERT INTO rfqs (id, number, due_on, status, created_by, created_at, updated_at, version) VALUES (?, ?, ?, 'SENT', ?, ?, ?, 1)",
        )
        .run(id, number, parsed.dueOn, context.actor.id, now, now);

      for (const reqId of parsed.requestIds) {
        sql.prepare("INSERT INTO rfq_requests (rfq_id, request_id) VALUES (?, ?)").run(id, reqId);
      }
      for (const supId of parsed.supplierIds) {
        sql.prepare("INSERT INTO rfq_suppliers (rfq_id, supplier_id) VALUES (?, ?)").run(id, supId);
      }
      for (const line of linesToUse) {
        sql
          .prepare(
            "INSERT INTO rfq_lines (id, rfq_id, material_id, quantity, unit) VALUES (?, ?, ?, ?, ?)",
          )
          .run(line.id, id, line.materialId, line.quantity, line.unit);
      }

      audit(context.actor, "rfq.created", "rfq", id, {
        number,
        requestCount: parsed.requestIds.length,
        supplierCount: parsed.supplierIds.length,
        dueOn: parsed.dueOn,
      });

      return {
        id,
        number,
        requestIds: parsed.requestIds,
        supplierIds: parsed.supplierIds,
        dueOn: parsed.dueOn,
        lines: linesToUse,
        status: "SENT",
        createdBy: context.actor.id,
        createdAt: now,
        updatedAt: now,
        version: 1,
        references: [],
      };
    })();
  }

  async recordQuotation(context: MutationContext, input: unknown): Promise<Quotation> {
    authorize(context.actor, "rfqs:write");
    const parsed = recordQuotationSchema.parse(input);
    const sql = db();

    return sql.transaction((): Quotation => {
      const rfq = sql
        .prepare("SELECT id, number, status FROM rfqs WHERE id = ?")
        .get(parsed.rfqId) as { id: string; number: string; status: string } | undefined;
      if (!rfq) throw new Error(`RFQ ${parsed.rfqId} not found.`);
      if (rfq.status === "CLOSED" || rfq.status === "CANCELLED") {
        throw new Error(`Cannot record quotation for ${rfq.status} RFQ.`);
      }

      // Check supplier was invited
      const supCheck = sql
        .prepare("SELECT 1 FROM rfq_suppliers WHERE rfq_id = ? AND supplier_id = ?")
        .get(parsed.rfqId, parsed.supplierId);
      if (!supCheck) {
        sql.prepare("INSERT OR IGNORE INTO rfq_suppliers (rfq_id, supplier_id) VALUES (?, ?)").run(
          parsed.rfqId,
          parsed.supplierId,
        );
      }

      const id = randomUUID();
      const number = nextDocumentNumber("QUOTE");
      const now = new Date().toISOString();

      let calculatedTotal = 0;
      const lines: PriceLine[] = [];

      for (const l of parsed.lines) {
        const lineTotal = calculateLineTotal(l.unitPrice, l.quantity);
        calculatedTotal += lineTotal;
        lines.push({
          id: l.id || randomUUID(),
          materialId: l.materialId,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: l.unitPrice,
          total: lineTotal,
        });
      }

      if (!Number.isSafeInteger(calculatedTotal)) {
        throw new Error("Quotation total exceeds safe integer bounds.");
      }

      sql
        .prepare(
          `INSERT INTO quotations (id, number, rfq_id, supplier_id, valid_until, lead_days, total, status, created_by, created_at, updated_at, version)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'RECEIVED', ?, ?, ?, 1)`,
        )
        .run(
          id,
          number,
          parsed.rfqId,
          parsed.supplierId,
          parsed.validUntil,
          parsed.leadDays,
          calculatedTotal,
          context.actor.id,
          now,
          now,
        );

      const insertLineStmt = sql.prepare(
        `INSERT INTO quotation_lines (id, quotation_id, material_id, quantity, unit, unit_price, total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );

      for (const line of lines) {
        insertLineStmt.run(
          line.id,
          id,
          line.materialId,
          line.quantity,
          line.unit,
          line.unitPrice,
          line.total,
        );
      }

      audit(context.actor, "quotation.recorded", "quotation", id, {
        number,
        rfqId: parsed.rfqId,
        supplierId: parsed.supplierId,
        total: calculatedTotal,
      });

      return {
        id,
        number,
        rfqId: parsed.rfqId,
        supplierId: parsed.supplierId,
        validUntil: parsed.validUntil,
        leadDays: parsed.leadDays,
        lines,
        total: calculatedTotal,
        status: "RECEIVED" as const,
        createdBy: context.actor.id,
        createdAt: now,
        updatedAt: now,
        version: 1,
        references: [{ type: "RFQ", id: parsed.rfqId, number: rfq.number }],
      };
    })();
  }

  async evaluateSuppliers(context: MutationContext, input: unknown): Promise<SupplierEvaluation> {
    authorize(context.actor, "rfqs:write");
    const parsed = evaluateSuppliersSchema.parse(input);
    const sql = db();

    return sql.transaction((): SupplierEvaluation => {
      const rfq = sql
        .prepare("SELECT id, number FROM rfqs WHERE id = ?")
        .get(parsed.rfqId) as { id: string; number: string } | undefined;
      if (!rfq) throw new Error(`RFQ ${parsed.rfqId} not found.`);

      const winningQuote = sql
        .prepare("SELECT id, number, rfq_id, supplier_id FROM quotations WHERE id = ?")
        .get(parsed.selectedQuotationId) as
        | { id: string; number: string; rfq_id: string; supplier_id: string }
        | undefined;
      if (!winningQuote) throw new Error(`Quotation ${parsed.selectedQuotationId} not found.`);
      if (winningQuote.rfq_id !== parsed.rfqId) {
        throw new Error("Selected quotation does not belong to this RFQ.");
      }

      const id = randomUUID();
      const number = nextDocumentNumber("EVAL");
      const now = new Date().toISOString();

      sql
        .prepare(
          `INSERT INTO supplier_evaluations (id, number, rfq_id, selected_quotation_id, criteria_json, reason, status, created_by, created_at, updated_at, version)
           VALUES (?, ?, ?, ?, ?, ?, 'FINAL', ?, ?, ?, 1)`,
        )
        .run(
          id,
          number,
          parsed.rfqId,
          parsed.selectedQuotationId,
          JSON.stringify(parsed.criteria),
          parsed.reason,
          context.actor.id,
          now,
          now,
        );

      // Mark winning quotation as evaluated
      sql.prepare("UPDATE quotations SET status = 'EVALUATED' WHERE rfq_id = ?").run(parsed.rfqId);

      audit(context.actor, "supplier_evaluation.finalized", "supplier_evaluation", id, {
        number,
        rfqId: parsed.rfqId,
        selectedQuotationId: parsed.selectedQuotationId,
        reason: parsed.reason,
      });

      const quotationIds = (
        sql.prepare("SELECT id FROM quotations WHERE rfq_id = ?").all(parsed.rfqId) as { id: string }[]
      ).map((q) => q.id);

      return {
        id,
        number,
        rfqId: parsed.rfqId,
        quotationIds,
        selectedQuotationId: parsed.selectedQuotationId,
        criteria: parsed.criteria,
        reason: parsed.reason,
        status: "FINAL" as const,
        createdBy: context.actor.id,
        createdAt: now,
        updatedAt: now,
        version: 1,
        references: [{ type: "RFQ", id: parsed.rfqId, number: rfq.number }],
      };
    })();
  }

  // =========================================================================
  // PURCHASE ORDERS & APPROVALS
  // =========================================================================

  async listOrders(
    actor: Actor,
    query: Query & { status?: string; supplierId?: string } = {},
  ): Promise<Page<ExtendedPurchaseOrder>> {
    authorize(actor, "orders:read");
    const sql = db();
    let whereClause = "WHERE 1=1";
    const params: unknown[] = [];

    if (query.status && query.status !== "ALL") {
      whereClause += " AND po.status = ?";
      params.push(query.status);
    }
    if (query.supplierId) {
      whereClause += " AND po.supplier_id = ?";
      params.push(query.supplierId);
    }
    if (query.search) {
      whereClause += " AND (po.number LIKE ? OR s.name LIKE ?)";
      const pattern = `%${query.search}%`;
      params.push(pattern, pattern);
    }

    const countRow = sql
      .prepare(
        `SELECT count(*) as total FROM purchase_orders po LEFT JOIN suppliers s ON s.id = po.supplier_id ${whereClause}`,
      )
      .get(...params) as { total: number };

    const limit = query.limit || 50;
    const poRows = sql
      .prepare(
        `SELECT po.id, po.number, po.supplier_id as supplierId, po.quotation_id as quotationId,
                po.warehouse_id as warehouseId, po.revision, po.status, po.delivery_terms as deliveryTerms,
                po.payment_terms as paymentTerms, po.total, po.issued_at as issuedAt, po.issued_by as issuedBy,
                po.issued_notes as issuedNotes, po.created_by as createdBy, po.created_at as createdAt,
                po.updated_at as updatedAt, po.version, s.name as supplierName, u.name as creatorName
         FROM purchase_orders po
         LEFT JOIN suppliers s ON s.id = po.supplier_id
         LEFT JOIN users u ON u.id = po.created_by
         ${whereClause}
         ORDER BY po.created_at DESC
         LIMIT ?`,
      )
      .all(...params, limit) as (PurchaseOrderDbRow & {
        deliveryTerms?: string;
        paymentTerms?: string;
        supplierName?: string;
        creatorName?: string;
        issuedAt?: string;
        issuedBy?: string;
        issuedNotes?: string;
      })[];

    const items: ExtendedPurchaseOrder[] = [];
    for (const po of poRows) {
      const full = await this.getOrder(actor, po.id);
      if (full) {
        items.push({
          ...full,
          deliveryTerms: po.deliveryTerms || "Franco Gudang",
          paymentTerms: po.paymentTerms || "Net 30 Days",
          supplierName: po.supplierName || "Unknown Supplier",
          approvalStage: this.determineApprovalStage(full.approvalSteps, full.status),
          issuedAt: po.issuedAt ?? undefined,
          issuedBy: po.issuedBy ?? undefined,
          issuedNotes: po.issuedNotes ?? undefined,
          creatorName: po.creatorName ?? undefined,
        });
      }
    }

    return { items, total: countRow.total };
  }

  private determineApprovalStage(steps: (ApprovalStep & { title?: string })[], status: string): string {
    if (status === "APPROVED" || status === "OPEN" || status === "CLOSED" || status === "PARTIALLY_RECEIVED") {
      return "Completed";
    }
    if (status === "REJECTED") {
      return "Rejected";
    }
    if (status === "DRAFT") {
      return "Draft";
    }
    const currentStep = steps.find((s) => s.status === "PENDING");
    if (!currentStep) return "Completed";
    return currentStep.title || "Pending Approval";
  }

  async getOrder(actor: Actor, id: Id): Promise<ExtendedPurchaseOrder | null> {
    authorize(actor, "orders:read");
    const sql = db();
    const po = sql
      .prepare(
        `SELECT po.id, po.number, po.supplier_id as supplierId, po.quotation_id as quotationId,
                po.warehouse_id as warehouseId, po.revision, po.status, po.delivery_terms as deliveryTerms,
                po.payment_terms as paymentTerms, po.total, po.issued_at as issuedAt, po.issued_by as issuedBy,
                po.issued_notes as issuedNotes, po.created_by as createdBy, po.created_at as createdAt,
                po.updated_at as updatedAt, po.version, s.name as supplierName, u.name as creatorName
         FROM purchase_orders po
         LEFT JOIN suppliers s ON s.id = po.supplier_id
         LEFT JOIN users u ON u.id = po.created_by
         WHERE po.id = ?`,
      )
      .get(id) as
      | (PurchaseOrderDbRow & {
          supplierName?: string;
          creatorName?: string;
          deliveryTerms?: string;
          paymentTerms?: string;
          issuedAt?: string;
          issuedBy?: string;
          issuedNotes?: string;
          quotationId?: string;
          warehouseId: string;
          supplierId: string;
        })
      | undefined;

    if (!po) return null;

    const reqRows = sql
      .prepare("SELECT request_id FROM purchase_order_requests WHERE order_id = ?")
      .all(id) as { request_id: string }[];
    const requestIds = reqRows.map((r) => r.request_id);

    const lines = sql
      .prepare(
        "SELECT id, material_id as materialId, quantity, unit, unit_price as unitPrice, total FROM purchase_order_lines WHERE order_id = ?",
      )
      .all(id) as PriceLine[];

    const stepRows = sql
      .prepare(
        `SELECT id, sequence, title, assigned_user_id as assignedUserId, assigned_role as assignedRole,
                authority_policy_id as authorityPolicyId, status, decision_id as decisionId,
                decided_by as decidedBy, decided_at as decidedAt, decision_outcome as decisionOutcome,
                decision_reason as decisionReason, document_revision as documentRevision
         FROM approval_steps
         WHERE order_id = ?
         ORDER BY sequence ASC`,
      )
      .all(id) as ApprovalStepDbRow[];

    const approvalSteps: ApprovalStep[] = stepRows.map((s) => ({
      id: s.id,
      sequence: s.sequence,
      title: s.title,
      assignedUserId: s.assignedUserId || "",
      authorityPolicyId: s.authorityPolicyId,
      status: s.status,
      decision: s.decisionId
        ? {
            id: s.decisionId,
            stepId: s.id,
            actorId: s.decidedBy || "",
            decidedAt: s.decidedAt || "",
            decision: (s.decisionOutcome as "APPROVED" | "REJECTED") || "APPROVED",
            reason: s.decisionReason || "",
            documentRevision: s.documentRevision || 1,
          }
        : undefined,
    }));

    // References
    const references: { type: "FPBB" | "QUOTE" | "RFQ" | "SO"; id: string; number: string }[] = [];
    for (const reqId of requestIds) {
      const req = sql
        .prepare("SELECT number FROM material_requests WHERE id = ?")
        .get(reqId) as { number: string } | undefined;
      if (req) references.push({ type: "FPBB", id: reqId, number: req.number });
    }
    if (po.quotationId) {
      const q = sql
        .prepare("SELECT number FROM quotations WHERE id = ?")
        .get(po.quotationId) as { number: string } | undefined;
      if (q) references.push({ type: "QUOTE", id: po.quotationId, number: q.number });
    }

    return {
      id: po.id,
      number: po.number,
      supplierId: po.supplierId,
      supplierName: po.supplierName || "Unknown Supplier",
      requestIds,
      quotationId: po.quotationId || "",
      warehouseId: po.warehouseId,
      revision: po.revision,
      status: po.status as OrderStatus,
      deliveryTerms: po.deliveryTerms || "Franco Gudang",
      paymentTerms: po.paymentTerms || "Net 30 Days",
      total: po.total,
      lines,
      approvalSteps,
      approvalStage: this.determineApprovalStage(approvalSteps, po.status),
      issuedAt: po.issuedAt,
      issuedBy: po.issuedBy,
      issuedNotes: po.issuedNotes,
      createdBy: po.createdBy || po.created_by,
      creatorName: po.creatorName,
      createdAt: po.createdAt || po.created_at,
      updatedAt: po.updatedAt || po.updated_at,
      version: po.version,
      references,
    };
  }

  async createOrder(context: MutationContext, input: unknown): Promise<PurchaseOrder> {
    authorize(context.actor, "orders:write");
    const parsed = createOrderSchema.parse(input);
    const sql = db();

    return sql.transaction((): PurchaseOrder => {
      // Validate supplier
      const supplier = sql
        .prepare("SELECT id, name FROM suppliers WHERE id = ?")
        .get(parsed.supplierId) as { id: string; name: string } | undefined;
      if (!supplier) throw new Error(`Supplier ${parsed.supplierId} not found.`);

      // Compute lines and total
      let calculatedTotal = 0;
      const lines: PriceLine[] = [];
      for (const l of parsed.lines) {
        const lineTotal = calculateLineTotal(l.unitPrice, l.quantity);
        calculatedTotal += lineTotal;
        lines.push({
          id: l.id || randomUUID(),
          materialId: l.materialId,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: l.unitPrice,
          total: lineTotal,
        });
      }

      if (!Number.isSafeInteger(calculatedTotal)) {
        throw new Error("Purchase order total exceeds safe integer limits.");
      }

      // Check PO Splitting Rule:
      const today = getJakartaDate();
      const sameDayRows = sql
        .prepare(
          "SELECT sum(total) as dayTotal FROM purchase_orders WHERE supplier_id = ? AND substr(created_at, 1, 10) = ?",
        )
        .get(parsed.supplierId, today) as { dayTotal: number | null };

      const existingDayTotal = sameDayRows?.dayTotal || 0;
      const combinedDayTotal = existingDayTotal + calculatedTotal;
      const isSplittingSuspected = combinedDayTotal > DEMO_POLICIES.poSplittingThresholdMinor;

      const id = randomUUID();
      const number = nextDocumentNumber("PO");
      const now = new Date().toISOString();

      sql
        .prepare(
          `INSERT INTO purchase_orders (id, number, supplier_id, quotation_id, warehouse_id, revision, status, delivery_terms, payment_terms, total, created_by, created_at, updated_at, version)
           VALUES (?, ?, ?, ?, ?, 1, 'AWAITING_APPROVAL', ?, ?, ?, ?, ?, ?, 1)`,
        )
        .run(
          id,
          number,
          parsed.supplierId,
          parsed.quotationId || null,
          parsed.warehouseId,
          parsed.deliveryTerms,
          parsed.paymentTerms,
          calculatedTotal,
          context.actor.id,
          now,
          now,
        );

      // Link requests
      for (const reqId of parsed.requestIds) {
        sql
          .prepare("INSERT INTO purchase_order_requests (order_id, request_id) VALUES (?, ?)")
          .run(id, reqId);
      }

      // Insert lines
      const insertLineStmt = sql.prepare(
        `INSERT INTO purchase_order_lines (id, order_id, material_id, quantity, unit, unit_price, total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const line of lines) {
        insertLineStmt.run(
          line.id,
          id,
          line.materialId,
          line.quantity,
          line.unit,
          line.unitPrice,
          line.total,
        );
      }

      // Generate approval steps based on demo policy
      const requiredSteps = getRequiredApprovalSteps(calculatedTotal, isSplittingSuspected);
      const approvalSteps: (ApprovalStep & { title?: string })[] = [];
      const insertStepStmt = sql.prepare(
        `INSERT INTO approval_steps (id, order_id, sequence, title, assigned_user_id, assigned_role, authority_policy_id, status, document_revision)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 1)`,
      );

      for (const stepPolicy of requiredSteps) {
        const stepId = randomUUID();
        insertStepStmt.run(
          stepId,
          id,
          stepPolicy.sequence,
          stepPolicy.title,
          "usr_approver",
          stepPolicy.role,
          stepPolicy.policyId,
        );
        approvalSteps.push({
          id: stepId,
          sequence: stepPolicy.sequence,
          title: stepPolicy.title,
          assignedUserId: "usr_approver",
          authorityPolicyId: stepPolicy.policyId,
          status: "PENDING",
        });
      }

      audit(context.actor, "order.created", "purchase_order", id, {
        number,
        supplierId: parsed.supplierId,
        total: calculatedTotal,
        isSplittingSuspected,
        stepCount: requiredSteps.length,
      });

      return {
        id,
        number,
        supplierId: parsed.supplierId,
        requestIds: parsed.requestIds,
        quotationId: parsed.quotationId || "",
        warehouseId: parsed.warehouseId,
        revision: 1,
        status: "AWAITING_APPROVAL" as OrderStatus,
        lines,
        total: calculatedTotal,
        approvalSteps,
        createdBy: context.actor.id,
        createdAt: now,
        updatedAt: now,
        version: 1,
        references: [],
      };
    })();
  }

  async decideApproval(
    context: MutationContext,
    orderId: Id,
    input: unknown,
  ): Promise<ApprovalDecision> {
    const sql = db();
    const order = sql
      .prepare("SELECT * FROM purchase_orders WHERE id = ?")
      .get(orderId) as PurchaseOrderDbRow | undefined;

    if (!order) throw new Error(`Purchase order ${orderId} not found.`);

    // INVARIANT 3 & 7: Prevent creator self-approval!
    if (context.actor.id === order.created_by) {
      throw new AccessError(403, "Creator cannot approve their own purchase order.");
    }

    authorize(context.actor, "approvals:decide", notCreator(order.created_by));
    const parsed = decideApprovalSchema.parse(input);

    return sql.transaction(() => {

      if (order.version !== context.expectedVersion) {
        throw new Error(
          `Stale update rejected. Expected order version ${context.expectedVersion}, found ${order.version}.`,
        );
      }

      if (order.status !== "AWAITING_APPROVAL") {
        throw new Error(`Order ${order.number} is not awaiting approval. Current status: ${order.status}`);
      }

      // Find the specific approval step
      const step = sql
        .prepare("SELECT * FROM approval_steps WHERE id = ? AND order_id = ?")
        .get(parsed.stepId, orderId) as (ApprovalStepDbRow & { order_id: string }) | undefined;

      if (!step) throw new Error(`Approval step ${parsed.stepId} not found on order.`);
      if (step.status !== "PENDING") {
        throw new Error(`Step has already been decided: ${step.status}.`);
      }

      // Enforce sequential approval hierarchy:
      const pendingPrior = sql
        .prepare(
          "SELECT count(*) as count FROM approval_steps WHERE order_id = ? AND sequence < ? AND status != 'APPROVED'",
        )
        .get(orderId, step.sequence) as { count: number };

      if (pendingPrior.count > 0) {
        throw new Error("Prior approval steps must be completed in sequence first.");
      }

      const decisionId = randomUUID();
      const now = new Date().toISOString();

      // Update step decision
      sql
        .prepare(
          `UPDATE approval_steps
           SET status = ?, decision_id = ?, decided_by = ?, decided_at = ?, decision_outcome = ?, decision_reason = ?, document_revision = ?
           WHERE id = ?`,
        )
        .run(
          parsed.decision,
          decisionId,
          context.actor.id,
          now,
          parsed.decision,
          parsed.reason,
          order.revision,
          parsed.stepId,
        );

      let newOrderStatus: OrderStatus = order.status;

      if (parsed.decision === "REJECTED") {
        newOrderStatus = "REJECTED";
      } else {
        // Check if all steps for this order are now APPROVED
        const remainingPending = sql
          .prepare(
            "SELECT count(*) as count FROM approval_steps WHERE order_id = ? AND status != 'APPROVED'",
          )
          .get(orderId) as { count: number };

        if (remainingPending.count === 0) {
          newOrderStatus = "APPROVED";
        }
      }

      // Update order status & version
      sql
        .prepare(
          "UPDATE purchase_orders SET status = ?, updated_at = ?, version = version + 1 WHERE id = ?",
        )
        .run(newOrderStatus, now, orderId);

      audit(context.actor, "order.approval_decided", "purchase_order", orderId, {
        number: order.number,
        stepId: parsed.stepId,
        decision: parsed.decision,
        reason: parsed.reason,
        newOrderStatus,
        revision: order.revision,
      });

      return {
        id: decisionId,
        stepId: parsed.stepId,
        actorId: context.actor.id,
        decidedAt: now,
        decision: parsed.decision,
        reason: parsed.reason,
        documentRevision: order.revision,
      };
    })();
  }

  /**
   * Revises a purchase order after rejection or for material changes.
   * Increments revision, invalidates previous approval steps, and resets status.
   */
  async reviseOrder(context: MutationContext, orderId: Id, input: unknown): Promise<PurchaseOrder> {
    authorize(context.actor, "orders:write");
    const parsed = createOrderSchema.parse(input);
    const sql = db();

    sql.transaction(() => {
      const order = sql
        .prepare("SELECT * FROM purchase_orders WHERE id = ?")
        .get(orderId) as PurchaseOrderDbRow | undefined;
      if (!order) throw new Error(`Purchase order ${orderId} not found.`);

      if (order.version !== context.expectedVersion) {
        throw new Error(
          `Stale update rejected. Expected version ${context.expectedVersion}, found ${order.version}.`,
        );
      }

      const newRevision = order.revision + 1;
      const now = new Date().toISOString();

      // Recalculate lines and total
      let calculatedTotal = 0;
      const lines: PriceLine[] = [];
      for (const l of parsed.lines) {
        const lineTotal = calculateLineTotal(l.unitPrice, l.quantity);
        calculatedTotal += lineTotal;
        lines.push({
          id: l.id || randomUUID(),
          materialId: l.materialId,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: l.unitPrice,
          total: lineTotal,
        });
      }

      // Delete old lines and old approval steps (INVALIDATE APPROVALS AFTER MATERIAL CHANGES)
      sql.prepare("DELETE FROM purchase_order_lines WHERE order_id = ?").run(orderId);
      sql.prepare("DELETE FROM approval_steps WHERE order_id = ?").run(orderId);

      const insertLineStmt = sql.prepare(
        `INSERT INTO purchase_order_lines (id, order_id, material_id, quantity, unit, unit_price, total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const line of lines) {
        insertLineStmt.run(
          line.id,
          orderId,
          line.materialId,
          line.quantity,
          line.unit,
          line.unitPrice,
          line.total,
        );
      }

      // Regenerate fresh approval steps for the new revision
      const requiredSteps = getRequiredApprovalSteps(calculatedTotal, false);
      const approvalSteps: (ApprovalStep & { title?: string })[] = [];
      const insertStepStmt = sql.prepare(
        `INSERT INTO approval_steps (id, order_id, sequence, title, assigned_user_id, assigned_role, authority_policy_id, status, document_revision)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
      );

      for (const stepPolicy of requiredSteps) {
        const stepId = randomUUID();
        insertStepStmt.run(
          stepId,
          orderId,
          stepPolicy.sequence,
          stepPolicy.title,
          "usr_approver",
          stepPolicy.role,
          stepPolicy.policyId,
          newRevision,
        );
        approvalSteps.push({
          id: stepId,
          sequence: stepPolicy.sequence,
          title: stepPolicy.title,
          assignedUserId: "usr_approver",
          authorityPolicyId: stepPolicy.policyId,
          status: "PENDING",
        });
      }

      sql
        .prepare(
          `UPDATE purchase_orders
           SET revision = ?, status = 'AWAITING_APPROVAL', total = ?, delivery_terms = ?, payment_terms = ?, updated_at = ?, version = version + 1
           WHERE id = ?`,
        )
        .run(
          newRevision,
          calculatedTotal,
          parsed.deliveryTerms,
          parsed.paymentTerms,
          now,
          orderId,
        );

      audit(context.actor, "order.revised", "purchase_order", orderId, {
        number: order.number,
        newRevision,
        total: calculatedTotal,
      });
    })();

    return (await this.getOrder(context.actor, orderId))!;
  }

  /**
   * Records PO issuance to supplier separately from approval.
   * Suppliers do not need accounts.
   */
  async issueOrder(context: MutationContext, orderId: Id, input: unknown): Promise<ExtendedPurchaseOrder> {
    authorize(context.actor, "orders:write");
    const parsed = issueOrderSchema.parse(input);
    const sql = db();

    sql.transaction(() => {
      const order = sql
        .prepare("SELECT * FROM purchase_orders WHERE id = ?")
        .get(orderId) as PurchaseOrderDbRow | undefined;
      if (!order) throw new Error(`Purchase order ${orderId} not found.`);

      if (order.version !== context.expectedVersion) {
        throw new Error(
          `Stale update rejected. Expected version ${context.expectedVersion}, found ${order.version}.`,
        );
      }

      if (order.status !== "APPROVED") {
        throw new Error(`Order must be APPROVED before issuance. Current status: ${order.status}`);
      }

      const now = new Date().toISOString();
      sql
        .prepare(
          `UPDATE purchase_orders
           SET status = 'OPEN', issued_at = ?, issued_by = ?, issued_notes = ?, updated_at = ?, version = version + 1
           WHERE id = ?`,
        )
        .run(now, context.actor.id, parsed.notes || "Issued to supplier via external dispatch", now, orderId);

      audit(context.actor, "order.issued", "purchase_order", orderId, {
        number: order.number,
        issuedAt: now,
        notes: parsed.notes,
      });
    })();

    return (await this.getOrder(context.actor, orderId))!;
  }

  // =========================================================================
  // INTEGRATION SERVICES (For Inventory & Finance modules)
  // =========================================================================

  /**
   * Exposes verified material requests ready for RFQ or PO creation.
   */
  async getVerifiedRequests(actor: Actor): Promise<ExtendedMaterialRequest[]> {
    authorize(actor, "requests:read");
    const page = await this.listRequests(actor, { status: "VERIFIED", limit: 100 });
    return page.items;
  }

  /**
   * Exposes approved/open purchase order lines for Goods Receipt by Inventory (Agent 4)
   * and Invoice 3-Way Matching by Finance (Agent 5).
   */
  async getApprovedOrderLines(
    actor: Actor,
    orderId?: Id,
  ): Promise<Array<PriceLine & { orderId: Id; orderNumber: string; supplierId: Id; warehouseId: Id }>> {
    // Inventory and Finance both have orders:read or receipts:read
    if (!can(actor, "orders:read") && !can(actor, "receipts:read") && !can(actor, "invoices:read")) {
      throw new AccessError(403, "Not authorized to read purchase order lines.");
    }

    const sql = db();
    let whereClause = "WHERE po.status IN ('APPROVED', 'OPEN', 'PARTIALLY_RECEIVED')";
    const params: unknown[] = [];

    if (orderId) {
      whereClause += " AND po.id = ?";
      params.push(orderId);
    }

    const rows = sql
      .prepare(
        `SELECT l.id, l.order_id as orderId, po.number as orderNumber, po.supplier_id as supplierId,
                po.warehouse_id as warehouseId, l.material_id as materialId, l.quantity, l.unit,
                l.unit_price as unitPrice, l.total
         FROM purchase_order_lines l
         INNER JOIN purchase_orders po ON po.id = l.order_id
         ${whereClause}
         ORDER BY po.created_at DESC`,
      )
      .all(...params) as OrderLineWithPoRow[];

    return rows as unknown as (PriceLine & { orderId: string; orderNumber: string; supplierId: string; warehouseId: string })[];
  }

  /**
   * Exposes outstanding receipt quantity for an approved PO line.
   * PO Line Quantity minus physically received quantity.
   */
  async getOutstandingReceiptQuantity(actor: Actor, orderLineId: Id): Promise<string> {
    if (!can(actor, "orders:read") && !can(actor, "receipts:read")) {
      throw new AccessError(403, "Not authorized to read receipt quantities.");
    }
    const sql = db();
    const line = sql
      .prepare("SELECT quantity FROM purchase_order_lines WHERE id = ?")
      .get(orderLineId) as { quantity: string } | undefined;

    if (!line) return "0.000";

    const tableExists = sql
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='receipt_lines'")
      .get();

    if (!tableExists) {
      return line.quantity;
    }

    const receivedRow = sql
      .prepare(
        "SELECT sum(received_quantity) as totalReceived FROM receipt_lines WHERE purchase_order_line_id = ?",
      )
      .get(orderLineId) as { totalReceived: number | null };

    const totalReceived = receivedRow?.totalReceived || 0;
    const orderedScaled = exactQuantity(line.quantity);
    const receivedScaled = BigInt(Math.round(totalReceived * 1000));
    const outstandingScaled = orderedScaled > receivedScaled ? orderedScaled - receivedScaled : BigInt(0);

    const whole = outstandingScaled / BigInt(1000);
    const fraction = outstandingScaled % BigInt(1000);
    return fraction > 0
      ? `${whole}.${String(fraction).padStart(3, "0")}`
      : `${whole}.000`;
  }
}

export const procurementService = new ProcurementDomainService();
