import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { CYCLES } from "@/shared/cycles";
import styles from "@/components/foundation.module.css";
/** Intentionally blank. Cycle agents implement their content here. */
export default async function CyclePage({
  params,
}: {
  params: Promise<{ cycle: string }>;
}) {
  const { cycle } = await params;
  if (!CYCLES.some((item) => item.key === cycle)) notFound();
  await requireUser(`/cycles/${cycle}`);
  return <div className={styles.cycleBlank} />;
}
