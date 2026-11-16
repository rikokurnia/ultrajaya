"use server";
import { redirect } from "next/navigation";
import {
  authenticate,
  createSession,
  revokeSession,
} from "@/server/auth-service";
import { sessionCookie } from "@/lib/auth/session";
import { safeDestination } from "@/lib/auth/redirect";
import { loginSchema } from "@/shared/contracts/auth";
export interface LoginState {
  error?: string;
  fieldErrors?: { email?: string[]; password?: string[] };
}
export async function signIn(
  _state: LoginState,
  form: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
    remember: form.get("remember") === "on",
  });
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const user = authenticate(parsed.data);
  if (!user)
    return {
      error:
        "Email or password is incorrect, or access is unavailable. After repeated attempts, wait 15 minutes and try again.",
    };
  const session = await sessionCookie(parsed.data.remember);
  revokeSession(session.token);
  const created = createSession(user, parsed.data.remember);
  session.token = created.token;
  await session.save();
  redirect(safeDestination(String(form.get("next") || ""), user));
}
export async function signOut() {
  const session = await sessionCookie();
  revokeSession(session.token);
  session.destroy();
  redirect("/login");
}
