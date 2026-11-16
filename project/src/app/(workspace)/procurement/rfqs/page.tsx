import { ModulePage } from "@/components/module-page";
import { RfqsPage } from "@/features/procurement/rfqs/page";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; status?: string }>;
}) {
  return (
    <ModulePage path="/procurement/rfqs">
      <RfqsPage searchParams={searchParams} />
    </ModulePage>
  );
}
