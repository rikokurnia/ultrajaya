import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { inventoryService } from "../server/inventory-service";
import { StockView } from "./stock-view";

export async function StockPage() {
  const user = await requireUser("/inventory/stock");
  const [stock, warehouses, movements] = await Promise.all([
    inventoryService.stock(user),
    inventoryService.listWarehouses(user),
    inventoryService.listMovements(user, { limit: 50 }),
  ]);

  const canVerify = can(user, "requests:verify");

  return (
    <StockView
      initialStock={stock}
      warehouses={warehouses}
      movements={movements}
      canVerify={canVerify}
    />
  );
}
