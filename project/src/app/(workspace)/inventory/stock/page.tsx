import { ModulePage } from "@/components/module-page";
import { StockPage } from "@/features/inventory/stock/page";
export default function Page() {
  return (
    <ModulePage path="/inventory/stock">
      <StockPage />
    </ModulePage>
  );
}
