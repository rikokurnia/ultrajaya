import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { ROUTES, MODULES } from "@/shared/routes";
import { AccessDenied } from "./access-denied";
import { PageHeader, TabNavigation } from "./ui";
export async function ModulePage({
  path,
  children,
}: {
  path: string;
  children: React.ReactNode;
}) {
  const route = ROUTES.find((r) => r.path === path);
  if (!route) throw new Error(`Unregistered route: ${path}`);
  const user = await requireUser(path);
  if (!can(user, route.permission)) return <AccessDenied />;
  const moduleInfo = MODULES[route.module];
  const tabs = ROUTES.filter(
    (r) => r.module === route.module && can(user, r.permission),
  );
  return (
    <>
      <PageHeader
        title={moduleInfo.title}
        description={moduleInfo.description}
      />
      {tabs.length > 1 && <TabNavigation items={tabs} active={path} />}
      <div className="module-content">{children}</div>
    </>
  );
}
