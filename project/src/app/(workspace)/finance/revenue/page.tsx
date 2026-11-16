import { ModulePage } from "@/components/module-page";
import { RevenuePage } from "@/features/finance/revenue/page";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ subview?: string }>;
}) {
  const params = await searchParams;
  return (
    <ModulePage path="/finance/revenue">
      <RevenuePage subview={params?.subview} />
    </ModulePage>
  );
}
