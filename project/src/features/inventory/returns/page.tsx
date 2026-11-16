import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { inventoryService } from "../server/inventory-service";
import { ReturnsView } from "./returns-view";

export async function ReturnsPage() {
  const user = await requireUser("/inventory/returns");
  const [returns, warehouses] = await Promise.all([
    inventoryService.listReturns(user),
    inventoryService.listWarehouses(user),
  ]);

  const canWrite = can(user, "returns:inspect") || can(user, "inspections:write");

  return (
    <ReturnsView
      returns={returns}
      warehouses={warehouses}
      canWrite={canWrite}
    />
  );
}
