import { ModulePage } from "@/components/module-page";
import { AuditPage } from "@/features/reports/audit/page";
export default function Page() {
  return (
    <ModulePage path="/reports/audit">
      <AuditPage />
    </ModulePage>
  );
}
