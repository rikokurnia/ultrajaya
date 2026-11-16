import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { CYCLES } from "@/shared/cycles";
import { CycleWorkspace } from "@/features/cycles/workspace";
export default async function CyclePage({
  params,
  searchParams,
}: {
  params: Promise<{ cycle: string }>;
  searchParams: Promise<{
    tab?: string;
    doc?: string;
    view?: string;
    sub?: string;
    period?: string;
  }>;
}) {
  const { cycle } = await params;
  const entry = CYCLES.find((c) => c.key === cycle);
  if (!entry) notFound();
  await requireUser(entry.path);
  return <CycleWorkspace cycle={entry.key} query={await searchParams} />;
}
