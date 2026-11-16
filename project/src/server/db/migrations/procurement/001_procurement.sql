-- Procurement namespace migration 001_procurement.sql
-- Owned tables: suppliers, material_requests, material_request_lines, rfqs, rfq_requests,
-- rfq_suppliers, rfq_lines, quotations, quotation_lines, supplier_evaluations,
-- purchase_orders, purchase_order_requests, purchase_order_lines, approval_steps

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  rating REAL DEFAULT 5.0,
  qualification_status TEXT NOT NULL DEFAULT 'QUALIFIED' CHECK(qualification_status IN ('QUALIFIED', 'PENDING', 'EXPIRED')),
  legal_doc_valid_until TEXT,
  risk_level TEXT NOT NULL DEFAULT 'LOW' CHECK(risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS material_requests (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  warehouse_id TEXT NOT NULL,
  production_reference TEXT,
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  required_on TEXT NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('DRAFT', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'CANCELLED')),
  created_by TEXT NOT NULL,
  verified_by TEXT,
  verified_at TEXT,
  verification_outcome TEXT CHECK(verification_outcome IN ('VERIFIED', 'REJECTED')),
  verification_reason TEXT,
  verification_stock TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS material_request_lines (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES material_requests(id) ON DELETE CASCADE,
  material_id TEXT NOT NULL,
  quantity TEXT NOT NULL,
  unit TEXT NOT NULL CHECK(unit IN ('L', 'kg', 'pcs'))
);

CREATE TABLE IF NOT EXISTS rfqs (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  due_on TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('DRAFT', 'SENT', 'CLOSED', 'CANCELLED')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS rfq_requests (
  rfq_id TEXT NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL REFERENCES material_requests(id) ON DELETE CASCADE,
  PRIMARY KEY (rfq_id, request_id)
);

CREATE TABLE IF NOT EXISTS rfq_suppliers (
  rfq_id TEXT NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  PRIMARY KEY (rfq_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS rfq_lines (
  id TEXT PRIMARY KEY,
  rfq_id TEXT NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  material_id TEXT NOT NULL,
  quantity TEXT NOT NULL,
  unit TEXT NOT NULL CHECK(unit IN ('L', 'kg', 'pcs'))
);

CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  rfq_id TEXT NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  valid_until TEXT NOT NULL,
  lead_days INTEGER NOT NULL CHECK(lead_days >= 0),
  total INTEGER NOT NULL CHECK(total >= 0),
  status TEXT NOT NULL CHECK(status IN ('RECEIVED', 'EVALUATED', 'WITHDRAWN')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS quotation_lines (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  material_id TEXT NOT NULL,
  quantity TEXT NOT NULL,
  unit TEXT NOT NULL CHECK(unit IN ('L', 'kg', 'pcs')),
  unit_price INTEGER NOT NULL CHECK(unit_price >= 0),
  total INTEGER NOT NULL CHECK(total >= 0)
);

CREATE TABLE IF NOT EXISTS supplier_evaluations (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  rfq_id TEXT NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  selected_quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  criteria_json TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('DRAFT', 'FINAL')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  quotation_id TEXT REFERENCES quotations(id) ON DELETE SET NULL,
  warehouse_id TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1),
  status TEXT NOT NULL CHECK(status IN ('DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'OPEN', 'PARTIALLY_RECEIVED', 'CLOSED', 'REJECTED', 'CANCELLED')),
  delivery_terms TEXT NOT NULL DEFAULT 'Franco Gudang',
  payment_terms TEXT NOT NULL DEFAULT 'Net 30 Days',
  total INTEGER NOT NULL CHECK(total >= 0),
  issued_at TEXT,
  issued_by TEXT,
  issued_notes TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS purchase_order_requests (
  order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL REFERENCES material_requests(id) ON DELETE RESTRICT,
  PRIMARY KEY (order_id, request_id)
);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  material_id TEXT NOT NULL,
  quantity TEXT NOT NULL,
  unit TEXT NOT NULL CHECK(unit IN ('L', 'kg', 'pcs')),
  unit_price INTEGER NOT NULL CHECK(unit_price >= 0),
  total INTEGER NOT NULL CHECK(total >= 0)
);

CREATE TABLE IF NOT EXISTS approval_steps (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL CHECK(sequence > 0),
  title TEXT NOT NULL,
  assigned_user_id TEXT NOT NULL,
  assigned_role TEXT NOT NULL,
  authority_policy_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
  decision_id TEXT,
  decided_by TEXT,
  decided_at TEXT,
  decision_outcome TEXT CHECK(decision_outcome IN ('APPROVED', 'REJECTED')),
  decision_reason TEXT,
  document_revision INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_requests_status ON material_requests(status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_approval_steps_order ON approval_steps(order_id);
