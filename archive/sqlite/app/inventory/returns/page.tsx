import { ModulePage } from "@/components/module-page";
import { ReturnsPage } from "@/features/inventory/returns/page";

export default function Page() {
  return (
    <ModulePage path="/inventory/returns">
      <ReturnsPage />
    </ModulePage>
  );
}
