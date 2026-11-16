import type { ReactNode } from "react";
import type { Actor } from "@/shared/contracts/auth";
import { can, type Permission } from "@/lib/auth/permissions";
/** Presentation only. Always authorize independently inside server operations. */
export function PermissionGate({
  actor,
  permission,
  children,
  fallback = null,
}: {
  actor: Actor;
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return can(actor, permission) ? children : fallback;
}
