import { ROUTES } from "@/shared/routes";
import { can, canViewCycle } from "./permissions";
import type { Actor } from "@/shared/contracts/auth";
export function safeDestination(next: string | undefined, user: Actor) {
  const route = ROUTES.find((r) => r.path === next);
  return route &&
    can(user, route.permission) &&
    (!route.cycle || canViewCycle(user, route.cycle))
    ? route.path
    : "/dashboard";
}
