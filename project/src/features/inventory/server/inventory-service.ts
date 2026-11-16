import "server-only";
import { db } from "@/server/db";
import { Actor } from "@/shared/contracts/auth";
import { MutationContext } from "@/shared/services/interfaces";
import { authorize, can, AccessError } from "@/lib/auth/permissions";
import { audit } from "@/server/auth-service";
import { nextDocumentNumber } from "@/server/document-number";
import {
  addQuantity,
  subQuantity,
  compareQuantity,
  isQuantityGte,
  isQuantityGt,
  isQuantityZero,
  formatQuantityExact,
} from "./decimal";
import { z } from "zod";
import {
  StockBalanceView,
  GoodsReceiptView,
  ReceiptLineView,
  InspectionView,
  InspectionTestView,
  DeliveryOrderView,
  DispatchLineView,
  AttachmentView,
  ReturnClaimView,
  ReturnInspectionView,
  StockMovementView,
  MaterialRecord,
  WarehouseRecord,
  SalesOrderView,
  SalesOrderLineView,
} from "../types";

// Zod Schemas
export const receiptLineSchema = z.object({
  purchaseOrderLineId: z.string().min(1),
  materialId: z.string().min(1),
  batch: z.string().min(1),
  location: z.string().min(1),
  orderedQuantity: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,3})?$/),
  receivedQuantity: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,3})?$/),
  unit: z.enum(["L", "kg", "pcs"]),
  discrepancyReason: z.string().optional(),
});

export const createReceiptSchema = z.object({
  purchaseOrderId: z.string().min(1),
  purchaseOrderNumber: z.string().min(1),
  supplierId: z.string().min(1),
  supplierName: z.string().min(1),
  warehouseId: z.string().min(1),
  supplierDeliveryNumber: z.string().min(1),
  permitOverReceipt: z.boolean().optional().default(false),
  lines: z.array(receiptLineSchema).min(1),
});

export const inspectionTestSchema = z.object({
  name: z.string().min(1),
  result: z.string().min(1),
  outcome: z.enum(["ACCEPTED", "HELD", "REJECTED"]),
});

export const performInspectionSchema = z.object({
  receiptId: z.string().min(1),
  receiptLineId: z.string().min(1),
  inspectedQuantity: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,3})?$/),
  acceptedQuantity: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,3})?$/),
  rejectedQuantity: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,3})?$/),
  tests: z.array(inspectionTestSchema).min(1),
  notes: z.string().optional(),
  quarantineReason: z.string().optional(),
  quarantineValueMinor: z.number().int().nonnegative().optional().default(0),
});

export const reserveStockSchema = z.object({
  salesOrderId: z.string().min(1),
  salesOrderLineId: z.string().min(1),
  materialId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,3})?$/),
});

export const createDispatchSchema = z.object({
  salesOrderId: z.string().min(1),
  warehouseId: z.string().min(1),
  carrier3pl: z.string().min(1),
  trackingNumber: z.string().optional(),
  driverName: z.string().optional(),
  vehicleNumber: z.string().optional(),
  lines: z.array(
    z.object({
      salesOrderLineId: z.string().min(1),
      materialId: z.string().min(1),
      quantity: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,3})?$/),
      unit: z.enum(["L", "kg", "pcs"]),
    }),
  ).min(1),
});

export const inspectReturnSchema = z.object({
  returnClaimId: z.string().min(1),
  warehouseId: z.string().min(1),
  materialId: z.string().min(1),
  claimedQuantity: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,3})?$/),
  inspectedQuantity: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,3})?$/),
  acceptedQuantity: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,3})?$/),
  damagedQuantity: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,3})?$/),
  rejectedQuantity: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,3})?$/),
  unit: z.enum(["L", "kg", "pcs"]),
  conditionClassification: z.enum(["RESALEABLE", "DAMAGED_SCRAP", "CUSTOMER_MISUSE", "INCOMPLETE"]),
  findings: z.string().min(1),
});

export class InventoryServiceImpl {
  /**
   * Retrieves stock balances for a warehouse or all warehouses.
   */
  async stock(actor: Actor, warehouseId?: string): Promise<StockBalanceView[]> {
    authorize(actor, "stock:read");
    const sql = db();
    let query = `
      SELECT sb.material_id AS materialId,
             sb.warehouse_id AS warehouseId,
             m.code AS materialCode,
             m.name AS materialName,
             m.category AS category,
             m.unit AS unit,
             m.minimum_quantity AS minimumQuantity,
             w.code AS warehouseCode,
             w.name AS warehouseName,
             sb.physical,
             sb.qc_pending AS qcPending,
             sb.accepted,
             sb.rejected,
             sb.reserved,
             sb.available,
             sb.version,
             sb.updated_at AS updatedAt
      FROM stock_balances sb
      JOIN materials m ON sb.material_id = m.id
      JOIN warehouses w ON sb.warehouse_id = w.id
    `;
    const params: string[] = [];
    if (warehouseId) {
      query += ` WHERE sb.warehouse_id = ?`;
      params.push(warehouseId);
    }
    query += ` ORDER BY m.category ASC, m.code ASC`;

    const rows = sql.prepare(query).all(...params) as StockBalanceView[];
    return rows.map((r) => {
      const isBelowMin = compareQuantity(r.available, r.minimumQuantity) < 0;
      return {
        ...r,
        status: isBelowMin ? ("BELOW_MINIMUM" as const) : ("HEALTHY" as const),
      };
    });
  }

  /**
   * Calculates remaining eligible receipt quantity for a purchase order line.
   */
  async eligibleReceiptQuantity(actor: Actor, orderLineId: string, orderedQty?: string): Promise<string> {
    if (!can(actor, "receipts:read") && !can(actor, "stock:read")) {
      throw new AccessError(403, "Forbidden");
    }
    const sql = db();
    const row = sql
      .prepare(
        `SELECT COALESCE(SUM(received_quantity), 0) AS totalReceived
         FROM goods_receipt_lines
         WHERE purchase_order_line_id = ?`,
      )
      .get(orderLineId) as { totalReceived: string | number } | undefined;

    const received = formatQuantityExact(row?.totalReceived || "0");
    if (!orderedQty) return received;
    const ordered = formatQuantityExact(orderedQty);
    if (isQuantityGte(received, ordered)) return "0.000";
    return subQuantity(ordered, received);
  }

  /**
   * Records physical goods receipt.
   * Invariant: Goods received are saved as QC-pending rather than immediately available.
   * Checks policy for over-receipt.
   */
  async receive(context: MutationContext, rawInput: unknown): Promise<GoodsReceiptView> {
    authorize(context.actor, "receipts:write");
    const input = createReceiptSchema.parse(rawInput);
    const sql = db();

    // Replay protection via idempotency key
    if (context.idempotencyKey) {
      const existing = sql
        .prepare(`SELECT id, number, status FROM goods_receipts WHERE idempotency_key = ?`)
        .get(context.idempotencyKey) as { id: string } | undefined;
      if (existing) {
        const found = await this.getReceipt(context.actor, existing.id);
        if (found) return found;
      }
    }

    const receiptId = `grn_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    sql.transaction(() => {
      const docNumber = nextDocumentNumber("GRN");
      const now = new Date().toISOString();

      // Check over-receipt on every line
      for (const line of input.lines) {
        const row = sql
          .prepare(
            `SELECT COALESCE(SUM(received_quantity), 0) AS totalReceived
             FROM goods_receipt_lines
             WHERE purchase_order_line_id = ?`,
          )
          .get(line.purchaseOrderLineId) as { totalReceived: string | number } | undefined;

        const previouslyReceived = formatQuantityExact(row?.totalReceived || "0");
        const newTotal = addQuantity(previouslyReceived, line.receivedQuantity);

        if (isQuantityGt(newTotal, line.orderedQuantity) && !input.permitOverReceipt) {
          throw new Error(
            `Over-receipt policy violation: Received total ${newTotal} ${line.unit} exceeds ordered quantity ${line.orderedQuantity} ${line.unit} for PO line ${line.purchaseOrderLineId}. Manager override required.`,
          );
        }
      }

      // Insert Goods Receipt header
      sql
        .prepare(
          `INSERT INTO goods_receipts (id, number, purchase_order_id, purchase_order_number, supplier_id, supplier_name, warehouse_id, supplier_delivery_number, status, received_at, created_by, created_at, updated_at, version, idempotency_key)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'RECORDED', ?, ?, ?, ?, 1, ?)`,
        )
        .run(
          receiptId,
          docNumber,
          input.purchaseOrderId,
          input.purchaseOrderNumber,
          input.supplierId,
          input.supplierName,
          input.warehouseId,
          input.supplierDeliveryNumber,
          now,
          context.actor.id,
          now,
          now,
          context.idempotencyKey,
        );

      // Insert lines & update stock balances
      for (const line of input.lines) {
        const lineId = `rline_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        sql
          .prepare(
            `INSERT INTO goods_receipt_lines (id, receipt_id, purchase_order_line_id, material_id, batch, location, ordered_quantity, received_quantity, accepted_quantity, rejected_quantity, unit, status, discrepancy_reason)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, '0.000', '0.000', ?, 'PENDING_QC', ?)`,
          )
          .run(
            lineId,
            receiptId,
            line.purchaseOrderLineId,
            line.materialId,
            line.batch,
            line.location,
            formatQuantityExact(line.orderedQuantity),
            formatQuantityExact(line.receivedQuantity),
            line.unit,
            line.discrepancyReason || null,
          );

        // Update Stock Balance: Increases physical and qc_pending. Available stays unchanged!
        const balance = sql
          .prepare(`SELECT physical, qc_pending FROM stock_balances WHERE material_id = ? AND warehouse_id = ?`)
          .get(line.materialId, input.warehouseId) as { physical: string; qc_pending: string } | undefined;

        if (balance) {
          const newPhysical = addQuantity(balance.physical, line.receivedQuantity);
          const newQcPending = addQuantity(balance.qc_pending, line.receivedQuantity);
          sql
            .prepare(
              `UPDATE stock_balances
               SET physical = ?, qc_pending = ?, updated_at = ?, version = version + 1
               WHERE material_id = ? AND warehouse_id = ?`,
            )
            .run(newPhysical, newQcPending, now, line.materialId, input.warehouseId);
        } else {
          sql
            .prepare(
              `INSERT INTO stock_balances (material_id, warehouse_id, physical, qc_pending, accepted, rejected, reserved, available, version, updated_at)
               VALUES (?, ?, ?, ?, '0.000', '0.000', '0.000', '0.000', 1, ?)`,
            )
            .run(line.materialId, input.warehouseId, formatQuantityExact(line.receivedQuantity), formatQuantityExact(line.receivedQuantity), now);
        }

        // Record stock movement (NONE -> QC_PENDING)
        const movementId = `smov_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        sql
          .prepare(
            `INSERT INTO stock_movements (id, material_id, warehouse_id, movement_type, quantity, unit, from_bucket, to_bucket, reference_type, reference_id, batch, location, actor_id, notes, occurred_at)
             VALUES (?, ?, ?, 'RECEIPT', ?, ?, 'NONE', 'QC_PENDING', 'GRN', ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            movementId,
            line.materialId,
            input.warehouseId,
            formatQuantityExact(line.receivedQuantity),
            line.unit,
            docNumber,
            line.batch,
            line.location,
            context.actor.id,
            `Inbound physical receipt from ${input.supplierName} (${input.purchaseOrderNumber})`,
            now,
          );
      }

      audit(context.actor.id, "receipt.create", "GRN", receiptId, {
        number: docNumber,
        purchaseOrderNumber: input.purchaseOrderNumber,
        supplierName: input.supplierName,
        lineCount: input.lines.length,
      });
    })();

    const result = await this.getReceipt(context.actor, receiptId);
    return result!;
  }

  /**
   * Performs QC Inspection.
   * Records inspected, accepted, and rejected quantities plus findings.
   * Atomically updates stock movements and balances.
   */
  async inspect(context: MutationContext, rawInput: unknown): Promise<InspectionView> {
    authorize(context.actor, "inspections:write");
    const input = performInspectionSchema.parse(rawInput);
    const sql = db();

    // Replay protection via idempotency key
    if (context.idempotencyKey) {
      const existing = sql
        .prepare(`SELECT id, number FROM qc_inspections WHERE idempotency_key = ?`)
        .get(context.idempotencyKey) as { id: string } | undefined;
      if (existing) {
        const found = await this.getInspection(context.actor, existing.id);
        if (found) return found;
      }
    }

    const inspectionId = `qc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    sql.transaction(() => {
      const line = sql
        .prepare(
          `SELECT r.id AS receiptId, r.number AS receiptNumber, r.warehouse_id AS warehouseId,
                  rl.id AS lineId, rl.material_id AS materialId, rl.batch, rl.location,
                  rl.received_quantity AS receivedQuantity, rl.accepted_quantity AS acceptedQuantity,
                  rl.rejected_quantity AS rejectedQuantity, rl.unit, rl.status
           FROM goods_receipt_lines rl
           JOIN goods_receipts r ON rl.receipt_id = r.id
           WHERE rl.id = ? AND r.id = ?`,
        )
        .get(input.receiptLineId, input.receiptId) as {
          receiptId: string;
          receiptNumber: string;
          warehouseId: string;
          lineId: string;
          materialId: string;
          batch: string;
          location: string;
          receivedQuantity: string;
          acceptedQuantity: string;
          rejectedQuantity: string;
          unit: string;
          status: string;
        } | undefined;

      if (!line) {
        throw new Error(`Receipt line ${input.receiptLineId} not found for receipt ${input.receiptId}`);
      }

      if (line.status === "INSPECTED") {
        throw new Error(`Receipt line ${input.receiptLineId} has already been fully inspected.`);
      }

      // Invariant: inspected == accepted + rejected
      const sumDecisions = addQuantity(input.acceptedQuantity, input.rejectedQuantity);
      if (compareQuantity(input.inspectedQuantity, sumDecisions) !== 0) {
        throw new Error(
          `Quantity mismatch: Inspected quantity (${input.inspectedQuantity}) must equal accepted (${input.acceptedQuantity}) + rejected (${input.rejectedQuantity}).`,
        );
      }

      // Check remaining uninspected quantity
      const alreadyInspected = addQuantity(line.acceptedQuantity, line.rejectedQuantity);
      const remainingUninspected = subQuantity(line.receivedQuantity, alreadyInspected);
      if (isQuantityGt(input.inspectedQuantity, remainingUninspected)) {
        throw new Error(
          `Inspected quantity (${input.inspectedQuantity}) exceeds remaining uninspected quantity (${remainingUninspected}).`,
        );
      }

      const docNumber = nextDocumentNumber("QC");
      const now = new Date().toISOString();

      // Insert QC Inspection record
      sql
        .prepare(
          `INSERT INTO qc_inspections (id, number, receipt_id, receipt_line_id, inspector_id, inspected_at, inspected_quantity, accepted_quantity, rejected_quantity, held_quantity, unit, status, notes, quarantine_reason, quarantine_value, created_at, updated_at, version, idempotency_key)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '0.000', ?, 'COMPLETED', ?, ?, ?, ?, ?, 1, ?)`,
        )
        .run(
          inspectionId,
          docNumber,
          input.receiptId,
          input.receiptLineId,
          context.actor.id,
          now,
          formatQuantityExact(input.inspectedQuantity),
          formatQuantityExact(input.acceptedQuantity),
          formatQuantityExact(input.rejectedQuantity),
          line.unit,
          input.notes || null,
          input.quarantineReason || null,
          input.quarantineValueMinor,
          now,
          now,
          context.idempotencyKey,
        );

      // Insert QC test details
      for (const t of input.tests) {
        const testId = `qct_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        sql
          .prepare(
            `INSERT INTO qc_inspection_tests (id, inspection_id, name, result, outcome)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .run(testId, inspectionId, t.name, t.result, t.outcome);
      }

      // Update receipt line status
      const updatedAccepted = addQuantity(line.acceptedQuantity, input.acceptedQuantity);
      const updatedRejected = addQuantity(line.rejectedQuantity, input.rejectedQuantity);
      const totalInspectedNow = addQuantity(updatedAccepted, updatedRejected);
      const lineFinished = compareQuantity(totalInspectedNow, line.receivedQuantity) === 0;

      sql
        .prepare(
          `UPDATE goods_receipt_lines
           SET accepted_quantity = ?, rejected_quantity = ?, status = ?
           WHERE id = ?`,
        )
        .run(updatedAccepted, updatedRejected, lineFinished ? "INSPECTED" : "PARTIALLY_INSPECTED", line.lineId);

      // Check if all lines in receipt are inspected
      const uninspectedLines = sql
        .prepare(
          `SELECT COUNT(*) AS count FROM goods_receipt_lines WHERE receipt_id = ? AND status != 'INSPECTED'`,
        )
        .get(input.receiptId) as { count: number };

      const allReceiptLinesFinished = uninspectedLines.count === 0;
      sql
        .prepare(`UPDATE goods_receipts SET status = ?, updated_at = ? WHERE id = ?`)
        .run(allReceiptLinesFinished ? "INSPECTED" : "PARTIALLY_INSPECTED", now, input.receiptId);

      // Update stock balances:
      const balance = sql
        .prepare(`SELECT qc_pending, accepted, rejected, available FROM stock_balances WHERE material_id = ? AND warehouse_id = ?`)
        .get(line.materialId, line.warehouseId) as {
          qc_pending: string;
          accepted: string;
          rejected: string;
          available: string;
        } | undefined;

      if (!balance) {
        throw new Error(`Stock balance not found for material ${line.materialId} in warehouse ${line.warehouseId}`);
      }

      const newQcPending = subQuantity(balance.qc_pending, input.inspectedQuantity);
      const newAccepted = addQuantity(balance.accepted, input.acceptedQuantity);
      const newRejected = addQuantity(balance.rejected, input.rejectedQuantity);
      const newAvailable = addQuantity(balance.available, input.acceptedQuantity);

      sql
        .prepare(
          `UPDATE stock_balances
           SET qc_pending = ?, accepted = ?, rejected = ?, available = ?, updated_at = ?, version = version + 1
           WHERE material_id = ? AND warehouse_id = ?`,
        )
        .run(newQcPending, newAccepted, newRejected, newAvailable, now, line.materialId, line.warehouseId);

      // Record stock movements
      if (!isQuantityZero(input.acceptedQuantity)) {
        const acceptMovId = `smov_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        sql
          .prepare(
            `INSERT INTO stock_movements (id, material_id, warehouse_id, movement_type, quantity, unit, from_bucket, to_bucket, reference_type, reference_id, batch, location, actor_id, notes, occurred_at)
             VALUES (?, ?, ?, 'QC_ACCEPT', ?, ?, 'QC_PENDING', 'ACCEPTED', 'QC', ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            acceptMovId,
            line.materialId,
            line.warehouseId,
            formatQuantityExact(input.acceptedQuantity),
            line.unit,
            docNumber,
            line.batch,
            line.location,
            context.actor.id,
            `QC accepted ${input.acceptedQuantity} ${line.unit} for production into available stock`,
            now,
          );
      }

      if (!isQuantityZero(input.rejectedQuantity)) {
        const rejectMovId = `smov_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        sql
          .prepare(
            `INSERT INTO stock_movements (id, material_id, warehouse_id, movement_type, quantity, unit, from_bucket, to_bucket, reference_type, reference_id, batch, location, actor_id, notes, occurred_at)
             VALUES (?, ?, ?, 'QC_REJECT', ?, ?, 'QC_PENDING', 'REJECTED', 'QC', ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            rejectMovId,
            line.materialId,
            line.warehouseId,
            formatQuantityExact(input.rejectedQuantity),
            line.unit,
            docNumber,
            line.batch,
            line.location,
            context.actor.id,
            `QC rejected ${input.rejectedQuantity} ${line.unit} quarantined: ${input.quarantineReason || "Quality rejection"}`,
            now,
          );
      }

      audit(context.actor.id, "inspection.complete", "QC", inspectionId, {
        number: docNumber,
        receiptNumber: line.receiptNumber,
        accepted: input.acceptedQuantity,
        rejected: input.rejectedQuantity,
      });
    })();

    const result = await this.getInspection(context.actor, inspectionId);
    return result!;
  }

  /**
   * Warehouse verification of stock availability for FPBB (Material Request).
   */
  async verifyRequestStock(
    actor: Actor,
    input: {
      requestId: string;
      warehouseId: string;
      items: { materialId: string; requestedQuantity: string }[];
    },
  ) {
    authorize(actor, "requests:verify");
    const sql = db();
    const results: Array<{
      materialId: string;
      outcome: "VERIFIED" | "REJECTED";
      availableStock: string;
      requestedQuantity: string;
      reason: string;
    }> = [];
    let allAvailable = true;

    for (const item of input.items) {
      const balance = sql
        .prepare(`SELECT available FROM stock_balances WHERE material_id = ? AND warehouse_id = ?`)
        .get(item.materialId, input.warehouseId) as { available: string } | undefined;

      const avail = balance ? balance.available : "0.000";
      const isSufficient = isQuantityGte(avail, item.requestedQuantity);
      if (!isSufficient) allAvailable = false;

      const verId = `ver_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const now = new Date().toISOString();
      const outcome: "VERIFIED" | "REJECTED" = isSufficient ? "VERIFIED" : "REJECTED";
      const reason = isSufficient
        ? `Available stock (${avail}) is sufficient for requested (${item.requestedQuantity}).`
        : `Shortfall: requested ${item.requestedQuantity}, but available stock is only ${avail}.`;

      sql
        .prepare(
          `INSERT INTO fpbb_verifications (id, request_id, material_id, warehouse_id, verified_by, verified_at, outcome, requested_quantity, available_stock, reason)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(verId, input.requestId, item.materialId, input.warehouseId, actor.id, now, outcome, item.requestedQuantity, avail, reason);

      results.push({
        materialId: item.materialId,
        outcome,
        availableStock: avail,
        requestedQuantity: item.requestedQuantity,
        reason,
      });
    }

    audit(actor.id, "request.verify", "FPBB", input.requestId, {
      outcome: allAvailable ? "VERIFIED" : "REJECTED",
      itemCount: input.items.length,
    });

    return {
      requestId: input.requestId,
      overallOutcome: allAvailable ? "VERIFIED" : "REJECTED",
      verifiedBy: actor.id,
      verifiedAt: new Date().toISOString(),
      details: results,
    };
  }

  /**
   * Reserves stock atomically against a Sales Order line.
   * Invariant: Prevents concurrent overselling. Checks SO credit status.
   */
  async reserveStock(context: MutationContext, rawInput: unknown) {
    if (!can(context.actor, "dispatches:write") && !can(context.actor, "receipts:write")) {
      throw new AccessError(403, "You do not have permission to reserve stock.");
    }
    const input = reserveStockSchema.parse(rawInput);
    const sql = db();

    return sql.transaction(() => {
      const so = sql
        .prepare(
          `SELECT so.id, so.number, so.status, so.credit_status AS creditStatus,
                  sol.id AS lineId, sol.quantity, sol.reserved_quantity AS reservedQuantity,
                  sol.dispatched_quantity AS dispatchedQuantity, sol.unit
           FROM sales_orders so
           JOIN sales_order_lines sol ON sol.sales_order_id = so.id
           WHERE so.id = ? AND sol.id = ?`,
        )
        .get(input.salesOrderId, input.salesOrderLineId) as {
          id: string;
          number: string;
          status: string;
          creditStatus: string;
          lineId: string;
          quantity: string;
          reservedQuantity: string;
          dispatchedQuantity: string;
          unit: string;
        } | undefined;

      if (!so) {
        throw new Error(`Sales order line not found: SO ${input.salesOrderId}, line ${input.salesOrderLineId}`);
      }

      if (so.creditStatus !== "APPROVED") {
        throw new Error(
          `Cannot reserve stock: Sales Order ${so.number} credit status is "${so.creditStatus}". Credit approval required before stock allocation.`,
        );
      }

      const unreservedOnSo = subQuantity(so.quantity, so.reservedQuantity);
      if (isQuantityGt(input.quantity, unreservedOnSo)) {
        throw new Error(
          `Reservation quantity (${input.quantity}) exceeds remaining unreserved line quantity (${unreservedOnSo}).`,
        );
      }

      const balance = sql
        .prepare(
          `SELECT physical, accepted, reserved, available, version
           FROM stock_balances
           WHERE material_id = ? AND warehouse_id = ?`,
        )
        .get(input.materialId, input.warehouseId) as {
          physical: string;
          accepted: string;
          reserved: string;
          available: string;
          version: number;
        } | undefined;

      if (!balance) {
        throw new Error(`No stock found for material ${input.materialId} in warehouse ${input.warehouseId}`);
      }

      if (isQuantityGt(input.quantity, balance.available)) {
        throw new Error(
          `Insufficient available stock: Requested reservation ${input.quantity} exceeds available ${balance.available}.`,
        );
      }

      const now = new Date().toISOString();
      const newAvailable = subQuantity(balance.available, input.quantity);
      const newReserved = addQuantity(balance.reserved, input.quantity);

      sql
        .prepare(
          `UPDATE stock_balances
           SET reserved = ?, available = ?, updated_at = ?, version = version + 1
           WHERE material_id = ? AND warehouse_id = ?`,
        )
        .run(newReserved, newAvailable, now, input.materialId, input.warehouseId);

      const updatedSoReserved = addQuantity(so.reservedQuantity, input.quantity);
      sql
        .prepare(`UPDATE sales_order_lines SET reserved_quantity = ? WHERE id = ?`)
        .run(updatedSoReserved, input.salesOrderLineId);

      const movId = `smov_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      sql
        .prepare(
          `INSERT INTO stock_movements (id, material_id, warehouse_id, movement_type, quantity, unit, from_bucket, to_bucket, reference_type, reference_id, actor_id, notes, occurred_at)
           VALUES (?, ?, ?, 'RESERVE', ?, ?, 'ACCEPTED', 'RESERVED', 'SO', ?, ?, ?, ?)`,
        )
        .run(
          movId,
          input.materialId,
          input.warehouseId,
          formatQuantityExact(input.quantity),
          so.unit,
          so.number,
          context.actor.id,
          `Stock reserved for Sales Order ${so.number}`,
          now,
        );

      audit(context.actor.id, "stock.reserve", "SO", input.salesOrderId, {
        salesOrderNumber: so.number,
        materialId: input.materialId,
        quantity: input.quantity,
      });

      return {
        salesOrderId: input.salesOrderId,
        salesOrderLineId: input.salesOrderLineId,
        reservedQuantity: input.quantity,
        newAvailable,
        newReserved,
      };
    })();
  }

  /**
   * Releases previously reserved stock back to available stock.
   */
  async releaseStockReservation(context: MutationContext, input: { salesOrderId: string; salesOrderLineId: string; materialId: string; warehouseId: string; quantity: string }) {
    if (!can(context.actor, "dispatches:write") && !can(context.actor, "receipts:write")) {
      throw new AccessError(403, "You do not have permission to release stock reservations.");
    }
    const sql = db();

    return sql.transaction(() => {
      const so = sql
        .prepare(
          `SELECT so.id, so.number, sol.reserved_quantity AS reservedQuantity, sol.unit
           FROM sales_orders so
           JOIN sales_order_lines sol ON sol.sales_order_id = so.id
           WHERE so.id = ? AND sol.id = ?`,
        )
        .get(input.salesOrderId, input.salesOrderLineId) as {
          id: string;
          number: string;
          reservedQuantity: string;
          unit: string;
        } | undefined;

      if (!so) {
        throw new Error(`Sales order line not found: ${input.salesOrderLineId}`);
      }

      if (isQuantityGt(input.quantity, so.reservedQuantity)) {
        throw new Error(`Release quantity (${input.quantity}) exceeds reserved quantity (${so.reservedQuantity}).`);
      }

      const balance = sql
        .prepare(`SELECT reserved, available FROM stock_balances WHERE material_id = ? AND warehouse_id = ?`)
        .get(input.materialId, input.warehouseId) as { reserved: string; available: string } | undefined;

      if (!balance) {
        throw new Error(`Stock balance not found for material ${input.materialId}`);
      }

      const now = new Date().toISOString();
      const newReserved = subQuantity(balance.reserved, input.quantity);
      const newAvailable = addQuantity(balance.available, input.quantity);

      sql
        .prepare(
          `UPDATE stock_balances
           SET reserved = ?, available = ?, updated_at = ?, version = version + 1
           WHERE material_id = ? AND warehouse_id = ?`,
        )
        .run(newReserved, newAvailable, now, input.materialId, input.warehouseId);

      const updatedSoReserved = subQuantity(so.reservedQuantity, input.quantity);
      sql
        .prepare(`UPDATE sales_order_lines SET reserved_quantity = ? WHERE id = ?`)
        .run(updatedSoReserved, input.salesOrderLineId);

      const movId = `smov_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      sql
        .prepare(
          `INSERT INTO stock_movements (id, material_id, warehouse_id, movement_type, quantity, unit, from_bucket, to_bucket, reference_type, reference_id, actor_id, notes, occurred_at)
             VALUES (?, ?, ?, 'RELEASE_RESERVATION', ?, ?, 'RESERVED', 'ACCEPTED', 'SO', ?, ?, ?, ?)`,
        )
        .run(
          movId,
          input.materialId,
          input.warehouseId,
          formatQuantityExact(input.quantity),
          so.unit,
          so.number,
          context.actor.id,
          `Reservation released back to available stock for Sales Order ${so.number}`,
          now,
        );

      audit(context.actor.id, "stock.release_reservation", "SO", input.salesOrderId, {
        salesOrderNumber: so.number,
        quantity: input.quantity,
      });

      return { released: input.quantity, newAvailable, newReserved };
    })();
  }

  /**
   * Creates outbound Delivery Order (Dispatch).
   * Verifies credit and stock reservation before dispatch.
   */
  async createDispatch(context: MutationContext, rawInput: unknown): Promise<DeliveryOrderView> {
    if (!can(context.actor, "dispatches:write") && !can(context.actor, "receipts:write")) {
      throw new AccessError(403, "You do not have permission to dispatch orders.");
    }
    const input = createDispatchSchema.parse(rawInput);
    const sql = db();

    // Replay protection via idempotency key
    if (context.idempotencyKey) {
      const existing = sql
        .prepare(`SELECT id, number FROM delivery_orders WHERE idempotency_key = ?`)
        .get(context.idempotencyKey) as { id: string } | undefined;
      if (existing) {
        const found = await this.getDispatch(context.actor, existing.id);
        if (found) return found;
      }
    }

    const dispatchId = `do_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    sql.transaction(() => {
      const so = sql
        .prepare(`SELECT id, number, credit_status AS creditStatus FROM sales_orders WHERE id = ?`)
        .get(input.salesOrderId) as { id: string; number: string; creditStatus: string } | undefined;

      if (!so) {
        throw new Error(`Sales Order ${input.salesOrderId} not found.`);
      }

      if (so.creditStatus !== "APPROVED") {
        throw new Error(`Cannot dispatch: Sales Order ${so.number} credit status is "${so.creditStatus}".`);
      }

      const docNumber = nextDocumentNumber("DO");
      const now = new Date().toISOString();

      sql
        .prepare(
          `INSERT INTO delivery_orders (id, number, sales_order_id, warehouse_id, carrier_3pl, tracking_number, driver_name, vehicle_number, status, dispatched_at, created_by, created_at, updated_at, version, idempotency_key)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DISPATCHED', ?, ?, ?, ?, 1, ?)`,
        )
        .run(
          dispatchId,
          docNumber,
          input.salesOrderId,
          input.warehouseId,
          input.carrier3pl,
          input.trackingNumber || null,
          input.driverName || null,
          input.vehicleNumber || null,
          now,
          context.actor.id,
          now,
          now,
          context.idempotencyKey,
        );

      for (const line of input.lines) {
        const sol = sql
          .prepare(
            `SELECT reserved_quantity AS reservedQuantity, dispatched_quantity AS dispatchedQuantity
             FROM sales_order_lines WHERE id = ?`,
          )
          .get(line.salesOrderLineId) as { reservedQuantity: string; dispatchedQuantity: string } | undefined;

        if (!sol) {
          throw new Error(`Sales order line ${line.salesOrderLineId} not found.`);
        }

        if (isQuantityGt(line.quantity, sol.reservedQuantity)) {
          throw new Error(
            `Dispatch quantity (${line.quantity}) exceeds reserved quantity (${sol.reservedQuantity}). Stock must be reserved before dispatch.`,
          );
        }

        const dolId = `doline_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        sql
          .prepare(
            `INSERT INTO delivery_order_lines (id, delivery_order_id, sales_order_line_id, material_id, quantity, unit)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .run(dolId, dispatchId, line.salesOrderLineId, line.materialId, formatQuantityExact(line.quantity), line.unit);

        const balance = sql
          .prepare(`SELECT physical, reserved, accepted FROM stock_balances WHERE material_id = ? AND warehouse_id = ?`)
          .get(line.materialId, input.warehouseId) as { physical: string; reserved: string; accepted: string } | undefined;

        if (!balance) {
          throw new Error(`Stock balance not found for material ${line.materialId}`);
        }

        const newPhysical = subQuantity(balance.physical, line.quantity);
        const newReserved = subQuantity(balance.reserved, line.quantity);

        sql
          .prepare(
            `UPDATE stock_balances
             SET physical = ?, reserved = ?, updated_at = ?, version = version + 1
             WHERE material_id = ? AND warehouse_id = ?`,
          )
          .run(newPhysical, newReserved, now, line.materialId, input.warehouseId);

        const newSoDispatched = addQuantity(sol.dispatchedQuantity, line.quantity);
        const newSoReserved = subQuantity(sol.reservedQuantity, line.quantity);
        sql
          .prepare(`UPDATE sales_order_lines SET dispatched_quantity = ?, reserved_quantity = ? WHERE id = ?`)
          .run(newSoDispatched, newSoReserved, line.salesOrderLineId);

        const movId = `smov_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        sql
          .prepare(
            `INSERT INTO stock_movements (id, material_id, warehouse_id, movement_type, quantity, unit, from_bucket, to_bucket, reference_type, reference_id, actor_id, notes, occurred_at)
             VALUES (?, ?, ?, 'DISPATCH', ?, ?, 'RESERVED', 'DISPATCHED', 'DO', ?, ?, ?, ?)`,
          )
          .run(
            movId,
            line.materialId,
            input.warehouseId,
            formatQuantityExact(line.quantity),
            line.unit,
            docNumber,
            context.actor.id,
            `Dispatched via ${input.carrier3pl} (${docNumber}) for SO ${so.number}`,
            now,
          );
      }

      audit(context.actor.id, "delivery.dispatch", "DO", dispatchId, {
        number: docNumber,
        salesOrderNumber: so.number,
        carrier: input.carrier3pl,
      });
    })();

    const result = await this.getDispatch(context.actor, dispatchId);
    return result!;
  }

  /**
   * Physical Return Inspection & Classification.
   * Reads return claims, inspects physical goods, classifies condition.
   * Invariant: Return only eligible accepted quantities to available stock. Quarantines damaged.
   */
  async inspectReturnGoods(context: MutationContext, rawInput: unknown): Promise<ReturnInspectionView> {
    if (!can(context.actor, "returns:inspect") && !can(context.actor, "inspections:write")) {
      throw new AccessError(403, "You do not have permission to inspect returns.");
    }
    const input = inspectReturnSchema.parse(rawInput);
    const sql = db();

    if (context.idempotencyKey) {
      const existing = sql
        .prepare(`SELECT id, number FROM return_inspections WHERE idempotency_key = ?`)
        .get(context.idempotencyKey) as { id: string } | undefined;
      if (existing) {
        const found = await this.getReturn(context.actor, existing.id);
        if (found?.inspection) return found.inspection;
      }
    }

    const returnInspId = `ret_insp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    sql.transaction(() => {
      const claim = sql
        .prepare(`SELECT id FROM return_claims WHERE id = ?`)
        .get(input.returnClaimId);

      if (!claim) {
        throw new Error(`Return claim ${input.returnClaimId} not found.`);
      }

      // Invariant: inspected == accepted + damaged + rejected
      const sumComponents = addQuantity(
        addQuantity(input.acceptedQuantity, input.damagedQuantity),
        input.rejectedQuantity,
      );
      if (compareQuantity(input.inspectedQuantity, sumComponents) !== 0) {
        throw new Error(
          `Inspected quantity (${input.inspectedQuantity}) must equal accepted (${input.acceptedQuantity}) + damaged (${input.damagedQuantity}) + rejected (${input.rejectedQuantity}).`,
        );
      }

      const docNumber = nextDocumentNumber("RET");
      const now = new Date().toISOString();

      sql
        .prepare(
          `INSERT INTO return_inspections (id, number, return_claim_id, warehouse_id, material_id, claimed_quantity, inspected_quantity, accepted_quantity, damaged_quantity, rejected_quantity, unit, condition_classification, findings, inspector_id, inspected_at, status, created_at, version, idempotency_key)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INSPECTED', ?, 1, ?)`,
        )
        .run(
          returnInspId,
          docNumber,
          input.returnClaimId,
          input.warehouseId,
          input.materialId,
          formatQuantityExact(input.claimedQuantity),
          formatQuantityExact(input.inspectedQuantity),
          formatQuantityExact(input.acceptedQuantity),
          formatQuantityExact(input.damagedQuantity),
          formatQuantityExact(input.rejectedQuantity),
          input.unit,
          input.conditionClassification,
          input.findings,
          context.actor.id,
          now,
          now,
          context.idempotencyKey,
        );

      sql
        .prepare(`UPDATE return_claims SET status = 'INSPECTED' WHERE id = ?`)
        .run(input.returnClaimId);

      const balance = sql
        .prepare(`SELECT physical, accepted, rejected, available FROM stock_balances WHERE material_id = ? AND warehouse_id = ?`)
        .get(input.materialId, input.warehouseId) as {
          physical: string;
          accepted: string;
          rejected: string;
          available: string;
        } | undefined;

      if (balance) {
        const addedPhysical = addQuantity(input.acceptedQuantity, input.damagedQuantity);
        const newPhysical = addQuantity(balance.physical, addedPhysical);
        const newAccepted = addQuantity(balance.accepted, input.acceptedQuantity);
        const newRejected = addQuantity(balance.rejected, input.damagedQuantity);
        const newAvailable = addQuantity(balance.available, input.acceptedQuantity);

        sql
          .prepare(
            `UPDATE stock_balances
             SET physical = ?, accepted = ?, rejected = ?, available = ?, updated_at = ?, version = version + 1
             WHERE material_id = ? AND warehouse_id = ?`,
          )
          .run(newPhysical, newAccepted, newRejected, newAvailable, now, input.materialId, input.warehouseId);
      }

      if (!isQuantityZero(input.acceptedQuantity)) {
        const movId = `smov_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        sql
          .prepare(
            `INSERT INTO stock_movements (id, material_id, warehouse_id, movement_type, quantity, unit, from_bucket, to_bucket, reference_type, reference_id, actor_id, notes, occurred_at)
             VALUES (?, ?, ?, 'RETURN_ACCEPT', ?, ?, 'NONE', 'ACCEPTED', 'RET', ?, ?, ?, ?)`,
          )
          .run(
            movId,
            input.materialId,
            input.warehouseId,
            formatQuantityExact(input.acceptedQuantity),
            input.unit,
            docNumber,
            context.actor.id,
            `Returned resaleable goods restored to available stock: ${input.findings}`,
            now,
          );
      }

      if (!isQuantityZero(input.damagedQuantity)) {
        const movId = `smov_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        sql
          .prepare(
            `INSERT INTO stock_movements (id, material_id, warehouse_id, movement_type, quantity, unit, from_bucket, to_bucket, reference_type, reference_id, actor_id, notes, occurred_at)
             VALUES (?, ?, ?, 'RETURN_REJECT', ?, ?, 'NONE', 'REJECTED', 'RET', ?, ?, ?, ?)`,
          )
          .run(
            movId,
            input.materialId,
            input.warehouseId,
            formatQuantityExact(input.damagedQuantity),
            input.unit,
            docNumber,
            context.actor.id,
            `Returned damaged goods quarantined: ${input.findings}`,
            now,
          );
      }

      audit(context.actor.id, "return.inspect", "RET", returnInspId, {
        number: docNumber,
        accepted: input.acceptedQuantity,
        damaged: input.damagedQuantity,
        classification: input.conditionClassification,
      });
    })();

    const returnClaimObj = await this.getReturn(context.actor, input.returnClaimId);
    return returnClaimObj!.inspection!;
  }

  // --- QUERY METHODS ---

  async listReceipts(actor: Actor, query?: { search?: string; status?: string; warehouseId?: string }): Promise<GoodsReceiptView[]> {
    authorize(actor, "receipts:read");
    const sql = db();
    let q = `
      SELECT r.id, r.number, r.purchase_order_id AS purchaseOrderId,
             r.purchase_order_number AS purchaseOrderNumber,
             r.supplier_id AS supplierId, r.supplier_name AS supplierName,
             r.warehouse_id AS warehouseId, w.name AS warehouseName,
             r.supplier_delivery_number AS supplierDeliveryNumber,
             r.status, r.received_at AS receivedAt, r.created_by AS createdBy
      FROM goods_receipts r
      JOIN warehouses w ON r.warehouse_id = w.id
    `;
    const conditions: string[] = [];
    const params: string[] = [];

    if (query?.warehouseId && query.warehouseId !== "ALL") {
      conditions.push(`r.warehouse_id = ?`);
      params.push(query.warehouseId);
    }
    if (query?.status && query.status !== "ALL") {
      conditions.push(`r.status = ?`);
      params.push(query.status);
    }
    if (query?.search) {
      conditions.push(`(r.number LIKE ? OR r.purchase_order_number LIKE ? OR r.supplier_name LIKE ?)`);
      const s = `%${query.search}%`;
      params.push(s, s, s);
    }
    if (conditions.length) {
      q += ` WHERE ` + conditions.join(" AND ");
    }
    q += ` ORDER BY r.received_at DESC`;

    const receipts = sql.prepare(q).all(...params) as Array<{
      id: string;
      number: string;
      purchaseOrderId: string;
      purchaseOrderNumber: string;
      supplierId: string;
      supplierName: string;
      warehouseId: string;
      warehouseName: string;
      supplierDeliveryNumber: string;
      status: "RECORDED" | "PARTIALLY_INSPECTED" | "INSPECTED";
      receivedAt: string;
      createdBy: string;
    }>;

    return receipts.map((r) => {
      const lines = sql
        .prepare(
          `SELECT rl.id, rl.purchase_order_line_id AS purchaseOrderLineId,
                  rl.material_id AS materialId, m.name AS materialName, m.code AS materialCode,
                  rl.batch, rl.location, rl.ordered_quantity AS orderedQuantity,
                  rl.received_quantity AS receivedQuantity, rl.accepted_quantity AS acceptedQuantity,
                  rl.rejected_quantity AS rejectedQuantity, rl.unit, rl.status, rl.discrepancy_reason AS discrepancyReason
           FROM goods_receipt_lines rl
           JOIN materials m ON rl.material_id = m.id
           WHERE rl.receipt_id = ?`,
        )
        .all(r.id) as ReceiptLineView[];

      const inspection = sql
        .prepare(
          `SELECT qi.id, qi.number, qi.receipt_id AS receiptId, qi.receipt_line_id AS receiptLineId,
                  r.number AS receiptNumber, r.purchase_order_number AS purchaseOrderNumber,
                  r.supplier_name AS supplierName, m.name AS materialName, m.code AS materialCode,
                  qi.inspector_id AS inspectorId, u.name AS inspectorName, qi.inspected_at AS inspectedAt,
                  qi.inspected_quantity AS inspectedQuantity, qi.accepted_quantity AS acceptedQuantity,
                  qi.rejected_quantity AS rejectedQuantity, qi.unit, qi.status, qi.notes,
                  qi.quarantine_reason AS quarantineReason, qi.quarantine_value AS quarantineValueMinor
           FROM qc_inspections qi
           JOIN goods_receipts r ON qi.receipt_id = r.id
           JOIN goods_receipt_lines rl ON qi.receipt_line_id = rl.id
           JOIN materials m ON rl.material_id = m.id
           JOIN users u ON qi.inspector_id = u.id
           WHERE qi.receipt_id = ?`,
        )
        .get(r.id) as InspectionView | undefined;

      if (inspection) {
        inspection.tests = sql
          .prepare(`SELECT id, name, result, outcome FROM qc_inspection_tests WHERE inspection_id = ?`)
          .all(inspection.id) as InspectionTestView[];
      }

      return { ...r, lines, inspection: inspection || null };
    });
  }

  async getReceipt(actor: Actor, id: string): Promise<GoodsReceiptView | null> {
    authorize(actor, "receipts:read");
    const sql = db();
    const r = sql
      .prepare(
        `SELECT r.id, r.number, r.purchase_order_id AS purchaseOrderId,
                r.purchase_order_number AS purchaseOrderNumber,
                r.supplier_id AS supplierId, r.supplier_name AS supplierName,
                r.warehouse_id AS warehouseId, w.name AS warehouseName,
                r.supplier_delivery_number AS supplierDeliveryNumber,
                r.status, r.received_at AS receivedAt, r.created_by AS createdBy
         FROM goods_receipts r
         JOIN warehouses w ON r.warehouse_id = w.id
         WHERE r.id = ? OR r.number = ?`,
      )
      .get(id, id) as {
        id: string;
        number: string;
        purchaseOrderId: string;
        purchaseOrderNumber: string;
        supplierId: string;
        supplierName: string;
        warehouseId: string;
        warehouseName: string;
        supplierDeliveryNumber: string;
        status: "RECORDED" | "PARTIALLY_INSPECTED" | "INSPECTED";
        receivedAt: string;
        createdBy: string;
      } | undefined;

    if (!r) return null;

    const lines = sql
      .prepare(
        `SELECT rl.id, rl.purchase_order_line_id AS purchaseOrderLineId,
                rl.material_id AS materialId, m.name AS materialName, m.code AS materialCode,
                rl.batch, rl.location, rl.ordered_quantity AS orderedQuantity,
                rl.received_quantity AS receivedQuantity, rl.accepted_quantity AS acceptedQuantity,
                rl.rejected_quantity AS rejectedQuantity, rl.unit, rl.status, rl.discrepancy_reason AS discrepancyReason
         FROM goods_receipt_lines rl
         JOIN materials m ON rl.material_id = m.id
         WHERE rl.receipt_id = ?`,
      )
      .all(r.id) as ReceiptLineView[];

    const inspection = sql
      .prepare(
        `SELECT qi.id, qi.number, qi.receipt_id AS receiptId, qi.receipt_line_id AS receiptLineId,
                r.number AS receiptNumber, r.purchase_order_number AS purchaseOrderNumber,
                r.supplier_name AS supplierName, m.name AS materialName, m.code AS materialCode,
                qi.inspector_id AS inspectorId, u.name AS inspectorName, qi.inspected_at AS inspectedAt,
                qi.inspected_quantity AS inspectedQuantity, qi.accepted_quantity AS acceptedQuantity,
                qi.rejected_quantity AS rejectedQuantity, qi.unit, qi.status, qi.notes,
                qi.quarantine_reason AS quarantineReason, qi.quarantine_value AS quarantineValueMinor
         FROM qc_inspections qi
         JOIN goods_receipts r ON qi.receipt_id = r.id
         JOIN goods_receipt_lines rl ON qi.receipt_line_id = rl.id
         JOIN materials m ON rl.material_id = m.id
         JOIN users u ON qi.inspector_id = u.id
         WHERE qi.receipt_id = ?`,
      )
      .get(r.id) as InspectionView | undefined;

    if (inspection) {
      inspection.tests = sql
        .prepare(`SELECT id, name, result, outcome FROM qc_inspection_tests WHERE inspection_id = ?`)
        .all(inspection.id) as InspectionTestView[];
    }

    return { ...r, lines, inspection: inspection || null };
  }

  async listInspections(actor: Actor, query?: { search?: string; status?: string }): Promise<InspectionView[]> {
    authorize(actor, "inspections:read");
    const sql = db();
    let q = `
      SELECT qi.id, qi.number, qi.receipt_id AS receiptId, qi.receipt_line_id AS receiptLineId,
             r.number AS receiptNumber, r.purchase_order_number AS purchaseOrderNumber,
             r.supplier_name AS supplierName, m.name AS materialName, m.code AS materialCode,
             qi.inspector_id AS inspectorId, u.name AS inspectorName, qi.inspected_at AS inspectedAt,
             qi.inspected_quantity AS inspectedQuantity, qi.accepted_quantity AS acceptedQuantity,
             qi.rejected_quantity AS rejectedQuantity, qi.unit, qi.status, qi.notes,
             qi.quarantine_reason AS quarantineReason, qi.quarantine_value AS quarantineValueMinor
      FROM qc_inspections qi
      JOIN goods_receipts r ON qi.receipt_id = r.id
      JOIN goods_receipt_lines rl ON qi.receipt_line_id = rl.id
      JOIN materials m ON rl.material_id = m.id
      JOIN users u ON qi.inspector_id = u.id
    `;
    const conditions: string[] = [];
    const params: string[] = [];

    if (query?.status && query.status !== "ALL") {
      conditions.push(`qi.status = ?`);
      params.push(query.status);
    }
    if (query?.search) {
      conditions.push(`(qi.number LIKE ? OR r.number LIKE ? OR m.name LIKE ?)`);
      const s = `%${query.search}%`;
      params.push(s, s, s);
    }
    if (conditions.length) {
      q += ` WHERE ` + conditions.join(" AND ");
    }
    q += ` ORDER BY qi.inspected_at DESC`;

    const inspections = sql.prepare(q).all(...params) as InspectionView[];
    return inspections.map((i) => {
      const tests = sql
        .prepare(`SELECT id, name, result, outcome FROM qc_inspection_tests WHERE inspection_id = ?`)
        .all(i.id) as InspectionTestView[];
      return { ...i, tests };
    });
  }

  async getInspection(actor: Actor, id: string): Promise<InspectionView | null> {
    authorize(actor, "inspections:read");
    const sql = db();
    const qi = sql
      .prepare(
        `SELECT qi.id, qi.number, qi.receipt_id AS receiptId, qi.receipt_line_id AS receiptLineId,
                r.number AS receiptNumber, r.purchase_order_number AS purchaseOrderNumber,
                r.supplier_name AS supplierName, m.name AS materialName, m.code AS materialCode,
                qi.inspector_id AS inspectorId, u.name AS inspectorName, qi.inspected_at AS inspectedAt,
                qi.inspected_quantity AS inspectedQuantity, qi.accepted_quantity AS acceptedQuantity,
                qi.rejected_quantity AS rejectedQuantity, qi.unit, qi.status, qi.notes,
                qi.quarantine_reason AS quarantineReason, qi.quarantine_value AS quarantineValueMinor
         FROM qc_inspections qi
         JOIN goods_receipts r ON qi.receipt_id = r.id
         JOIN goods_receipt_lines rl ON qi.receipt_line_id = rl.id
         JOIN materials m ON rl.material_id = m.id
         JOIN users u ON qi.inspector_id = u.id
         WHERE qi.id = ? OR qi.number = ?`,
      )
      .get(id, id) as InspectionView | undefined;

    if (!qi) return null;
    const tests = sql
      .prepare(`SELECT id, name, result, outcome FROM qc_inspection_tests WHERE inspection_id = ?`)
      .all(qi.id) as InspectionTestView[];
    return { ...qi, tests };
  }

  async listDispatches(actor: Actor, query?: { search?: string; status?: string }): Promise<DeliveryOrderView[]> {
    if (!can(actor, "dispatches:read") && !can(actor, "stock:read")) {
      throw new AccessError(403, "You do not have permission to view dispatches.");
    }
    const sql = db();
    let q = `
      SELECT do.id, do.number, do.sales_order_id AS salesOrderId,
             so.number AS salesOrderNumber, so.customer_name AS customerName,
             do.warehouse_id AS warehouseId, w.name AS warehouseName,
             do.carrier_3pl AS carrier3pl, do.tracking_number AS trackingNumber,
             do.driver_name AS driverName, do.vehicle_number AS vehicleNumber,
             do.status, do.dispatched_at AS dispatchedAt, do.delivered_at AS deliveredAt
      FROM delivery_orders do
      JOIN sales_orders so ON do.sales_order_id = so.id
      JOIN warehouses w ON do.warehouse_id = w.id
    `;
    const conditions: string[] = [];
    const params: string[] = [];

    if (query?.status && query.status !== "ALL") {
      conditions.push(`do.status = ?`);
      params.push(query.status);
    }
    if (query?.search) {
      conditions.push(`(do.number LIKE ? OR so.number LIKE ? OR so.customer_name LIKE ?)`);
      const s = `%${query.search}%`;
      params.push(s, s, s);
    }
    if (conditions.length) {
      q += ` WHERE ` + conditions.join(" AND ");
    }
    q += ` ORDER BY do.created_at DESC`;

    const dispatches = sql.prepare(q).all(...params) as Array<{
      id: string;
      number: string;
      salesOrderId: string;
      salesOrderNumber: string;
      customerName: string;
      warehouseId: string;
      warehouseName: string;
      carrier3pl: string;
      trackingNumber?: string | null;
      driverName?: string | null;
      vehicleNumber?: string | null;
      status: "DRAFT" | "PICKED" | "DISPATCHED" | "DELIVERED" | "CANCELLED";
      dispatchedAt?: string | null;
      deliveredAt?: string | null;
    }>;

    return dispatches.map((d) => {
      const lines = sql
        .prepare(
          `SELECT dol.id, dol.material_id AS materialId, m.name AS materialName, m.code AS materialCode,
                  dol.quantity, dol.unit
           FROM delivery_order_lines dol
           JOIN materials m ON dol.material_id = m.id
           WHERE dol.delivery_order_id = ?`,
        )
        .all(d.id) as DispatchLineView[];

      const attachments = sql
        .prepare(
          `SELECT id, file_name AS fileName, mime_type AS mimeType, file_size AS fileSize,
                  sha256, uploaded_at AS uploadedAt
           FROM inventory_attachments
           WHERE entity_type = 'DELIVERY_ORDER' AND entity_id = ?`,
        )
        .all(d.id) as AttachmentView[];

      return { ...d, lines, attachments };
    });
  }

  async getDispatch(actor: Actor, id: string): Promise<DeliveryOrderView | null> {
    if (!can(actor, "dispatches:read") && !can(actor, "stock:read")) {
      throw new AccessError(403, "You do not have permission to view dispatches.");
    }
    const sql = db();
    const d = sql
      .prepare(
        `SELECT do.id, do.number, do.sales_order_id AS salesOrderId,
                so.number AS salesOrderNumber, so.customer_name AS customerName,
                do.warehouse_id AS warehouseId, w.name AS warehouseName,
                do.carrier_3pl AS carrier3pl, do.tracking_number AS trackingNumber,
                do.driver_name AS driverName, do.vehicle_number AS vehicleNumber,
                do.status, do.dispatched_at AS dispatchedAt, do.delivered_at AS deliveredAt
         FROM delivery_orders do
         JOIN sales_orders so ON do.sales_order_id = so.id
         JOIN warehouses w ON do.warehouse_id = w.id
         WHERE do.id = ? OR do.number = ?`,
      )
      .get(id, id) as {
        id: string;
        number: string;
        salesOrderId: string;
        salesOrderNumber: string;
        customerName: string;
        warehouseId: string;
        warehouseName: string;
        carrier3pl: string;
        trackingNumber?: string | null;
        driverName?: string | null;
        vehicleNumber?: string | null;
        status: "DRAFT" | "PICKED" | "DISPATCHED" | "DELIVERED" | "CANCELLED";
        dispatchedAt?: string | null;
        deliveredAt?: string | null;
      } | undefined;

    if (!d) return null;

    const lines = sql
      .prepare(
        `SELECT dol.id, dol.material_id AS materialId, m.name AS materialName, m.code AS materialCode,
                dol.quantity, dol.unit
         FROM delivery_order_lines dol
         JOIN materials m ON dol.material_id = m.id
         WHERE dol.delivery_order_id = ?`,
      )
      .all(d.id) as DispatchLineView[];

    const attachments = sql
      .prepare(
        `SELECT id, file_name AS fileName, mime_type AS mimeType, file_size AS fileSize,
                sha256, uploaded_at AS uploadedAt
         FROM inventory_attachments
         WHERE entity_type = 'DELIVERY_ORDER' AND entity_id = ?`,
      )
      .all(d.id) as AttachmentView[];

    return { ...d, lines, attachments };
  }

  async listReturns(actor: Actor, query?: { search?: string; status?: string }): Promise<ReturnClaimView[]> {
    if (!can(actor, "returns:read") && !can(actor, "stock:read")) {
      throw new AccessError(403, "You do not have permission to view returns.");
    }
    const sql = db();
    let q = `
      SELECT rc.id, rc.number, rc.customer_id AS customerId, rc.customer_name AS customerName,
             rc.sales_order_id AS salesOrderId, rc.delivery_order_id AS deliveryOrderId,
             rc.material_id AS materialId, m.name AS materialName, m.code AS materialCode,
             rc.claimed_quantity AS claimedQuantity, rc.unit, rc.reason, rc.status,
             rc.created_at AS createdAt
      FROM return_claims rc
      JOIN materials m ON rc.material_id = m.id
    `;
    const conditions: string[] = [];
    const params: string[] = [];

    if (query?.status && query.status !== "ALL") {
      conditions.push(`rc.status = ?`);
      params.push(query.status);
    }
    if (query?.search) {
      conditions.push(`(rc.number LIKE ? OR rc.customer_name LIKE ? OR m.name LIKE ?)`);
      const s = `%${query.search}%`;
      params.push(s, s, s);
    }
    if (conditions.length) {
      q += ` WHERE ` + conditions.join(" AND ");
    }
    q += ` ORDER BY rc.created_at DESC`;

    const claims = sql.prepare(q).all(...params) as Array<{
      id: string;
      number: string;
      customerId: string;
      customerName: string;
      salesOrderId?: string | null;
      deliveryOrderId?: string | null;
      materialId: string;
      materialName: string;
      materialCode: string;
      claimedQuantity: string;
      unit: "L" | "kg" | "pcs";
      reason: string;
      status: "SUBMITTED" | "INSPECTED" | "AUTHORIZED" | "CREDITED" | "REJECTED";
      createdAt: string;
    }>;

    return claims.map((c) => {
      const inspection = sql
        .prepare(
          `SELECT ri.id, ri.number, ri.warehouse_id AS warehouseId, w.name AS warehouseName,
                  ri.inspected_quantity AS inspectedQuantity, ri.accepted_quantity AS acceptedQuantity,
                  ri.damaged_quantity AS damagedQuantity, ri.rejected_quantity AS rejectedQuantity,
                  ri.condition_classification AS conditionClassification, ri.findings,
                  ri.inspector_id AS inspectorId, u.name AS inspectorName, ri.inspected_at AS inspectedAt,
                  ri.status, ri.credit_note_number AS creditNoteNumber
           FROM return_inspections ri
           JOIN warehouses w ON ri.warehouse_id = w.id
           JOIN users u ON ri.inspector_id = u.id
           WHERE ri.return_claim_id = ?`,
        )
        .get(c.id) as ReturnInspectionView | undefined;
      return { ...c, inspection: inspection || null };
    });
  }

  async getReturn(actor: Actor, id: string): Promise<ReturnClaimView | null> {
    if (!can(actor, "returns:read") && !can(actor, "stock:read")) {
      throw new AccessError(403, "You do not have permission to view returns.");
    }
    const sql = db();
    const c = sql
      .prepare(
        `SELECT rc.id, rc.number, rc.customer_id AS customerId, rc.customer_name AS customerName,
                rc.sales_order_id AS salesOrderId, rc.delivery_order_id AS deliveryOrderId,
                rc.material_id AS materialId, m.name AS materialName, m.code AS materialCode,
                rc.claimed_quantity AS claimedQuantity, rc.unit, rc.reason, rc.status,
                rc.created_at AS createdAt
         FROM return_claims rc
         JOIN materials m ON rc.material_id = m.id
         WHERE rc.id = ? OR rc.number = ?`,
      )
      .get(id, id) as {
        id: string;
        number: string;
        customerId: string;
        customerName: string;
        salesOrderId?: string | null;
        deliveryOrderId?: string | null;
        materialId: string;
        materialName: string;
        materialCode: string;
        claimedQuantity: string;
        unit: "L" | "kg" | "pcs";
        reason: string;
        status: "SUBMITTED" | "INSPECTED" | "AUTHORIZED" | "CREDITED" | "REJECTED";
        createdAt: string;
      } | undefined;

    if (!c) return null;

    const inspection = sql
      .prepare(
        `SELECT ri.id, ri.number, ri.warehouse_id AS warehouseId, w.name AS warehouseName,
                ri.inspected_quantity AS inspectedQuantity, ri.accepted_quantity AS acceptedQuantity,
                ri.damaged_quantity AS damagedQuantity, ri.rejected_quantity AS rejectedQuantity,
                ri.condition_classification AS conditionClassification, ri.findings,
                ri.inspector_id AS inspectorId, u.name AS inspectorName, ri.inspected_at AS inspectedAt,
                ri.status, ri.credit_note_number AS creditNoteNumber
         FROM return_inspections ri
         JOIN warehouses w ON ri.warehouse_id = w.id
         JOIN users u ON ri.inspector_id = u.id
         WHERE ri.return_claim_id = ?`,
      )
      .get(c.id) as ReturnInspectionView | undefined;

    return { ...c, inspection: inspection || null };
  }

  async listMovements(actor: Actor, query?: { materialId?: string; warehouseId?: string; limit?: number }): Promise<StockMovementView[]> {
    authorize(actor, "stock:read");
    const sql = db();
    let q = `
      SELECT sm.id, sm.material_id AS materialId, m.code AS materialCode, m.name AS materialName,
             sm.warehouse_id AS warehouseId, w.name AS warehouseName,
             sm.movement_type AS movementType, sm.quantity, sm.unit,
             sm.from_bucket AS fromBucket, sm.to_bucket AS toBucket,
             sm.reference_type AS referenceType, sm.reference_id AS referenceId,
             sm.batch, sm.location, sm.actor_id AS actorId, u.name AS actorName,
             sm.notes, sm.occurred_at AS occurredAt
      FROM stock_movements sm
      JOIN materials m ON sm.material_id = m.id
      JOIN warehouses w ON sm.warehouse_id = w.id
      JOIN users u ON sm.actor_id = u.id
    `;
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (query?.materialId) {
      conditions.push(`sm.material_id = ?`);
      params.push(query.materialId);
    }
    if (query?.warehouseId) {
      conditions.push(`sm.warehouse_id = ?`);
      params.push(query.warehouseId);
    }
    if (conditions.length) {
      q += ` WHERE ` + conditions.join(" AND ");
    }
    q += ` ORDER BY sm.occurred_at DESC LIMIT ?`;
    params.push(query?.limit || 50);

    return sql.prepare(q).all(...params) as StockMovementView[];
  }

  async listMaterials(actor: Actor): Promise<MaterialRecord[]> {
    authorize(actor, "stock:read");
    return db().prepare(`SELECT * FROM materials ORDER BY code ASC`).all() as MaterialRecord[];
  }

  async listWarehouses(actor: Actor): Promise<WarehouseRecord[]> {
    authorize(actor, "stock:read");
    return db().prepare(`SELECT * FROM warehouses ORDER BY code ASC`).all() as WarehouseRecord[];
  }

  async listSalesOrders(actor: Actor): Promise<SalesOrderView[]> {
    authorize(actor, "stock:read");
    const sos = db().prepare(`SELECT * FROM sales_orders ORDER BY ordered_at DESC`).all() as Array<{
      id: string;
      number: string;
      customer_id: string;
      customer_name: string;
      warehouse_id: string;
      status: "DRAFT" | "APPROVED" | "CREDIT_HOLD" | "PARTIALLY_DISPATCHED" | "COMPLETED" | "CANCELLED";
      credit_status: "APPROVED" | "HOLD" | "PENDING";
      total_minor: number;
      ordered_at: string;
      created_at: string;
    }>;

    return sos.map((so) => {
      const lines = db()
        .prepare(
          `SELECT sol.id, sol.material_id AS materialId, m.name AS materialName, m.code AS materialCode,
                  sol.quantity, sol.reserved_quantity AS reservedQuantity,
                  sol.dispatched_quantity AS dispatchedQuantity, sol.unit, sol.unit_price_minor AS unitPriceMinor
           FROM sales_order_lines sol
           JOIN materials m ON sol.material_id = m.id
           WHERE sol.sales_order_id = ?`,
        )
        .all(so.id) as SalesOrderLineView[];
      return { ...so, lines };
    });
  }
}

export const inventoryService = new InventoryServiceImpl();
