import type { User } from "@/shared/contracts/auth";
import { PenggajianView } from "./penggajian-view";

export function PenggajianPage({
  user,
  initialTab,
  initialSubView,
  initialPeriod,
}: {
  user: User;
  initialTab?: string;
  initialSubView?: string;
  initialPeriod?: string;
}) {
  return (
    <PenggajianView
      user={user}
      initialTab={initialTab}
      initialSubView={initialSubView}
      initialPeriod={initialPeriod}
    />
  );
}
