import { ROUTES } from "@/shared/routes";
import { can } from "./permissions";
import type { Actor } from "@/shared/contracts/auth";
/** Exact registry match excludes external URLs, protocol-relative links and unauthorized destinations. */
export function safeDestination(next: string | undefined, user: Actor) {
  const route = ROUTES.find((r) => r.path === next);
  return route && can(user, route.permission) ? route.path : "/dashboard";
}
