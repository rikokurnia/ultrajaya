import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { CYCLES } from "@/shared/cycles";
import { PendapatanPage } from "@/features/cycles/pendapatan/page";
import { ProduksiPage } from "@/features/cycles/produksi/page";
import { PenggajianPage } from "@/features/cycles/penggajian/page";
import styles from "@/components/foundation.module.css";

/** Cycle entry points. Pendapatan, Produksi, and Penggajian implement their respective cycles; remaining cycles stay blank for their owners. */
export default async function CyclePage({
  params,
  searchParams,
}: {
  params: Promise<{ cycle: string }>;
  searchParams: Promise<{ tab?: string; view?: string; sub?: string; period?: string }>;
}) {
  const { cycle } = await params;
  if (!CYCLES.some((item) => item.key === cycle)) notFound();
  const user = await requireUser(`/cycles/${cycle}`);

  if (cycle === "pendapatan") {
    const { tab } = await searchParams;
    return <PendapatanPage user={user} initialTab={tab} />;
  }

  if (cycle === "produksi") {
    const { tab, view } = await searchParams;
    return <ProduksiPage user={user} initialTab={tab} initialView={view} />;
  }

  if (cycle === "penggajian") {
    const { tab, sub, period } = await searchParams;
    return (
      <PenggajianPage
        user={user}
        initialTab={tab}
        initialSubView={sub}
        initialPeriod={period}
      />
    );
  }

  return <div className={styles.cycleBlank} />;
}
