import { ModulePage } from "@/components/module-page";
import { ReceiptsPage } from "@/features/inventory/receipts/page";
export default function Page() {
  return (
    <ModulePage path="/inventory/receipts">
      <ReceiptsPage />
    </ModulePage>
  );
}
