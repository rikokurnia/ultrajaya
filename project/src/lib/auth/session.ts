import "server-only";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { redirect } from "next/navigation";
import { cache } from "react";
import { resolveSession } from "@/server/auth-service";
import { authorize, type Permission } from "./permissions";
import type { Actor } from "@/shared/contracts/auth";
export async function sessionCookie(remember?: boolean) {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32)
    throw new Error("Configure SESSION_SECRET with at least 32 characters.");
  return getIronSession<{ token?: string }>(await cookies(), {
    password,
    cookieName: "ultraops_session",
    ttl: remember === undefined ? 30 * 86400 : remember ? 30 * 86400 : 8 * 3600,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      ...(remember === undefined
        ? {}
        : { maxAge: remember ? 30 * 86400 : undefined }),
    },
  });
}
export const getCurrentUser = cache(async () =>
  resolveSession((await sessionCookie()).token),
);
export async function requireUser(next = "/dashboard") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}
/** For server actions: throws on unauthenticated/forbidden access; never trusts caller-supplied actors. */
export async function requirePermission(
  permission: Permission,
  rule?: (actor: Actor) => boolean,
) {
  const user = await getCurrentUser();
  authorize(user, permission, rule);
  return user;
}
