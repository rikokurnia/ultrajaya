import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { inventoryService } from "../server/inventory-service";
import { ReceiptsView } from "./receipts-view";

export async function ReceiptsPage() {
  const user = await requireUser("/inventory/receipts");
  const [stock, receipts, warehouses, materials] = await Promise.all([
    inventoryService.stock(user),
    inventoryService.listReceipts(user),
    inventoryService.listWarehouses(user),
    inventoryService.listMaterials(user),
  ]);

  const canWrite = can(user, "receipts:write");

  return (
    <ReceiptsView
      initialStock={stock}
      initialReceipts={receipts}
      warehouses={warehouses}
      materials={materials}
      canWrite={canWrite}
    />
  );
}
