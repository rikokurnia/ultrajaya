import { ModulePage } from "@/components/module-page";
import { DispatchesPage } from "@/features/inventory/dispatches/page";

export default function Page() {
  return (
    <ModulePage path="/inventory/dispatches">
      <DispatchesPage />
    </ModulePage>
  );
}
