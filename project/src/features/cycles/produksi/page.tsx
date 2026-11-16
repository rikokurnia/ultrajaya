import type { User } from "@/shared/contracts/auth";
import { ProduksiView } from "./produksi-view";

export function ProduksiPage({
  user,
  initialTab,
  initialView,
}: {
  user: User;
  initialTab?: string;
  initialView?: string;
}) {
  return (
    <ProduksiView
      user={user}
      initialTab={initialTab}
      initialView={initialView}
    />
  );
}
