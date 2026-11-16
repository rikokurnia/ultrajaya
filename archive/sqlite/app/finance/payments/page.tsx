import { ModulePage } from "@/components/module-page";
import { PaymentsPage } from "@/features/finance/payments/page";
export default function Page({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; invoiceId?: string }>;
}) {
  return (
    <ModulePage path="/finance/payments">
      <PaymentsPage searchParams={searchParams} />
    </ModulePage>
  );
}
