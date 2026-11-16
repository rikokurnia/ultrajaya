import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { inventoryService } from "../server/inventory-service";
import { InspectionsView } from "./inspections-view";

export async function InspectionsPage() {
  const user = await requireUser("/inventory/inspections");
  const [inspections, pendingReceipts] = await Promise.all([
    inventoryService.listInspections(user),
    inventoryService.listReceipts(user, { status: "RECORDED" }),
  ]);

  const canWrite = can(user, "inspections:write");

  return (
    <InspectionsView
      inspections={inspections}
      pendingReceipts={pendingReceipts}
      canWrite={canWrite}
    />
  );
}
