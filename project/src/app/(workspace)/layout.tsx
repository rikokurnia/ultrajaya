import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth/session";
import { DemoProvider } from "@/lib/demo/provider";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <DemoProvider user={user}>
      <AppShell user={user}>{children}</AppShell>
    </DemoProvider>
  );
}
