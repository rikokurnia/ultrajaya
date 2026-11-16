CREATE TABLE materials (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('RAW_MATERIAL','PACKAGING','FINISHED_GOOD')),
  unit TEXT NOT NULL CHECK(unit IN ('L','kg','pcs')),
  minimum_quantity TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE warehouses (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE unit_conversions (
  id TEXT PRIMARY KEY,
  material_id TEXT REFERENCES materials(id),
  from_unit TEXT NOT NULL,
  to_unit TEXT NOT NULL,
  multiplier TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);

CREATE TABLE stock_balances (
  material_id TEXT NOT NULL REFERENCES materials(id),
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  physical TEXT NOT NULL DEFAULT '0',
  qc_pending TEXT NOT NULL DEFAULT '0',
  accepted TEXT NOT NULL DEFAULT '0',
  rejected TEXT NOT NULL DEFAULT '0',
  reserved TEXT NOT NULL DEFAULT '0',
  available TEXT NOT NULL DEFAULT '0',
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (material_id, warehouse_id)
);

CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY,
  material_id TEXT NOT NULL REFERENCES materials(id),
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  movement_type TEXT NOT NULL CHECK(movement_type IN ('RECEIPT','QC_ACCEPT','QC_REJECT','RESERVE','RELEASE_RESERVATION','DISPATCH','RETURN_ACCEPT','RETURN_REJECT','ADJUSTMENT')),
  quantity TEXT NOT NULL,
  unit TEXT NOT NULL,
  from_bucket TEXT NOT NULL CHECK(from_bucket IN ('NONE','QC_PENDING','ACCEPTED','REJECTED','RESERVED')),
  to_bucket TEXT NOT NULL CHECK(to_bucket IN ('NONE','QC_PENDING','ACCEPTED','REJECTED','RESERVED','DISPATCHED')),
  reference_type TEXT NOT NULL CHECK(reference_type IN ('GRN','QC','SO','DO','RET','FPBB','ADJ')),
  reference_id TEXT NOT NULL,
  batch TEXT,
  location TEXT,
  actor_id TEXT NOT NULL REFERENCES users(id),
  notes TEXT,
  occurred_at TEXT NOT NULL
);

CREATE TABLE goods_receipts (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  purchase_order_id TEXT NOT NULL,
  purchase_order_number TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  supplier_delivery_number TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('RECORDED','PARTIALLY_INSPECTED','INSPECTED')),
  received_at TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  idempotency_key TEXT UNIQUE
);

CREATE TABLE goods_receipt_lines (
  id TEXT PRIMARY KEY,
  receipt_id TEXT NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  purchase_order_line_id TEXT NOT NULL,
  material_id TEXT NOT NULL REFERENCES materials(id),
  batch TEXT NOT NULL,
  location TEXT NOT NULL,
  ordered_quantity TEXT NOT NULL,
  received_quantity TEXT NOT NULL,
  accepted_quantity TEXT NOT NULL DEFAULT '0',
  rejected_quantity TEXT NOT NULL DEFAULT '0',
  unit TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PENDING_QC','PARTIALLY_INSPECTED','INSPECTED')),
  discrepancy_reason TEXT
);

CREATE TABLE qc_inspections (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  receipt_id TEXT NOT NULL REFERENCES goods_receipts(id),
  receipt_line_id TEXT NOT NULL REFERENCES goods_receipt_lines(id),
  inspector_id TEXT NOT NULL REFERENCES users(id),
  inspected_at TEXT NOT NULL,
  inspected_quantity TEXT NOT NULL,
  accepted_quantity TEXT NOT NULL,
  rejected_quantity TEXT NOT NULL,
  held_quantity TEXT NOT NULL DEFAULT '0',
  unit TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PENDING','HELD','COMPLETED')),
  notes TEXT,
  quarantine_reason TEXT,
  quarantine_value INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  idempotency_key TEXT UNIQUE
);

CREATE TABLE qc_inspection_tests (
  id TEXT PRIMARY KEY,
  inspection_id TEXT NOT NULL REFERENCES qc_inspections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  result TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('ACCEPTED','HELD','REJECTED'))
);

CREATE TABLE sales_orders (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  status TEXT NOT NULL CHECK(status IN ('DRAFT','APPROVED','CREDIT_HOLD','PARTIALLY_DISPATCHED','COMPLETED','CANCELLED')),
  credit_status TEXT NOT NULL CHECK(credit_status IN ('APPROVED','HOLD','PENDING')),
  total_minor INTEGER NOT NULL,
  ordered_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE sales_order_lines (
  id TEXT PRIMARY KEY,
  sales_order_id TEXT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  material_id TEXT NOT NULL REFERENCES materials(id),
  quantity TEXT NOT NULL,
  reserved_quantity TEXT NOT NULL DEFAULT '0',
  dispatched_quantity TEXT NOT NULL DEFAULT '0',
  unit TEXT NOT NULL,
  unit_price_minor INTEGER NOT NULL
);

CREATE TABLE delivery_orders (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  sales_order_id TEXT NOT NULL REFERENCES sales_orders(id),
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  carrier_3pl TEXT NOT NULL,
  tracking_number TEXT,
  driver_name TEXT,
  vehicle_number TEXT,
  status TEXT NOT NULL CHECK(status IN ('DRAFT','PICKED','DISPATCHED','DELIVERED','CANCELLED')),
  dispatched_at TEXT,
  delivered_at TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  idempotency_key TEXT UNIQUE
);

CREATE TABLE delivery_order_lines (
  id TEXT PRIMARY KEY,
  delivery_order_id TEXT NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  sales_order_line_id TEXT NOT NULL REFERENCES sales_order_lines(id),
  material_id TEXT NOT NULL REFERENCES materials(id),
  quantity TEXT NOT NULL,
  unit TEXT NOT NULL
);

CREATE TABLE inventory_attachments (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('DELIVERY_ORDER','QC_INSPECTION','RETURN_INSPECTION')),
  entity_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  uploaded_at TEXT NOT NULL
);

CREATE TABLE return_claims (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  sales_order_id TEXT,
  delivery_order_id TEXT,
  material_id TEXT NOT NULL REFERENCES materials(id),
  claimed_quantity TEXT NOT NULL,
  unit TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('SUBMITTED','INSPECTED','AUTHORIZED','CREDITED','REJECTED')),
  created_at TEXT NOT NULL
);

CREATE TABLE return_inspections (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  return_claim_id TEXT NOT NULL REFERENCES return_claims(id),
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  material_id TEXT NOT NULL REFERENCES materials(id),
  claimed_quantity TEXT NOT NULL,
  inspected_quantity TEXT NOT NULL,
  accepted_quantity TEXT NOT NULL,
  damaged_quantity TEXT NOT NULL,
  rejected_quantity TEXT NOT NULL,
  unit TEXT NOT NULL,
  condition_classification TEXT NOT NULL CHECK(condition_classification IN ('RESALEABLE','DAMAGED_SCRAP','CUSTOMER_MISUSE','INCOMPLETE')),
  findings TEXT NOT NULL,
  inspector_id TEXT NOT NULL REFERENCES users(id),
  inspected_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('INSPECTED','FAM_AUTHORIZED','CLOSED')),
  fam_authorized_by TEXT REFERENCES users(id),
  fam_authorized_at TEXT,
  credit_note_number TEXT,
  created_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  idempotency_key TEXT UNIQUE
);

CREATE TABLE fpbb_verifications (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  material_id TEXT NOT NULL REFERENCES materials(id),
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  verified_by TEXT NOT NULL REFERENCES users(id),
  verified_at TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('VERIFIED','REJECTED')),
  requested_quantity TEXT NOT NULL,
  available_stock TEXT NOT NULL,
  reason TEXT NOT NULL
);
