import { requireUser } from "@/lib/auth/session";
import { ReportsPage } from "@/features/reports/overview/page";
/** Reference-only report foundation; domain report services retain their own permission checks. */
export default async function Page() {
  await requireUser("/reports");
  return <ReportsPage />;
}
