import { ModulePage } from "@/components/module-page";
import { PayablesPage } from "@/features/finance/payables/page";
export default function Page({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string }>;
}) {
  return (
    <ModulePage path="/finance/payables">
      <PayablesPage searchParams={searchParams} />
    </ModulePage>
  );
}
