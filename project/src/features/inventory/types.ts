import { Unit } from "@/shared/contracts/domain";

export interface MaterialRecord {
  id: string;
  code: string;
  name: string;
  category: "RAW_MATERIAL" | "PACKAGING" | "FINISHED_GOOD";
  unit: Unit;
  minimum_quantity: string;
  active: number;
}

export interface WarehouseRecord {
  id: string;
  code: string;
  name: string;
  active: number;
}

export interface StockBalanceView {
  materialId: string;
  warehouseId: string;
  materialCode: string;
  materialName: string;
  category: "RAW_MATERIAL" | "PACKAGING" | "FINISHED_GOOD";
  unit: Unit;
  minimumQuantity: string;
  warehouseCode: string;
  warehouseName: string;
  physical: string;
  qcPending: string;
  accepted: string;
  rejected: string;
  reserved: string;
  available: string;
  version: number;
  updatedAt: string;
  status: "BELOW_MINIMUM" | "HEALTHY";
}

export interface ReceiptLineView {
  id: string;
  purchaseOrderLineId: string;
  materialId: string;
  materialName: string;
  materialCode: string;
  batch: string;
  location: string;
  orderedQuantity: string;
  receivedQuantity: string;
  acceptedQuantity: string;
  rejectedQuantity: string;
  unit: Unit;
  status: "PENDING_QC" | "PARTIALLY_INSPECTED" | "INSPECTED";
  discrepancyReason?: string | null;
}

export interface InspectionTestView {
  id: string;
  name: string;
  result: string;
  outcome: "ACCEPTED" | "HELD" | "REJECTED";
}

export interface InspectionView {
  id: string;
  number: string;
  receiptId: string;
  receiptLineId: string;
  receiptNumber: string;
  purchaseOrderNumber: string;
  supplierName: string;
  materialName: string;
  materialCode: string;
  inspectorId: string;
  inspectorName: string;
  inspectedAt: string;
  inspectedQuantity: string;
  acceptedQuantity: string;
  rejectedQuantity: string;
  unit: Unit;
  status: "PENDING" | "HELD" | "COMPLETED";
  notes?: string | null;
  quarantineReason?: string | null;
  quarantineValueMinor: number;
  tests: InspectionTestView[];
}

export interface GoodsReceiptView {
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
  lines: ReceiptLineView[];
  inspection?: InspectionView | null;
}

export interface DispatchLineView {
  id: string;
  materialId: string;
  materialName: string;
  materialCode: string;
  quantity: string;
  unit: Unit;
}

export interface AttachmentView {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
  uploadedAt: string;
}

export interface DeliveryOrderView {
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
  lines: DispatchLineView[];
  attachments: AttachmentView[];
}

export interface SalesOrderLineView {
  id: string;
  materialId: string;
  materialName: string;
  materialCode: string;
  quantity: string;
  reservedQuantity: string;
  dispatchedQuantity: string;
  unit: Unit;
  unitPriceMinor: number;
}

export interface SalesOrderView {
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
  lines: SalesOrderLineView[];
}

export interface ReturnInspectionView {
  id: string;
  number: string;
  warehouseId: string;
  warehouseName: string;
  inspectedQuantity: string;
  acceptedQuantity: string;
  damagedQuantity: string;
  rejectedQuantity: string;
  conditionClassification: "RESALEABLE" | "DAMAGED_SCRAP" | "CUSTOMER_MISUSE" | "INCOMPLETE";
  findings: string;
  inspectorId: string;
  inspectorName: string;
  inspectedAt: string;
  status: "INSPECTED" | "FAM_AUTHORIZED" | "CLOSED";
  creditNoteNumber?: string | null;
}

export interface ReturnClaimView {
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
  unit: Unit;
  reason: string;
  status: "SUBMITTED" | "INSPECTED" | "AUTHORIZED" | "CREDITED" | "REJECTED";
  createdAt: string;
  inspection?: ReturnInspectionView | null;
}

export interface StockMovementView {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  warehouseId: string;
  warehouseName: string;
  movementType: string;
  quantity: string;
  unit: Unit;
  fromBucket: string;
  toBucket: string;
  referenceType: string;
  referenceId: string;
  batch?: string | null;
  location?: string | null;
  actorId: string;
  actorName: string;
  notes?: string | null;
  occurredAt: string;
}
