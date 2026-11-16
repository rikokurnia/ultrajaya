import "server-only";
import {
  randomBytes,
  createHash,
  scryptSync,
  timingSafeEqual,
  randomUUID,
} from "node:crypto";
import { db } from "./db";
import { authorize } from "@/lib/auth/permissions";
import type { User, Actor, Role } from "@/shared/contracts/auth";
import { userSchema, loginSchema, roleSchema } from "@/shared/contracts/auth";
interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: number;
  created_at: string;
  updated_at: string;
  password_hash: string;
}
const publicUser = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  active: !!row.active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, encoded: string) {
  const [, salt, expected] = encoded.split(":");
  if (!salt || !expected) return false;
  const hash = scryptSync(password, salt, 64);
  const target = Buffer.from(expected, "hex");
  return hash.length === target.length && timingSafeEqual(hash, target);
}
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const dummyHash = hashPassword("dummy-password-used-for-constant-work");
export function audit(
  actor: Actor | string,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown> = {},
) {
  const actorId = typeof actor === "string" ? actor : actor.id;
  db()
    .prepare("INSERT INTO audit_events VALUES (?,?,?,?,?,?,?)")
    .run(
      randomUUID(),
      actorId,
      action,
      entityType,
      entityId,
      new Date().toISOString(),
      JSON.stringify(details),
    );
}
export function authenticate(input: unknown): User | null {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return null;
  const { email, password } = parsed.data;
  const now = Date.now();
  const attempts = db()
    .prepare("SELECT * FROM login_attempts WHERE email=?")
    .get(email) as { failures: number; blocked_until: number } | undefined;
  if (attempts && attempts.blocked_until > now) return null;
  const row = db().prepare("SELECT * FROM users WHERE email=?").get(email) as
    UserRow | undefined;
  const valid = verifyPassword(password, row?.password_hash || dummyHash);
  if (!valid || !row?.active) {
    const failures = (attempts?.failures || 0) + 1;
    db()
      .prepare("INSERT OR REPLACE INTO login_attempts VALUES (?,?,?)")
      .run(email, failures, failures >= 5 ? now + 15 * 60 * 1000 : 0);
    return null;
  }
  db().prepare("DELETE FROM login_attempts WHERE email=?").run(email);
  return publicUser(row);
}
export function createSession(user: User, remember: boolean) {
  const token = randomBytes(32).toString("hex");
  const seconds = remember ? 30 * 86400 : 8 * 3600;
  db().prepare("DELETE FROM sessions WHERE expires_at<=?").run(Date.now());
  db()
    .prepare("INSERT INTO sessions VALUES (?,?,?)")
    .run(tokenHash(token), user.id, Date.now() + seconds * 1000);
  audit(user, "auth.sign_in", "user", user.id);
  return { token, seconds };
}
export function resolveSession(token?: string): User | null {
  if (!token) return null;
  const row = db()
    .prepare(
      "SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1",
    )
    .get(tokenHash(token), Date.now()) as UserRow | undefined;
  return row ? publicUser(row) : null;
}
export function revokeSession(token?: string) {
  if (!token) return;
  const user = resolveSession(token);
  db().prepare("DELETE FROM sessions WHERE token_hash=?").run(tokenHash(token));
  if (user) audit(user, "auth.sign_out", "user", user.id);
}
export function listUsers(actor: Actor | null) {
  authorize(actor, "users:manage");
  return (
    db().prepare("SELECT * FROM users ORDER BY name").all() as UserRow[]
  ).map(publicUser);
}
export function createUser(actor: Actor | null, input: unknown) {
  authorize(actor, "users:manage");
  const data = userSchema.parse(input);
  const id = randomUUID();
  const now = new Date().toISOString();
  db().transaction(() => {
    db()
      .prepare("INSERT INTO users VALUES (?,?,?,?,?,1,?,?)")
      .run(
        id,
        data.name,
        data.email,
        data.role,
        hashPassword(data.password),
        now,
        now,
      );
    audit(actor, "user.created", "user", id, { role: data.role });
  })();
  return id;
}
export function updateUserAccess(
  actor: Actor | null,
  id: string,
  role: unknown,
  active: boolean,
) {
  authorize(actor, "users:manage");
  const nextRole = roleSchema.parse(role);
  if (id === actor.id)
    throw new Error(
      "You cannot change your own access. Ask another administrator.",
    );
  db().transaction(() => {
    const target = db().prepare("SELECT id FROM users WHERE id=?").get(id);
    if (!target) throw new Error("User not found.");
    db()
      .prepare("UPDATE users SET role=?,active=?,updated_at=? WHERE id=?")
      .run(nextRole, Number(active), new Date().toISOString(), id);
    db().prepare("DELETE FROM sessions WHERE user_id=?").run(id);
    audit(actor, "user.access_changed", "user", id, { role: nextRole, active });
  })();
}
