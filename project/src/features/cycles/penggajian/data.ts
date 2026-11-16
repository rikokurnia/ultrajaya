import type { Actor } from "@/shared/contracts/auth";
import { can } from "@/lib/auth/permissions";

export type PenggajianTab =
  "ringkasan" | "karyawan" | "absensi-kinerja" | "penggajian";

export type AbsensiKinerjaSubView = "absensi" | "kinerja";

export type PayrollPeriodKey = "2026-11" | "2026-10" | "2026-09" | "2026-12";

export type TaskQueueStatus =
  | "Perlu ditinjau"
  | "Sedang berjalan"
  | "Menunggu persetujuan"
  | "Belum dimulai"
  | "Selesai";

export type OnboardingStatus =
  "Selesai Onboarding" | "Verifikasi Dokumen" | "Orientasi Baru";

export type ReadinessStatus = "Siap Diproses" | "Data Belum Lengkap";

export type EmploymentType = "Tetap" | "Kontrak" | "Masa Percobaan";

export type AttendanceCorrectionStatus =
  "Perlu Koreksi" | "Menunggu Verifikasi" | "Terverifikasi";

export type KpiReviewStatus = "Perlu Ditinjau" | "Disahkan";

export type PayPeriodStage =
  | "Perlu Perhitungan"
  | "Menunggu Tinjauan"
  | "Menunggu Persetujuan"
  | "Menunggu Pencairan"
  | "Menunggu Posting Jurnal"
  | "Selesai";

export type SubStageStatus =
  | "Belum Dimulai"
  | "Menunggu"
  | "Perlu Tindak Lanjut"
  | "Disetujui"
  | "Telah Dicairkan"
  | "Terposting";

export type PayPeriodActionLabel =
  | "Hitung Gaji"
  | "Tinjau Perhitungan"
  | "Setujui Periode"
  | "Proses Pencairan"
  | "Posting Jurnal";

export interface PenggajianTabMeta {
  key: PenggajianTab;
  label: string;
  bannerTitle: string;
}

export const PENGGAJIAN_TABS: readonly PenggajianTabMeta[] = [
  {
    key: "ringkasan",
    label: "Ringkasan",
    bannerTitle: "Ringkasan Penggajian",
  },
  {
    key: "karyawan",
    label: "Karyawan",
    bannerTitle: "Karyawan",
  },
  {
    key: "absensi-kinerja",
    label: "Absensi & Kinerja",
    bannerTitle: "Absensi & Kinerja",
  },
  {
    key: "penggajian",
    label: "Penggajian",
    bannerTitle: "Penggajian",
  },
];

export function normalizePenggajianTab(raw?: string): PenggajianTab {
  if (raw === "karyawan" || raw === "absensi-kinerja" || raw === "penggajian") {
    return raw;
  }
  if (raw === "absensi" || raw === "kinerja") {
    return "absensi-kinerja";
  }
  return "ringkasan";
}

export function normalizeSubView(raw?: string): AbsensiKinerjaSubView {
  if (raw === "kinerja") return "kinerja";
  return "absensi";
}

export function normalizePeriodKey(raw?: string): PayrollPeriodKey {
  if (
    raw === "2026-11" ||
    raw === "2026-10" ||
    raw === "2026-09" ||
    raw === "2026-12"
  ) {
    return raw;
  }
  return "2026-11";
}

export function formatRupiahFull(amount: number): string {
  const formatted = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(amount)));
  return `Rp${formatted}`;
}

export function formatRupiahCompact(amount: number): string {
  if (amount <= 0) return "Rp0";
  if (amount >= 1_000_000_000) {
    const billions = amount / 1_000_000_000;
    const formatted = new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(billions);
    return `Rp${formatted} M`;
  }
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const formatted = new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(millions);
    return `Rp${formatted} jt`;
  }
  return formatRupiahFull(amount);
}

/** Every payroll capability requires an explicit cycle/duty assignment. */
export const canViewPayrollAmounts = (actor: Actor | null | undefined) =>
  can(actor, "payroll:totals");
export const canViewIndividualCompensation = (
  actor: Actor | null | undefined,
) => can(actor, "salary:read");
export const canViewFullBankDetails = (actor: Actor | null | undefined) =>
  can(actor, "bank:read");
export function formatBankAccountForActor(
  actor: Actor | null | undefined,
  bankName: string,
  accountNumber: string,
): string {
  if (!accountNumber.trim()) return "Belum terdaftar";
  return canViewFullBankDetails(actor)
    ? `${bankName} · ${accountNumber}`
    : "Terbatas (izin rekening diperlukan)";
}
export const canManageEmployees = (actor: Actor | null | undefined) =>
  can(actor, "employees:write");
export const canReviewAttendance = (actor: Actor | null | undefined) =>
  can(actor, "attendance:write");
export const canReviewKpi = (actor: Actor | null | undefined) =>
  can(actor, "kpi:write");
export function canExecutePayPeriodAction(
  actor: Actor | null | undefined,
  stage: PayPeriodStage,
  creatorId?: string,
): boolean {
  if (!actor || stage === "Selesai") return false;
  switch (stage) {
    case "Perlu Perhitungan":
      return can(actor, "payroll:calculate");
    case "Menunggu Tinjauan":
      return can(actor, "payroll:review");
    case "Menunggu Persetujuan":
      return (
        can(actor, "payroll:approve") &&
        actor.id !== (creatorId || "demo_hr_payroll_staff")
      );
    case "Menunggu Pencairan":
      return can(actor, "payroll:disburse");
    case "Menunggu Posting Jurnal":
      return can(actor, "journals:post");
  }
}
export const canReadGeneralLedger = (actor: Actor | null | undefined) =>
  can(actor, "journals:read");

export function actionLabelForPayPeriodStage(
  stage: PayPeriodStage,
): PayPeriodActionLabel | null {
  switch (stage) {
    case "Perlu Perhitungan":
      return "Hitung Gaji";
    case "Menunggu Tinjauan":
      return "Tinjau Perhitungan";
    case "Menunggu Persetujuan":
      return "Setujui Periode";
    case "Menunggu Pencairan":
      return "Proses Pencairan";
    case "Menunggu Posting Jurnal":
      return "Posting Jurnal";
    case "Selesai":
      return null;
  }
}

export interface EmployeeRecord {
  id: string;
  code: string;
  name: string;
  department: string;
  roleTitle: string;
  employmentType: EmploymentType;
  joinDateLabel: string;
  onboardingStatus: OnboardingStatus;
  readinessStatus: ReadinessStatus;
  missingDataNote: string;
  baseSalary: number;
  fixedAllowance: number;
  overtimeRatePerHour: number;
  kpiIncentiveEligible: boolean;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  npwpNumber: string;
  ptkpStatus: string;
  bpjsKesehatanNumber: string;
  bpjsKetenagakerjaanNumber: string;
}

export interface AttendanceRecord {
  id: string;
  code: string;
  periodKey: PayrollPeriodKey;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  shiftLabel: string;
  daysPresent: number;
  leaveDays: number;
  hoursWorked: number;
  overtimeHours: number;
  spklReference: string;
  correctionStatus: AttendanceCorrectionStatus;
  anomalyNote: string;
}

export interface KpiEvaluationRecord {
  id: string;
  code: string;
  periodKey: PayrollPeriodKey;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  roleTitle: string;
  keyIndicator: string;
  achievementSummary: string;
  score: number;
  gradeLabel: string;
  incentiveEligible: boolean;
  incentiveRatePct: number;
  reviewStatus: KpiReviewStatus;
  evaluatorNote: string;
}

export interface PayTimelineStep {
  id: string;
  title: string;
  actorLabel: string;
  status: "done" | "current" | "pending";
  timestampLabel: string;
  note: string;
}

export interface JournalPreviewLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface PayPeriodRecord {
  createdByUserId?: string;
  id: string;
  code: string;
  periodKey: PayrollPeriodKey;
  name: string;
  cutoffLabel: string;
  payDateLabel: string;
  employeeCount: number;
  readyEmployeeCount: number;
  baseAndAllowanceTotal: number;
  kpiIncentiveTotal: number;
  overtimeTotal: number;
  grossPay: number;
  pph21Deduction: number;
  bpjsDeduction: number;
  attendanceDeduction: number;
  totalDeductions: number;
  netPay: number;
  stage: PayPeriodStage;
  approvalStatus: SubStageStatus;
  disbursementStatus: SubStageStatus;
  journalPostingStatus: SubStageStatus;
  journalNumber: string | null;
  journalPostedDate: string | null;
  journalLines: JournalPreviewLine[];
  summaryNote: string;
  timeline: PayTimelineStep[];
}

export interface PayrollTrendPoint {
  periodKey: string;
  label: string;
  grossMillions: number;
  netMillions: number;
  employeeCount: number;
}

export interface SummaryFollowUpItem {
  id: string;
  label: string;
  detail: string;
  actionLabel: string;
  tone: "warning" | "danger" | "info";
  targetTab: PenggajianTab;
  targetSubView?: AbsensiKinerjaSubView;
  targetPeriodKey?: PayrollPeriodKey;
  targetRecordId?: string;
}

export interface PayrollTaskQueueItem {
  id: string;
  task: string;
  reference: string;
  stageLabel: string;
  status: TaskQueueStatus;
  actionLabel: string;
  targetTab: PenggajianTab;
  targetSubView?: AbsensiKinerjaSubView;
  targetPeriodKey?: PayrollPeriodKey;
  targetRecordId?: string;
  description: string;
  ownerRole: string;
}

/**
 * Existing payroll rule for KPI incentive calculation (per UC-03 & UC-10):
 * KPI results are included in payroll calculation ONLY when:
 * 1) the employee's compensation scheme includes periodic KPI incentives (`incentiveEligible`),
 * 2) the evaluation is verified/approved by HRD (`reviewStatus === "Disahkan"`), and
 * 3) the KPI score meets the minimum performance standard (`score >= 80`).
 */
export function calculateKpiIncentiveAmount(
  baseSalary: number,
  evaluation: Pick<
    KpiEvaluationRecord,
    "incentiveEligible" | "incentiveRatePct" | "reviewStatus" | "score"
  >,
): number {
  if (!evaluation.incentiveEligible) return 0;
  if (evaluation.reviewStatus !== "Disahkan") return 0;
  if (evaluation.score < 80) return 0;
  return Math.round((baseSalary * evaluation.incentiveRatePct) / 100);
}

export const PAYROLL_PERIOD_OPTIONS: readonly {
  key: PayrollPeriodKey;
  label: string;
}[] = [
  { key: "2026-11", label: "November 2026" },
  { key: "2026-10", label: "Oktober 2026" },
  { key: "2026-09", label: "September 2026" },
  { key: "2026-12", label: "Desember 2026 (Draf)" },
];

export const PAYROLL_TREND_SERIES: readonly PayrollTrendPoint[] = [
  {
    periodKey: "2026-06",
    label: "Jun 2026",
    grossMillions: 1610,
    netMillions: 1375,
    employeeCount: 122,
  },
  {
    periodKey: "2026-07",
    label: "Jul 2026",
    grossMillions: 1645,
    netMillions: 1402,
    employeeCount: 124,
  },
  {
    periodKey: "2026-08",
    label: "Agu 2026",
    grossMillions: 1650,
    netMillions: 1408,
    employeeCount: 125,
  },
  {
    periodKey: "2026-09",
    label: "Sep 2026",
    grossMillions: 1660,
    netMillions: 1415,
    employeeCount: 126,
  },
  {
    periodKey: "2026-10",
    label: "Okt 2026",
    grossMillions: 1695,
    netMillions: 1442,
    employeeCount: 127,
  },
  {
    periodKey: "2026-11",
    label: "Nov 2026",
    grossMillions: 1740,
    netMillions: 1485,
    employeeCount: 128,
  },
];

export const INITIAL_EMPLOYEES: readonly EmployeeRecord[] = [
  {
    id: "emp-1041",
    code: "EMP-1041",
    name: "Rendra Wijaya",
    department: "Produksi UHT",
    roleTitle: "Supervisor Lini Sterilisasi",
    employmentType: "Tetap",
    joinDateLabel: "12 Mar 2021",
    onboardingStatus: "Selesai Onboarding",
    readinessStatus: "Siap Diproses",
    missingDataNote: "Data induk, rekening BCA, NPWP, dan BPJS lengkap.",
    baseSalary: 9_500_000,
    fixedAllowance: 2_250_000,
    overtimeRatePerHour: 65_000,
    kpiIncentiveEligible: true,
    bankName: "BCA",
    bankAccountNumber: "0084921840",
    bankAccountHolder: "Rendra Wijaya",
    npwpNumber: "09.241.882.4-421.000",
    ptkpStatus: "K/1",
    bpjsKesehatanNumber: "0001849201124",
    bpjsKetenagakerjaanNumber: "21049281942",
  },
  {
    id: "emp-1042",
    code: "EMP-1042",
    name: "Siti Rahmawati",
    department: "Quality Control",
    roleTitle: "Analis Mikrobiologi Susu",
    employmentType: "Tetap",
    joinDateLabel: "04 Jul 2022",
    onboardingStatus: "Selesai Onboarding",
    readinessStatus: "Siap Diproses",
    missingDataNote: "Data induk, rekening Mandiri, NPWP, dan BPJS lengkap.",
    baseSalary: 8_200_000,
    fixedAllowance: 1_800_000,
    overtimeRatePerHour: 55_000,
    kpiIncentiveEligible: true,
    bankName: "Bank Mandiri",
    bankAccountNumber: "1300094827165",
    bankAccountHolder: "Siti Rahmawati",
    npwpNumber: "48.192.710.1-428.000",
    ptkpStatus: "TK/0",
    bpjsKesehatanNumber: "0001928374610",
    bpjsKetenagakerjaanNumber: "22019482716",
  },
  {
    id: "emp-1043",
    code: "EMP-1043",
    name: "Dimas Prasetyo",
    department: "Gudang & Logistik",
    roleTitle: "Koordinator Cold Chain",
    employmentType: "Tetap",
    joinDateLabel: "19 Jan 2023",
    onboardingStatus: "Selesai Onboarding",
    readinessStatus: "Siap Diproses",
    missingDataNote: "Data induk, rekening BNI, NPWP, dan BPJS lengkap.",
    baseSalary: 7_600_000,
    fixedAllowance: 1_500_000,
    overtimeRatePerHour: 50_000,
    kpiIncentiveEligible: false,
    bankName: "BNI",
    bankAccountNumber: "0449281739",
    bankAccountHolder: "Dimas Prasetyo",
    npwpNumber: "61.840.119.3-423.000",
    ptkpStatus: "K/0",
    bpjsKesehatanNumber: "0002019283741",
    bpjsKetenagakerjaanNumber: "23091827364",
  },
  {
    id: "emp-1044",
    code: "EMP-1044",
    name: "Nadia Kusuma",
    department: "Produksi UHT",
    roleTitle: "Operator Filling Aseptik",
    employmentType: "Kontrak",
    joinDateLabel: "02 Nov 2026",
    onboardingStatus: "Verifikasi Dokumen",
    readinessStatus: "Data Belum Lengkap",
    missingDataNote:
      "Nomor rekening bank penggajian dan kepesertaan BPJS Ketenagakerjaan belum dilengkapi.",
    baseSalary: 6_400_000,
    fixedAllowance: 1_100_000,
    overtimeRatePerHour: 45_000,
    kpiIncentiveEligible: true,
    bankName: "BCA",
    bankAccountNumber: "",
    bankAccountHolder: "Nadia Kusuma",
    npwpNumber: "74.119.302.8-429.000",
    ptkpStatus: "TK/0",
    bpjsKesehatanNumber: "0002849102938",
    bpjsKetenagakerjaanNumber: "",
  },
  {
    id: "emp-1045",
    code: "EMP-1045",
    name: "Bagus Setiawan",
    department: "Teknik & Utilitas",
    roleTitle: "Teknisi Boiler & Chiller",
    employmentType: "Masa Percobaan",
    joinDateLabel: "09 Nov 2026",
    onboardingStatus: "Orientasi Baru",
    readinessStatus: "Data Belum Lengkap",
    missingDataNote:
      "NPWP/status PTKP dan nomor BPJS Kesehatan belum terdaftar pada HRIS.",
    baseSalary: 6_800_000,
    fixedAllowance: 1_250_000,
    overtimeRatePerHour: 48_000,
    kpiIncentiveEligible: false,
    bankName: "BRI",
    bankAccountNumber: "011901048291502",
    bankAccountHolder: "Bagus Setiawan",
    npwpNumber: "",
    ptkpStatus: "TK/0",
    bpjsKesehatanNumber: "",
    bpjsKetenagakerjaanNumber: "26110928371",
  },
  {
    id: "emp-1046",
    code: "EMP-1046",
    name: "Larasati Putri",
    department: "Keuangan & Akuntansi",
    roleTitle: "Spesialis Akuntansi Biaya & Gaji",
    employmentType: "Tetap",
    joinDateLabel: "15 Agu 2020",
    onboardingStatus: "Selesai Onboarding",
    readinessStatus: "Siap Diproses",
    missingDataNote: "Data induk, rekening BCA, NPWP, dan BPJS lengkap.",
    baseSalary: 10_200_000,
    fixedAllowance: 2_500_000,
    overtimeRatePerHour: 0,
    kpiIncentiveEligible: true,
    bankName: "BCA",
    bankAccountNumber: "0087162534",
    bankAccountHolder: "Larasati Putri",
    npwpNumber: "19.832.401.5-421.000",
    ptkpStatus: "K/2",
    bpjsKesehatanNumber: "0001482910384",
    bpjsKetenagakerjaanNumber: "20084716253",
  },
  {
    id: "emp-1047",
    code: "EMP-1047",
    name: "Hendra Gunawan",
    department: "Gudang & Logistik",
    roleTitle: "Operator Reach Truck",
    employmentType: "Tetap",
    joinDateLabel: "10 Mei 2022",
    onboardingStatus: "Selesai Onboarding",
    readinessStatus: "Siap Diproses",
    missingDataNote: "Data induk, rekening Mandiri, NPWP, dan BPJS lengkap.",
    baseSalary: 6_600_000,
    fixedAllowance: 1_200_000,
    overtimeRatePerHour: 45_000,
    kpiIncentiveEligible: true,
    bankName: "Bank Mandiri",
    bankAccountNumber: "1320018472910",
    bankAccountHolder: "Hendra Gunawan",
    npwpNumber: "55.901.284.7-424.000",
    ptkpStatus: "K/1",
    bpjsKesehatanNumber: "0001748291023",
    bpjsKetenagakerjaanNumber: "22059182736",
  },
  {
    id: "emp-1048",
    code: "EMP-1048",
    name: "Dewi Anggraini",
    department: "HR & Umum",
    roleTitle: "Pejabat Hubungan Industrial & Penggajian",
    employmentType: "Tetap",
    joinDateLabel: "01 Feb 2019",
    onboardingStatus: "Selesai Onboarding",
    readinessStatus: "Siap Diproses",
    missingDataNote: "Data induk, rekening BCA, NPWP, dan BPJS lengkap.",
    baseSalary: 10_800_000,
    fixedAllowance: 2_700_000,
    overtimeRatePerHour: 0,
    kpiIncentiveEligible: true,
    bankName: "BCA",
    bankAccountNumber: "0081928374",
    bankAccountHolder: "Dewi Anggraini",
    npwpNumber: "12.490.817.2-421.000",
    ptkpStatus: "K/1",
    bpjsKesehatanNumber: "0001293847561",
    bpjsKetenagakerjaanNumber: "19028374651",
  },
];

export const INITIAL_ATTENDANCE_RECORDS: readonly AttendanceRecord[] = [
  // November 2026
  {
    id: "abs-2611-001",
    code: "ABS-2611-001",
    periodKey: "2026-11",
    employeeId: "emp-1041",
    employeeCode: "EMP-1041",
    employeeName: "Rendra Wijaya",
    department: "Produksi UHT",
    shiftLabel: "Shift 1 (07.00–15.00)",
    daysPresent: 22,
    leaveDays: 0,
    hoursWorked: 176,
    overtimeHours: 14,
    spklReference: "SPKL-2611-018",
    correctionStatus: "Terverifikasi",
    anomalyNote:
      "Presensi mesin dan lembur 14 jam pada lini sterilisasi UHT telah diverifikasi atasan & HRD.",
  },
  {
    id: "abs-2611-002",
    code: "ABS-2611-002",
    periodKey: "2026-11",
    employeeId: "emp-1042",
    employeeCode: "EMP-1042",
    employeeName: "Siti Rahmawati",
    department: "Quality Control",
    shiftLabel: "Shift 1 (07.00–15.00)",
    daysPresent: 21,
    leaveDays: 1,
    hoursWorked: 168,
    overtimeHours: 8,
    spklReference: "SPKL-2611-021",
    correctionStatus: "Terverifikasi",
    anomalyNote:
      "Cuti tahunan 1 hari (UC-06) dan lembur pengujian batch 8 jam telah disahkan.",
  },
  {
    id: "abs-2611-003",
    code: "ABS-2611-003",
    periodKey: "2026-11",
    employeeId: "emp-1044",
    employeeCode: "EMP-1044",
    employeeName: "Nadia Kusuma",
    department: "Produksi UHT",
    shiftLabel: "Shift 2 (15.00–23.00)",
    daysPresent: 20,
    leaveDays: 0,
    hoursWorked: 160,
    overtimeHours: 12,
    spklReference: "SPKL-2611-029",
    correctionStatus: "Perlu Koreksi",
    anomalyNote:
      "Presensi pulang tanggal 12 Nov 2026 belum terekam mesin biometrik; SPKL 4 jam menunggu konfirmasi Supervisor Lini.",
  },
  {
    id: "abs-2611-004",
    code: "ABS-2611-004",
    periodKey: "2026-11",
    employeeId: "emp-1045",
    employeeCode: "EMP-1045",
    employeeName: "Bagus Setiawan",
    department: "Teknik & Utilitas",
    shiftLabel: "Shift 3 (23.00–07.00)",
    daysPresent: 19,
    leaveDays: 1,
    hoursWorked: 152,
    overtimeHours: 10,
    spklReference: "SPKL-2611-034",
    correctionStatus: "Menunggu Verifikasi",
    anomalyNote:
      "Lembur pemeliharaan chiller 10 jam dan surat izin sakit 1 hari menunggu verifikasi akhir HRD (UC-07).",
  },
  {
    id: "abs-2611-005",
    code: "ABS-2611-005",
    periodKey: "2026-11",
    employeeId: "emp-1043",
    employeeCode: "EMP-1043",
    employeeName: "Dimas Prasetyo",
    department: "Gudang & Logistik",
    shiftLabel: "Shift 1 (07.00–15.00)",
    daysPresent: 22,
    leaveDays: 0,
    hoursWorked: 176,
    overtimeHours: 6,
    spklReference: "SPKL-2611-015",
    correctionStatus: "Terverifikasi",
    anomalyNote:
      "Rekap presensi hadir penuh dan lembur bongkar-muat cold storage telah valid.",
  },
  {
    id: "abs-2611-006",
    code: "ABS-2611-006",
    periodKey: "2026-11",
    employeeId: "emp-1047",
    employeeCode: "EMP-1047",
    employeeName: "Hendra Gunawan",
    department: "Gudang & Logistik",
    shiftLabel: "Shift 2 (15.00–23.00)",
    daysPresent: 22,
    leaveDays: 0,
    hoursWorked: 176,
    overtimeHours: 9,
    spklReference: "SPKL-2611-027",
    correctionStatus: "Terverifikasi",
    anomalyNote:
      "Rekap presensi dan jam lembur pengiriman regional telah valid.",
  },
  // Oktober 2026
  {
    id: "abs-2610-001",
    code: "ABS-2610-001",
    periodKey: "2026-10",
    employeeId: "emp-1041",
    employeeCode: "EMP-1041",
    employeeName: "Rendra Wijaya",
    department: "Produksi UHT",
    shiftLabel: "Shift 1 (07.00–15.00)",
    daysPresent: 22,
    leaveDays: 0,
    hoursWorked: 176,
    overtimeHours: 11,
    spklReference: "SPKL-2610-012",
    correctionStatus: "Terverifikasi",
    anomalyNote:
      "Seluruh presensi dan lembur Oktober 2026 telah terverifikasi.",
  },
  {
    id: "abs-2610-002",
    code: "ABS-2610-002",
    periodKey: "2026-10",
    employeeId: "emp-1042",
    employeeCode: "EMP-1042",
    employeeName: "Siti Rahmawati",
    department: "Quality Control",
    shiftLabel: "Shift 1 (07.00–15.00)",
    daysPresent: 22,
    leaveDays: 0,
    hoursWorked: 176,
    overtimeHours: 6,
    spklReference: "SPKL-2610-019",
    correctionStatus: "Terverifikasi",
    anomalyNote: "Presensi dan jam lembur rilis batch QC Oktober 2026 valid.",
  },
  {
    id: "abs-2610-003",
    code: "ABS-2610-003",
    periodKey: "2026-10",
    employeeId: "emp-1043",
    employeeCode: "EMP-1043",
    employeeName: "Dimas Prasetyo",
    department: "Gudang & Logistik",
    shiftLabel: "Shift 1 (07.00–15.00)",
    daysPresent: 21,
    leaveDays: 1,
    hoursWorked: 168,
    overtimeHours: 8,
    spklReference: "SPKL-2610-024",
    correctionStatus: "Terverifikasi",
    anomalyNote: "Cuti 1 hari dan lembur distribusi Oktober 2026 valid.",
  },
  // September 2026
  {
    id: "abs-2609-001",
    code: "ABS-2609-001",
    periodKey: "2026-09",
    employeeId: "emp-1041",
    employeeCode: "EMP-1041",
    employeeName: "Rendra Wijaya",
    department: "Produksi UHT",
    shiftLabel: "Shift 1 (07.00–15.00)",
    daysPresent: 21,
    leaveDays: 0,
    hoursWorked: 168,
    overtimeHours: 9,
    spklReference: "SPKL-2609-008",
    correctionStatus: "Terverifikasi",
    anomalyNote: "Presensi September 2026 telah ditutup dan dibayarkan.",
  },
  {
    id: "abs-2609-002",
    code: "ABS-2609-002",
    periodKey: "2026-09",
    employeeId: "emp-1042",
    employeeCode: "EMP-1042",
    employeeName: "Siti Rahmawati",
    department: "Quality Control",
    shiftLabel: "Shift 1 (07.00–15.00)",
    daysPresent: 21,
    leaveDays: 0,
    hoursWorked: 168,
    overtimeHours: 5,
    spklReference: "SPKL-2609-014",
    correctionStatus: "Terverifikasi",
    anomalyNote: "Presensi September 2026 telah ditutup dan dibayarkan.",
  },
  // Desember 2026 (Draf)
  {
    id: "abs-2612-001",
    code: "ABS-2612-001",
    periodKey: "2026-12",
    employeeId: "emp-1041",
    employeeCode: "EMP-1041",
    employeeName: "Rendra Wijaya",
    department: "Produksi UHT",
    shiftLabel: "Shift 1 (07.00–15.00)",
    daysPresent: 22,
    leaveDays: 0,
    hoursWorked: 176,
    overtimeHours: 12,
    spklReference: "SPKL-2612-002",
    correctionStatus: "Menunggu Verifikasi",
    anomalyNote:
      "Rekap awal jam kerja dan lembur Desember menunggu verifikasi.",
  },
];

export const INITIAL_KPI_EVALUATIONS: readonly KpiEvaluationRecord[] = [
  // November 2026
  {
    id: "kpi-2611-001",
    code: "KPI-2611-001",
    periodKey: "2026-11",
    employeeId: "emp-1041",
    employeeCode: "EMP-1041",
    employeeName: "Rendra Wijaya",
    department: "Produksi UHT",
    roleTitle: "Supervisor Lini Sterilisasi",
    keyIndicator: "Efisiensi Lini UHT & Zero Downtime",
    achievementSummary: "OEE 94,2% (Target 90%) · 0 batch tertahan",
    score: 92,
    gradeLabel: "Sangat Baik (A)",
    incentiveEligible: true,
    incentiveRatePct: 10,
    reviewStatus: "Disahkan",
    evaluatorNote:
      "Evaluasi berkala disahkan Manajer Produksi & HRD; berhak atas insentif kinerja 10% gaji pokok.",
  },
  {
    id: "kpi-2611-002",
    code: "KPI-2611-002",
    periodKey: "2026-11",
    employeeId: "emp-1042",
    employeeCode: "EMP-1042",
    employeeName: "Siti Rahmawati",
    department: "Quality Control",
    roleTitle: "Analis Mikrobiologi Susu",
    keyIndicator: "Ketepatan Waktu Uji Lab & Akurasi CoA",
    achievementSummary: "SLA uji lab 98,5% tepat waktu · 0 deviasi audit",
    score: 90,
    gradeLabel: "Sangat Baik (A)",
    incentiveEligible: true,
    incentiveRatePct: 10,
    reviewStatus: "Disahkan",
    evaluatorNote:
      "Evaluasi kinerja berkala telah disahkan HRD; insentif kinerja masuk dalam komponen gaji bruto.",
  },
  {
    id: "kpi-2611-003",
    code: "KPI-2611-003",
    periodKey: "2026-11",
    employeeId: "emp-1044",
    employeeCode: "EMP-1044",
    employeeName: "Nadia Kusuma",
    department: "Produksi UHT",
    roleTitle: "Operator Filling Aseptik",
    keyIndicator: "Target Output Filling & Minimasi Reject Kemasan",
    achievementSummary: "Reject rate 0,38% (batas maks 0,50%) · Output 101%",
    score: 86,
    gradeLabel: "Baik (B+)",
    incentiveEligible: true,
    incentiveRatePct: 8,
    reviewStatus: "Perlu Ditinjau",
    evaluatorNote:
      "Penilaian atasan langsung telah diinput; menunggu pengesahan HRD (UC-10) sebelum insentif 8% dihitung ke gaji.",
  },
  {
    id: "kpi-2611-004",
    code: "KPI-2611-004",
    periodKey: "2026-11",
    employeeId: "emp-1047",
    employeeCode: "EMP-1047",
    employeeName: "Hendra Gunawan",
    department: "Gudang & Logistik",
    roleTitle: "Operator Reach Truck",
    keyIndicator: "Akurasi Putaway FEFO & Keselamatan Gudang",
    achievementSummary: "Akurasi FEFO 97,8% · 0 insiden kerja",
    score: 84,
    gradeLabel: "Baik (B)",
    incentiveEligible: true,
    incentiveRatePct: 7,
    reviewStatus: "Perlu Ditinjau",
    evaluatorNote:
      "Menunggu verifikasi akhir HRD atas capaian KPI kuartal berjalan.",
  },
  {
    id: "kpi-2611-005",
    code: "KPI-2611-005",
    periodKey: "2026-11",
    employeeId: "emp-1043",
    employeeCode: "EMP-1043",
    employeeName: "Dimas Prasetyo",
    department: "Gudang & Logistik",
    roleTitle: "Koordinator Cold Chain",
    keyIndicator: "Kepatuhan Suhu Cold Chain & Ketepatan DO",
    achievementSummary: "Suhu terjaga 100% · Ketepatan DO 99,1%",
    score: 89,
    gradeLabel: "Baik (B+)",
    incentiveEligible: false,
    incentiveRatePct: 0,
    reviewStatus: "Disahkan",
    evaluatorNote:
      "Skema kompensasi jabatan menggunakan tunjangan tetap bulanan (tanpa variabel insentif KPI bulanan).",
  },
  // Oktober 2026
  {
    id: "kpi-2610-001",
    code: "KPI-2610-001",
    periodKey: "2026-10",
    employeeId: "emp-1041",
    employeeCode: "EMP-1041",
    employeeName: "Rendra Wijaya",
    department: "Produksi UHT",
    roleTitle: "Supervisor Lini Sterilisasi",
    keyIndicator: "Efisiensi Lini UHT & Zero Downtime",
    achievementSummary: "OEE 93,0% · 0 temuan kontaminasi",
    score: 91,
    gradeLabel: "Sangat Baik (A)",
    incentiveEligible: true,
    incentiveRatePct: 10,
    reviewStatus: "Disahkan",
    evaluatorNote: "Telah disahkan dan diperhitungkan dalam gaji Oktober 2026.",
  },
  {
    id: "kpi-2610-002",
    code: "KPI-2610-002",
    periodKey: "2026-10",
    employeeId: "emp-1042",
    employeeCode: "EMP-1042",
    employeeName: "Siti Rahmawati",
    department: "Quality Control",
    roleTitle: "Analis Mikrobiologi Susu",
    keyIndicator: "Ketepatan Waktu Uji Lab & Akurasi CoA",
    achievementSummary: "SLA uji lab 97,9% tepat waktu",
    score: 88,
    gradeLabel: "Baik (B+)",
    incentiveEligible: true,
    incentiveRatePct: 10,
    reviewStatus: "Disahkan",
    evaluatorNote: "Telah disahkan dan diperhitungkan dalam gaji Oktober 2026.",
  },
  // September 2026
  {
    id: "kpi-2609-001",
    code: "KPI-2609-001",
    periodKey: "2026-09",
    employeeId: "emp-1041",
    employeeCode: "EMP-1041",
    employeeName: "Rendra Wijaya",
    department: "Produksi UHT",
    roleTitle: "Supervisor Lini Sterilisasi",
    keyIndicator: "Efisiensi Lini UHT & Zero Downtime",
    achievementSummary: "OEE 91,8% · 0 temuan kualitas",
    score: 89,
    gradeLabel: "Baik (B+)",
    incentiveEligible: true,
    incentiveRatePct: 10,
    reviewStatus: "Disahkan",
    evaluatorNote: "Telah disahkan dan dibayarkan pada periode September 2026.",
  },
  // Desember 2026 (Draf)
  {
    id: "kpi-2612-001",
    code: "KPI-2612-001",
    periodKey: "2026-12",
    employeeId: "emp-1041",
    employeeCode: "EMP-1041",
    employeeName: "Rendra Wijaya",
    department: "Produksi UHT",
    roleTitle: "Supervisor Lini Sterilisasi",
    keyIndicator: "Efisiensi Lini UHT & Zero Downtime",
    achievementSummary: "Proyeksi evaluasi akhir tahun",
    score: 90,
    gradeLabel: "Sangat Baik (A)",
    incentiveEligible: true,
    incentiveRatePct: 10,
    reviewStatus: "Perlu Ditinjau",
    evaluatorNote: "Draf penilaian KPI Desember 2026 menunggu pengesahan HRD.",
  },
];

export const INITIAL_PAY_PERIODS: readonly PayPeriodRecord[] = [
  {
    id: "prd-2026-11",
    code: "PRG-2026-11",
    periodKey: "2026-11",
    name: "November 2026",
    cutoffLabel: "21 Okt – 20 Nov 2026",
    payDateLabel: "25 Nov 2026",
    employeeCount: 128,
    readyEmployeeCount: 126,
    baseAndAllowanceTotal: 1_542_000_000,
    kpiIncentiveTotal: 118_500_000,
    overtimeTotal: 79_500_000,
    grossPay: 1_740_000_000,
    pph21Deduction: 148_000_000,
    bpjsDeduction: 98_500_000,
    attendanceDeduction: 8_500_000,
    totalDeductions: 255_000_000,
    netPay: 1_485_000_000,
    stage: "Menunggu Persetujuan",
    approvalStatus: "Menunggu",
    disbursementStatus: "Belum Dimulai",
    journalPostingStatus: "Belum Dimulai",
    journalNumber: null,
    journalPostedDate: null,
    journalLines: [
      {
        accountCode: "6101",
        accountName: "Beban Gaji Pokok & Tunjangan Tetap",
        debit: 1_542_000_000,
        credit: 0,
      },
      {
        accountCode: "6102",
        accountName: "Beban Insentif Kinerja & Upah Lembur",
        debit: 198_000_000,
        credit: 0,
      },
      {
        accountCode: "2104",
        accountName: "Utang PPh Pasal 21 Karyawan",
        debit: 0,
        credit: 148_000_000,
      },
      {
        accountCode: "2105",
        accountName: "Utang Iuran BPJS Kesehatan & Ketenagakerjaan",
        debit: 0,
        credit: 98_500_000,
      },
      {
        accountCode: "5109",
        accountName: "Koreksi Kehadiran / Potongan Absensi",
        debit: 0,
        credit: 8_500_000,
      },
      {
        accountCode: "1102",
        accountName: "Bank BCA Operasional / Utang Gaji Bersih",
        debit: 0,
        credit: 1_485_000_000,
      },
    ],
    summaryNote:
      "Perhitungan gaji bruto, insentif KPI, lembur, serta potongan PPh 21 & BPJS telah ditinjau; menunggu otorisasi persetujuan periode gaji sebelum pencairan.",
    timeline: [
      {
        id: "tl-1",
        title: "Perhitungan Gaji",
        actorLabel: "Staf Penggajian (HR)",
        status: "done",
        timestampLabel: "15 Nov 2026, 14:20 WIB",
        note: "Kalkulasi gaji pokok, tunjangan, lembur SPKL, dan potongan PPh 21/BPJS selesai.",
      },
      {
        id: "tl-2",
        title: "Tinjauan Perhitungan",
        actorLabel: "Supervisor HR & Payroll",
        status: "done",
        timestampLabel: "16 Nov 2026, 09:45 WIB",
        note: "Rekapitulasi gaji bruto Rp1,74 M dan potongan Rp255 jt telah diverifikasi.",
      },
      {
        id: "tl-3",
        title: "Persetujuan Periode",
        actorLabel: "Manajemen / Finance Manager",
        status: "current",
        timestampLabel: "Menunggu otorisasi",
        note: "Menunggu persetujuan berjenjang atas rekap gaji periode November 2026.",
      },
      {
        id: "tl-4",
        title: "Pencairan Gaji",
        actorLabel: "Treasury / Keuangan",
        status: "pending",
        timestampLabel: "Dijadwalkan 25 Nov 2026",
        note: "Instruksi transfer payroll bank & penerbitan slip gaji ESS menunggu persetujuan.",
      },
      {
        id: "tl-5",
        title: "Posting Jurnal",
        actorLabel: "Akuntansi (GL)",
        status: "pending",
        timestampLabel: "Setelah pencairan",
        note: "Pencatatan beban gaji, liabilitas PPh 21/BPJS, dan posting ke Buku Besar.",
      },
    ],
  },
  {
    id: "prd-2026-11-ot",
    code: "PRG-2026-11B",
    periodKey: "2026-11",
    name: "November 2026 — Lembur & Shift Pabrik",
    cutoffLabel: "01 Nov – 15 Nov 2026",
    payDateLabel: "25 Nov 2026",
    employeeCount: 64,
    readyEmployeeCount: 64,
    baseAndAllowanceTotal: 0,
    kpiIncentiveTotal: 34_500_000,
    overtimeTotal: 45_000_000,
    grossPay: 79_500_000,
    pph21Deduction: 3_975_000,
    bpjsDeduction: 0,
    attendanceDeduction: 525_000,
    totalDeductions: 4_500_000,
    netPay: 75_000_000,
    stage: "Menunggu Tinjauan",
    approvalStatus: "Belum Dimulai",
    disbursementStatus: "Belum Dimulai",
    journalPostingStatus: "Belum Dimulai",
    journalNumber: null,
    journalPostedDate: null,
    journalLines: [
      {
        accountCode: "6102",
        accountName: "Beban Insentif Kinerja & Upah Lembur Pabrik",
        debit: 79_500_000,
        credit: 0,
      },
      {
        accountCode: "2104",
        accountName: "Utang PPh Pasal 21 Karyawan",
        debit: 0,
        credit: 3_975_000,
      },
      {
        accountCode: "5109",
        accountName: "Koreksi Jam Lembur SPKL",
        debit: 0,
        credit: 525_000,
      },
      {
        accountCode: "1102",
        accountName: "Bank BCA Operasional / Utang Lembur Bersih",
        debit: 0,
        credit: 75_000_000,
      },
    ],
    summaryNote:
      "Perhitungan lembur SPKL dan insentif lini produksi telah dihitung otomatis; menunggu tinjauan perhitungan oleh Supervisor Payroll & HR.",
    timeline: [
      {
        id: "tl-1",
        title: "Perhitungan Gaji",
        actorLabel: "Staf Penggajian (HR)",
        status: "done",
        timestampLabel: "16 Nov 2026, 08:30 WIB",
        note: "Kalkulasi jam lembur SPKL 64 personel lini pabrik selesai.",
      },
      {
        id: "tl-2",
        title: "Tinjauan Perhitungan",
        actorLabel: "Supervisor HR & Payroll",
        status: "current",
        timestampLabel: "Menunggu tinjauan",
        note: "Verifikasi kecocokan tarif lembur dan potongan PPh 21.",
      },
      {
        id: "tl-3",
        title: "Persetujuan Periode",
        actorLabel: "Manajemen / Finance Manager",
        status: "pending",
        timestampLabel: "Menunggu tinjauan",
        note: "Otorisasi pencairan lembur pabrik.",
      },
      {
        id: "tl-4",
        title: "Pencairan Gaji",
        actorLabel: "Treasury / Keuangan",
        status: "pending",
        timestampLabel: "Dijadwalkan 25 Nov 2026",
        note: "Transfer bank rekening karyawan.",
      },
      {
        id: "tl-5",
        title: "Posting Jurnal",
        actorLabel: "Akuntansi (GL)",
        status: "pending",
        timestampLabel: "Setelah pencairan",
        note: "Posting jurnal beban lembur ke Buku Besar.",
      },
    ],
  },
  {
    id: "prd-2026-10-ins",
    code: "PRG-2026-10B",
    periodKey: "2026-10",
    name: "Oktober 2026 — Insentif Kinerja Kuartal",
    cutoffLabel: "01 Jul – 30 Sep 2026",
    payDateLabel: "30 Okt 2026",
    employeeCount: 92,
    readyEmployeeCount: 92,
    baseAndAllowanceTotal: 0,
    kpiIncentiveTotal: 112_000_000,
    overtimeTotal: 0,
    grossPay: 112_000_000,
    pph21Deduction: 5_600_000,
    bpjsDeduction: 0,
    attendanceDeduction: 0,
    totalDeductions: 5_600_000,
    netPay: 106_400_000,
    stage: "Menunggu Pencairan",
    approvalStatus: "Disetujui",
    disbursementStatus: "Menunggu",
    journalPostingStatus: "Belum Dimulai",
    journalNumber: null,
    journalPostedDate: null,
    journalLines: [
      {
        accountCode: "6102",
        accountName: "Beban Insentif Kinerja Kuartal",
        debit: 112_000_000,
        credit: 0,
      },
      {
        accountCode: "2104",
        accountName: "Utang PPh Pasal 21 Karyawan",
        debit: 0,
        credit: 5_600_000,
      },
      {
        accountCode: "1102",
        accountName: "Bank BCA Operasional",
        debit: 0,
        credit: 106_400_000,
      },
    ],
    summaryNote:
      "Rekap insentif evaluasi KPI kuartal telah disetujui manajemen; siap diproses pencairan transfer bank oleh Treasury.",
    timeline: [
      {
        id: "tl-1",
        title: "Perhitungan Gaji",
        actorLabel: "Staf Penggajian (HR)",
        status: "done",
        timestampLabel: "24 Okt 2026, 10:00 WIB",
        note: "Kalkulasi insentif KPI 92 karyawan selesai.",
      },
      {
        id: "tl-2",
        title: "Tinjauan Perhitungan",
        actorLabel: "Supervisor HR & Payroll",
        status: "done",
        timestampLabel: "25 Okt 2026, 13:15 WIB",
        note: "Skor KPI dan tarif insentif terverifikasi.",
      },
      {
        id: "tl-3",
        title: "Persetujuan Periode",
        actorLabel: "Manajemen / Finance Manager",
        status: "done",
        timestampLabel: "27 Okt 2026, 16:00 WIB",
        note: "Disetujui untuk pencairan.",
      },
      {
        id: "tl-4",
        title: "Pencairan Gaji",
        actorLabel: "Treasury / Keuangan",
        status: "current",
        timestampLabel: "Siap dicairkan",
        note: "Menunggu eksekusi transfer bank BCA/Mandiri oleh Treasury.",
      },
      {
        id: "tl-5",
        title: "Posting Jurnal",
        actorLabel: "Akuntansi (GL)",
        status: "pending",
        timestampLabel: "Setelah pencairan",
        note: "Posting jurnal beban insentif ke Buku Besar.",
      },
    ],
  },
  {
    id: "prd-2026-10",
    code: "PRG-2026-10",
    periodKey: "2026-10",
    name: "Oktober 2026",
    cutoffLabel: "21 Sep – 20 Okt 2026",
    payDateLabel: "25 Okt 2026",
    employeeCount: 127,
    readyEmployeeCount: 127,
    baseAndAllowanceTotal: 1_510_000_000,
    kpiIncentiveTotal: 112_000_000,
    overtimeTotal: 73_000_000,
    grossPay: 1_695_000_000,
    pph21Deduction: 145_000_000,
    bpjsDeduction: 96_000_000,
    attendanceDeduction: 12_000_000,
    totalDeductions: 253_000_000,
    netPay: 1_442_000_000,
    stage: "Menunggu Posting Jurnal",
    approvalStatus: "Disetujui",
    disbursementStatus: "Telah Dicairkan",
    journalPostingStatus: "Menunggu",
    journalNumber: null,
    journalPostedDate: null,
    journalLines: [
      {
        accountCode: "6101",
        accountName: "Beban Gaji Pokok & Tunjangan Tetap",
        debit: 1_510_000_000,
        credit: 0,
      },
      {
        accountCode: "6102",
        accountName: "Beban Insentif Kinerja & Upah Lembur",
        debit: 185_000_000,
        credit: 0,
      },
      {
        accountCode: "2104",
        accountName: "Utang PPh Pasal 21 Karyawan",
        debit: 0,
        credit: 145_000_000,
      },
      {
        accountCode: "2105",
        accountName: "Utang Iuran BPJS Kesehatan & Ketenagakerjaan",
        debit: 0,
        credit: 96_000_000,
      },
      {
        accountCode: "5109",
        accountName: "Koreksi Kehadiran / Potongan Absensi",
        debit: 0,
        credit: 12_000_000,
      },
      {
        accountCode: "1102",
        accountName: "Bank BCA Operasional",
        debit: 0,
        credit: 1_442_000_000,
      },
    ],
    summaryNote:
      "Gaji bersih Oktober 2026 telah dicairkan ke rekening karyawan dan slip gaji ESS telah terbit; menunggu Akuntansi memposting jurnal akrual & beban penggajian ke Buku Besar.",
    timeline: [
      {
        id: "tl-1",
        title: "Perhitungan Gaji",
        actorLabel: "Staf Penggajian (HR)",
        status: "done",
        timestampLabel: "21 Okt 2026, 11:10 WIB",
        note: "Rekap gaji 127 karyawan selesai dihitung.",
      },
      {
        id: "tl-2",
        title: "Tinjauan Perhitungan",
        actorLabel: "Supervisor HR & Payroll",
        status: "done",
        timestampLabel: "22 Okt 2026, 15:00 WIB",
        note: "Rincian penghasilan bruto dan potongan pajak/BPJS tervalidasi.",
      },
      {
        id: "tl-3",
        title: "Persetujuan Periode",
        actorLabel: "Manajemen / Finance Manager",
        status: "done",
        timestampLabel: "23 Okt 2026, 16:30 WIB",
        note: "Periode gaji Oktober 2026 disetujui untuk pencairan.",
      },
      {
        id: "tl-4",
        title: "Pencairan Gaji",
        actorLabel: "Treasury / Keuangan",
        status: "done",
        timestampLabel: "25 Okt 2026, 10:15 WIB",
        note: "Transfer payroll Rp1,442 M berhasil diproses; slip gaji ESS diterbitkan.",
      },
      {
        id: "tl-5",
        title: "Posting Jurnal",
        actorLabel: "Akuntansi (GL)",
        status: "current",
        timestampLabel: "Menunggu posting GL",
        note: "Draf jurnal penggajian seimbang (Rp1.695.000.000) siap diposting ke Buku Besar.",
      },
    ],
  },
  {
    id: "prd-2026-09",
    code: "PRG-2026-09",
    periodKey: "2026-09",
    name: "September 2026",
    cutoffLabel: "21 Agu – 20 Sep 2026",
    payDateLabel: "25 Sep 2026",
    employeeCount: 126,
    readyEmployeeCount: 126,
    baseAndAllowanceTotal: 1_488_000_000,
    kpiIncentiveTotal: 104_000_000,
    overtimeTotal: 68_000_000,
    grossPay: 1_660_000_000,
    pph21Deduction: 141_000_000,
    bpjsDeduction: 94_500_000,
    attendanceDeduction: 9_500_000,
    totalDeductions: 245_000_000,
    netPay: 1_415_000_000,
    stage: "Selesai",
    approvalStatus: "Disetujui",
    disbursementStatus: "Telah Dicairkan",
    journalPostingStatus: "Terposting",
    journalNumber: "JRN-2609-0042",
    journalPostedDate: "26 Sep 2026, 14:10 WIB",
    journalLines: [
      {
        accountCode: "6101",
        accountName: "Beban Gaji Pokok & Tunjangan Tetap",
        debit: 1_488_000_000,
        credit: 0,
      },
      {
        accountCode: "6102",
        accountName: "Beban Insentif Kinerja & Upah Lembur",
        debit: 172_000_000,
        credit: 0,
      },
      {
        accountCode: "2104",
        accountName: "Utang PPh Pasal 21 Karyawan",
        debit: 0,
        credit: 141_000_000,
      },
      {
        accountCode: "2105",
        accountName: "Utang Iuran BPJS Kesehatan & Ketenagakerjaan",
        debit: 0,
        credit: 94_500_000,
      },
      {
        accountCode: "5109",
        accountName: "Koreksi Kehadiran / Potongan Absensi",
        debit: 0,
        credit: 9_500_000,
      },
      {
        accountCode: "1102",
        accountName: "Bank BCA Operasional",
        debit: 0,
        credit: 1_415_000_000,
      },
    ],
    summaryNote:
      "Seluruh tahapan perhitungan, persetujuan, pencairan bank, setoran PPh 21/BPJS, dan posting jurnal Buku Besar (JRN-2609-0042) telah selesai.",
    timeline: [
      {
        id: "tl-1",
        title: "Perhitungan Gaji",
        actorLabel: "Staf Penggajian (HR)",
        status: "done",
        timestampLabel: "21 Sep 2026, 10:30 WIB",
        note: "Perhitungan gaji 126 karyawan selesai.",
      },
      {
        id: "tl-2",
        title: "Tinjauan Perhitungan",
        actorLabel: "Supervisor HR & Payroll",
        status: "done",
        timestampLabel: "22 Sep 2026, 13:20 WIB",
        note: "Rekap gaji & potongan pajak/BPJS terverifikasi.",
      },
      {
        id: "tl-3",
        title: "Persetujuan Periode",
        actorLabel: "Manajemen / Finance Manager",
        status: "done",
        timestampLabel: "23 Sep 2026, 15:40 WIB",
        note: "Otorisasi manajemen disetujui penuh.",
      },
      {
        id: "tl-4",
        title: "Pencairan Gaji",
        actorLabel: "Treasury / Keuangan",
        status: "done",
        timestampLabel: "25 Sep 2026, 09:50 WIB",
        note: "Dana gaji Rp1,415 M cair ke rekening karyawan.",
      },
      {
        id: "tl-5",
        title: "Posting Jurnal",
        actorLabel: "Akuntansi (GL)",
        status: "done",
        timestampLabel: "26 Sep 2026, 14:10 WIB",
        note: "Jurnal JRN-2609-0042 terposting ke Buku Besar.",
      },
    ],
  },
  {
    id: "prd-2026-12",
    code: "PRG-2026-12",
    periodKey: "2026-12",
    name: "Desember 2026 (Draf)",
    cutoffLabel: "21 Nov – 20 Des 2026",
    payDateLabel: "24 Des 2026",
    employeeCount: 128,
    readyEmployeeCount: 126,
    baseAndAllowanceTotal: 1_548_000_000,
    kpiIncentiveTotal: 120_000_000,
    overtimeTotal: 82_000_000,
    grossPay: 1_750_000_000,
    pph21Deduction: 149_500_000,
    bpjsDeduction: 99_000_000,
    attendanceDeduction: 6_500_000,
    totalDeductions: 255_000_000,
    netPay: 1_495_000_000,
    stage: "Perlu Perhitungan",
    approvalStatus: "Belum Dimulai",
    disbursementStatus: "Belum Dimulai",
    journalPostingStatus: "Belum Dimulai",
    journalNumber: null,
    journalPostedDate: null,
    journalLines: [
      {
        accountCode: "6101",
        accountName: "Beban Gaji Pokok & Tunjangan Tetap",
        debit: 1_548_000_000,
        credit: 0,
      },
      {
        accountCode: "6102",
        accountName: "Beban Insentif Kinerja & Upah Lembur",
        debit: 202_000_000,
        credit: 0,
      },
      {
        accountCode: "2104",
        accountName: "Utang PPh Pasal 21 Karyawan",
        debit: 0,
        credit: 149_500_000,
      },
      {
        accountCode: "2105",
        accountName: "Utang Iuran BPJS Kesehatan & Ketenagakerjaan",
        debit: 0,
        credit: 99_000_000,
      },
      {
        accountCode: "5109",
        accountName: "Koreksi Kehadiran / Potongan Absensi",
        debit: 0,
        credit: 6_500_000,
      },
      {
        accountCode: "1102",
        accountName: "Bank BCA Operasional / Utang Gaji Bersih",
        debit: 0,
        credit: 1_495_000_000,
      },
    ],
    summaryNote:
      "Periode draf Desember 2026 siap dihitung setelah kelengkapan data karyawan baru dan verifikasi absensi diselesaikan.",
    timeline: [
      {
        id: "tl-1",
        title: "Perhitungan Gaji",
        actorLabel: "Staf Penggajian (HR)",
        status: "current",
        timestampLabel: "Siap dihitung",
        note: "Menunggu eksekusi Hitung Gaji berdasarkan data induk, absensi, dan evaluasi KPI.",
      },
      {
        id: "tl-2",
        title: "Tinjauan Perhitungan",
        actorLabel: "Supervisor HR & Payroll",
        status: "pending",
        timestampLabel: "Menunggu perhitungan",
        note: "Verifikasi rincian penghasilan bruto dan potongan pajak/BPJS.",
      },
      {
        id: "tl-3",
        title: "Persetujuan Periode",
        actorLabel: "Manajemen / Finance Manager",
        status: "pending",
        timestampLabel: "Menunggu tinjauan",
        note: "Otorisasi berjenjang atas rekap gaji periode Desember 2026.",
      },
      {
        id: "tl-4",
        title: "Pencairan Gaji",
        actorLabel: "Treasury / Keuangan",
        status: "pending",
        timestampLabel: "Dijadwalkan 24 Des 2026",
        note: "Transfer gaji bank & penerbitan slip gaji ESS.",
      },
      {
        id: "tl-5",
        title: "Posting Jurnal",
        actorLabel: "Akuntansi (GL)",
        status: "pending",
        timestampLabel: "Setelah pencairan",
        note: "Posting jurnal penggajian ke Buku Besar.",
      },
    ],
  },
];

export const SUMMARY_FOLLOW_UPS: readonly SummaryFollowUpItem[] = [
  {
    id: "pfu-absensi",
    label: "Tinjau koreksi absensi",
    detail: "ABS-2611-003 · Nadia Kusuma (presensi pulang & SPKL 4 jam)",
    actionLabel: "Tinjau Absensi",
    tone: "warning",
    targetTab: "absensi-kinerja",
    targetSubView: "absensi",
    targetPeriodKey: "2026-11",
    targetRecordId: "abs-2611-003",
  },
  {
    id: "pfu-approve",
    label: "Setujui periode gaji",
    detail: "PRG-2026-11 · Periode November 2026 menunggu otorisasi",
    actionLabel: "Setujui Periode",
    tone: "warning",
    targetTab: "penggajian",
    targetPeriodKey: "2026-11",
    targetRecordId: "prd-2026-11",
  },
  {
    id: "pfu-journal",
    label: "Posting jurnal penggajian",
    detail: "PRG-2026-10 · Pencairan Oktober selesai, siap posting ke GL",
    actionLabel: "Posting Jurnal",
    tone: "danger",
    targetTab: "penggajian",
    targetPeriodKey: "2026-10",
    targetRecordId: "prd-2026-10",
  },
  {
    id: "pfu-employee",
    label: "Lengkapi data rekening & BPJS karyawan",
    detail: "EMP-1044 · Nadia Kusuma & EMP-1045 · Bagus Setiawan",
    actionLabel: "Lengkapi Data",
    tone: "warning",
    targetTab: "karyawan",
    targetRecordId: "emp-1044",
  },
];

export const PAYROLL_TASK_QUEUE: readonly PayrollTaskQueueItem[] = [
  {
    id: "ptask-abs-003",
    task: "Tinjau koreksi absensi & SPKL lini UHT",
    reference: "ABS-2611-003",
    stageLabel: "Absensi & Jam Lembur",
    status: "Perlu ditinjau",
    actionLabel: "Tinjau Absensi",
    targetTab: "absensi-kinerja",
    targetSubView: "absensi",
    targetPeriodKey: "2026-11",
    targetRecordId: "abs-2611-003",
    description:
      "Verifikasi waktu pulang shift 2 tanggal 12 Nov 2026 dan surat perintah kerja lembur (SPKL-2611-029) untuk Nadia Kusuma.",
    ownerRole: "Supervisor Produksi & HRD",
  },
  {
    id: "ptask-emp-1044",
    task: "Lengkapi nomor rekening & BPJS Ketenagakerjaan",
    reference: "EMP-1044",
    stageLabel: "Kesiapan Data Karyawan",
    status: "Sedang berjalan",
    actionLabel: "Lengkapi Data",
    targetTab: "karyawan",
    targetRecordId: "emp-1044",
    description:
      "Lengkapi nomor rekening BCA dan nomor kepesertaan BPJS Ketenagakerjaan agar Nadia Kusuma siap diproses dalam periode gaji.",
    ownerRole: "HRD / Administrasi Personalia",
  },
  {
    id: "ptask-kpi-003",
    task: "Sahkan evaluasi KPI berkala operator filling",
    reference: "KPI-2611-003",
    stageLabel: "Evaluasi Kinerja (KPI)",
    status: "Perlu ditinjau",
    actionLabel: "Tinjau KPI",
    targetTab: "absensi-kinerja",
    targetSubView: "kinerja",
    targetPeriodKey: "2026-11",
    targetRecordId: "kpi-2611-003",
    description:
      "Tinjau hasil evaluasi KPI Nadia Kusuma (skor 86/100) untuk dasar perhitungan insentif kinerja 8% pada periode November 2026.",
    ownerRole: "Manajer Produksi & HRD",
  },
  {
    id: "ptask-prd-11",
    task: "Setujui rekapitulasi periode gaji November 2026",
    reference: "PRG-2026-11",
    stageLabel: "Persetujuan Penggajian",
    status: "Menunggu persetujuan",
    actionLabel: "Setujui Periode",
    targetTab: "penggajian",
    targetPeriodKey: "2026-11",
    targetRecordId: "prd-2026-11",
    description:
      "Otorisasi rekapitulasi gaji bruto Rp1.740.000.000 dan gaji bersih Rp1.485.000.000 untuk 128 karyawan sebelum instruksi pencairan bank.",
    ownerRole: "Manajemen / Finance Manager",
  },
  {
    id: "ptask-prd-10",
    task: "Posting jurnal akrual & beban penggajian Oktober 2026",
    reference: "PRG-2026-10",
    stageLabel: "Integrasi Buku Besar (GL)",
    status: "Belum dimulai",
    actionLabel: "Posting Jurnal",
    targetTab: "penggajian",
    targetPeriodKey: "2026-10",
    targetRecordId: "prd-2026-10",
    description:
      "Periksa keseimbangan debit dan kredit (Rp1.695.000.000) atas beban gaji, PPh 21, dan BPJS periode Oktober 2026 lalu posting ke Buku Besar.",
    ownerRole: "Akuntansi (General Ledger)",
  },
];

export function advancePayPeriodRecord(
  period: PayPeriodRecord,
  actorName: string,
): PayPeriodRecord {
  const nowLabel = "16 Nov 2026, 12:30 WIB";
  switch (period.stage) {
    case "Perlu Perhitungan":
      return {
        ...period,
        stage: "Menunggu Tinjauan",
        approvalStatus: "Belum Dimulai",
        disbursementStatus: "Belum Dimulai",
        journalPostingStatus: "Belum Dimulai",
        summaryNote: `Perhitungan gaji bruto (${formatRupiahFull(period.grossPay)}) dan potongan (${formatRupiahFull(period.totalDeductions)}) selesai dihitung oleh ${actorName}; menunggu tinjauan perhitungan.`,
        timeline: period.timeline.map((step, idx) =>
          idx === 0
            ? {
                ...step,
                status: "done",
                timestampLabel: nowLabel,
                note: `Dihitung oleh ${actorName}: Gaji bersih ${formatRupiahFull(period.netPay)}.`,
              }
            : idx === 1
              ? {
                  ...step,
                  status: "current",
                  timestampLabel: "Menunggu tinjauan",
                }
              : step,
        ),
      };
    case "Menunggu Tinjauan":
      return {
        ...period,
        stage: "Menunggu Persetujuan",
        approvalStatus: "Menunggu",
        summaryNote: `Rincian perhitungan gaji dan potongan PPh 21/BPJS telah ditinjau oleh ${actorName}; menunggu persetujuan periode gaji.`,
        timeline: period.timeline.map((step, idx) =>
          idx === 1
            ? {
                ...step,
                status: "done",
                timestampLabel: nowLabel,
                note: `Ditinjau dan divalidasi oleh ${actorName}.`,
              }
            : idx === 2
              ? {
                  ...step,
                  status: "current",
                  timestampLabel: "Menunggu otorisasi",
                }
              : step,
        ),
      };
    case "Menunggu Persetujuan":
      return {
        ...period,
        stage: "Menunggu Pencairan",
        approvalStatus: "Disetujui",
        disbursementStatus: "Menunggu",
        summaryNote: `Periode gaji ${period.name} telah disetujui oleh ${actorName}; siap diproses pencairan transfer bank oleh Treasury.`,
        timeline: period.timeline.map((step, idx) =>
          idx === 2
            ? {
                ...step,
                status: "done",
                timestampLabel: nowLabel,
                note: `Disetujui oleh ${actorName} untuk pencairan.`,
              }
            : idx === 3
              ? {
                  ...step,
                  status: "current",
                  timestampLabel: "Siap dicairkan",
                }
              : step,
        ),
      };
    case "Menunggu Pencairan":
      return {
        ...period,
        stage: "Menunggu Posting Jurnal",
        approvalStatus: "Disetujui",
        disbursementStatus: "Telah Dicairkan",
        journalPostingStatus: "Menunggu",
        summaryNote: `Pencairan gaji bersih ${formatRupiahFull(period.netPay)} telah diproses oleh ${actorName} dan slip gaji ESS diterbitkan; menunggu posting jurnal ke Buku Besar.`,
        timeline: period.timeline.map((step, idx) =>
          idx === 3
            ? {
                ...step,
                status: "done",
                timestampLabel: nowLabel,
                note: `Dicairkan via transfer bank oleh ${actorName}; slip ESS aktif.`,
              }
            : idx === 4
              ? {
                  ...step,
                  status: "current",
                  timestampLabel: "Menunggu posting GL",
                }
              : step,
        ),
      };
    case "Menunggu Posting Jurnal": {
      const compactMonth = period.periodKey.replace("20", "").replace("-", "");
      const journalNum = period.journalNumber ?? `JRN-${compactMonth}-0051`;
      return {
        ...period,
        stage: "Selesai",
        approvalStatus: "Disetujui",
        disbursementStatus: "Telah Dicairkan",
        journalPostingStatus: "Terposting",
        journalNumber: journalNum,
        journalPostedDate: nowLabel,
        summaryNote: `Jurnal penggajian ${journalNum} telah diposting ke Buku Besar oleh ${actorName}. Seluruh rangkaian penggajian periode ${period.name} selesai.`,
        timeline: period.timeline.map((step, idx) =>
          idx === 4
            ? {
                ...step,
                status: "done",
                timestampLabel: nowLabel,
                note: `Jurnal ${journalNum} terposting ke Buku Besar oleh ${actorName}.`,
              }
            : step,
        ),
      };
    }
    case "Selesai":
      return period;
  }
}
