import { ModulePage } from "@/components/module-page";
import { InspectionsPage } from "@/features/inventory/inspections/page";
export default function Page() {
  return (
    <ModulePage path="/inventory/inspections">
      <InspectionsPage />
    </ModulePage>
  );
}
