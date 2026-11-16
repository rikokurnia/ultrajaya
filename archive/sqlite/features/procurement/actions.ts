"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { requirePermission } from "@/lib/auth/session";
import { procurementService } from "./service";
import type {
  CreateRequestInput,
  VerifyRequestInput,
  CreateRfqInput,
  RecordQuotationInput,
  EvaluateSuppliersInput,
  CreateOrderInput,
  DecideApprovalInput,
  IssueOrderInput,
  SupplierInput,
} from "./types";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

export async function createRequestAction(input: CreateRequestInput): Promise<ActionResult> {
  try {
    const actor = await requirePermission("requests:write");
    const result = await procurementService.createRequest(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      input,
    );
    revalidatePath("/procurement/requests");
    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err, "Failed to create material request.") };
  }
}

export async function verifyRequestAction(
  id: string,
  expectedVersion: number,
  input: VerifyRequestInput,
): Promise<ActionResult> {
  try {
    const actor = await requirePermission("requests:verify");
    const result = await procurementService.verifyRequest(
      { actor, expectedVersion, idempotencyKey: randomUUID() },
      id,
      input,
    );
    revalidatePath("/procurement/requests");
    revalidatePath("/procurement/rfqs");
    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err, "Failed to verify material request.") };
  }
}

export async function createRfqAction(input: CreateRfqInput): Promise<ActionResult> {
  try {
    const actor = await requirePermission("rfqs:write");
    const result = await procurementService.createRfq(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      input,
    );
    revalidatePath("/procurement/rfqs");
    return { success: true, data: result };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err, "Failed to create RFQ.") };
  }
}

export async function recordQuotationAction(input: RecordQuotationInput): Promise<ActionResult> {
  try {
    const actor = await requirePermission("rfqs:write");
    const result = await procurementService.recordQuotation(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      input,
    );
    revalidatePath("/procurement/rfqs");
    return { success: true, data: result };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err, "Failed to record quotation.") };
  }
}

export async function evaluateSuppliersAction(input: EvaluateSuppliersInput): Promise<ActionResult> {
  try {
    const actor = await requirePermission("rfqs:write");
    const result = await procurementService.evaluateSuppliers(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      input,
    );
    revalidatePath("/procurement/rfqs");
    revalidatePath("/procurement/suppliers");
    return { success: true, data: result };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err, "Failed to finalize supplier evaluation.") };
  }
}

export async function createOrderAction(input: CreateOrderInput): Promise<ActionResult> {
  try {
    const actor = await requirePermission("orders:write");
    const result = await procurementService.createOrder(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      input,
    );
    revalidatePath("/procurement/orders");
    revalidatePath("/procurement/approvals");
    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err, "Failed to create purchase order.") };
  }
}

export async function decideApprovalAction(
  orderId: string,
  expectedVersion: number,
  input: DecideApprovalInput,
): Promise<ActionResult> {
  try {
    const actor = await requirePermission("approvals:decide");
    const result = await procurementService.decideApproval(
      { actor, expectedVersion, idempotencyKey: randomUUID() },
      orderId,
      input,
    );
    revalidatePath("/procurement/approvals");
    revalidatePath("/procurement/orders");
    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err, "Failed to decide approval.") };
  }
}

export async function reviseOrderAction(
  orderId: string,
  expectedVersion: number,
  input: CreateOrderInput,
): Promise<ActionResult> {
  try {
    const actor = await requirePermission("orders:write");
    const result = await procurementService.reviseOrder(
      { actor, expectedVersion, idempotencyKey: randomUUID() },
      orderId,
      input,
    );
    revalidatePath("/procurement/orders");
    revalidatePath("/procurement/approvals");
    return { success: true, data: result };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err, "Failed to revise purchase order.") };
  }
}

export async function issueOrderAction(
  orderId: string,
  expectedVersion: number,
  input: IssueOrderInput,
): Promise<ActionResult> {
  try {
    const actor = await requirePermission("orders:write");
    const result = await procurementService.issueOrder(
      { actor, expectedVersion, idempotencyKey: randomUUID() },
      orderId,
      input,
    );
    revalidatePath("/procurement/orders");
    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err, "Failed to issue purchase order.") };
  }
}

export async function createSupplierAction(input: SupplierInput): Promise<ActionResult> {
  try {
    const actor = await requirePermission("suppliers:write");
    const result = await procurementService.createSupplier(
      { actor, expectedVersion: 1, idempotencyKey: randomUUID() },
      input,
    );
    revalidatePath("/procurement/suppliers");
    return { success: true, data: result };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err, "Failed to create supplier record.") };
  }
}
