import { ModulePage } from "@/components/module-page";
import { RequestsPage } from "@/features/procurement/requests/page";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; status?: string }>;
}) {
  return (
    <ModulePage path="/procurement/requests">
      <RequestsPage searchParams={searchParams} />
    </ModulePage>
  );
}
