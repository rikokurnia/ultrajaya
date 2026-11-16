import type { Permission } from "@/lib/auth/permissions";
import { CYCLES, type CycleKey } from "./cycles";
export type ModuleKey = "dashboard" | "reports" | "settings";
export const MODULES = {
  dashboard: {
    title: "Dashboard",
    description: "Empat siklus operasional Ultrajaya",
    owner: 1,
  },
  reports: {
    title: "Laporan",
    description: "Laporan aktivitas siklus",
    owner: 1,
  },
  settings: {
    title: "Pengaturan",
    description: "Peran, siklus dan tugas",
    owner: 1,
  },
};
export interface RouteDefinition {
  path: string;
  label: string;
  module: ModuleKey;
  permission: Permission;
  cycle?: CycleKey;
}
export const ROUTES: readonly RouteDefinition[] = [
  {
    path: "/dashboard",
    label: "Dashboard",
    module: "dashboard",
    permission: "dashboard:read",
  },
  ...CYCLES.map((c) => ({
    path: c.path,
    label: c.title,
    module: "dashboard" as const,
    permission: "dashboard:read" as const,
    cycle: c.key,
  })),
  {
    path: "/reports",
    label: "Laporan",
    module: "reports",
    permission: "reports:read",
  },
  {
    path: "/settings",
    label: "Pengaturan",
    module: "settings",
    permission: "users:manage",
  },
];
