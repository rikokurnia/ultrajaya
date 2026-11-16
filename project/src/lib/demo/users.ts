import {
  ROLES,
  ROLE_LABELS,
  type Role,
  type User,
} from "@/shared/contracts/auth";
import { CYCLES } from "@/shared/cycles";
import { DUTY_CATALOG, isEligible } from "@/lib/auth/permissions";
export const DEMO_PASSWORD = "Ultrajaya2026!";
export const DEMO_EMAILS: Record<Role, string> = {
  SYSTEM_ADMIN: "admin@ultrajaya.local",
  OPERATIONS_STAFF: "operations@ultrajaya.local",
  FINANCE_STAFF: "finance@ultrajaya.local",
  HR_PAYROLL_STAFF: "hr@ultrajaya.local",
  MANAGER_APPROVER: "manager@ultrajaya.local",
};
/** Demo fixtures only. Sensitive duties are explicit; role membership alone never grants them. */
export function demoUser(role: Role): User {
  return {
    id: `demo_${role.toLowerCase()}`,
    name: ROLE_LABELS[role],
    email: DEMO_EMAILS[role],
    role,
    active: true,
    createdAt: "2026-11-16T00:00:00Z",
    updatedAt: "2026-11-16T00:00:00Z",
    assignments:
      role === "SYSTEM_ADMIN"
        ? []
        : CYCLES.map((c) => ({
            cycle: c.key,
            duties: DUTY_CATALOG.filter(
              (d) =>
                d.cycle === c.key &&
                isEligible(role, c.key, d.key) &&
                !["salary:read", "bank:read"].includes(d.key),
            ).map((d) => d.key),
          })).filter((a) => a.duties.length > 0),
  };
}
export const DEMO_USERS = ROLES.map(demoUser);
