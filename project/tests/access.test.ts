import test from "node:test";
import assert from "node:assert/strict";
import { ROLES } from "../src/shared/contracts/auth";
import {
  can,
  canDuty,
  canViewCycle,
  notCreator,
  authorize,
  AccessError,
  validateAssignments,
} from "../src/lib/auth/permissions";
import { safeDestination } from "../src/lib/auth/redirect";
import { demoUser, DEMO_USERS } from "../src/lib/demo/users";
test("exactly five roles have distinct fixture identities", () => {
  assert.equal(ROLES.length, 5);
  assert.equal(new Set(DEMO_USERS.map((u) => u.id)).size, 5);
});
test("system administration never automatically grants business access or approval", () => {
  const admin = demoUser("SYSTEM_ADMIN");
  assert.ok(can(admin, "users:manage"));
  assert.equal(can(admin, "approvals:decide"), false);
  assert.equal(canViewCycle(admin, "pengeluaran"), false);
  assert.equal(can(admin, "salary:read"), false);
});
test("role eligibility, cycle assignment and exact duty must all match", () => {
  const ops = demoUser("OPERATIONS_STAFF");
  ops.assignments = [
    { cycle: "pengeluaran", duties: ["cycle:read", "receipts:write"] },
  ];
  assert.equal(canDuty(ops, "pengeluaran", "receipts:write"), true);
  assert.equal(can(ops, "inspections:write"), false);
  assert.equal(canViewCycle(ops, "produksi"), false);
  ops.assignments[0].duties.push("approvals:decide");
  assert.equal(can(ops, "approvals:decide"), false);
  assert.equal(validateAssignments(ops.role, ops.assignments), false);
});
test("sensitive payroll information needs explicit grants", () => {
  for (const role of ROLES) {
    const user = demoUser(role);
    assert.equal(can(user, "salary:read"), false);
    assert.equal(can(user, "bank:read"), false);
  }
  const hr = demoUser("HR_PAYROLL_STAFF");
  hr.assignments
    .find((a) => a.cycle === "penggajian")!
    .duties.push("salary:read");
  assert.ok(can(hr, "salary:read"));
  assert.equal(can(hr, "bank:read"), false);
});
test("creator cannot approve; unrelated assigned manager can", () => {
  const manager = demoUser("MANAGER_APPROVER");
  assert.throws(
    () => authorize(manager, "approvals:decide", notCreator(manager.id)),
    AccessError,
  );
  assert.doesNotThrow(() =>
    authorize(manager, "approvals:decide", notCreator("creator")),
  );
  assert.throws(() => authorize(null, "approvals:decide"), AccessError);
});
test("redirects reject external, unknown and unauthorized destinations", () => {
  const ops = demoUser("OPERATIONS_STAFF");
  assert.equal(safeDestination("https://evil.example", ops), "/dashboard");
  assert.equal(safeDestination("//evil.example", ops), "/dashboard");
  assert.equal(safeDestination("/settings", ops), "/dashboard");
  assert.equal(safeDestination("/cycles/penggajian", ops), "/dashboard");
  assert.equal(safeDestination("/cycles/produksi", ops), "/cycles/produksi");
});
