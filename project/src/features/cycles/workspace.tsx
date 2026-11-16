"use client";
import { useDemo } from "@/lib/demo/provider";
import { canViewCycle } from "@/lib/auth/permissions";
import type { CycleKey } from "@/shared/cycles";
import { AccessDenied } from "@/components/access-denied";
import { PendapatanPage } from "./pendapatan/page";
import { PengeluaranPage } from "./pengeluaran/page";
import { ProduksiPage } from "./produksi/page";
import { PenggajianPage } from "./penggajian/page";
export function CycleWorkspace({
  cycle,
  query,
}: {
  cycle: CycleKey;
  query: {
    tab?: string;
    doc?: string;
    view?: string;
    sub?: string;
    period?: string;
  };
}) {
  const { user } = useDemo();
  if (!user.active || !canViewCycle(user, cycle)) return <AccessDenied />;
  switch (cycle) {
    case "pendapatan":
      return <PendapatanPage user={user} initialTab={query.tab} />;
    case "pengeluaran":
      return (
        <PengeluaranPage
          user={user}
          initialTab={query.tab}
          initialDocType={query.doc}
        />
      );
    case "produksi":
      return (
        <ProduksiPage
          user={user}
          initialTab={query.tab}
          initialView={query.view}
        />
      );
    case "penggajian":
      return (
        <PenggajianPage
          user={user}
          initialTab={query.tab}
          initialSubView={query.sub}
          initialPeriod={query.period}
        />
      );
  }
}
