-- Finance module migration: Purchasing Finance, Revenue Cycle & General Ledger
-- Namespace: finance

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
  active INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  supplier_id TEXT NOT NULL,
  supplier_invoice_number TEXT NOT NULL,
  purchase_order_id TEXT NOT NULL,
  receipt_ids TEXT NOT NULL,
  issued_on TEXT NOT NULL,
  due_on TEXT NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('DRAFT', 'MATCHING', 'HELD', 'MATCHED', 'POSTED', 'VOIDED')),
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_supplier_number ON invoices(supplier_id, supplier_invoice_number);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  purchase_order_line_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  quantity TEXT NOT NULL,
  unit TEXT NOT NULL,
  unit_price INTEGER NOT NULL,
  total INTEGER NOT NULL,
  receipt_line_ids TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS matching_results (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL UNIQUE REFERENCES invoices(id) ON DELETE CASCADE,
  matched_by TEXT NOT NULL,
  matched_at TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('MATCHED', 'HELD')),
  eligible INTEGER NOT NULL,
  held INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matching_checks (
  id TEXT PRIMARY KEY,
  matching_id TEXT NOT NULL REFERENCES matching_results(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('PASS', 'HOLD')),
  reason TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payable_balances (
  invoice_id TEXT PRIMARY KEY REFERENCES invoices(id) ON DELETE CASCADE,
  supplier_id TEXT NOT NULL,
  recognized INTEGER NOT NULL,
  paid INTEGER NOT NULL DEFAULT 0,
  outstanding INTEGER NOT NULL,
  held INTEGER NOT NULL DEFAULT 0,
  eligible_unpaid INTEGER NOT NULL,
  as_of TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  paid_on TEXT NOT NULL,
  bank_reference TEXT NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('BANK_TRANSFER', 'GIRO', 'CASH')),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('DRAFT', 'AUTHORIZED', 'POSTED', 'REVERSED')),
  reversal_of TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_allocations (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  amount INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  posting_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('DRAFT', 'REVIEWED', 'POSTED', 'REVERSED')),
  posted_by TEXT,
  posted_at TEXT,
  reversal_of TEXT,
  description TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id TEXT PRIMARY KEY,
  journal_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  debit INTEGER NOT NULL DEFAULT 0,
  credit INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  document_type TEXT,
  document_id TEXT,
  document_number TEXT
);

CREATE TABLE IF NOT EXISTS ar_customers (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  tax_id TEXT,
  credit_limit INTEGER NOT NULL DEFAULT 0,
  credit_terms_days INTEGER NOT NULL DEFAULT 30,
  credit_status TEXT NOT NULL CHECK(credit_status IN ('ACTIVE', 'BLOCKED', 'PENDING_REVIEW')),
  active INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ar_credit_decisions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES ar_customers(id),
  decision_type TEXT NOT NULL CHECK(decision_type IN ('ACTIVATE', 'SET_LIMIT', 'SUSPEND', 'OVERRIDE')),
  limit_amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  decided_by TEXT NOT NULL,
  decided_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sales_order_finance (
  sales_order_id TEXT PRIMARY KEY,
  discount_rate REAL NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  subtotal INTEGER NOT NULL DEFAULT 0,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  special_discount_approved INTEGER NOT NULL DEFAULT 0,
  special_discount_approved_by TEXT,
  special_discount_approved_at TEXT,
  credit_approved INTEGER NOT NULL DEFAULT 0,
  credit_approved_by TEXT,
  credit_approved_at TEXT,
  credit_exposure_at_approval INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ar_invoices (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES ar_customers(id),
  sales_order_id TEXT NOT NULL,
  delivery_order_id TEXT NOT NULL,
  issued_on TEXT NOT NULL,
  due_on TEXT NOT NULL,
  subtotal INTEGER NOT NULL,
  tax_amount INTEGER NOT NULL,
  total INTEGER NOT NULL,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  outstanding_balance INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'WRITTEN_OFF', 'VOIDED')),
  e_faktur_number TEXT,
  e_faktur_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(e_faktur_status IN ('DRAFT', 'EXPORTED', 'SIMULATED')),
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ar_invoice_lines (
  id TEXT PRIMARY KEY,
  ar_invoice_id TEXT NOT NULL REFERENCES ar_invoices(id) ON DELETE CASCADE,
  sales_order_line_id TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity TEXT NOT NULL,
  unit TEXT NOT NULL,
  unit_price INTEGER NOT NULL,
  total INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ar_receipts (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES ar_customers(id),
  received_on TEXT NOT NULL,
  bank_reference TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('BANK_TRANSFER', 'GIRO')),
  amount INTEGER NOT NULL,
  allocated_amount INTEGER NOT NULL DEFAULT 0,
  unallocated_amount INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('RECORDED', 'TREASURY_VALIDATED', 'SETTLED', 'REVERSED')),
  bank_evidence_ref TEXT,
  treasury_validated_by TEXT,
  treasury_validated_at TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ar_receipt_allocations (
  id TEXT PRIMARY KEY,
  receipt_id TEXT NOT NULL REFERENCES ar_receipts(id) ON DELETE CASCADE,
  ar_invoice_id TEXT NOT NULL REFERENCES ar_invoices(id),
  amount INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS return_claim_finance (
  return_claim_id TEXT PRIMARY KEY,
  ar_invoice_id TEXT,
  completeness_checked INTEGER NOT NULL DEFAULT 0,
  completeness_checked_by TEXT,
  completeness_checked_at TEXT,
  fam_authorized INTEGER NOT NULL DEFAULT 0,
  fam_authorized_by TEXT,
  fam_authorized_at TEXT,
  credit_note_id TEXT,
  credit_amount INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ar_credit_notes (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES ar_customers(id),
  return_claim_id TEXT NOT NULL,
  ar_invoice_id TEXT NOT NULL REFERENCES ar_invoices(id),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('ISSUED', 'APPLIED', 'VOIDED')),
  issued_by TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ar_write_off_requests (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES ar_customers(id),
  ar_invoice_id TEXT NOT NULL REFERENCES ar_invoices(id),
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  submitted_by TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  fam_authorized INTEGER NOT NULL DEFAULT 0,
  fam_authorized_by TEXT,
  fam_authorized_at TEXT,
  journal_id TEXT REFERENCES journal_entries(id),
  status TEXT NOT NULL CHECK(status IN ('PENDING', 'AUTHORIZED', 'RECORDED', 'REJECTED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id TEXT PRIMARY KEY,
  period_month TEXT NOT NULL UNIQUE,
  statement_balance INTEGER NOT NULL,
  book_balance INTEGER NOT NULL,
  unreconciled_difference INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('DRAFT', 'PREPARED', 'FAM_APPROVED', 'REJECTED')),
  prepared_by TEXT,
  prepared_at TEXT,
  fam_approved_by TEXT,
  fam_approved_at TEXT,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bank_reconciliation_items (
  id TEXT PRIMARY KEY,
  reconciliation_id TEXT NOT NULL REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('DEPOSIT_IN_TRANSIT', 'OUTSTANDING_CHECK', 'BANK_FEE', 'INTEREST', 'RECEIPT', 'PAYMENT')),
  reference TEXT NOT NULL,
  amount INTEGER NOT NULL,
  matched INTEGER NOT NULL DEFAULT 0,
  details TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS financial_idempotency (
  key TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
