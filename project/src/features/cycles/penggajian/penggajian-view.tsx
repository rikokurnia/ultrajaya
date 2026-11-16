"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import type { User } from "@/shared/contracts/auth";
import foundationStyles from "@/components/foundation.module.css";
import {
  INITIAL_ATTENDANCE_RECORDS,
  INITIAL_EMPLOYEES,
  INITIAL_KPI_EVALUATIONS,
  INITIAL_PAY_PERIODS,
  PAYROLL_PERIOD_OPTIONS,
  PAYROLL_TASK_QUEUE,
  PAYROLL_TREND_SERIES,
  PENGGAJIAN_TABS,
  SUMMARY_FOLLOW_UPS,
  actionLabelForPayPeriodStage,
  advancePayPeriodRecord,
  calculateKpiIncentiveAmount,
  canExecutePayPeriodAction,
  canManageEmployees,
  canReadGeneralLedger,
  canReviewAttendance,
  canReviewKpi,
  canViewIndividualCompensation,
  canViewPayrollAmounts,
  formatRupiahFull,
  normalizePenggajianTab,
  normalizePeriodKey,
  normalizeSubView,
  type AbsensiKinerjaSubView,
  type AttendanceRecord,
  type EmployeeRecord,
  type EmploymentType,
  type KpiEvaluationRecord,
  type PayPeriodRecord,
  type PayrollPeriodKey,
  type PenggajianTab,
} from "./data";
import {
  AttendanceOvertimeBreakdown,
  EmployeeReadinessSummary,
  NetPayTrendChart,
} from "./charts";
import {
  AttendanceReviewDrawer,
  AttendanceStatusPill,
  CreateEmployeeDrawer,
  EmployeeDetailDrawer,
  KpiReviewDrawer,
  KpiStatusPill,
  OnboardingStatusPill,
  PayPeriodActionDrawer,
  PayPeriodStagePill,
  ReadinessStatusPill,
  SubStageStatusPill,
  TaskStatusPill,
} from "./drawers";
import styles from "./penggajian.module.css";

export function PenggajianView({
  user,
  initialTab,
  initialSubView,
  initialPeriod,
}: {
  user: User;
  initialTab?: string;
  initialSubView?: string;
  initialPeriod?: string;
}) {
  const [activeTab, setActiveTab] = useState<PenggajianTab>(() =>
    normalizePenggajianTab(initialTab),
  );
  const [subView, setSubView] = useState<AbsensiKinerjaSubView>(() =>
    normalizeSubView(initialSubView ?? initialTab),
  );
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<PayrollPeriodKey>(
    () => normalizePeriodKey(initialPeriod),
  );

  // Domain state
  const [employees, setEmployees] = useState<EmployeeRecord[]>(() => [
    ...INITIAL_EMPLOYEES,
  ]);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >(() => [...INITIAL_ATTENDANCE_RECORDS]);
  const [kpiEvaluations, setKpiEvaluations] = useState<KpiEvaluationRecord[]>(
    () => [...INITIAL_KPI_EVALUATIONS],
  );
  const [payPeriods, setPayPeriods] = useState<PayPeriodRecord[]>(() => [
    ...INITIAL_PAY_PERIODS,
  ]);

  // Filters
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [readinessFilter, setReadinessFilter] = useState<
    "ALL" | EmployeeRecord["readinessStatus"]
  >("ALL");
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [kpiSearch, setKpiSearch] = useState("");

  // Drawers & detail selections
  const [createEmployeeOpen, setCreateEmployeeOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<
    string | null
  >(null);
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
  const [activeDetailPeriodId, setActiveDetailPeriodId] = useState<string>(
    INITIAL_PAY_PERIODS[0].id,
  );
  const [actionDrawerPeriodId, setActionDrawerPeriodId] = useState<
    string | null
  >(null);

  const canSeeAmounts = canViewPayrollAmounts(user);
  const canSeeComp = canViewIndividualCompensation(user);
  const canManageEmp = canManageEmployees(user);
  const canReviewAtt = canReviewAttendance(user);
  const canReviewEval = canReviewKpi(user);
  const canSeeGl = canReadGeneralLedger(user);

  const activeTabMeta =
    PENGGAJIAN_TABS.find((t) => t.key === activeTab) ?? PENGGAJIAN_TABS[0];

  const selectedPeriodLabel =
    PAYROLL_PERIOD_OPTIONS.find((p) => p.key === selectedPeriodKey)?.label ??
    "November 2026";

  const activeSummaryPeriod =
    payPeriods.find(
      (p) => p.periodKey === selectedPeriodKey && p.baseAndAllowanceTotal > 0,
    ) ??
    payPeriods.find((p) => p.periodKey === selectedPeriodKey) ??
    payPeriods[0];

  const activeDetailPeriod =
    payPeriods.find((p) => p.id === activeDetailPeriodId) ?? payPeriods[0];

  const selectedEmployee =
    employees.find((e) => e.id === selectedEmployeeId) ?? null;
  const selectedAttendance =
    attendanceRecords.find((a) => a.id === selectedAttendanceId) ?? null;
  const selectedKpi =
    kpiEvaluations.find((k) => k.id === selectedKpiId) ?? null;
  const drawerPeriod =
    payPeriods.find((p) => p.id === actionDrawerPeriodId) ?? null;

  function syncUrl(
    nextTab: PenggajianTab,
    nextSub: AbsensiKinerjaSubView,
    nextPeriod: PayrollPeriodKey,
  ) {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (nextTab === "ringkasan") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", nextTab);
    }
    if (nextTab === "absensi-kinerja" && nextSub === "kinerja") {
      url.searchParams.set("sub", "kinerja");
    } else {
      url.searchParams.delete("sub");
    }
    if (nextPeriod === "2026-11") {
      url.searchParams.delete("period");
    } else {
      url.searchParams.set("period", nextPeriod);
    }
    window.history.replaceState(null, "", url.toString());
  }

  function selectTab(next: PenggajianTab) {
    setActiveTab(next);
    syncUrl(next, subView, selectedPeriodKey);
  }

  function selectSubView(nextSub: AbsensiKinerjaSubView) {
    setSubView(nextSub);
    syncUrl(activeTab, nextSub, selectedPeriodKey);
  }

  function selectPeriod(nextPeriod: PayrollPeriodKey) {
    setSelectedPeriodKey(nextPeriod);
    syncUrl(activeTab, subView, nextPeriod);
  }

  function handleNavigateTarget(params: {
    targetTab: PenggajianTab;
    targetSubView?: AbsensiKinerjaSubView;
    targetPeriodKey?: PayrollPeriodKey;
    targetRecordId?: string;
  }) {
    const nextPeriod = params.targetPeriodKey ?? selectedPeriodKey;
    const nextSub = params.targetSubView ?? subView;
    setActiveTab(params.targetTab);
    if (params.targetSubView) setSubView(params.targetSubView);
    if (params.targetPeriodKey) setSelectedPeriodKey(params.targetPeriodKey);
    syncUrl(params.targetTab, nextSub, nextPeriod);

    if (!params.targetRecordId) return;
    if (params.targetTab === "karyawan") {
      setSelectedEmployeeId(params.targetRecordId);
    } else if (params.targetTab === "absensi-kinerja") {
      if (nextSub === "kinerja") {
        setSelectedKpiId(params.targetRecordId);
      } else {
        setSelectedAttendanceId(params.targetRecordId);
      }
    } else if (params.targetTab === "penggajian") {
      setActiveDetailPeriodId(params.targetRecordId);
      setActionDrawerPeriodId(params.targetRecordId);
    }
  }

  function handleCreateEmployee(input: {
    name: string;
    department: string;
    roleTitle: string;
    employmentType: EmploymentType;
    baseSalary: number;
    fixedAllowance: number;
    bankName: string;
    bankAccountNumber: string;
    npwpNumber: string;
    ptkpStatus: string;
    bpjsKesehatanNumber: string;
    bpjsKetenagakerjaanNumber: string;
  }) {
    const nextNum = 1041 + employees.length;
    const code = `EMP-${nextNum}`;
    const isComplete =
      Boolean(input.bankAccountNumber) &&
      Boolean(input.npwpNumber) &&
      Boolean(input.bpjsKesehatanNumber) &&
      Boolean(input.bpjsKetenagakerjaanNumber);

    const newEmp: EmployeeRecord = {
      id: `emp-${nextNum}`,
      code,
      name: input.name,
      department: input.department,
      roleTitle: input.roleTitle,
      employmentType: input.employmentType,
      joinDateLabel: "16 Nov 2026",
      onboardingStatus: isComplete ? "Selesai Onboarding" : "Orientasi Baru",
      readinessStatus: isComplete ? "Siap Diproses" : "Data Belum Lengkap",
      missingDataNote: isComplete
        ? "Data induk, rekening bank, NPWP, dan BPJS lengkap."
        : "Sebagian data rekening bank, NPWP, atau BPJS masih perlu dilengkapi.",
      baseSalary: input.baseSalary,
      fixedAllowance: input.fixedAllowance,
      overtimeRatePerHour: 45_000,
      kpiIncentiveEligible: true,
      bankName: input.bankName,
      bankAccountNumber: input.bankAccountNumber,
      bankAccountHolder: input.name,
      npwpNumber: input.npwpNumber,
      ptkpStatus: input.ptkpStatus,
      bpjsKesehatanNumber: input.bpjsKesehatanNumber,
      bpjsKetenagakerjaanNumber: input.bpjsKetenagakerjaanNumber,
    };
    setEmployees((prev) => [newEmp, ...prev]);
  }

  function handleCompleteEmployeeData(
    employeeId: string,
    updates: {
      bankName: string;
      bankAccountNumber: string;
      npwpNumber: string;
      bpjsKesehatanNumber: string;
      bpjsKetenagakerjaanNumber: string;
    },
  ) {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              bankName: updates.bankName,
              bankAccountNumber: updates.bankAccountNumber,
              npwpNumber: updates.npwpNumber,
              bpjsKesehatanNumber: updates.bpjsKesehatanNumber,
              bpjsKetenagakerjaanNumber: updates.bpjsKetenagakerjaanNumber,
              onboardingStatus: "Selesai Onboarding",
              readinessStatus: "Siap Diproses",
              missingDataNote:
                "Data induk, rekening bank, NPWP, dan BPJS lengkap.",
            }
          : emp,
      ),
    );
  }

  function handleVerifyAttendance(
    recordId: string,
    hoursWorked: number,
    overtimeHours: number,
    note: string,
  ) {
    setAttendanceRecords((prev) =>
      prev.map((rec) =>
        rec.id === recordId
          ? {
              ...rec,
              hoursWorked,
              overtimeHours,
              correctionStatus: "Terverifikasi",
              anomalyNote: note,
            }
          : rec,
      ),
    );
  }

  function handleApproveKpi(
    evaluationId: string,
    score: number,
    evaluatorNote: string,
  ) {
    setKpiEvaluations((prev) =>
      prev.map((ev) =>
        ev.id === evaluationId
          ? {
              ...ev,
              score,
              gradeLabel:
                score >= 90
                  ? "Sangat Baik (A)"
                  : score >= 85
                    ? "Baik (B+)"
                    : score >= 80
                      ? "Baik (B)"
                      : "Cukup (C)",
              reviewStatus: "Disahkan",
              evaluatorNote,
            }
          : ev,
      ),
    );
  }

  function handleAdvancePeriod(periodId: string) {
    setPayPeriods((prev) =>
      prev.map((p) =>
        p.id === periodId ? advancePayPeriodRecord(p, user.name) : p,
      ),
    );
  }

  // Filtered lists
  const filteredEmployees = employees.filter((emp) => {
    if (readinessFilter !== "ALL" && emp.readinessStatus !== readinessFilter) {
      return false;
    }
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      emp.code.toLowerCase().includes(q) ||
      emp.name.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q)
    );
  });

  const periodAttendance = attendanceRecords.filter((rec) => {
    if (rec.periodKey !== selectedPeriodKey) return false;
    const q = attendanceSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      rec.code.toLowerCase().includes(q) ||
      rec.employeeCode.toLowerCase().includes(q) ||
      rec.employeeName.toLowerCase().includes(q) ||
      rec.department.toLowerCase().includes(q)
    );
  });

  const periodKpi = kpiEvaluations.filter((ev) => {
    if (ev.periodKey !== selectedPeriodKey) return false;
    const q = kpiSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      ev.code.toLowerCase().includes(q) ||
      ev.employeeCode.toLowerCase().includes(q) ||
      ev.employeeName.toLowerCase().includes(q) ||
      ev.department.toLowerCase().includes(q)
    );
  });

  const selectedKpiEmployee = selectedKpi
    ? employees.find((e) => e.id === selectedKpi.employeeId) ?? null
    : null;

  const detailTotalDebit = activeDetailPeriod.journalLines.reduce(
    (acc, l) => acc + l.debit,
    0,
  );

  return (
    <section className={styles.page}>
      <header className={foundationStyles.banner}>
        <h1>{activeTabMeta.bannerTitle}</h1>
      </header>

      <div
        className={styles.tabBar}
        role="tablist"
        aria-label="Submenu Penggajian"
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          e.preventDefault();
          const idx = PENGGAJIAN_TABS.findIndex((t) => t.key === activeTab);
          const next =
            PENGGAJIAN_TABS[
              (idx +
                (e.key === "ArrowRight" ? 1 : PENGGAJIAN_TABS.length - 1)) %
                PENGGAJIAN_TABS.length
            ];
          selectTab(next.key);
          document.getElementById(`penggajian-tab-${next.key}`)?.focus();
        }}
      >
        {PENGGAJIAN_TABS.map((tab) => (
          <button
            key={tab.key}
            id={`penggajian-tab-${tab.key}`}
            type="button"
            role="tab"
            className={styles.tabButton}
            tabIndex={activeTab === tab.key ? 0 : -1}
            aria-selected={activeTab === tab.key}
            onClick={() => selectTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        aria-labelledby={`penggajian-tab-${activeTab}`}
        className={styles.page}
      >
        {/* 1. RINGKASAN */}
        {activeTab === "ringkasan" && (
          <>
            <div className={styles.filterBar}>
              <div className={styles.filterBarRight}>
                <label htmlFor="penggajian-period" className={styles.filterLabel}>
                  Periode Gaji
                </label>
                <div className={styles.selectControl}>
                  <select
                    id="penggajian-period"
                    value={selectedPeriodKey}
                    onChange={(e) =>
                      selectPeriod(e.target.value as PayrollPeriodKey)
                    }
                  >
                    {PAYROLL_PERIOD_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.kpiGrid}>
              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Total Gaji Bersih</span>
                <strong className={styles.kpiValue}>
                  {canSeeAmounts
                    ? formatRupiahFull(activeSummaryPeriod.netPay)
                    : "Terbatas"}
                </strong>
                <span className={styles.kpiHint}>
                  {canSeeAmounts
                    ? `Periode ${activeSummaryPeriod.name} · Bruto ${formatRupiahFull(activeSummaryPeriod.grossPay)}`
                    : "Nominal gaji hanya tampil untuk HR, Keuangan, dan Auditor"}
                </span>
              </article>

              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Karyawan dalam Periode</span>
                <strong className={styles.kpiValue}>
                  {activeSummaryPeriod.employeeCount} karyawan
                </strong>
                <span className={styles.kpiHint}>
                  {activeSummaryPeriod.readyEmployeeCount} siap diproses ·{" "}
                  {Math.max(
                    0,
                    activeSummaryPeriod.employeeCount -
                      activeSummaryPeriod.readyEmployeeCount,
                  )}{" "}
                  perlu kelengkapan data
                </span>
              </article>

              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Status Periode Gaji</span>
                <strong
                  className={styles.kpiValue}
                  style={{ fontSize: 20, marginTop: 2 }}
                >
                  <PayPeriodStagePill stage={activeSummaryPeriod.stage} />
                </strong>
                <span className={styles.kpiHint}>
                  Tanggal bayar: {activeSummaryPeriod.payDateLabel}
                </span>
              </article>
            </div>

            <div className={styles.splitGrid}>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardHeaderStack}>
                    <h2 className={styles.cardTitle}>
                      Tren Gaji Bersih per Periode
                    </h2>
                    <p className={styles.cardSubtitle}>
                      Perbandingan gaji bersih dan gaji bruto (dalam jutaan IDR)
                      pada 6 periode terakhir
                    </p>
                  </div>
                </div>
                <NetPayTrendChart
                  series={PAYROLL_TREND_SERIES}
                  selectedPeriodKey={selectedPeriodKey}
                  activePeriod={activeSummaryPeriod}
                  canViewAmounts={canSeeAmounts}
                />
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Perlu Ditindaklanjuti</h2>
                </div>
                <ul className={styles.followUpList}>
                  {SUMMARY_FOLLOW_UPS.map((item) => (
                    <li className={styles.followUpItem} key={item.id}>
                      <div className={styles.followUpMain}>
                        <span className={styles.followUpText}>{item.label}</span>
                        <span className={styles.followUpSub}>{item.detail}</span>
                      </div>
                      <button
                        type="button"
                        className={styles.textLink}
                        onClick={() => handleNavigateTarget(item)}
                      >
                        {item.actionLabel}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Antrean Tugas Hari Ini</h2>
              </div>
              <div
                className={styles.tableWrap}
                role="region"
                tabIndex={0}
                aria-label="Antrean Tugas Hari Ini"
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Tugas</th>
                      <th scope="col">Referensi</th>
                      <th scope="col">Tahap</th>
                      <th scope="col">Status</th>
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PAYROLL_TASK_QUEUE.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{row.task}</div>
                          <span className={styles.cellNote}>{row.ownerRole}</span>
                        </td>
                        <td className={styles.tabular}>
                          <button
                            type="button"
                            className={styles.textLink}
                            onClick={() => handleNavigateTarget(row)}
                          >
                            {row.reference}
                          </button>
                        </td>
                        <td>{row.stageLabel}</td>
                        <td>
                          <TaskStatusPill status={row.status} />
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.textLink}
                            onClick={() => handleNavigateTarget(row)}
                          >
                            {row.actionLabel}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* 2. KARYAWAN */}
        {activeTab === "karyawan" && (
          <>
            <div className={styles.toolbar}>
              <label className={styles.searchBox}>
                <Search aria-hidden />
                <span className="sr-only">
                  Cari ID karyawan, nama, atau departemen
                </span>
                <input
                  type="search"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="Cari ID karyawan, nama, atau departemen"
                />
              </label>

              <div className={styles.selectControl}>
                <label htmlFor="employee-readiness-filter" className="sr-only">
                  Filter kesiapan data penggajian
                </label>
                <select
                  id="employee-readiness-filter"
                  value={readinessFilter}
                  onChange={(e) =>
                    setReadinessFilter(
                      e.target.value as "ALL" | EmployeeRecord["readinessStatus"],
                    )
                  }
                >
                  <option value="ALL">Semua kesiapan data</option>
                  <option value="Siap Diproses">Siap Diproses</option>
                  <option value="Data Belum Lengkap">Data Belum Lengkap</option>
                </select>
              </div>

              {canManageEmp && (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => setCreateEmployeeOpen(true)}
                >
                  <Plus size={18} aria-hidden />
                  Tambah Karyawan
                </button>
              )}
            </div>

            <EmployeeReadinessSummary employees={employees} />

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderStack}>
                  <h2 className={styles.cardTitle}>Daftar Karyawan</h2>
                  <p className={styles.cardSubtitle}>
                    Klik ID atau nama karyawan untuk membuka rincian profil,
                    kompensasi, rekening bank, dan kepesertaan BPJS.
                  </p>
                </div>
              </div>
              <div
                className={styles.tableWrap}
                role="region"
                tabIndex={0}
                aria-label="Daftar Karyawan"
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">ID &amp; Nama Karyawan</th>
                      <th scope="col">Departemen</th>
                      <th scope="col">Status Onboarding</th>
                      <th scope="col">Kesiapan Data Gaji</th>
                      <th scope="col">Aksi Berikutnya</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={styles.emptyRow}>
                          Tidak ada data karyawan yang sesuai dengan pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp) => {
                        const needsFollowUp =
                          emp.readinessStatus === "Data Belum Lengkap";
                        const showCompleteAction =
                          needsFollowUp && canManageEmp;
                        return (
                          <tr key={emp.id}>
                            <td>
                              <button
                                type="button"
                                className={styles.recordLink}
                                onClick={() => setSelectedEmployeeId(emp.id)}
                              >
                                <span className={styles.recordLinkCode}>
                                  {emp.code} · {emp.name}
                                </span>
                                <span className={styles.recordLinkSub}>
                                  {emp.roleTitle} · {emp.employmentType}
                                </span>
                              </button>
                            </td>
                            <td>{emp.department}</td>
                            <td>
                              <OnboardingStatusPill
                                status={emp.onboardingStatus}
                              />
                            </td>
                            <td>
                              <ReadinessStatusPill status={emp.readinessStatus} />
                            </td>
                            <td>
                              {showCompleteAction ? (
                                <button
                                  type="button"
                                  className={styles.textLink}
                                  onClick={() => setSelectedEmployeeId(emp.id)}
                                >
                                  Lengkapi Data
                                </button>
                              ) : (
                                <span className={styles.mutedDash}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* 3. ABSENSI & KINERJA */}
        {activeTab === "absensi-kinerja" && (
          <>
            <div className={styles.filterBar}>
              <div
                className={styles.subViewSwitch}
                role="group"
                aria-label="Tampilan Absensi dan Kinerja"
              >
                <button
                  type="button"
                  className={styles.subViewButton}
                  aria-pressed={subView === "absensi"}
                  onClick={() => selectSubView("absensi")}
                >
                  Absensi
                </button>
                <button
                  type="button"
                  className={styles.subViewButton}
                  aria-pressed={subView === "kinerja"}
                  onClick={() => selectSubView("kinerja")}
                >
                  Kinerja
                </button>
              </div>

              <div className={styles.filterBarRight}>
                <label htmlFor="absensi-period" className={styles.filterLabel}>
                  Periode
                </label>
                <div className={styles.selectControl}>
                  <select
                    id="absensi-period"
                    value={selectedPeriodKey}
                    onChange={(e) =>
                      selectPeriod(e.target.value as PayrollPeriodKey)
                    }
                  >
                    {PAYROLL_PERIOD_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {subView === "absensi" ? (
              <>
                <AttendanceOvertimeBreakdown
                  records={periodAttendance}
                  periodLabel={selectedPeriodLabel}
                />

                <section className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardHeaderStack}>
                      <h2 className={styles.cardTitle}>
                        Catatan Absensi &amp; Lembur — {selectedPeriodLabel}
                      </h2>
                      <p className={styles.cardSubtitle}>
                        Verifikasi jam hadir dan Surat Perintah Kerja Lembur
                        (SPKL) sebelum perhitungan gaji.
                      </p>
                    </div>
                    <div className={styles.headerControls}>
                      <label className={styles.searchBox}>
                        <Search aria-hidden />
                        <span className="sr-only">
                          Cari catatan absensi atau karyawan
                        </span>
                        <input
                          type="search"
                          value={attendanceSearch}
                          onChange={(e) => setAttendanceSearch(e.target.value)}
                          placeholder="Cari ID absensi atau nama"
                        />
                      </label>
                    </div>
                  </div>

                  <div
                    className={styles.tableWrap}
                    role="region"
                    tabIndex={0}
                    aria-label="Catatan Absensi dan Lembur"
                  >
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">Catatan &amp; Karyawan</th>
                          <th scope="col">Departemen</th>
                          <th scope="col">Jam Kerja</th>
                          <th scope="col">Lembur (SPKL)</th>
                          <th scope="col">Status Koreksi</th>
                          <th scope="col">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periodAttendance.length === 0 ? (
                          <tr>
                            <td colSpan={6} className={styles.emptyRow}>
                              Tidak ada catatan absensi pada periode{" "}
                              {selectedPeriodLabel}.
                            </td>
                          </tr>
                        ) : (
                          periodAttendance.map((rec) => {
                            const needsReview =
                              rec.correctionStatus !== "Terverifikasi";
                            return (
                              <tr key={rec.id}>
                                <td>
                                  <button
                                    type="button"
                                    className={styles.recordLink}
                                    onClick={() =>
                                      setSelectedAttendanceId(rec.id)
                                    }
                                  >
                                    <span className={styles.recordLinkCode}>
                                      {rec.code} · {rec.employeeName}
                                    </span>
                                    <span className={styles.recordLinkSub}>
                                      {rec.employeeCode} · {rec.shiftLabel}
                                    </span>
                                  </button>
                                </td>
                                <td>{rec.department}</td>
                                <td className={styles.tabular}>
                                  {rec.hoursWorked} jam
                                  <span className={styles.cellNote}>
                                    {rec.daysPresent} hari hadir
                                  </span>
                                </td>
                                <td className={styles.tabular}>
                                  {rec.overtimeHours} jam
                                  <span className={styles.cellNote}>
                                    {rec.spklReference}
                                  </span>
                                </td>
                                <td>
                                  <AttendanceStatusPill
                                    status={rec.correctionStatus}
                                  />
                                </td>
                                <td>
                                  {needsReview && canReviewAtt ? (
                                    <button
                                      type="button"
                                      className={styles.textLink}
                                      onClick={() =>
                                        setSelectedAttendanceId(rec.id)
                                      }
                                    >
                                      Tinjau Absensi
                                    </button>
                                  ) : (
                                    <span className={styles.mutedDash}>—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            ) : (
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardHeaderStack}>
                    <h2 className={styles.cardTitle}>
                      Evaluasi Kinerja (KPI) — {selectedPeriodLabel}
                    </h2>
                    <p className={styles.cardSubtitle}>
                      Hasil KPI hanya dimasukkan ke perhitungan gaji bila skema
                      jabatan berhak atas insentif, status Disahkan, dan skor ≥
                      80.
                    </p>
                  </div>
                  <div className={styles.headerControls}>
                    <label className={styles.searchBox}>
                      <Search aria-hidden />
                      <span className="sr-only">
                        Cari evaluasi KPI atau karyawan
                      </span>
                      <input
                        type="search"
                        value={kpiSearch}
                        onChange={(e) => setKpiSearch(e.target.value)}
                        placeholder="Cari kode KPI, nama, atau departemen"
                      />
                    </label>
                  </div>
                </div>

                <div
                  className={styles.tableWrap}
                  role="region"
                  tabIndex={0}
                  aria-label="Evaluasi Kinerja KPI"
                >
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">ID KPI &amp; Karyawan</th>
                        <th scope="col">Indikator &amp; Realisasi</th>
                        <th scope="col">Skor KPI</th>
                        <th scope="col">Dampak ke Gaji</th>
                        <th scope="col">Status Tinjauan</th>
                        <th scope="col">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periodKpi.length === 0 ? (
                        <tr>
                          <td colSpan={6} className={styles.emptyRow}>
                            Belum ada evaluasi KPI pada periode{" "}
                            {selectedPeriodLabel}.
                          </td>
                        </tr>
                      ) : (
                        periodKpi.map((ev) => {
                          const emp = employees.find(
                            (e) => e.id === ev.employeeId,
                          );
                          const incentiveAmt = emp
                            ? calculateKpiIncentiveAmount(emp.baseSalary, ev)
                            : 0;
                          const needsReview =
                            ev.reviewStatus === "Perlu Ditinjau";

                          return (
                            <tr key={ev.id}>
                              <td>
                                <button
                                  type="button"
                                  className={styles.recordLink}
                                  onClick={() => setSelectedKpiId(ev.id)}
                                >
                                  <span className={styles.recordLinkCode}>
                                    {ev.code} · {ev.employeeName}
                                  </span>
                                  <span className={styles.recordLinkSub}>
                                    {ev.employeeCode} · {ev.department}
                                  </span>
                                </button>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600 }}>
                                  {ev.keyIndicator}
                                </div>
                                <span className={styles.cellNote}>
                                  {ev.achievementSummary}
                                </span>
                              </td>
                              <td className={styles.tabular}>
                                <strong>{ev.score}/100</strong>
                                <span className={styles.cellNote}>
                                  {ev.gradeLabel}
                                </span>
                              </td>
                              <td className={styles.tabular}>
                                {!ev.incentiveEligible ? (
                                  <span className={styles.cellNote}>
                                    Non-insentif (tunjangan tetap)
                                  </span>
                                ) : ev.reviewStatus !== "Disahkan" ? (
                                  <span className={styles.cellNote}>
                                    Menunggu pengesahan ({ev.incentiveRatePct}%)
                                  </span>
                                ) : canSeeComp ? (
                                  <>
                                    <strong>
                                      {formatRupiahFull(incentiveAmt)}
                                    </strong>
                                    <span className={styles.cellNote}>
                                      Insentif {ev.incentiveRatePct}% gaji pokok
                                    </span>
                                  </>
                                ) : (
                                  <span>Insentif {ev.incentiveRatePct}%</span>
                                )}
                              </td>
                              <td>
                                <KpiStatusPill status={ev.reviewStatus} />
                              </td>
                              <td>
                                {needsReview && canReviewEval ? (
                                  <button
                                    type="button"
                                    className={styles.textLink}
                                    onClick={() => setSelectedKpiId(ev.id)}
                                  >
                                    Tinjau KPI
                                  </button>
                                ) : (
                                  <span className={styles.mutedDash}>—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        {/* 4. PENGGAJIAN */}
        {activeTab === "penggajian" && (
          <>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderStack}>
                  <h2 className={styles.cardTitle}>Daftar Periode Gaji</h2>
                  <p className={styles.cardSubtitle}>
                    Klik nama periode untuk membuka rincian perhitungan, linimasa
                    persetujuan hingga pencairan, dan posting jurnal Buku Besar.
                  </p>
                </div>
              </div>

              <div
                className={styles.tableWrap}
                role="region"
                tabIndex={0}
                aria-label="Daftar Periode Gaji"
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Periode Gaji</th>
                      <th scope="col">Karyawan</th>
                      <th scope="col">Gaji Bersih</th>
                      <th scope="col">Status</th>
                      <th scope="col">Aksi Berikutnya</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payPeriods.map((period) => {
                      const actionLabel = actionLabelForPayPeriodStage(
                        period.stage,
                      );
                      const canAct =
                        actionLabel !== null &&
                        canExecutePayPeriodAction(user, period.stage);
                      const isSelected = period.id === activeDetailPeriod.id;

                      return (
                        <tr
                          key={period.id}
                          className={
                            isSelected ? styles.selectedTableRow : undefined
                          }
                        >
                          <td>
                            <button
                              type="button"
                              className={styles.recordLink}
                              onClick={() => setActiveDetailPeriodId(period.id)}
                            >
                              <span className={styles.recordLinkCode}>
                                {period.name}
                              </span>
                              <span className={styles.recordLinkSub}>
                                {period.code} · Cut-off {period.cutoffLabel}
                              </span>
                            </button>
                          </td>
                          <td className={styles.tabular}>
                            {period.employeeCount} karyawan
                          </td>
                          <td className={styles.tabular}>
                            {canSeeAmounts ? (
                              formatRupiahFull(period.netPay)
                            ) : (
                              <span className={styles.mutedDash}>Terbatas</span>
                            )}
                          </td>
                          <td>
                            <PayPeriodStagePill stage={period.stage} />
                          </td>
                          <td>
                            {canAct ? (
                              <button
                                type="button"
                                className={styles.textLink}
                                onClick={() => {
                                  setActiveDetailPeriodId(period.id);
                                  setActionDrawerPeriodId(period.id);
                                }}
                              >
                                {actionLabel}
                              </button>
                            ) : (
                              <span className={styles.mutedDash}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Detail Periode Gaji Terpilih */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderStack}>
                  <h2 className={styles.cardTitle}>
                    Detail Periode: {activeDetailPeriod.name} (
                    {activeDetailPeriod.code})
                  </h2>
                  <p className={styles.cardSubtitle}>
                    {activeDetailPeriod.summaryNote}
                  </p>
                </div>
                <div className={styles.journalActions}>
                  {activeDetailPeriod.journalNumber && canSeeGl && (
                    <Link
                      href={`/finance/journals?search=${encodeURIComponent(activeDetailPeriod.journalNumber)}`}
                      className={styles.secondaryButton}
                    >
                      Lihat Jurnal {activeDetailPeriod.journalNumber}
                    </Link>
                  )}
                  {actionLabelForPayPeriodStage(activeDetailPeriod.stage) &&
                    canExecutePayPeriodAction(
                      user,
                      activeDetailPeriod.stage,
                    ) && (
                      <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={() =>
                          setActionDrawerPeriodId(activeDetailPeriod.id)
                        }
                      >
                        {actionLabelForPayPeriodStage(activeDetailPeriod.stage)}
                      </button>
                    )}
                </div>
              </div>

              <div className={styles.periodDetailGrid}>
                {/* Gaji Bruto -> Potongan -> Gaji Bersih */}
                {canSeeAmounts ? (
                  <div className={styles.equationGrid}>
                    <div className={styles.equationBox}>
                      <span className={styles.equationTitle}>Gaji Bruto</span>
                      <strong className={styles.equationAmount}>
                        {formatRupiahFull(activeDetailPeriod.grossPay)}
                      </strong>
                      <ul className={styles.equationSubList}>
                        <li>
                          <span>Gaji Pokok &amp; Tunjangan</span>
                          <span>
                            {formatRupiahFull(
                              activeDetailPeriod.baseAndAllowanceTotal,
                            )}
                          </span>
                        </li>
                        <li>
                          <span>Insentif Kinerja (KPI)</span>
                          <span>
                            {formatRupiahFull(
                              activeDetailPeriod.kpiIncentiveTotal,
                            )}
                          </span>
                        </li>
                        <li>
                          <span>Upah Lembur (SPKL)</span>
                          <span>
                            {formatRupiahFull(activeDetailPeriod.overtimeTotal)}
                          </span>
                        </li>
                      </ul>
                    </div>

                    <div className={styles.equationArrow} aria-hidden>
                      −
                    </div>

                    <div className={styles.equationBox}>
                      <span className={styles.equationTitle}>Potongan</span>
                      <strong className={styles.equationAmount}>
                        {formatRupiahFull(activeDetailPeriod.totalDeductions)}
                      </strong>
                      <ul className={styles.equationSubList}>
                        <li>
                          <span>PPh Pasal 21</span>
                          <span>
                            {formatRupiahFull(
                              activeDetailPeriod.pph21Deduction,
                            )}
                          </span>
                        </li>
                        <li>
                          <span>BPJS Kesehatan &amp; TK</span>
                          <span>
                            {formatRupiahFull(activeDetailPeriod.bpjsDeduction)}
                          </span>
                        </li>
                        <li>
                          <span>Potongan Kehadiran</span>
                          <span>
                            {formatRupiahFull(
                              activeDetailPeriod.attendanceDeduction,
                            )}
                          </span>
                        </li>
                      </ul>
                    </div>

                    <div className={styles.equationArrow} aria-hidden>
                      =
                    </div>

                    <div
                      className={`${styles.equationBox} ${styles.equationBoxHighlight}`}
                    >
                      <span className={styles.equationTitle}>Gaji Bersih</span>
                      <strong className={styles.equationAmount}>
                        {formatRupiahFull(activeDetailPeriod.netPay)}
                      </strong>
                      <ul className={styles.equationSubList}>
                        <li>
                          <span>Penerima</span>
                          <span>{activeDetailPeriod.employeeCount} orang</span>
                        </li>
                        <li>
                          <span>Tanggal Bayar</span>
                          <span>{activeDetailPeriod.payDateLabel}</span>
                        </li>
                        <li>
                          <span>Slip Gaji ESS</span>
                          <span>
                            {activeDetailPeriod.disbursementStatus ===
                            "Telah Dicairkan"
                              ? "Tersedia"
                              : "Menunggu pencairan"}
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className={styles.drawerNotice} role="status">
                    Rincian nominal <strong>Gaji Bruto → Potongan → Gaji Bersih</strong>{" "}
                    dibatasi untuk peran <strong>HR, Keuangan, Akuntansi, dan Auditor</strong>.
                  </div>
                )}

                {/* Status terpisah: Persetujuan, Pencairan, Posting Jurnal */}
                <div className={styles.statusTrioGrid}>
                  <div className={styles.statusCard}>
                    <div className={styles.statusCardTop}>
                      <span className={styles.statusCardLabel}>Persetujuan</span>
                      <SubStageStatusPill
                        status={activeDetailPeriod.approvalStatus}
                      />
                    </div>
                    <span className={styles.statusCardHint}>
                      Otorisasi berjenjang atas rekap gaji &amp; potongan pajak.
                    </span>
                  </div>

                  <div className={styles.statusCard}>
                    <div className={styles.statusCardTop}>
                      <span className={styles.statusCardLabel}>Pencairan</span>
                      <SubStageStatusPill
                        status={activeDetailPeriod.disbursementStatus}
                      />
                    </div>
                    <span className={styles.statusCardHint}>
                      Transfer bank oleh Treasury &amp; rilis slip gaji ESS.
                    </span>
                  </div>

                  <div className={styles.statusCard}>
                    <div className={styles.statusCardTop}>
                      <span className={styles.statusCardLabel}>
                        Posting Jurnal
                      </span>
                      <SubStageStatusPill
                        status={activeDetailPeriod.journalPostingStatus}
                      />
                    </div>
                    <span className={styles.statusCardHint}>
                      {activeDetailPeriod.journalNumber
                        ? `Terposting ke Buku Besar (${activeDetailPeriod.journalNumber})`
                        : "Pencatatan beban gaji & liabilitas PPh 21/BPJS ke GL."}
                    </span>
                  </div>
                </div>

                {/* Linimasa Penggajian */}
                <div>
                  <h3
                    className={styles.cardTitle}
                    style={{ fontSize: 15, marginBottom: 10 }}
                  >
                    Linimasa Proses Penggajian
                  </h3>
                  <ol className={styles.timelineList}>
                    {activeDetailPeriod.timeline.map((step, index) => (
                      <li
                        key={step.id}
                        className={`${styles.timelineStep} ${
                          step.status === "current"
                            ? styles.timelineStepCurrent
                            : step.status === "done"
                              ? styles.timelineStepDone
                              : ""
                        }`}
                      >
                        <div className={styles.timelineStepHeader}>
                          <span className={styles.timelineStepTitle}>
                            {index + 1}. {step.title}
                          </span>
                        </div>
                        <span className={styles.timelineStepActor}>
                          {step.actorLabel}
                        </span>
                        <span className={styles.timelineStepTime}>
                          {step.timestampLabel}
                        </span>
                        <span className={styles.timelineStepNote}>
                          {step.note}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Integrasi Buku Besar (GL) */}
                <div className={styles.journalBanner}>
                  <div className={styles.journalBannerInfo}>
                    <span className={styles.journalBannerTitle}>
                      {activeDetailPeriod.journalNumber
                        ? `Jurnal Buku Besar ${activeDetailPeriod.journalNumber} Telah Diposting`
                        : "Integrasi Jurnal Buku Besar (General Ledger)"}
                    </span>
                    <span className={styles.journalBannerSub}>
                      {activeDetailPeriod.journalNumber
                        ? `Diposting pada ${activeDetailPeriod.journalPostedDate ?? "—"} · Total seimbang ${
                            canSeeAmounts
                              ? formatRupiahFull(detailTotalDebit)
                              : "Terbatas"
                          }`
                        : `Draf jurnal penggajian seimbang (${
                            canSeeAmounts
                              ? formatRupiahFull(detailTotalDebit)
                              : "Terbatas"
                          }) siap diposting setelah pencairan selesai.`}
                    </span>
                  </div>

                  {activeDetailPeriod.journalNumber && canSeeGl ? (
                    <Link
                      href={`/finance/journals?search=${encodeURIComponent(activeDetailPeriod.journalNumber)}`}
                      className={styles.secondaryButton}
                    >
                      Buka Jurnal di Buku Besar
                    </Link>
                  ) : !canSeeGl ? (
                    <span className={styles.cellNote}>
                      Akses Buku Besar hanya untuk Akuntansi, FAM &amp; Auditor
                    </span>
                  ) : null}
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {/* Drawers */}
      <CreateEmployeeDrawer
        open={createEmployeeOpen}
        onOpenChange={setCreateEmployeeOpen}
        user={user}
        onCreateEmployee={handleCreateEmployee}
      />

      <EmployeeDetailDrawer
        employee={selectedEmployee}
        onOpenChange={(open) => {
          if (!open) setSelectedEmployeeId(null);
        }}
        user={user}
        onCompleteEmployeeData={handleCompleteEmployeeData}
      />

      <AttendanceReviewDrawer
        record={selectedAttendance}
        onOpenChange={(open) => {
          if (!open) setSelectedAttendanceId(null);
        }}
        user={user}
        onVerifyAttendance={handleVerifyAttendance}
      />

      <KpiReviewDrawer
        evaluation={selectedKpi}
        employeeBaseSalary={selectedKpiEmployee?.baseSalary ?? 0}
        onOpenChange={(open) => {
          if (!open) setSelectedKpiId(null);
        }}
        user={user}
        onApproveKpi={handleApproveKpi}
      />

      <PayPeriodActionDrawer
        period={drawerPeriod}
        onOpenChange={(open) => {
          if (!open) setActionDrawerPeriodId(null);
        }}
        user={user}
        onAdvancePeriod={handleAdvancePeriod}
      />
    </section>
  );
}
