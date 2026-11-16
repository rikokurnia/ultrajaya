import type { Permission } from "@/lib/auth/permissions";

export interface RevenueSubviewDefinition {
  id: string;
  label: string;
  description: string;
  readPermission: Permission;
  writePermission?: Permission;
  actionLabels?: {
    primary?: string;
  };
}

export const REVENUE_SUBVIEWS: readonly RevenueSubviewDefinition[] = [
  {
    id: "customers",
    label: "Customers & Credit",
    description: "Manage customer profiles, payment terms, and credit activation.",
    readPermission: "customers:read",
    writePermission: "customers:write",
    actionLabels: {
      primary: "Register customer",
    },
  },
  {
    id: "sales-orders",
    label: "Sales Orders",
    description: "Order entry, pricing verification, and discount validation.",
    readPermission: "sales_orders:read",
    writePermission: "sales_orders:write",
    actionLabels: {
      primary: "Create sales order",
    },
  },
  {
    id: "credit-decisions",
    label: "Credit Decisions",
    description: "Evaluate customer credit utilization and approve credit release.",
    readPermission: "sales_orders:read",
    writePermission: "sales_orders:approve",
    actionLabels: {
      primary: "Approve credit release",
    },
  },
  {
    id: "invoices",
    label: "Customer Invoices",
    description: "Generate AR invoices upon verified signed delivery evidence.",
    readPermission: "customer_invoices:read",
    writePermission: "customer_invoices:write",
    actionLabels: {
      primary: "Issue invoice",
    },
  },
  {
    id: "receipts",
    label: "Incoming Receipts",
    description: "Record customer payment slips and validate bank receipts.",
    readPermission: "receipts_incoming:read",
    writePermission: "receipts_incoming:write",
    actionLabels: {
      primary: "Record receipt",
    },
  },
  {
    id: "returns",
    label: "Returns & Credit Notes",
    description: "Track return claims and issue authorized credit notes.",
    readPermission: "returns:read",
    writePermission: "credit_notes:write",
    actionLabels: {
      primary: "Issue credit note",
    },
  },
  {
    id: "write-offs",
    label: "Bad Debt Write-Offs",
    description: "AR write-off recommendations and FAM managerial authorization.",
    readPermission: "writeoffs:read",
    writePermission: "writeoffs:recommend",
    actionLabels: {
      primary: "Recommend write-off",
    },
  },
] as const;

export type RevenueSubviewId = (typeof REVENUE_SUBVIEWS)[number]["id"];
