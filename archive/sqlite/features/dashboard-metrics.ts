import type { Actor } from "@/shared/contracts/auth";
import { can, type Permission } from "@/lib/auth/permissions";
import type { Material, StockBalance, MaterialRequest, PurchaseOrder, GoodsReceipt, Invoice, PayableBalance } from "@/shared/contracts/domain";

export const dashboardMetrics: { key: string; label: string; permission: Permission; href: string; hint: string }[] = [
  { key: "critical", label: "Critical materials", permission: "stock:read", href: "/inventory/stock", hint: "Available stock below minimum" },
  { key: "requests", label: "Pending material requests", permission: "requests:read", href: "/procurement/requests", hint: "Submitted, awaiting verification" },
  { key: "approvals", label: "POs awaiting approval", permission: "approvals:read", href: "/procurement/approvals", hint: "Current approval queue" },
  { key: "receipts", label: "Receipts awaiting QC", permission: "receipts:read", href: "/inventory/receipts", hint: "Recorded or partially inspected" },
  { key: "held", label: "Invoices on hold", permission: "invoices:read", href: "/finance/invoices", hint: "Blocked for new payment" },
  { key: "due", label: "Payables due", permission: "payables:read", href: "/finance/payables", hint: "Outstanding due in next 7 days" },
];
export function visibleMetrics(actor: Actor) { return dashboardMetrics.filter(m => can(actor, m.permission)); }
export function periodRange(period: string, now = new Date()) {
  const today = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
  const end = new Date(`${today}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (period === "7d" ? 6 : period === "90d" ? 89 : 29));
  return { start: start.toISOString().slice(0, 10), end: today };
}
export function inPeriod(instant: string, range: ReturnType<typeof periodRange>) {
  const day = new Date(new Date(instant).getTime() + 7 * 3600000).toISOString().slice(0, 10);
  return day >= range.start && day <= range.end;
}
export function exactQuantity(value: string): bigint {
  if (!/^\d+(\.\d{1,3})?$/.test(value)) throw new Error("Invalid decimal quantity");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(1000) + BigInt(fraction.padEnd(3, "0"));
}
export function sumMoney(values: number[]): number {
  const total = values.reduce((sum, value) => {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid minor units");
    return sum + BigInt(value);
  }, BigInt(0));
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Unsafe monetary total");
  return Number(total);
}
// Pure calculations over existing shared contracts; not a replacement read-model/service.
export function criticalCount(materials: Material[], stock: StockBalance[]) {
  return materials.filter(m => m.active && stock.some(s => s.materialId === m.id) && stock.filter(s => s.materialId === m.id).reduce((n,s) => n + exactQuantity(s.available), BigInt(0)) < exactQuantity(m.minimum)).length;
}
export const pendingRequests = (rows: MaterialRequest[]) => rows.filter(r => r.status === "SUBMITTED").length;
export const pendingApprovals = (rows: PurchaseOrder[]) => rows.filter(r => r.status === "AWAITING_APPROVAL").length;
export const awaitingQc = (rows: GoodsReceipt[]) => rows.filter(r => r.status !== "INSPECTED").length;
export const heldInvoices = (rows: Invoice[]) => rows.filter(r => r.status === "HELD").length;
export function duePayables(invoices: Invoice[], balances: PayableBalance[], today: string) {
  const end = new Date(`${today}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + 7);
  const last = end.toISOString().slice(0,10);
  const ids = new Set(invoices.filter(i => i.status !== "VOIDED" && i.dueOn >= today && i.dueOn <= last).map(i => i.id));
  return sumMoney(balances.filter(b => ids.has(b.invoiceId)).map(b => b.outstanding));
}
