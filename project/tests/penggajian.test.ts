import { demoUser } from "../src/lib/demo/users";
import test from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_ATTENDANCE_RECORDS,
  INITIAL_EMPLOYEES,
  INITIAL_KPI_EVALUATIONS,
  INITIAL_PAY_PERIODS,
  PAYROLL_TASK_QUEUE,
  PAYROLL_TREND_SERIES,
  PENGGAJIAN_TABS,
  SUMMARY_FOLLOW_UPS,
  actionLabelForPayPeriodStage,
  advancePayPeriodRecord,
  calculateKpiIncentiveAmount,
  canExecutePayPeriodAction,
  canViewFullBankDetails,
  canViewIndividualCompensation,
  canViewPayrollAmounts,
  formatBankAccountForActor,
  formatRupiahCompact,
  formatRupiahFull,
} from "../src/features/cycles/penggajian/data";

test("penggajian tabs are ordered Ringkasan, Karyawan, Absensi & Kinerja, Penggajian", () => {
  assert.deepEqual(
    PENGGAJIAN_TABS.map((t) => t.key),
    ["ringkasan", "karyawan", "absensi-kinerja", "penggajian"],
  );
  assert.deepEqual(
    PENGGAJIAN_TABS.map((t) => t.label),
    ["Ringkasan", "Karyawan", "Absensi & Kinerja", "Penggajian"],
  );
  assert.equal(PENGGAJIAN_TABS[0].bannerTitle, "Ringkasan Penggajian");
});

test("all pay periods have balanced Gross - Deductions = Net and balanced GL journals", () => {
  for (const period of INITIAL_PAY_PERIODS) {
    assert.equal(
      period.grossPay - period.totalDeductions,
      period.netPay,
      `Net pay mismatch on ${period.code}`,
    );
    const debitSum = period.journalLines.reduce((acc, l) => acc + l.debit, 0);
    const creditSum = period.journalLines.reduce((acc, l) => acc + l.credit, 0);
    assert.equal(
      debitSum,
      creditSum,
      `Unbalanced journal on ${period.code}: ${debitSum} vs ${creditSum}`,
    );
  }
});

test("payroll totals, individual compensation and bank details require explicit duties", () => {
  const operations = demoUser("OPERATIONS_STAFF");
  const finance = demoUser("FINANCE_STAFF");
  const manager = demoUser("MANAGER_APPROVER");
  assert.equal(canViewPayrollAmounts(operations), false);
  assert.equal(canViewIndividualCompensation(finance), false);
  assert.equal(canViewFullBankDetails(finance), false);
  assert.equal(
    formatBankAccountForActor(finance, "BCA", "0084921840"),
    "Terbatas (izin rekening diperlukan)",
  );
  assert.equal(canViewPayrollAmounts(finance), true);
  finance.assignments
    .find((a) => a.cycle === "penggajian")!
    .duties.push("salary:read", "bank:read");
  assert.equal(canViewIndividualCompensation(finance), true);
  assert.equal(
    formatBankAccountForActor(finance, "BCA", "0084921840"),
    "BCA · 0084921840",
  );
  assert.equal(
    canExecutePayPeriodAction(manager, "Menunggu Persetujuan"),
    true,
  );
  assert.equal(
    canExecutePayPeriodAction(manager, "Menunggu Persetujuan", manager.id),
    false,
  );
  assert.equal(canExecutePayPeriodAction(finance, "Menunggu Pencairan"), true);
  assert.equal(
    canExecutePayPeriodAction(operations, "Menunggu Pencairan"),
    false,
  );
});

test("KPI incentive calculation applies only when eligible, Disahkan, and score >= 80", () => {
  const baseSalary = 10_000_000;
  assert.equal(
    calculateKpiIncentiveAmount(baseSalary, {
      incentiveEligible: false,
      incentiveRatePct: 10,
      reviewStatus: "Disahkan",
      score: 95,
    }),
    0,
  );
  assert.equal(
    calculateKpiIncentiveAmount(baseSalary, {
      incentiveEligible: true,
      incentiveRatePct: 10,
      reviewStatus: "Perlu Ditinjau",
      score: 95,
    }),
    0,
  );
  assert.equal(
    calculateKpiIncentiveAmount(baseSalary, {
      incentiveEligible: true,
      incentiveRatePct: 10,
      reviewStatus: "Disahkan",
      score: 79,
    }),
    0,
  );
  assert.equal(
    calculateKpiIncentiveAmount(baseSalary, {
      incentiveEligible: true,
      incentiveRatePct: 10,
      reviewStatus: "Disahkan",
      score: 92,
    }),
    1_000_000,
  );
});

test("pay period advances cleanly from Perlu Perhitungan to Selesai with GL journal number", () => {
  let period = INITIAL_PAY_PERIODS.find((p) => p.stage === "Perlu Perhitungan");
  assert.ok(period);
  assert.equal(actionLabelForPayPeriodStage(period.stage), "Hitung Gaji");

  period = advancePayPeriodRecord(period, "Admin Demo");
  assert.equal(period.stage, "Menunggu Tinjauan");
  assert.equal(
    actionLabelForPayPeriodStage(period.stage),
    "Tinjau Perhitungan",
  );

  period = advancePayPeriodRecord(period, "Admin Demo");
  assert.equal(period.stage, "Menunggu Persetujuan");
  assert.equal(actionLabelForPayPeriodStage(period.stage), "Setujui Periode");

  period = advancePayPeriodRecord(period, "Admin Demo");
  assert.equal(period.stage, "Menunggu Pencairan");
  assert.equal(period.approvalStatus, "Disetujui");
  assert.equal(actionLabelForPayPeriodStage(period.stage), "Proses Pencairan");

  period = advancePayPeriodRecord(period, "Admin Demo");
  assert.equal(period.stage, "Menunggu Posting Jurnal");
  assert.equal(period.disbursementStatus, "Telah Dicairkan");
  assert.equal(actionLabelForPayPeriodStage(period.stage), "Posting Jurnal");

  period = advancePayPeriodRecord(period, "Admin Demo");
  assert.equal(period.stage, "Selesai");
  assert.equal(period.journalPostingStatus, "Terposting");
  assert.ok(period.journalNumber?.startsWith("JRN-"));
  assert.equal(actionLabelForPayPeriodStage(period.stage), null);
});

test("rupiah formatting and initial fixtures stay consistent", () => {
  assert.equal(formatRupiahFull(1_485_000_000), "Rp1.485.000.000");
  assert.equal(formatRupiahCompact(1_485_000_000), "Rp1,49 M");
  assert.equal(formatRupiahCompact(79_500_000), "Rp79,5 jt");
  assert.ok(PAYROLL_TREND_SERIES.length >= 6);
  assert.ok(INITIAL_EMPLOYEES.length >= 6);
  assert.ok(INITIAL_ATTENDANCE_RECORDS.length >= 6);
  assert.ok(INITIAL_KPI_EVALUATIONS.length >= 5);
  assert.ok(SUMMARY_FOLLOW_UPS.length >= 3);
  assert.ok(PAYROLL_TASK_QUEUE.length >= 4);
});
