import { requireUser } from "@/lib/auth/session";
import { DashboardPage } from "@/features/dashboard/overview/page";
export default async function Page() {
  await requireUser("/dashboard");
  return <DashboardPage />;
}
