import "server-only";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Actor, User } from "@/shared/contracts/auth";
import { roleSchema } from "@/shared/contracts/auth";
import { authorize, validateAssignments, type Permission } from "./permissions";
/** Frontend preview identity only. Replace with backend-issued session verification before real data. */
export async function sessionCookie(remember = true) {
  const password =
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV !== "production"
      ? "local-demo-only-secret-please-never-use-in-production"
      : undefined);
  if (!password || password.length < 32)
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  return getIronSession<{ user?: User; expiresAt?: number }>(await cookies(), {
    password,
    cookieName: "ultrajaya_demo",
    ttl: remember ? 30 * 86400 : 8 * 3600,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: remember ? 30 * 86400 : undefined,
    },
  });
}
export const getCurrentUser = cache(async () => {
  const session = await sessionCookie();
  const user = session.user;
  if (
    !user ||
    !session.expiresAt ||
    session.expiresAt < Date.now() ||
    !roleSchema.safeParse(user.role).success ||
    !Array.isArray(user.assignments) ||
    !validateAssignments(user.role, user.assignments)
  )
    return null;
  return user;
});
export async function requireUser(next = "/dashboard") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}
export async function requirePermission(
  permission: Permission,
  rule?: (actor: Actor) => boolean,
) {
  const user = await getCurrentUser();
  authorize(user, permission, rule);
  return user;
}
