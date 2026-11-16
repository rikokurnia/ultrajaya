import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { AccessDenied } from "@/components/access-denied";
import { SettingsPage } from "@/features/settings/page";
export default async function Page() {
  const actor = await requireUser("/settings");
  if (!can(actor, "users:manage")) return <AccessDenied />;
  return <SettingsPage />;
}
