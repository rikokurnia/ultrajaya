import { z } from "zod";
export const ROLES = [
  "ADMIN",
  "PRODUCTION",
  "WAREHOUSE",
  "PURCHASING",
  "APPROVER",
  "QC",
  "AP",
  "TREASURY",
  "ACCOUNTING",
  "AUDITOR",
  "SALES_ADMIN",
  "CREDIT_MANAGER",
  "AR",
  "FAM",
] as const;
export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
export type Actor = Pick<User, "id" | "role">;
export const loginSchema = z.object({
  email: z
    .email("Enter a valid work email.")
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1, "Enter your password.").max(256),
  remember: z.boolean().default(false),
});
export const userSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  role: roleSchema,
  password: z.string().min(12, "Use at least 12 characters.").max(256),
});
