import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const directory = mkdtempSync(join(tmpdir(), "ultraops-auth-"));
process.env.DATABASE_PATH = join(directory, "test.sqlite");
import { migrate } from "../scripts/migrate";
import { db } from "../src/server/db";
import {
  hashPassword,
  authenticate,
  createSession,
  resolveSession,
  revokeSession,
  createUser,
  listUsers,
  updateUserAccess,
} from "../src/server/auth-service";
import {
  authorize,
  can,
  notCreator,
  AccessError,
} from "../src/lib/auth/permissions";
import { ROLES } from "../src/shared/contracts/auth";
migrate();
const now = new Date().toISOString();
for (const role of ROLES)
  db()
    .prepare("INSERT INTO users VALUES (?,?,?,?,?,1,?,?)")
    .run(
      `usr_${role.toLowerCase()}`,
      role,
      `${role.toLowerCase()}@ultraops.local`,
      role,
      hashPassword("Test-password-2026!"),
      now,
      now,
    );
const admin = { id: "usr_admin", role: "ADMIN" as const };
const auditor = { id: "usr_auditor", role: "AUDITOR" as const };
after(() => {
  db().close();
  rmSync(directory, { recursive: true, force: true });
});
test("password verification rejects wrong and unknown accounts, normalizes email", () => {
  assert.equal(
    authenticate({ email: "admin@ultraops.local", password: "wrong" }),
    null,
  );
  assert.equal(
    authenticate({ email: "unknown@ultraops.local", password: "wrong" }),
    null,
  );
  const user = authenticate({
    email: "ADMIN@ultraops.local",
    password: "Test-password-2026!",
  });
  assert.equal(user?.id, admin.id);
  assert.ok(!("password_hash" in user!));
});
test("server sessions expire, remember-me extends lifetime, logout revokes token", () => {
  const user = authenticate({
    email: "admin@ultraops.local",
    password: "Test-password-2026!",
  })!;
  const regular = createSession(user, false),
    remembered = createSession(user, true);
  assert.equal(regular.seconds, 8 * 3600);
  assert.equal(remembered.seconds, 30 * 86400);
  assert.equal(resolveSession(regular.token)?.id, user.id);
  revokeSession(regular.token);
  assert.equal(resolveSession(regular.token), null);
  db().prepare("UPDATE sessions SET expires_at=0").run();
  assert.equal(resolveSession(remembered.token), null);
  assert.equal(resolveSession("forged"), null);
});
test("unauthenticated and forbidden server operations fail before writes", () => {
  const before = db().prepare("SELECT count(*) AS n FROM users").get();
  assert.throws(
    () => createUser(null, {}),
    (e) => e instanceof AccessError && e.status === 401,
  );
  assert.throws(
    () => listUsers(auditor),
    (e) => e instanceof AccessError && e.status === 403,
  );
  assert.throws(
    () => createUser(auditor, {}),
    (e) => e instanceof AccessError && e.status === 403,
  );
  assert.deepEqual(
    db().prepare("SELECT count(*) AS n FROM users").get(),
    before,
  );
});
test("auditor has no write permissions; admin has no business approval authority; QC cannot edit prices", () => {
  for (const permission of [
    "requests:write",
    "suppliers:write",
    "orders:write",
    "approvals:decide",
    "receipts:write",
    "inspections:write",
    "invoices:write",
    "payments:write",
    "journals:post",
    "users:manage",
  ] as const)
    assert.equal(can(auditor, permission), false);
  assert.equal(can(admin, "approvals:decide"), false);
  assert.equal(can({ id: "qc", role: "QC" }, "orders:write"), false);
  assert.equal(can(admin, "users:manage"), true);
});
test("object authorization prevents creator approval and honors role checks", () => {
  const approver = { id: "usr_approver", role: "APPROVER" as const };
  assert.throws(
    () => authorize(approver, "approvals:decide", notCreator(approver.id)),
    AccessError,
  );
  assert.doesNotThrow(() =>
    authorize(approver, "approvals:decide", notCreator("usr_purchasing")),
  );
  assert.throws(
    () => authorize(admin, "approvals:decide", notCreator("usr_purchasing")),
    AccessError,
  );
});
test("admin can create users, change access, suspend and revoke sessions; self access protected", () => {
  const id = createUser(admin, {
    name: "New User",
    email: "new@ultraops.local",
    password: "New-password-2026!",
    role: "AP",
  });
  assert.ok(listUsers(admin).find((u) => u.id === id));
  const user = authenticate({
    email: "new@ultraops.local",
    password: "New-password-2026!",
  })!;
  const session = createSession(user, true);
  updateUserAccess(admin, id, "TREASURY", true);
  assert.equal(resolveSession(session.token), null);
  assert.equal(
    authenticate({
      email: "new@ultraops.local",
      password: "New-password-2026!",
    })?.role,
    "TREASURY",
  );
  updateUserAccess(admin, id, "TREASURY", false);
  assert.equal(
    authenticate({
      email: "new@ultraops.local",
      password: "New-password-2026!",
    }),
    null,
  );
  assert.throws(
    () => updateUserAccess(admin, admin.id, "AP", false),
    /own access/,
  );
});
test("failed sign-in is throttled after five attempts", () => {
  for (let n = 0; n < 5; n++)
    authenticate({ email: "production@ultraops.local", password: "wrong" });
  assert.equal(
    authenticate({
      email: "production@ultraops.local",
      password: "Test-password-2026!",
    }),
    null,
  );
  db()
    .prepare("UPDATE login_attempts SET blocked_until=0 WHERE email=?")
    .run("production@ultraops.local");
  assert.ok(
    authenticate({
      email: "production@ultraops.local",
      password: "Test-password-2026!",
    }),
  );
});
test("audit records are server generated and immutable; migrations are repeatable", () => {
  const event = db().prepare("SELECT * FROM audit_events LIMIT 1").get() as {
    id: string;
    occurred_at: string;
  };
  assert.ok(event.id);
  assert.ok(event.occurred_at);
  assert.throws(
    () =>
      db()
        .prepare("UPDATE audit_events SET action=? WHERE id=?")
        .run("tampered", event.id),
    /immutable/,
  );
  assert.throws(
    () => db().prepare("DELETE FROM audit_events WHERE id=?").run(event.id),
    /immutable/,
  );
  assert.doesNotThrow(() => migrate());
});

test("redirects allow only registered authorized routes", async () => {
  const { safeDestination } = await import("../src/lib/auth/redirect");
  assert.equal(safeDestination("/settings", admin), "/settings");
  assert.equal(safeDestination("/settings", auditor), "/dashboard");
  assert.equal(safeDestination("https://evil.example", admin), "/dashboard");
  assert.equal(safeDestination("//evil.example", admin), "/dashboard");
  assert.equal(
    safeDestination("/procurement/orders", { id: "qc", role: "QC" }),
    "/dashboard",
  );
  assert.equal(safeDestination("/reports/audit", auditor), "/reports/audit");
});

test("document numbering is atomic and uses the Jakarta calendar day", async () => {
  const { nextDocumentNumber } = await import("../src/server/document-number");
  const instant = new Date("2026-10-28T18:00:00Z");
  assert.equal(nextDocumentNumber("PO", instant), "PO-261029-0001");
  assert.equal(nextDocumentNumber("PO", instant), "PO-261029-0002");
  assert.equal(nextDocumentNumber("GRN", instant), "GRN-261029-0001");
});
