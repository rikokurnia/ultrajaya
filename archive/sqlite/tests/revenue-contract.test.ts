import { test } from "node:test";
import assert from "node:assert/strict";
import { ROLES, type Role } from "../src/shared/contracts/auth";
import { PERMISSIONS, ROLE_PERMISSIONS, can, type Permission } from "../src/lib/auth/permissions";
import { ROUTES } from "../src/shared/routes";
import { safeDestination } from "../src/lib/auth/redirect";
import { nextDocumentNumber } from "../src/server/document-number";
import { FIXTURE_IDS, masterFixtures } from "../src/shared/fixtures";
import {
  SALES_ORDER_TRANSITIONS,
  CUSTOMER_INVOICE_TRANSITIONS,
  INCOMING_RECEIPT_TRANSITIONS,
  InsufficientStockError,
  CreditLimitExceededError,
  SignedEvidenceRequiredError,
} from "../src/shared/services/revenue-interfaces";
import { REVENUE_SUBVIEWS } from "../src/features/finance/revenue/subviews";

test("all 14 roles are defined and mapped in ROLE_PERMISSIONS", () => {
  assert.equal(ROLES.length, 14);
  for (const role of ROLES) {
    const permissions = ROLE_PERMISSIONS[role];
    assert.ok(Array.isArray(permissions), `Role ${role} must have a permission list`);
    assert.ok(permissions.length > 0, `Role ${role} must have at least one permission`);
    // Verify each permission belongs to PERMISSIONS
    for (const p of permissions) {
      assert.ok(PERMISSIONS.includes(p), `Permission ${p} on ${role} must be registered`);
    }
  }
});

test("auditor has no write permissions; admin has no business authority", () => {
  const auditor = { id: "usr_auditor", role: "AUDITOR" as Role };
  const admin = { id: "usr_admin", role: "ADMIN" as Role };

  // Auditor has only permissions ending in :read
  for (const p of ROLE_PERMISSIONS.AUDITOR) {
    assert.ok(p.endsWith(":read"), `Auditor permission ${p} must be read-only`);
  }

  // Admin has strictly dashboard:read and users:manage
  assert.deepEqual(ROLE_PERMISSIONS.ADMIN, ["dashboard:read", "users:manage"]);
  assert.equal(can(admin, "sales_orders:write"), false);
  assert.equal(can(admin, "sales_orders:approve"), false);
  assert.equal(can(admin, "credit:manage"), false);
  assert.equal(can(admin, "customer_invoices:write"), false);
  assert.equal(can(admin, "dispatches:write"), false);
  assert.equal(can(auditor, "dispatches:write"), false);
  assert.equal(can(auditor, "customers:write"), false);
  assert.equal(can(auditor, "credit_notes:write"), false);
});

test("revenue roles follow least-privilege separation of duties", () => {
  const salesAdmin = { id: "usr_sales_admin", role: "SALES_ADMIN" as Role };
  const creditManager = { id: "usr_credit_manager", role: "CREDIT_MANAGER" as Role };
  const ar = { id: "usr_ar", role: "AR" as Role };
  const fam = { id: "usr_fam", role: "FAM" as Role };
  const warehouse = { id: "usr_warehouse", role: "WAREHOUSE" as Role };
  const treasury = { id: "usr_treasury", role: "TREASURY" as Role };
  const accounting = { id: "usr_accounting", role: "ACCOUNTING" as Role };

  // Sales Admin can create SOs and customers, cannot approve credit or issue invoices
  assert.equal(can(salesAdmin, "sales_orders:write"), true);
  assert.equal(can(salesAdmin, "customers:write"), true);
  assert.equal(can(salesAdmin, "sales_orders:approve"), false);
  assert.equal(can(salesAdmin, "credit:manage"), false);
  assert.equal(can(salesAdmin, "customer_invoices:write"), false);
  assert.equal(can(salesAdmin, "receipts_incoming:validate"), false);

  // Credit Manager can activate credit and approve SO credit, cannot dispatch or issue invoices
  assert.equal(can(creditManager, "credit:manage"), true);
  assert.equal(can(creditManager, "sales_orders:approve"), true);
  assert.equal(can(creditManager, "credit_notes:write"), true);
  assert.equal(can(creditManager, "dispatches:write"), false);
  assert.equal(can(creditManager, "customer_invoices:write"), false);

  // AR can issue customer invoices and allocate receipts, cannot approve credit or validate treasury cash
  assert.equal(can(ar, "customer_invoices:write"), true);
  assert.equal(can(ar, "receipts_incoming:write"), true);
  assert.equal(can(ar, "writeoffs:recommend"), true);
  assert.equal(can(ar, "writeoffs:approve"), false); // FAM only
  assert.equal(can(ar, "credit:manage"), false);
  assert.equal(can(ar, "receipts_incoming:validate"), false);

  // Treasury can validate cash receipts, cannot issue customer invoices
  assert.equal(can(treasury, "receipts_incoming:validate"), true);
  assert.equal(can(treasury, "customer_invoices:write"), false);

  // FAM has high-level write-off and reconciliation approval
  assert.equal(can(fam, "writeoffs:approve"), true);
  assert.equal(can(fam, "reconciliation:approve"), true);
  assert.equal(can(fam, "sales_orders:approve"), true);

  // Warehouse owns dispatches and return inspections
  assert.equal(can(warehouse, "dispatches:write"), true);
  assert.equal(can(warehouse, "returns:inspect"), true);
  assert.equal(can(warehouse, "customer_invoices:write"), false);

  // Accounting prepares reconciliation, FAM approves
  assert.equal(can(accounting, "reconciliation:write"), true);
  assert.equal(can(accounting, "reconciliation:approve"), false);
});

test("additive routes are registered with valid permissions and safeDestination", () => {
  const newRoutes = [
    { path: "/inventory/dispatches", permission: "dispatches:read" as Permission },
    { path: "/inventory/returns", permission: "returns:read" as Permission },
    { path: "/finance/revenue", permission: "revenue:read" as Permission },
  ];

  for (const { path, permission } of newRoutes) {
    const r = ROUTES.find((route) => route.path === path);
    assert.ok(r, `Route ${path} must be registered in ROUTES`);
    assert.equal(r.permission, permission);
  }

  const ar = { id: "usr_ar", role: "AR" as Role };
  const prod = { id: "usr_production", role: "PRODUCTION" as Role };

  // AR can access revenue
  assert.equal(safeDestination("/finance/revenue", ar), "/finance/revenue");
  // Production cannot access revenue
  assert.equal(safeDestination("/finance/revenue", prod), "/dashboard");
});

test("document numbering generates atomic sequence for all revenue document types", () => {
  const instant = new Date("2026-10-29T10:00:00Z");

  const revenueTypes = ["SO", "DO", "CINV", "RCPT", "RET", "CN", "WROFF", "BREC"] as const;

  for (const type of revenueTypes) {
    const num1 = nextDocumentNumber(type, instant);
    const num2 = nextDocumentNumber(type, instant);
    assert.ok(num1.startsWith(`${type}-261029-`), `${type} number must start with prefix`);
    assert.ok(num2.startsWith(`${type}-261029-`), `${type} number must start with prefix`);
    assert.notEqual(num1, num2, "Consecutive numbers must be unique");
  }
});

test("revenue subviews cover all 7 defined domains with explicit permissions", () => {
  assert.equal(REVENUE_SUBVIEWS.length, 7);
  const ids = REVENUE_SUBVIEWS.map((s) => s.id);
  assert.ok(ids.includes("customers"));
  assert.ok(ids.includes("sales-orders"));
  assert.ok(ids.includes("credit-decisions"));
  assert.ok(ids.includes("invoices"));
  assert.ok(ids.includes("receipts"));
  assert.ok(ids.includes("returns"));
  assert.ok(ids.includes("write-offs"));

  for (const subview of REVENUE_SUBVIEWS) {
    assert.ok(PERMISSIONS.includes(subview.readPermission));
    if (subview.writePermission) {
      assert.ok(PERMISSIONS.includes(subview.writePermission));
    }
  }
});

test("fixture specifications contain internally consistent revenue scenarios", () => {
  assert.ok(FIXTURE_IDS.customers.indofood);
  assert.ok(FIXTURE_IDS.customers.mayora);
  assert.ok(FIXTURE_IDS.documents.salesOrder);
  assert.ok(FIXTURE_IDS.documents.deliveryOrder);
  assert.ok(FIXTURE_IDS.documents.customerInvoice);
  assert.ok(FIXTURE_IDS.documents.incomingReceipt);
  assert.ok(FIXTURE_IDS.documents.returnClaim);
  assert.ok(FIXTURE_IDS.documents.creditNote);
  assert.ok(FIXTURE_IDS.documents.writeOff);
  assert.ok(FIXTURE_IDS.documents.bankReconciliation);

  const scenario = masterFixtures.canonicalRevenueScenario;
  assert.equal(scenario.salesOrder.totalMinor, 12500000000);
  assert.equal(scenario.customerInvoice.totalMinor, 12500000000);
  assert.equal(scenario.incomingReceipt.amountMinor, 10000000000);
  assert.equal(scenario.incomingReceipt.remainingOutstandingMinor, 2500000000);
  assert.equal(scenario.creditNote.amountMinor, 500000000);
  assert.equal(scenario.creditNote.adjustedOutstandingMinor, 2000000000);
});

test("status transition definitions prevent illegal state transitions", () => {
  assert.deepEqual(SALES_ORDER_TRANSITIONS.DRAFT, ["PENDING_VALIDATION", "CANCELLED"]);
  assert.deepEqual(CUSTOMER_INVOICE_TRANSITIONS.PAID, []);
  assert.deepEqual(INCOMING_RECEIPT_TRANSITIONS.POSTED, []);
});

test("custom error classes have informative names and messages", () => {
  const stockErr = new InsufficientStockError("mat_milk", "100.000", "50.000");
  assert.equal(stockErr.name, "InsufficientStockError");
  assert.ok(stockErr.message.includes("Insufficient available stock"));

  const creditErr = new CreditLimitExceededError("cust_1", 10000000, 5000000);
  assert.equal(creditErr.name, "CreditLimitExceededError");
  assert.ok(creditErr.message.includes("Credit limit exceeded"));

  const doErr = new SignedEvidenceRequiredError("do_123");
  assert.equal(doErr.name, "SignedEvidenceRequiredError");
  assert.ok(doErr.message.includes("verified signed delivery order evidence"));
});
