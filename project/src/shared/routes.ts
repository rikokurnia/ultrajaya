import type { Permission } from "@/lib/auth/permissions";
export type ModuleKey =
  | "dashboard"
  | "procurement"
  | "inventory"
  | "finance"
  | "reports"
  | "settings";
export const MODULES: Record<
  ModuleKey,
  { title: string; description: string; owner: number }
> = {
  dashboard: {
    title: "Dashboard",
    description: "Procurement, stock and finance at a glance",
    owner: 2,
  },
  procurement: {
    title: "Procurement",
    description: "Manage requests, supplier quotes and purchase approvals",
    owner: 3,
  },
  inventory: {
    title: "Inventory & Quality Control",
    description: "Track raw materials, partial receipts and quality acceptance",
    owner: 4,
  },
  finance: {
    title: "Finance",
    description: "Match invoices, manage payables and track every payment",
    owner: 5,
  },
  reports: {
    title: "Reports",
    description:
      "Trace documents and review operational and accounting reports",
    owner: 6,
  },
  settings: {
    title: "Settings",
    description: "Manage your workspace users and access",
    owner: 1,
  },
};
export interface RouteDefinition {
  path: string;
  label: string;
  module: ModuleKey;
  permission: Permission;
}
export const ROUTES: readonly RouteDefinition[] = [
  {
    path: "/dashboard",
    label: "Overview",
    module: "dashboard",
    permission: "dashboard:read",
  },
  {
    path: "/cycles/pendapatan",
    label: "Pendapatan",
    module: "dashboard",
    permission: "dashboard:read",
  },
  {
    path: "/cycles/pengeluaran",
    label: "Pengeluaran",
    module: "dashboard",
    permission: "dashboard:read",
  },
  {
    path: "/cycles/produksi",
    label: "Produksi",
    module: "dashboard",
    permission: "dashboard:read",
  },
  {
    path: "/cycles/penggajian",
    label: "Penggajian",
    module: "dashboard",
    permission: "dashboard:read",
  },
  {
    path: "/procurement/requests",
    label: "Material Requests / FPBB",
    module: "procurement",
    permission: "requests:read",
  },
  {
    path: "/procurement/rfqs",
    label: "RFQs",
    module: "procurement",
    permission: "rfqs:read",
  },
  {
    path: "/procurement/suppliers",
    label: "Suppliers",
    module: "procurement",
    permission: "suppliers:read",
  },
  {
    path: "/procurement/orders",
    label: "Purchase Orders",
    module: "procurement",
    permission: "orders:read",
  },
  {
    path: "/procurement/approvals",
    label: "Approvals",
    module: "procurement",
    permission: "approvals:read",
  },
  {
    path: "/inventory/stock",
    label: "Material Stock",
    module: "inventory",
    permission: "stock:read",
  },
  {
    path: "/inventory/receipts",
    label: "Goods Receipts",
    module: "inventory",
    permission: "receipts:read",
  },
  {
    path: "/inventory/inspections",
    label: "QC Inspections",
    module: "inventory",
    permission: "inspections:read",
  },
  {
    path: "/inventory/dispatches",
    label: "Dispatches",
    module: "inventory",
    permission: "dispatches:read",
  },
  {
    path: "/inventory/returns",
    label: "Returns",
    module: "inventory",
    permission: "returns:read",
  },
  {
    path: "/finance/invoices",
    label: "Invoices & Matching",
    module: "finance",
    permission: "invoices:read",
  },
  {
    path: "/finance/payables",
    label: "Payables",
    module: "finance",
    permission: "payables:read",
  },
  {
    path: "/finance/payments",
    label: "Payments",
    module: "finance",
    permission: "payments:read",
  },
  {
    path: "/finance/journals",
    label: "Journals",
    module: "finance",
    permission: "journals:read",
  },
  {
    path: "/finance/revenue",
    label: "Revenue Operations",
    module: "finance",
    permission: "revenue:read",
  },
  {
    path: "/reports",
    label: "Reports",
    module: "reports",
    permission: "reports:read",
  },
  {
    path: "/reports/audit",
    label: "Audit Trail",
    module: "reports",
    permission: "audit:read",
  },
  {
    path: "/settings",
    label: "User administration",
    module: "settings",
    permission: "users:manage",
  },
];
