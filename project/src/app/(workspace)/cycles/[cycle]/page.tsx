import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { CYCLES } from "@/shared/cycles";
import { PendapatanPage } from "@/features/cycles/pendapatan/page";
import styles from "@/components/foundation.module.css";

/** Cycle entry points. Pendapatan implements the revenue dashboard; remaining cycles stay blank for their owners. */
export default async function CyclePage({
  params,
  searchParams,
}: {
  params: Promise<{ cycle: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { cycle } = await params;
  if (!CYCLES.some((item) => item.key === cycle)) notFound();
  const user = await requireUser(`/cycles/${cycle}`);

  if (cycle === "pendapatan") {
    const { tab } = await searchParams;
    return <PendapatanPage user={user} initialTab={tab} />;
  }

  return <div className={styles.cycleBlank} />;
}
