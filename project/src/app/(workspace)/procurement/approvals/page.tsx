import { ModulePage } from "@/components/module-page";
import { ApprovalsPage } from "@/features/procurement/approvals/page";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ selected?: string }>;
}) {
  return (
    <ModulePage path="/procurement/approvals">
      <ApprovalsPage searchParams={searchParams} />
    </ModulePage>
  );
}
