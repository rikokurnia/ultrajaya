import { ModulePage } from "@/components/module-page";
import { JournalsPage } from "@/features/finance/journals/page";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; subview?: string }>;
}) {
  return (
    <ModulePage path="/finance/journals">
      <JournalsPage searchParams={searchParams} />
    </ModulePage>
  );
}
