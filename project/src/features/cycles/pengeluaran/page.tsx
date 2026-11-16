import type { User } from "@/shared/contracts/auth";
import { PengeluaranView } from "./pengeluaran-view";

export function PengeluaranPage({
  user,
  initialTab,
  initialDocType,
}: {
  user: User;
  initialTab?: string;
  initialDocType?: string;
}) {
  return (
    <PengeluaranView
      user={user}
      initialTab={initialTab}
      initialDocType={initialDocType}
    />
  );
}
