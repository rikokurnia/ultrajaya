import { z } from "zod";
import type { CycleKey } from "@/shared/cycles";
export const ROLES = [
  "SYSTEM_ADMIN",
  "OPERATIONS_STAFF",
  "FINANCE_STAFF",
  "HR_PAYROLL_STAFF",
  "MANAGER_APPROVER",
] as const;
export const ROLE_LABELS: Record<Role, string> = {
  SYSTEM_ADMIN: "System Admin",
  OPERATIONS_STAFF: "Operations Staff",
  FINANCE_STAFF: "Finance Staff",
  HR_PAYROLL_STAFF: "HR & Payroll Staff",
  MANAGER_APPROVER: "Manager / Approver",
};
export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;
export interface CycleAssignment {
  cycle: CycleKey;
  duties: string[];
}
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  assignments: CycleAssignment[];
  createdAt: string;
  updatedAt: string;
}
export type Actor = Pick<User, "id" | "role" | "assignments">;
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Masukkan email yang valid.")
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1, "Masukkan kata sandi.").max(256),
  remember: z.boolean().default(false),
});
export const userSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  role: roleSchema,
});
