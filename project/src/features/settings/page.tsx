import { requirePermission } from "@/lib/auth/session";
import { listUsers } from "@/server/auth-service";
import { SettingsView } from "./settings-view";
export async function SettingsPage() {
  const actor = await requirePermission("users:manage");
  return <SettingsView actor={actor} users={listUsers(actor)} />;
}
