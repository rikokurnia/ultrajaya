import { ModulePage } from "@/components/module-page";
import { SuppliersPage } from "@/features/procurement/suppliers/page";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string }>;
}) {
  return (
    <ModulePage path="/procurement/suppliers">
      <SuppliersPage searchParams={searchParams} />
    </ModulePage>
  );
}
