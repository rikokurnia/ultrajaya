"use client";

import { useId } from "react";
import {
  formatRupiahFull,
  type AttendanceRecord,
  type EmployeeRecord,
  type PayPeriodRecord,
  type PayrollPeriodKey,
  type PayrollTrendPoint,
} from "./data";
import styles from "./penggajian.module.css";

export function NetPayTrendChart({
  series,
  selectedPeriodKey,
  activePeriod,
  canViewAmounts,
}: {
  series: readonly PayrollTrendPoint[];
  selectedPeriodKey: PayrollPeriodKey;
  activePeriod: PayPeriodRecord;
  canViewAmounts: boolean;
}) {
  const gradientId = useId();
  const width = 640;
  const height = 224;
  const padLeft = 92;
  const padRight = 32;
  const padTop = 26;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const maxY = 2000;
  const yTicks = [0, 500, 1000, 1500, 2000];

  if (!canViewAmounts) {
    return (
      <div className={styles.drawerNotice} role="status">
        Grafik nominal <strong>Tren Gaji Bersih per Periode</strong> dibatasi
        untuk peran <strong>HR, Keuangan, Akuntansi, dan Auditor</strong>.
        Jumlah personel pada periode {activePeriod.name}:{" "}
        <strong>{activePeriod.employeeCount} karyawan</strong>.
      </div>
    );
  }

  const xFor = (idx: number) =>
    series.length <= 1
      ? padLeft + plotW / 2
      : padLeft + (idx / (series.length - 1)) * plotW;

  const yFor = (val: number) =>
    padTop + plotH - Math.min(1, Math.max(0, val / maxY)) * plotH;

  const grossPoints = series.map((pt, idx) => ({
    x: xFor(idx),
    y: yFor(pt.grossMillions),
    val: pt.grossMillions,
    label: pt.label,
    periodKey: pt.periodKey,
  }));

  const netPoints = series.map((pt, idx) => ({
    x: xFor(idx),
    y: yFor(pt.netMillions),
    val: pt.netMillions,
    label: pt.label,
    periodKey: pt.periodKey,
  }));

  const grossLine = grossPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const netLine = netPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    netPoints.length > 0
      ? `${netLine} L ${netPoints[netPoints.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${netPoints[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : "";

  return (
    <div className={styles.chartBox}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={styles.chartSvg}
        role="img"
        aria-label={`Grafik tren gaji bersih dan gaji bruto per periode dalam jutaan Rupiah`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0061ff" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0061ff" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = yFor(tick);
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke={tick === 0 ? "#cbd8ee" : "#e4ecf8"}
                strokeWidth="1"
              />
              <text
                x={padLeft - 12}
                y={y + 4}
                textAnchor="end"
                fontSize="12"
                fill="#36476a"
                fontWeight="500"
              >
                {`Rp${tick.toLocaleString("id-ID")} jt`}
              </text>
            </g>
          );
        })}

        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

        <path
          d={grossLine}
          fill="none"
          stroke="#0c9b6b"
          strokeWidth="2.2"
          strokeDasharray="4 3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <path
          d={netLine}
          fill="none"
          stroke="#0057eb"
          strokeWidth="2.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {grossPoints.map((pt) => (
          <g key={`gross-${pt.periodKey}`}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r="4.5"
              fill="#ffffff"
              stroke="#0c9b6b"
              strokeWidth="2.2"
            >
              <title>{`${pt.label} — Gaji Bruto: Rp${pt.val.toLocaleString("id-ID")} juta`}</title>
            </circle>
            <text
              x={pt.x}
              y={pt.y - 10}
              textAnchor="middle"
              fontSize="11.5"
              fontWeight="600"
              fill="#0a855c"
            >
              {pt.val.toLocaleString("id-ID")}
            </text>
          </g>
        ))}

        {netPoints.map((pt) => {
          const isSelected = pt.periodKey === selectedPeriodKey;
          return (
            <g key={`net-${pt.periodKey}`}>
              {isSelected && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="9"
                  fill="#0061ff22"
                />
              )}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isSelected ? "5.5" : "4.8"}
                fill={isSelected ? "#0057eb" : "#ffffff"}
                stroke="#0057eb"
                strokeWidth="2.6"
              >
                <title>{`${pt.label} — Gaji Bersih: Rp${pt.val.toLocaleString("id-ID")} juta`}</title>
              </circle>
              <text
                x={pt.x}
                y={pt.y + 20}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="#004ad6"
              >
                {pt.val.toLocaleString("id-ID")}
              </text>
            </g>
          );
        })}

        {series.map((pt, idx) => {
          const isSelected = pt.periodKey === selectedPeriodKey;
          return (
            <text
              key={pt.periodKey}
              x={xFor(idx)}
              y={height - 8}
              textAnchor="middle"
              fontSize="12"
              fill={isSelected ? "#0057eb" : "#20345c"}
              fontWeight={isSelected ? "700" : "500"}
            >
              {pt.label}
            </text>
          );
        })}
      </svg>

      <div className={styles.chartLegend}>
        <span className={styles.legendItem}>
          <span className={styles.legendDotBlue} aria-hidden />
          Gaji Bersih (Rp juta)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDotGreen} aria-hidden />
          Gaji Bruto (Rp juta)
        </span>
      </div>

      <div className={styles.chartSummaryStrip}>
        <div className={styles.chartSummaryItem}>
          <span>Gaji Bruto ({activePeriod.name})</span>
          <strong>{formatRupiahFull(activePeriod.grossPay)}</strong>
        </div>
        <div className={styles.chartSummaryItem}>
          <span>Potongan Pajak &amp; BPJS</span>
          <strong>-{formatRupiahFull(activePeriod.totalDeductions)}</strong>
        </div>
        <div className={styles.chartSummaryItem}>
          <span>Total Gaji Bersih</span>
          <strong>{formatRupiahFull(activePeriod.netPay)}</strong>
        </div>
      </div>
    </div>
  );
}

export function EmployeeReadinessSummary({
  employees,
}: {
  employees: readonly EmployeeRecord[];
}) {
  const total = employees.length;
  const readyCount = employees.filter(
    (e) => e.readinessStatus === "Siap Diproses",
  ).length;
  const incompleteCount = total - readyCount;
  const readyPct = total > 0 ? Math.round((readyCount / total) * 100) : 0;

  const bankReadyCount = employees.filter((e) =>
    Boolean(e.bankAccountNumber.trim()),
  ).length;
  const bpjsReadyCount = employees.filter(
    (e) =>
      Boolean(e.bpjsKesehatanNumber.trim()) &&
      Boolean(e.bpjsKetenagakerjaanNumber.trim()),
  ).length;
  const npwpReadyCount = employees.filter((e) =>
    Boolean(e.npwpNumber.trim()),
  ).length;

  return (
    <>
      <div className={styles.kpiGrid}>
        <article className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Siap Diproses</span>
          <strong className={styles.kpiValue}>
            {readyCount} karyawan
          </strong>
          <span className={styles.kpiHint}>
            {readyPct}% data induk, bank, NPWP &amp; BPJS lengkap
          </span>
        </article>
        <article className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Data Belum Lengkap</span>
          <strong className={styles.kpiValue}>
            {incompleteCount} karyawan
          </strong>
          <span className={styles.kpiHint}>
            {incompleteCount > 0
              ? "Perlu dilengkapi sebelum penutupan draf gaji"
              : "Seluruh data penggajian karyawan telah lengkap"}
          </span>
        </article>
        <article className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total Sampel Direktori Aktif</span>
          <strong className={styles.kpiValue}>{total} karyawan</strong>
          <span className={styles.kpiHint}>
            Mencakup pegawai tetap, kontrak, dan masa percobaan
          </span>
        </article>
      </div>

      <section className={styles.readinessCard}>
        <div className={styles.readinessTop}>
          <h2 className={styles.cardTitle}>
            Indikator Kesiapan Data Penggajian
          </h2>
          <div className={styles.readinessStats}>
            <span className={styles.readinessStatItem}>
              <span className={`${styles.pill} ${styles.pillSuccess}`}>
                Siap Diproses: {readyCount}
              </span>
            </span>
            <span className={styles.readinessStatItem}>
              <span
                className={`${styles.pill} ${
                  incompleteCount > 0 ? styles.pillWarning : styles.pillNeutral
                }`}
              >
                Data Belum Lengkap: {incompleteCount}
              </span>
            </span>
          </div>
        </div>

        <div
          className={styles.readinessBarTrack}
          role="progressbar"
          aria-label={`Kesiapan data penggajian: ${readyCount} dari ${total} karyawan siap diproses (${readyPct}%)`}
          aria-valuenow={readyCount}
          aria-valuemin={0}
          aria-valuemax={total}
        >
          <div
            className={styles.readinessBarFillReady}
            style={{ width: `${readyPct}%` }}
          />
        </div>

        <div className={styles.readinessMetaRow}>
          <span>
            Rekening Bank Terverifikasi:{" "}
            <strong>
              {bankReadyCount}/{total}
            </strong>
          </span>
          <span>
            Kepesertaan BPJS Kesehatan &amp; TK:{" "}
            <strong>
              {bpjsReadyCount}/{total}
            </strong>
          </span>
          <span>
            NPWP &amp; Status PTKP:{" "}
            <strong>
              {npwpReadyCount}/{total}
            </strong>
          </span>
        </div>
      </section>
    </>
  );
}

export function AttendanceOvertimeBreakdown({
  records,
  periodLabel,
}: {
  records: readonly AttendanceRecord[];
  periodLabel: string;
}) {
  const totalRegularHours = records.reduce((acc, r) => acc + r.hoursWorked, 0);
  const totalOvertimeHours = records.reduce(
    (acc, r) => acc + r.overtimeHours,
    0,
  );
  const pendingCorrectionCount = records.filter(
    (r) => r.correctionStatus !== "Terverifikasi",
  ).length;

  // Group by department
  const deptMap = new Map<
    string,
    { regular: number; overtime: number; needsReview: boolean }
  >();
  for (const rec of records) {
    const cur = deptMap.get(rec.department) ?? {
      regular: 0,
      overtime: 0,
      needsReview: false,
    };
    cur.regular += rec.hoursWorked;
    cur.overtime += rec.overtimeHours;
    if (rec.correctionStatus !== "Terverifikasi") {
      cur.needsReview = true;
    }
    deptMap.set(rec.department, cur);
  }

  const departments = Array.from(deptMap.entries()).map(([name, stats]) => ({
    name,
    ...stats,
    total: stats.regular + stats.overtime,
  }));

  const maxDeptHours = Math.max(1, ...departments.map((d) => d.total));

  return (
    <>
      <div className={styles.kpiGrid}>
        <article className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Jam Kerja Reguler Terdata</span>
          <strong className={styles.kpiValue}>
            {totalRegularHours.toLocaleString("id-ID")} jam
          </strong>
          <span className={styles.kpiHint}>
            Rekap presensi periode {periodLabel} ({records.length} catatan)
          </span>
        </article>
        <article className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total Jam Lembur (SPKL)</span>
          <strong className={styles.kpiValue}>
            {totalOvertimeHours.toLocaleString("id-ID")} jam
          </strong>
          <span className={styles.kpiHint}>
            Dasar perhitungan komponen upah lembur pada gaji bruto
          </span>
        </article>
        <article className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Status Koreksi &amp; Verifikasi</span>
          <strong className={styles.kpiValue}>
            {pendingCorrectionCount === 0
              ? "Semua Valid"
              : `${pendingCorrectionCount} perlu tinjauan`}
          </strong>
          <span className={styles.kpiHint}>
            {pendingCorrectionCount === 0
              ? "Siap diintegrasikan ke perhitungan gaji"
              : "Menunggu verifikasi atasan / HRD (UC-07)"}
          </span>
        </article>
      </div>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderStack}>
            <h2 className={styles.cardTitle}>
              Rincian Jam Kerja &amp; Lembur per Departemen
            </h2>
            <p className={styles.cardSubtitle}>
              Warna kuning menandakan departemen dengan catatan presensi/SPKL
              yang masih memerlukan tinjauan koreksi.
            </p>
          </div>
        </div>
        {departments.length === 0 ? (
          <p className={styles.emptyRow}>
            Belum ada rincian jam kerja untuk periode ini.
          </p>
        ) : (
          <div className={styles.breakdownList}>
            {departments.map((dept) => {
              const pct = Math.max(
                8,
                Math.round((dept.total / maxDeptHours) * 100),
              );
              return (
                <div className={styles.breakdownRow} key={dept.name}>
                  <span className={styles.breakdownLabel}>{dept.name}</span>
                  <div
                    className={styles.breakdownTrack}
                    role="progressbar"
                    aria-label={`${dept.name}: ${dept.regular} jam kerja, ${dept.overtime} jam lembur`}
                    aria-valuenow={dept.total}
                    aria-valuemin={0}
                    aria-valuemax={maxDeptHours}
                  >
                    <div
                      className={
                        dept.needsReview
                          ? styles.breakdownFillAttention
                          : styles.breakdownFillRegular
                      }
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={styles.breakdownValue}>
                    {dept.regular} jam · +{dept.overtime} jam lembur
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
