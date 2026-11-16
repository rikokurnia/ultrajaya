"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { createUser, updateUserAccess } from "@/server/auth-service";
import { userSchema } from "@/shared/contracts/auth";
import { z } from "zod";
export interface AdminState {
  error?: string;
  success?: string;
}
export async function addUser(
  _state: AdminState,
  form: FormData,
): Promise<AdminState> {
  const actor = await requirePermission("users:manage");
  const parsed = userSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(" "),
    };
  try {
    createUser(actor, parsed.data);
  } catch {
    return {
      error: "Could not create this user. The email may already be registered.",
    };
  }
  revalidatePath("/settings");
  return {
    success:
      "User created. Share credentials through your approved internal channel.",
  };
}
export async function changeAccess(
  _state: AdminState,
  form: FormData,
): Promise<AdminState> {
  const actor = await requirePermission("users:manage");
  const id = z.string().min(1).max(100).parse(form.get("id"));
  try {
    updateUserAccess(actor, id, form.get("role"), form.get("active") === "on");
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not update access.",
    };
  }
  revalidatePath("/settings");
  return {
    success: "Access updated. Existing sessions for this user were revoked.",
  };
}
