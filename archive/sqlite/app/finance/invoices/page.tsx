import { ModulePage } from "@/components/module-page";
import { InvoicesPage } from "@/features/finance/invoices/page";
export default function Page({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; selected?: string }>;
}) {
  return (
    <ModulePage path="/finance/invoices">
      <InvoicesPage searchParams={searchParams} />
    </ModulePage>
  );
}
