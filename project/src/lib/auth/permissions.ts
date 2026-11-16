import type { Actor, Role, CycleAssignment } from "@/shared/contracts/auth";
import type { CycleKey } from "@/shared/cycles";
const OPS = ["OPERATIONS_STAFF"] as const,
  FIN = ["FINANCE_STAFF"] as const,
  HR = ["HR_PAYROLL_STAFF"] as const,
  MAN = ["MANAGER_APPROVER"] as const;
/** Explicit assignments are always required. A role defines eligibility, never an automatic grant. */
export const DUTY_CATALOG = [
  {
    key: "cycle:read",
    cycle: "pendapatan",
    label: "Lihat siklus pendapatan",
    roles: [...OPS, ...FIN, ...MAN],
  },
  {
    key: "sales_orders:write",
    cycle: "pendapatan",
    label: "Buat pesanan penjualan",
    roles: OPS,
  },
  {
    key: "stock:verify",
    cycle: "pendapatan",
    label: "Verifikasi stok",
    roles: OPS,
  },
  {
    key: "dispatches:write",
    cycle: "pendapatan",
    label: "Terbitkan surat jalan",
    roles: OPS,
  },
  {
    key: "sales_orders:approve",
    cycle: "pendapatan",
    label: "Tinjau kredit pelanggan",
    roles: FIN,
  },
  {
    key: "customer_invoices:write",
    cycle: "pendapatan",
    label: "Cocokkan faktur pelanggan",
    roles: FIN,
  },
  {
    key: "receipts_incoming:write",
    cycle: "pendapatan",
    label: "Catat penerimaan pembayaran",
    roles: FIN,
  },
  {
    key: "reconciliation:write",
    cycle: "pendapatan",
    label: "Rekonsiliasi bank",
    roles: FIN,
  },
  {
    key: "aging:approve",
    cycle: "pendapatan",
    label: "Setujui tinjauan umur piutang",
    roles: MAN,
  },
  {
    key: "cycle:read",
    cycle: "pengeluaran",
    label: "Lihat siklus pengeluaran",
    roles: [...OPS, ...FIN, ...MAN],
  },
  {
    key: "requests:write",
    cycle: "pengeluaran",
    label: "Buat permintaan pembelian",
    roles: OPS,
  },
  {
    key: "requests:verify",
    cycle: "pengeluaran",
    label: "Verifikasi kebutuhan pembelian",
    roles: OPS,
  },
  {
    key: "rfqs:write",
    cycle: "pengeluaran",
    label: "Kelola RFQ dan penawaran",
    roles: OPS,
  },
  {
    key: "orders:write",
    cycle: "pengeluaran",
    label: "Buat purchase order",
    roles: OPS,
  },
  {
    key: "receipts:write",
    cycle: "pengeluaran",
    label: "Terima barang",
    roles: OPS,
  },
  {
    key: "inspections:write",
    cycle: "pengeluaran",
    label: "Inspeksi QC penerimaan (terpisah)",
    roles: OPS,
  },
  {
    key: "invoices:write",
    cycle: "pengeluaran",
    label: "Cocokkan faktur dan catat utang",
    roles: FIN,
  },
  {
    key: "payments:write",
    cycle: "pengeluaran",
    label: "Bayar tagihan yang disetujui",
    roles: FIN,
  },
  {
    key: "approvals:decide",
    cycle: "pengeluaran",
    label: "Setujui purchase order",
    roles: MAN,
  },
  {
    key: "cycle:read",
    cycle: "produksi",
    label: "Lihat siklus produksi",
    roles: [...OPS, ...FIN, ...MAN],
  },
  {
    key: "production_orders:write",
    cycle: "produksi",
    label: "Rencanakan dan rilis produksi",
    roles: OPS,
  },
  {
    key: "batches:write",
    cycle: "produksi",
    label: "Proses batch produksi",
    roles: OPS,
  },
  {
    key: "production_qc:write",
    cycle: "produksi",
    label: "QC dan rilis batch (terpisah)",
    roles: OPS,
  },
  {
    key: "storage:confirm",
    cycle: "produksi",
    label: "Konfirmasi penyimpanan",
    roles: OPS,
  },
  {
    key: "production_costs:review",
    cycle: "produksi",
    label: "Hitung dan tinjau HPP",
    roles: [...FIN, ...MAN],
  },
  {
    key: "cycle:read",
    cycle: "penggajian",
    label: "Lihat siklus penggajian",
    roles: [...FIN, ...HR, ...MAN],
  },
  {
    key: "employees:write",
    cycle: "penggajian",
    label: "Kelola karyawan dan onboarding",
    roles: HR,
  },
  {
    key: "attendance:write",
    cycle: "penggajian",
    label: "Verifikasi absensi",
    roles: HR,
  },
  { key: "kpi:write", cycle: "penggajian", label: "Tinjau KPI", roles: HR },
  {
    key: "payroll:calculate",
    cycle: "penggajian",
    label: "Hitung penggajian",
    roles: HR,
  },
  {
    key: "payroll:review",
    cycle: "penggajian",
    label: "Tinjau perhitungan gaji",
    roles: [...FIN, ...HR],
  },
  {
    key: "payroll:approve",
    cycle: "penggajian",
    label: "Setujui periode penggajian",
    roles: MAN,
  },
  {
    key: "payroll:disburse",
    cycle: "penggajian",
    label: "Cairkan penggajian disetujui",
    roles: FIN,
  },
  {
    key: "journals:post",
    cycle: "penggajian",
    label: "Posting jurnal penggajian",
    roles: FIN,
  },
  {
    key: "journals:read",
    cycle: "penggajian",
    label: "Lihat jurnal penggajian",
    roles: [...FIN, ...MAN],
  },
  {
    key: "payroll:totals",
    cycle: "penggajian",
    label: "Lihat total penggajian",
    roles: [...FIN, ...HR, ...MAN],
  },
  {
    key: "salary:read",
    cycle: "penggajian",
    label: "Lihat gaji individual (sensitif)",
    roles: [...FIN, ...HR, ...MAN],
  },
  {
    key: "bank:read",
    cycle: "penggajian",
    label: "Lihat rekening individual (sensitif)",
    roles: [...FIN, ...HR],
  },
] as const;
export type Duty = (typeof DUTY_CATALOG)[number]["key"];
export type Permission =
  Duty | "dashboard:read" | "reports:read" | "users:manage" | "audit:read";
export const PERMISSIONS = [
  ...new Set<Permission>([
    "dashboard:read",
    "reports:read",
    "users:manage",
    "audit:read",
    ...DUTY_CATALOG.map((d) => d.key),
  ]),
];
export function isEligible(role: Role, cycle: CycleKey, duty: string) {
  const rule = DUTY_CATALOG.find((d) => d.cycle === cycle && d.key === duty);
  if (!rule) return false;
  if (role === "SYSTEM_ADMIN")
    return !["approvals:decide", "payroll:approve", "aging:approve"].includes(
      duty,
    );
  return (rule.roles as readonly Role[]).includes(role);
}
export function canDuty(
  actor: Actor | null | undefined,
  cycle: CycleKey,
  duty: string,
): boolean {
  return (
    !!actor &&
    isEligible(actor.role, cycle, duty) &&
    actor.assignments.some((a) => a.cycle === cycle && a.duties.includes(duty))
  );
}
export function canViewCycle(actor: Actor | null | undefined, cycle: CycleKey) {
  return canDuty(actor, cycle, "cycle:read");
}
export function can(
  actor: Actor | null | undefined,
  permission: Permission,
): boolean {
  if (!actor) return false;
  if (permission === "dashboard:read") return true;
  if (permission === "users:manage") return actor.role === "SYSTEM_ADMIN";
  if (permission === "reports:read")
    return (
      actor.role === "SYSTEM_ADMIN" ||
      actor.assignments.some((a) => canViewCycle(actor, a.cycle))
    );
  if (permission === "audit:read") return false;
  return DUTY_CATALOG.some(
    (d) => d.key === permission && canDuty(actor, d.cycle, permission),
  );
}
export function validateAssignments(
  role: Role,
  assignments: CycleAssignment[],
): boolean {
  return assignments.every((a) =>
    a.duties.every((d) => isEligible(role, a.cycle, d)),
  );
}
export class AccessError extends Error {
  constructor(
    public status: 401 | 403,
    message: string,
  ) {
    super(message);
  }
}
export function authorize(
  actor: Actor | null,
  permission: Permission,
  rule?: (actor: Actor) => boolean,
): asserts actor is Actor {
  if (!actor) throw new AccessError(401, "Silakan masuk.");
  if (!can(actor, permission) || (rule && !rule(actor)))
    throw new AccessError(403, "Akses tidak diizinkan.");
}
export const notCreator = (creatorId: string) => (actor: Actor) =>
  actor.id !== creatorId;
export const ownDocument = (creatorId: string) => (actor: Actor) =>
  actor.id === creatorId;
