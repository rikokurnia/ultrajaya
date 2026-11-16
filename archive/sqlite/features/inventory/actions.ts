"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { inventoryService } from "./server/inventory-service";
import { saveAttachment } from "./server/attachments";
import { randomUUID } from "node:crypto";
import { Unit } from "@/shared/contracts/domain";

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export async function recordReceiptAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser("/inventory/receipts");
    const purchaseOrderId = formData.get("purchaseOrderId") as string;
    const purchaseOrderNumber = formData.get("purchaseOrderNumber") as string;
    const supplierId = formData.get("supplierId") as string;
    const supplierName = formData.get("supplierName") as string;
    const warehouseId = formData.get("warehouseId") as string;
    const supplierDeliveryNumber = formData.get("supplierDeliveryNumber") as string;
    const permitOverReceipt = formData.get("permitOverReceipt") === "true";
    const idempotencyKey = (formData.get("idempotencyKey") as string) || `idem_grn_${randomUUID()}`;

    const linesJson = formData.get("lines") as string;
    let lines: Array<{
      purchaseOrderLineId: string;
      materialId: string;
      batch: string;
      location: string;
      orderedQuantity: string;
      receivedQuantity: string;
      unit: Unit;
      discrepancyReason?: string;
    }> = [];

    if (linesJson) {
      lines = JSON.parse(linesJson);
    } else {
      lines = [
        {
          purchaseOrderLineId: formData.get("purchaseOrderLineId") as string,
          materialId: formData.get("materialId") as string,
          batch: formData.get("batch") as string,
          location: formData.get("location") as string,
          orderedQuantity: formData.get("orderedQuantity") as string,
          receivedQuantity: formData.get("receivedQuantity") as string,
          unit: formData.get("unit") as Unit,
          discrepancyReason: (formData.get("discrepancyReason") as string) || undefined,
        },
      ];
    }

    const context = {
      actor: user,
      expectedVersion: 1,
      idempotencyKey,
    };

    const receipt = await inventoryService.receive(context, {
      purchaseOrderId,
      purchaseOrderNumber,
      supplierId,
      supplierName,
      warehouseId,
      supplierDeliveryNumber,
      permitOverReceipt,
      lines,
    });

    revalidatePath("/inventory/receipts");
    revalidatePath("/inventory/stock");
    return { success: true, message: `Goods receipt ${receipt?.number} recorded as QC-pending.`, data: receipt };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to record goods receipt.";
    return { success: false, error: errorMsg };
  }
}

export async function performInspectionAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser("/inventory/inspections");
    const receiptId = formData.get("receiptId") as string;
    const receiptLineId = formData.get("receiptLineId") as string;
    const inspectedQuantity = formData.get("inspectedQuantity") as string;
    const acceptedQuantity = formData.get("acceptedQuantity") as string;
    const rejectedQuantity = formData.get("rejectedQuantity") as string;
    const notes = formData.get("notes") as string;
    const quarantineReason = formData.get("quarantineReason") as string;
    const quarantineValueMinor = Number(formData.get("quarantineValueMinor") || "0");
    const idempotencyKey = (formData.get("idempotencyKey") as string) || `idem_qc_${randomUUID()}`;

    const testsJson = formData.get("tests") as string;
    const tests = testsJson ? JSON.parse(testsJson) : [
      { name: "Visual and Packaging", result: "Passed integrity check", outcome: "ACCEPTED" as const },
    ];

    const context = {
      actor: user,
      expectedVersion: 1,
      idempotencyKey,
    };

    const inspection = await inventoryService.inspect(context, {
      receiptId,
      receiptLineId,
      inspectedQuantity,
      acceptedQuantity,
      rejectedQuantity,
      tests,
      notes,
      quarantineReason,
      quarantineValueMinor,
    });

    revalidatePath("/inventory/inspections");
    revalidatePath("/inventory/receipts");
    revalidatePath("/inventory/stock");
    return { success: true, message: `QC inspection ${inspection?.number} recorded successfully.`, data: inspection };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to perform QC inspection.";
    return { success: false, error: errorMsg };
  }
}

export async function verifyRequestStockAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser("/inventory/stock");
    const requestId = formData.get("requestId") as string;
    const warehouseId = formData.get("warehouseId") as string;
    const itemsJson = formData.get("items") as string;
    const items = JSON.parse(itemsJson);

    const result = await inventoryService.verifyRequestStock(user, {
      requestId,
      warehouseId,
      items,
    });

    revalidatePath("/inventory/stock");
    return { success: true, message: `Stock verified: ${result.overallOutcome}`, data: result };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to verify stock.";
    return { success: false, error: errorMsg };
  }
}

export async function reserveStockAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser("/inventory/dispatches");
    const salesOrderId = formData.get("salesOrderId") as string;
    const salesOrderLineId = formData.get("salesOrderLineId") as string;
    const materialId = formData.get("materialId") as string;
    const warehouseId = formData.get("warehouseId") as string;
    const quantity = formData.get("quantity") as string;
    const idempotencyKey = (formData.get("idempotencyKey") as string) || `idem_res_${randomUUID()}`;

    const context = {
      actor: user,
      expectedVersion: 1,
      idempotencyKey,
    };

    const result = await inventoryService.reserveStock(context, {
      salesOrderId,
      salesOrderLineId,
      materialId,
      warehouseId,
      quantity,
    });

    revalidatePath("/inventory/dispatches");
    revalidatePath("/inventory/stock");
    return { success: true, message: "Stock reserved atomically.", data: result };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to reserve stock.";
    return { success: false, error: errorMsg };
  }
}

export async function releaseStockReservationAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser("/inventory/dispatches");
    const salesOrderId = formData.get("salesOrderId") as string;
    const salesOrderLineId = formData.get("salesOrderLineId") as string;
    const materialId = formData.get("materialId") as string;
    const warehouseId = formData.get("warehouseId") as string;
    const quantity = formData.get("quantity") as string;
    const idempotencyKey = (formData.get("idempotencyKey") as string) || `idem_rel_${randomUUID()}`;

    const context = {
      actor: user,
      expectedVersion: 1,
      idempotencyKey,
    };

    const result = await inventoryService.releaseStockReservation(context, {
      salesOrderId,
      salesOrderLineId,
      materialId,
      warehouseId,
      quantity,
    });

    revalidatePath("/inventory/dispatches");
    revalidatePath("/inventory/stock");
    return { success: true, message: "Stock reservation released back to available.", data: result };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to release reservation.";
    return { success: false, error: errorMsg };
  }
}

export async function createDispatchAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser("/inventory/dispatches");
    const salesOrderId = formData.get("salesOrderId") as string;
    const warehouseId = formData.get("warehouseId") as string;
    const carrier3pl = formData.get("carrier3pl") as string;
    const trackingNumber = (formData.get("trackingNumber") as string) || undefined;
    const driverName = (formData.get("driverName") as string) || undefined;
    const vehicleNumber = (formData.get("vehicleNumber") as string) || undefined;
    const idempotencyKey = (formData.get("idempotencyKey") as string) || `idem_do_${randomUUID()}`;

    const linesJson = formData.get("lines") as string;
    const lines = JSON.parse(linesJson);

    const context = {
      actor: user,
      expectedVersion: 1,
      idempotencyKey,
    };

    const dispatch = await inventoryService.createDispatch(context, {
      salesOrderId,
      warehouseId,
      carrier3pl,
      trackingNumber,
      driverName,
      vehicleNumber,
      lines,
    });

    revalidatePath("/inventory/dispatches");
    revalidatePath("/inventory/stock");
    return { success: true, message: `Delivery Order ${dispatch?.number} created and dispatched.`, data: dispatch };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create delivery order.";
    return { success: false, error: errorMsg };
  }
}

export async function uploadSignedDOAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser("/inventory/dispatches");
    const dispatchId = formData.get("dispatchId") as string;
    const file = formData.get("file") as File;

    if (!file || file.size === 0) {
      return { success: false, error: "Please select a valid signed delivery order file to upload." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const attachment = saveAttachment(user, {
      entityType: "DELIVERY_ORDER",
      entityId: dispatchId,
      fileName: file.name,
      mimeType: file.type || "application/pdf",
      buffer,
    });

    const { db } = await import("@/server/db");
    const now = new Date().toISOString();
    db().prepare(`UPDATE delivery_orders SET status = 'DELIVERED', delivered_at = ?, updated_at = ? WHERE id = ?`).run(now, now, dispatchId);

    revalidatePath("/inventory/dispatches");
    return { success: true, message: `Signed Delivery Order evidence attached successfully (${attachment.fileName}).`, data: attachment };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to upload signed DO evidence.";
    return { success: false, error: errorMsg };
  }
}

export async function inspectReturnAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser("/inventory/returns");
    const returnClaimId = formData.get("returnClaimId") as string;
    const warehouseId = formData.get("warehouseId") as string;
    const materialId = formData.get("materialId") as string;
    const claimedQuantity = formData.get("claimedQuantity") as string;
    const inspectedQuantity = formData.get("inspectedQuantity") as string;
    const acceptedQuantity = formData.get("acceptedQuantity") as string;
    const damagedQuantity = formData.get("damagedQuantity") as string;
    const rejectedQuantity = formData.get("rejectedQuantity") as string;
    const unit = formData.get("unit") as Unit;
    const conditionClassification = formData.get("conditionClassification") as (
      | "RESALEABLE"
      | "DAMAGED_SCRAP"
      | "CUSTOMER_MISUSE"
      | "INCOMPLETE"
    );
    const findings = formData.get("findings") as string;
    const idempotencyKey = (formData.get("idempotencyKey") as string) || `idem_ret_${randomUUID()}`;

    const context = {
      actor: user,
      expectedVersion: 1,
      idempotencyKey,
    };

    const returnInsp = await inventoryService.inspectReturnGoods(context, {
      returnClaimId,
      warehouseId,
      materialId,
      claimedQuantity,
      inspectedQuantity,
      acceptedQuantity,
      damagedQuantity,
      rejectedQuantity,
      unit,
      conditionClassification,
      findings,
    });

    revalidatePath("/inventory/returns");
    revalidatePath("/inventory/stock");
    return { success: true, message: `Return inspection ${returnInsp?.number} recorded. Accepted goods restored to available stock.`, data: returnInsp };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to inspect return goods.";
    return { success: false, error: errorMsg };
  }
}
