import { ModulePage } from "@/components/module-page";
import { OrdersPage } from "@/features/procurement/orders/page";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; status?: string; selected?: string }>;
}) {
  return (
    <ModulePage path="/procurement/orders">
      <OrdersPage searchParams={searchParams} />
    </ModulePage>
  );
}
