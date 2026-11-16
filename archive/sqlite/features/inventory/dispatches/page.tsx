import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { inventoryService } from "../server/inventory-service";
import { DispatchesView } from "./dispatches-view";

export async function DispatchesPage() {
  const user = await requireUser("/inventory/dispatches");
  const [dispatches, salesOrders, warehouses] = await Promise.all([
    inventoryService.listDispatches(user),
    inventoryService.listSalesOrders(user),
    inventoryService.listWarehouses(user),
  ]);

  const canWrite = can(user, "dispatches:write") || can(user, "receipts:write");

  return (
    <DispatchesView
      dispatches={dispatches}
      salesOrders={salesOrders}
      warehouses={warehouses}
      canWrite={canWrite}
    />
  );
}
