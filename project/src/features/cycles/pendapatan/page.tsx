import type { User } from "@/shared/contracts/auth";
import { PendapatanView } from "./pendapatan-view";

export function PendapatanPage({
  user,
  initialTab,
}: {
  user: User;
  initialTab?: string;
}) {
  return <PendapatanView user={user} initialTab={initialTab} />;
}
