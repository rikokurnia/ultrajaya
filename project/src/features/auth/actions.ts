"use server";
import { redirect } from "next/navigation";
import { sessionCookie } from "@/lib/auth/session";
import { safeDestination } from "@/lib/auth/redirect";
import { loginSchema, roleSchema } from "@/shared/contracts/auth";
import { DEMO_PASSWORD, DEMO_USERS, demoUser } from "@/lib/demo/users";
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
  const user = DEMO_USERS.find((u) => u.email === parsed.data.email);
  if (!user || parsed.data.password !== DEMO_PASSWORD)
    return { error: "Email atau kata sandi tidak sesuai." };
  const session = await sessionCookie(parsed.data.remember);
  session.user = user;
  session.expiresAt =
    Date.now() + (parsed.data.remember ? 30 * 86400 : 8 * 3600) * 1000;
  await session.save();
  redirect(safeDestination(String(form.get("next") || ""), user));
}
/** Public role preview, deliberately available to every demo visitor; not a production impersonation feature. */
export async function switchDemoRole(form: FormData) {
  const role = roleSchema.parse(form.get("role"));
  const session = await sessionCookie();
  session.user = demoUser(role);
  session.expiresAt = Date.now() + 8 * 3600 * 1000;
  await session.save();
  redirect("/dashboard");
}
export async function signOut() {
  (await sessionCookie()).destroy();
  redirect("/login");
}
