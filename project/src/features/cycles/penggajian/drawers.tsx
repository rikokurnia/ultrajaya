"use client";

import { useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { User } from "@/shared/contracts/auth";
import {
  actionLabelForPayPeriodStage,
  calculateKpiIncentiveAmount,
  canExecutePayPeriodAction,
  canManageEmployees,
  canReadGeneralLedger,
  canReviewAttendance,
  canReviewKpi,
  canViewFullBankDetails,
  canViewIndividualCompensation,
  canViewPayrollAmounts,
  formatBankAccountForActor,
  formatRupiahFull,
  type AttendanceCorrectionStatus,
  type AttendanceRecord,
  type EmployeeRecord,
  type EmploymentType,
  type KpiEvaluationRecord,
  type KpiReviewStatus,
  type OnboardingStatus,
  type PayPeriodRecord,
  type PayPeriodStage,
  type ReadinessStatus,
  type SubStageStatus,
  type TaskQueueStatus,
} from "./data";
import styles from "./penggajian.module.css";

function DrawerShell({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="drawer"
          style={{ overscrollBehavior: "contain" }}
        >
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
          <Dialog.Close
            className="icon-button drawer-close"
            aria-label="Tutup panel"
          >
            <X size={20} />
          </Dialog.Close>
          <div className="drawer-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function TaskStatusPill({ status }: { status: TaskQueueStatus }) {
  const cls =
    status === "Perlu ditinjau" || status === "Menunggu persetujuan"
      ? styles.pillWarning
      : status === "Sedang berjalan"
        ? styles.pillInfo
        : status === "Selesai"
          ? styles.pillSuccess
          : styles.pillNeutral;
  return <span className={`${styles.pill} ${cls}`}>{status}</span>;
}

export function OnboardingStatusPill({ status }: { status: OnboardingStatus }) {
  const cls =
    status === "Selesai Onboarding"
      ? styles.pillSuccess
      : status === "Verifikasi Dokumen"
        ? styles.pillWarning
        : styles.pillInfo;
  return <span className={`${styles.pill} ${cls}`}>{status}</span>;
}

export function ReadinessStatusPill({ status }: { status: ReadinessStatus }) {
  const cls =
    status === "Siap Diproses" ? styles.pillSuccess : styles.pillWarning;
  return <span className={`${styles.pill} ${cls}`}>{status}</span>;
}

export function AttendanceStatusPill({
  status,
}: {
  status: AttendanceCorrectionStatus;
}) {
  const cls =
    status === "Terverifikasi"
      ? styles.pillSuccess
      : status === "Perlu Koreksi"
        ? styles.pillDanger
        : styles.pillWarning;
  return <span className={`${styles.pill} ${cls}`}>{status}</span>;
}

export function KpiStatusPill({ status }: { status: KpiReviewStatus }) {
  const cls = status === "Disahkan" ? styles.pillSuccess : styles.pillWarning;
  return <span className={`${styles.pill} ${cls}`}>{status}</span>;
}

export function PayPeriodStagePill({ stage }: { stage: PayPeriodStage }) {
  const cls =
    stage === "Selesai"
      ? styles.pillSuccess
      : stage === "Menunggu Pencairan"
        ? styles.pillInfo
        : stage === "Menunggu Posting Jurnal"
          ? styles.pillDanger
          : styles.pillWarning;
  return <span className={`${styles.pill} ${cls}`}>{stage}</span>;
}

export function SubStageStatusPill({ status }: { status: SubStageStatus }) {
  const cls =
    status === "Disetujui" ||
    status === "Telah Dicairkan" ||
    status === "Terposting"
      ? styles.pillSuccess
      : status === "Menunggu"
        ? styles.pillWarning
        : status === "Perlu Tindak Lanjut"
          ? styles.pillDanger
          : styles.pillNeutral;
  return <span className={`${styles.pill} ${cls}`}>{status}</span>;
}

export function CreateEmployeeDrawer({
  open,
  onOpenChange,
  user,
  onCreateEmployee,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onCreateEmployee: (input: {
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
  }) => void;
}) {
  const canManage = canManageEmployees(user);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("Produksi UHT");
  const [roleTitle, setRoleTitle] = useState("Operator Proses UHT");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("Tetap");
  const [baseSalaryInput, setBaseSalaryInput] = useState("7000000");
  const [fixedAllowanceInput, setFixedAllowanceInput] = useState("1400000");
  const [bankName, setBankName] = useState("BCA");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [npwpNumber, setNpwpNumber] = useState("");
  const [ptkpStatus, setPtkpStatus] = useState("TK/0");
  const [bpjsKesehatanNumber, setBpjsKesehatanNumber] = useState("");
  const [bpjsKetenagakerjaanNumber, setBpjsKetenagakerjaanNumber] =
    useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    if (!name.trim()) {
      setError("Masukkan nama lengkap karyawan.");
      return;
    }
    if (!roleTitle.trim()) {
      setError("Masukkan jabatan karyawan.");
      return;
    }
    const baseSalary = Number(baseSalaryInput.replaceAll(/[^0-9]/g, ""));
    const fixedAllowance = Number(
      fixedAllowanceInput.replaceAll(/[^0-9]/g, ""),
    );
    if (!Number.isFinite(baseSalary) || baseSalary <= 0) {
      setError("Masukkan gaji pokok yang valid.");
      return;
    }
    setError(null);
    onCreateEmployee({
      name: name.trim(),
      department,
      roleTitle: roleTitle.trim(),
      employmentType,
      baseSalary,
      fixedAllowance: Number.isFinite(fixedAllowance) ? fixedAllowance : 0,
      bankName,
      bankAccountNumber: bankAccountNumber.trim(),
      npwpNumber: npwpNumber.trim(),
      ptkpStatus,
      bpjsKesehatanNumber: bpjsKesehatanNumber.trim(),
      bpjsKetenagakerjaanNumber: bpjsKetenagakerjaanNumber.trim(),
    });
    setName("");
    setBankAccountNumber("");
    setNpwpNumber("");
    setBpjsKesehatanNumber("");
    setBpjsKetenagakerjaanNumber("");
    onOpenChange(false);
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Tambah Karyawan"
      description="Pendaftaran data induk karyawan baru untuk integrasi absensi dan penggajian."
    >
      <div className={styles.drawerStack}>
        {!canManage && (
          <div className={styles.drawerNotice} role="status">
            Penambahan data induk karyawan diotorisasi untuk peran{" "}
            <strong>HR / Administrasi Kepegawaian &amp; Keuangan</strong>.
          </div>
        )}
        <form onSubmit={handleSubmit} className={styles.drawerForm}>
          <label>
            Nama Lengkap Karyawan
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Fajar Nugroho"
              disabled={!canManage}
              required
            />
          </label>
          <div className={styles.metaGrid}>
            <label>
              Departemen
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={!canManage}
              >
                <option value="Produksi UHT">Produksi UHT</option>
                <option value="Quality Control">Quality Control</option>
                <option value="Gudang & Logistik">Gudang &amp; Logistik</option>
                <option value="Teknik & Utilitas">Teknik &amp; Utilitas</option>
                <option value="Keuangan & Akuntansi">
                  Keuangan &amp; Akuntansi
                </option>
                <option value="HR & Umum">HR &amp; Umum</option>
              </select>
            </label>
            <label>
              Status Kerja
              <select
                value={employmentType}
                onChange={(e) =>
                  setEmploymentType(e.target.value as EmploymentType)
                }
                disabled={!canManage}
              >
                <option value="Tetap">Tetap</option>
                <option value="Kontrak">Kontrak</option>
                <option value="Masa Percobaan">Masa Percobaan</option>
              </select>
            </label>
          </div>
          <label>
            Jabatan
            <input
              type="text"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              disabled={!canManage}
              required
            />
          </label>
          <div className={styles.metaGrid}>
            <label>
              Gaji Pokok (Rp)
              <input
                type="number"
                min={1000000}
                step={100000}
                value={baseSalaryInput}
                onChange={(e) => setBaseSalaryInput(e.target.value)}
                disabled={!canManage}
                required
              />
            </label>
            <label>
              Tunjangan Tetap (Rp)
              <input
                type="number"
                min={0}
                step={50000}
                value={fixedAllowanceInput}
                onChange={(e) => setFixedAllowanceInput(e.target.value)}
                disabled={!canManage}
              />
            </label>
          </div>
          <div className={styles.metaGrid}>
            <label>
              Bank Penggajian
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                disabled={!canManage}
              >
                <option value="BCA">BCA</option>
                <option value="Bank Mandiri">Bank Mandiri</option>
                <option value="BNI">BNI</option>
                <option value="BRI">BRI</option>
              </select>
            </label>
            <label>
              Nomor Rekening (opsional saat orientasi)
              <input
                type="text"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="Kosongkan jika belum ada"
                disabled={!canManage}
              />
            </label>
          </div>
          <div className={styles.metaGrid}>
            <label>
              Nomor NPWP (opsional saat orientasi)
              <input
                type="text"
                value={npwpNumber}
                onChange={(e) => setNpwpNumber(e.target.value)}
                placeholder="00.000.000.0-000.000"
                disabled={!canManage}
              />
            </label>
            <label>
              Status PTKP
              <select
                value={ptkpStatus}
                onChange={(e) => setPtkpStatus(e.target.value)}
                disabled={!canManage}
              >
                <option value="TK/0">TK/0</option>
                <option value="K/0">K/0</option>
                <option value="K/1">K/1</option>
                <option value="K/2">K/2</option>
                <option value="K/3">K/3</option>
              </select>
            </label>
          </div>
          <div className={styles.metaGrid}>
            <label>
              No. BPJS Kesehatan
              <input
                type="text"
                value={bpjsKesehatanNumber}
                onChange={(e) => setBpjsKesehatanNumber(e.target.value)}
                placeholder="000xxxxxxxxxx"
                disabled={!canManage}
              />
            </label>
            <label>
              No. BPJS Ketenagakerjaan
              <input
                type="text"
                value={bpjsKetenagakerjaanNumber}
                onChange={(e) => setBpjsKetenagakerjaanNumber(e.target.value)}
                placeholder="26xxxxxxxxx"
                disabled={!canManage}
              />
            </label>
          </div>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <div className={styles.drawerActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => onOpenChange(false)}
            >
              Tutup
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={!canManage}
            >
              Simpan Karyawan
            </button>
          </div>
        </form>
      </div>
    </DrawerShell>
  );
}

export function EmployeeDetailDrawer({
  employee,
  onOpenChange,
  user,
  onCompleteEmployeeData,
}: {
  employee: EmployeeRecord | null;
  onOpenChange: (open: boolean) => void;
  user: User;
  onCompleteEmployeeData: (
    employeeId: string,
    updates: {
      bankName: string;
      bankAccountNumber: string;
      npwpNumber: string;
      bpjsKesehatanNumber: string;
      bpjsKetenagakerjaanNumber: string;
    },
  ) => void;
}) {
  const [bankName, setBankName] = useState("BCA");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [npwpNumber, setNpwpNumber] = useState("");
  const [bpjsKesehatanNumber, setBpjsKesehatanNumber] = useState("");
  const [bpjsKetenagakerjaanNumber, setBpjsKetenagakerjaanNumber] =
    useState("");
  const [prevEmpId, setPrevEmpId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (employee && employee.id !== prevEmpId) {
    setPrevEmpId(employee.id);
    setBankName(employee.bankName || "BCA");
    setBankAccountNumber(employee.bankAccountNumber || "0089410284");
    setNpwpNumber(employee.npwpNumber || "81.204.519.2-421.000");
    setBpjsKesehatanNumber(employee.bpjsKesehatanNumber || "0002918472615");
    setBpjsKetenagakerjaanNumber(
      employee.bpjsKetenagakerjaanNumber || "26119482715",
    );
    setError(null);
  }

  if (!employee) return null;

  const canManage = canManageEmployees(user);
  const canSeeComp = canViewIndividualCompensation(user);
  const canSeeFullBank = canViewFullBankDetails(user);
  const needsCompletion = employee.readinessStatus === "Data Belum Lengkap";

  function handleCompleteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employee || !canManage || !canSeeFullBank) return;
    if (
      !bankAccountNumber.trim() ||
      !npwpNumber.trim() ||
      !bpjsKesehatanNumber.trim() ||
      !bpjsKetenagakerjaanNumber.trim()
    ) {
      setError(
        "Lengkapi nomor rekening bank, NPWP, BPJS Kesehatan, dan BPJS Ketenagakerjaan.",
      );
      return;
    }
    setError(null);
    onCompleteEmployeeData(employee.id, {
      bankName,
      bankAccountNumber: bankAccountNumber.trim(),
      npwpNumber: npwpNumber.trim(),
      bpjsKesehatanNumber: bpjsKesehatanNumber.trim(),
      bpjsKetenagakerjaanNumber: bpjsKetenagakerjaanNumber.trim(),
    });
    onOpenChange(false);
  }

  return (
    <DrawerShell
      open={!!employee}
      onOpenChange={onOpenChange}
      title={`${employee.code} — ${employee.name}`}
      description={`${employee.roleTitle} · Departemen ${employee.department}`}
    >
      <div className={styles.drawerStack}>
        <div className={styles.drawerSection}>
          <div className={styles.drawerSectionTop}>
            <h3>Profil &amp; Status Onboarding</h3>
            <ReadinessStatusPill status={employee.readinessStatus} />
          </div>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span>ID Karyawan</span>
              <strong>{employee.code}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Status Onboarding</span>
              <div>
                <OnboardingStatusPill status={employee.onboardingStatus} />
              </div>
            </div>
            <div className={styles.metaItem}>
              <span>Departemen</span>
              <strong>{employee.department}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Status Kerja &amp; Tanggal Masuk</span>
              <strong>
                {employee.employmentType} · {employee.joinDateLabel}
              </strong>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#36476a" }}>
            {employee.missingDataNote}
          </p>
        </div>

        <div className={styles.drawerSection}>
          <h3>Kompensasi Individu</h3>
          {canSeeComp ? (
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span>Gaji Pokok Bulanan</span>
                <strong>{formatRupiahFull(employee.baseSalary)}</strong>
              </div>
              <div className={styles.metaItem}>
                <span>Tunjangan Tetap</span>
                <strong>{formatRupiahFull(employee.fixedAllowance)}</strong>
              </div>
              <div className={styles.metaItem}>
                <span>Tarif Lembur (SPKL)</span>
                <strong>
                  {employee.overtimeRatePerHour > 0
                    ? `${formatRupiahFull(employee.overtimeRatePerHour)} / jam`
                    : "Jabatan non-lembur"}
                </strong>
              </div>
              <div className={styles.metaItem}>
                <span>Skema Insentif Kinerja (KPI)</span>
                <strong>
                  {employee.kpiIncentiveEligible
                    ? "Aktif (mengikuti pengesahan KPI)"
                    : "Kompensasi tetap bulanan"}
                </strong>
              </div>
            </div>
          ) : (
            <div className={styles.drawerNotice} role="status">
              Rincian nominal kompensasi individu dibatasi untuk peran{" "}
              <strong>HR, Keuangan, Akuntansi, dan Pejabat Penyetuju</strong>.
            </div>
          )}
        </div>

        <div className={styles.drawerSection}>
          <h3>Rekening Bank, Pajak &amp; Kepesertaan BPJS</h3>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span>Rekening Pencairan Gaji</span>
              <strong>
                {formatBankAccountForActor(
                  user,
                  employee.bankName,
                  employee.bankAccountNumber,
                )}
              </strong>
            </div>
            <div className={styles.metaItem}>
              <span>NPWP &amp; Status PTKP</span>
              <strong>
                {canSeeComp
                  ? `${employee.npwpNumber || "Belum diisi"} (${employee.ptkpStatus})`
                  : "Terbatas"}
              </strong>
            </div>
            <div className={styles.metaItem}>
              <span>BPJS Kesehatan</span>
              <strong>
                {canSeeComp
                  ? employee.bpjsKesehatanNumber || "Belum terdaftar"
                  : "Terbatas"}
              </strong>
            </div>
            <div className={styles.metaItem}>
              <span>BPJS Ketenagakerjaan</span>
              <strong>
                {canSeeComp
                  ? employee.bpjsKetenagakerjaanNumber || "Belum terdaftar"
                  : "Terbatas"}
              </strong>
            </div>
          </div>
          {!canSeeFullBank && (
            <p style={{ margin: 0, fontSize: 12.5, color: "#46597d" }}>
              Nomor rekening individual memerlukan tugas akses rekening yang
              ditetapkan secara eksplisit.
            </p>
          )}
        </div>

        {needsCompletion && canSeeFullBank ? (
          <form onSubmit={handleCompleteSubmit} className={styles.drawerForm}>
            <div className={styles.drawerWarning} role="status">
              <strong>Lengkapi Data Penggajian:</strong> Karyawan ini belum siap
              diproses dalam penutupan gaji. Lengkapi data di bawah ini untuk
              mengubah kesiapan menjadi <strong>Siap Diproses</strong>.
            </div>
            {!canManage && (
              <div className={styles.drawerNotice} role="status">
                Peran Anda saat ini hanya-baca untuk perubahan data induk
                karyawan.
              </div>
            )}
            <div className={styles.metaGrid}>
              <label>
                Bank Penggajian
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  disabled={!canManage}
                >
                  <option value="BCA">BCA</option>
                  <option value="Bank Mandiri">Bank Mandiri</option>
                  <option value="BNI">BNI</option>
                  <option value="BRI">BRI</option>
                </select>
              </label>
              <label>
                Nomor Rekening Bank
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  disabled={!canManage}
                  required
                />
              </label>
            </div>
            <label>
              Nomor NPWP
              <input
                type="text"
                value={npwpNumber}
                onChange={(e) => setNpwpNumber(e.target.value)}
                disabled={!canManage}
                required
              />
            </label>
            <div className={styles.metaGrid}>
              <label>
                Nomor BPJS Kesehatan
                <input
                  type="text"
                  value={bpjsKesehatanNumber}
                  onChange={(e) => setBpjsKesehatanNumber(e.target.value)}
                  disabled={!canManage}
                  required
                />
              </label>
              <label>
                Nomor BPJS Ketenagakerjaan
                <input
                  type="text"
                  value={bpjsKetenagakerjaanNumber}
                  onChange={(e) => setBpjsKetenagakerjaanNumber(e.target.value)}
                  disabled={!canManage}
                  required
                />
              </label>
            </div>
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <div className={styles.drawerActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => onOpenChange(false)}
              >
                Tutup
              </button>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={!canManage}
              >
                Simpan &amp; Tandai Siap Diproses
              </button>
            </div>
          </form>
        ) : (
          <div className={styles.drawerActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => onOpenChange(false)}
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </DrawerShell>
  );
}

export function AttendanceReviewDrawer({
  record,
  onOpenChange,
  user,
  onVerifyAttendance,
}: {
  record: AttendanceRecord | null;
  onOpenChange: (open: boolean) => void;
  user: User;
  onVerifyAttendance: (
    recordId: string,
    hoursWorked: number,
    overtimeHours: number,
    note: string,
  ) => void;
}) {
  const [hoursInput, setHoursInput] = useState("168");
  const [overtimeInput, setOvertimeInput] = useState("12");
  const [resolutionNote, setResolutionNote] = useState("");
  const [prevId, setPrevId] = useState<string | null>(null);

  if (record && record.id !== prevId) {
    setPrevId(record.id);
    setHoursInput(String(record.hoursWorked));
    setOvertimeInput(String(record.overtimeHours));
    setResolutionNote(
      "Log mesin presensi dan SPKL telah dicocokkan oleh Supervisor & HRD; dinyatakan valid untuk penggajian.",
    );
  }

  if (!record) return null;

  const canReview = canReviewAttendance(user);
  const needsReview = record.correctionStatus !== "Terverifikasi";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!record || !canReview) return;
    const hw = Math.max(0, Number(hoursInput) || record.hoursWorked);
    const ot = Math.max(0, Number(overtimeInput) || record.overtimeHours);
    onVerifyAttendance(
      record.id,
      hw,
      ot,
      resolutionNote.trim() || record.anomalyNote,
    );
    onOpenChange(false);
  }

  return (
    <DrawerShell
      open={!!record}
      onOpenChange={onOpenChange}
      title={`${record.code} — ${record.employeeName}`}
      description={`Rekap Kehadiran & Lembur (${record.employeeCode} · ${record.department})`}
    >
      <div className={styles.drawerStack}>
        <div className={styles.drawerSection}>
          <div className={styles.drawerSectionTop}>
            <h3>Rincian Kehadiran &amp; Lembur</h3>
            <AttendanceStatusPill status={record.correctionStatus} />
          </div>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span>Shift Kerja</span>
              <strong>{record.shiftLabel}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Hari Hadir / Izin</span>
              <strong>
                {record.daysPresent} hari hadir · {record.leaveDays} hari
                izin/cuti
              </strong>
            </div>
            <div className={styles.metaItem}>
              <span>Jam Kerja Reguler</span>
              <strong>{record.hoursWorked} jam</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Jam Lembur &amp; Ref SPKL</span>
              <strong>
                {record.overtimeHours} jam ({record.spklReference})
              </strong>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#36476a" }}>
            <strong>Catatan Verifikasi:</strong> {record.anomalyNote}
          </p>
        </div>

        {needsReview ? (
          <form onSubmit={handleSubmit} className={styles.drawerForm}>
            {!canReview && (
              <div className={styles.drawerNotice} role="status">
                Verifikasi koreksi absensi dan SPKL diotorisasi untuk{" "}
                <strong>Atasan Langsung / Supervisor &amp; HRD</strong>.
              </div>
            )}
            <div className={styles.metaGrid}>
              <label>
                Jam Kerja Terverifikasi
                <input
                  type="number"
                  min={0}
                  max={240}
                  value={hoursInput}
                  onChange={(e) => setHoursInput(e.target.value)}
                  disabled={!canReview}
                  required
                />
              </label>
              <label>
                Jam Lembur (SPKL) Disahkan
                <input
                  type="number"
                  min={0}
                  max={80}
                  value={overtimeInput}
                  onChange={(e) => setOvertimeInput(e.target.value)}
                  disabled={!canReview}
                  required
                />
              </label>
            </div>
            <label>
              Catatan Penyelesaian Koreksi (UC-07)
              <textarea
                rows={2}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                disabled={!canReview}
              />
            </label>
            <div className={styles.drawerActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => onOpenChange(false)}
              >
                Tutup
              </button>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={!canReview}
              >
                Setujui &amp; Verifikasi Absensi
              </button>
            </div>
          </form>
        ) : (
          <div className={styles.drawerActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => onOpenChange(false)}
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </DrawerShell>
  );
}

export function KpiReviewDrawer({
  evaluation,
  employeeBaseSalary,
  onOpenChange,
  user,
  onApproveKpi,
}: {
  evaluation: KpiEvaluationRecord | null;
  employeeBaseSalary: number;
  onOpenChange: (open: boolean) => void;
  user: User;
  onApproveKpi: (
    evaluationId: string,
    score: number,
    evaluatorNote: string,
  ) => void;
}) {
  const [scoreInput, setScoreInput] = useState("86");
  const [noteInput, setNoteInput] = useState("");
  const [prevId, setPrevId] = useState<string | null>(null);

  if (evaluation && evaluation.id !== prevId) {
    setPrevId(evaluation.id);
    setScoreInput(String(evaluation.score));
    setNoteInput(
      "Evaluasi KPI berkala memenuhi standar mutu & output; disahkan HRD untuk integrasi perhitungan insentif penggajian.",
    );
  }

  if (!evaluation) return null;

  const canReview = canReviewKpi(user);
  const canSeeComp = canViewIndividualCompensation(user);
  const needsReview = evaluation.reviewStatus === "Perlu Ditinjau";
  const numericScore = Math.min(
    100,
    Math.max(0, Number(scoreInput) || evaluation.score),
  );

  const projectedIncentive = calculateKpiIncentiveAmount(employeeBaseSalary, {
    incentiveEligible: evaluation.incentiveEligible,
    incentiveRatePct: evaluation.incentiveRatePct,
    reviewStatus: "Disahkan",
    score: numericScore,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!evaluation || !canReview) return;
    onApproveKpi(
      evaluation.id,
      numericScore,
      noteInput.trim() || evaluation.evaluatorNote,
    );
    onOpenChange(false);
  }

  return (
    <DrawerShell
      open={!!evaluation}
      onOpenChange={onOpenChange}
      title={`${evaluation.code} — ${evaluation.employeeName}`}
      description={`Evaluasi Kinerja Berkala (${evaluation.employeeCode} · ${evaluation.roleTitle})`}
    >
      <div className={styles.drawerStack}>
        <div className={styles.drawerSection}>
          <div className={styles.drawerSectionTop}>
            <h3>Capaian Indikator Kinerja Utama</h3>
            <KpiStatusPill status={evaluation.reviewStatus} />
          </div>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span>Indikator Utama</span>
              <strong>{evaluation.keyIndicator}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Realisasi Capaian</span>
              <strong>{evaluation.achievementSummary}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Skor &amp; Predikat</span>
              <strong>
                {evaluation.score} / 100 · {evaluation.gradeLabel}
              </strong>
            </div>
            <div className={styles.metaItem}>
              <span>Dampak pada Perhitungan Gaji</span>
              <strong>
                {!evaluation.incentiveEligible
                  ? "Jabatan kompensasi tetap (tanpa variabel insentif KPI)"
                  : canSeeComp
                    ? `Insentif ${evaluation.incentiveRatePct}% gaji pokok (${formatRupiahFull(projectedIncentive)}) bila disahkan & skor ≥ 80`
                    : `Insentif ${evaluation.incentiveRatePct}% gaji pokok (nominal terbatas)`}
              </strong>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#36476a" }}>
            {evaluation.evaluatorNote}
          </p>
        </div>

        {needsReview ? (
          <form onSubmit={handleSubmit} className={styles.drawerForm}>
            {!canReview && (
              <div className={styles.drawerNotice} role="status">
                Pengesahan evaluasi kinerja berkala (UC-10) diotorisasi untuk{" "}
                <strong>Manajemen Lini &amp; HRD</strong>.
              </div>
            )}
            <label>
              Skor Evaluasi Final (0–100)
              <input
                type="number"
                min={0}
                max={100}
                value={scoreInput}
                onChange={(e) => setScoreInput(e.target.value)}
                disabled={!canReview}
                required
              />
            </label>
            <label>
              Catatan Pengesahan HRD &amp; Manajemen
              <textarea
                rows={2}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                disabled={!canReview}
              />
            </label>
            <div className={styles.drawerActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => onOpenChange(false)}
              >
                Tutup
              </button>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={!canReview}
              >
                Sahkan Evaluasi KPI
              </button>
            </div>
          </form>
        ) : (
          <div className={styles.drawerActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => onOpenChange(false)}
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </DrawerShell>
  );
}

export function PayPeriodActionDrawer({
  period,
  onOpenChange,
  user,
  onAdvancePeriod,
}: {
  period: PayPeriodRecord | null;
  onOpenChange: (open: boolean) => void;
  user: User;
  onAdvancePeriod: (periodId: string) => void;
}) {
  if (!period) return null;

  const actionLabel = actionLabelForPayPeriodStage(period.stage);
  const canExecute = canExecutePayPeriodAction(
    user,
    period.stage,
    period.createdByUserId,
  );
  const canSeeAmounts = canViewPayrollAmounts(user);
  const canSeeGl = canReadGeneralLedger(user);

  const totalDebit = period.journalLines.reduce((acc, l) => acc + l.debit, 0);
  const totalCredit = period.journalLines.reduce((acc, l) => acc + l.credit, 0);

  return (
    <DrawerShell
      open={!!period}
      onOpenChange={onOpenChange}
      title={`${period.code} — ${period.name}`}
      description={`Rentang absensi ${period.cutoffLabel} · Tanggal bayar ${period.payDateLabel}`}
    >
      <div className={styles.drawerStack}>
        <div className={styles.drawerSection}>
          <div className={styles.drawerSectionTop}>
            <h3>Status Tahapan Periode Gaji</h3>
            <PayPeriodStagePill stage={period.stage} />
          </div>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span>Persetujuan</span>
              <div>
                <SubStageStatusPill status={period.approvalStatus} />
              </div>
            </div>
            <div className={styles.metaItem}>
              <span>Pencairan</span>
              <div>
                <SubStageStatusPill status={period.disbursementStatus} />
              </div>
            </div>
            <div className={styles.metaItem}>
              <span>Posting Jurnal</span>
              <div>
                <SubStageStatusPill status={period.journalPostingStatus} />
              </div>
            </div>
            <div className={styles.metaItem}>
              <span>Cakupan Karyawan</span>
              <strong>
                {period.readyEmployeeCount} dari {period.employeeCount} siap
                diproses
              </strong>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#36476a" }}>
            {period.summaryNote}
          </p>
        </div>

        <div className={styles.drawerSection}>
          <h3>Rincian Gaji Bruto → Potongan → Gaji Bersih</h3>
          {canSeeAmounts ? (
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span>Gaji Bruto</span>
                <strong>{formatRupiahFull(period.grossPay)}</strong>
              </div>
              <div className={styles.metaItem}>
                <span>Total Potongan (PPh 21 &amp; BPJS)</span>
                <strong>-{formatRupiahFull(period.totalDeductions)}</strong>
              </div>
              <div className={styles.metaItem}>
                <span>Gaji Bersih (Take-Home Pay)</span>
                <strong>{formatRupiahFull(period.netPay)}</strong>
              </div>
              <div className={styles.metaItem}>
                <span>Komponen Variabel (KPI &amp; Lembur)</span>
                <strong>
                  {formatRupiahFull(
                    period.kpiIncentiveTotal + period.overtimeTotal,
                  )}
                </strong>
              </div>
            </div>
          ) : (
            <div className={styles.drawerNotice} role="status">
              Nominal rincian penggajian dibatasi untuk peran{" "}
              <strong>HR, Keuangan, Akuntansi, dan Auditor</strong>.
            </div>
          )}
        </div>

        {canSeeGl && canSeeAmounts && (
          <div className={styles.drawerSection}>
            <div className={styles.drawerSectionTop}>
              <h3>
                Pratinjau Jurnal Buku Besar{" "}
                {period.journalNumber
                  ? `(${period.journalNumber})`
                  : "(Draf Seimbang)"}
              </h3>
              <span className={`${styles.pill} ${styles.pillInfo}`}>
                Debit = Kredit: {formatRupiahFull(totalDebit)}
              </span>
            </div>
            <div className={styles.tableWrap}>
              <table style={{ minWidth: 440 }}>
                <thead>
                  <tr>
                    <th scope="col">Akun</th>
                    <th scope="col">Debit</th>
                    <th scope="col">Kredit</th>
                  </tr>
                </thead>
                <tbody>
                  {period.journalLines.map((line) => (
                    <tr key={line.accountCode}>
                      <td>
                        <strong>{line.accountCode}</strong> · {line.accountName}
                      </td>
                      <td className={styles.tabular}>
                        {line.debit > 0 ? formatRupiahFull(line.debit) : "—"}
                      </td>
                      <td className={styles.tabular}>
                        {line.credit > 0 ? formatRupiahFull(line.credit) : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td>
                      <strong>Total Jurnal Seimbang</strong>
                    </td>
                    <td className={styles.tabular}>
                      <strong>{formatRupiahFull(totalDebit)}</strong>
                    </td>
                    <td className={styles.tabular}>
                      <strong>{formatRupiahFull(totalCredit)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {actionLabel && !canExecute && (
          <div className={styles.drawerNotice} role="status">
            Tindakan <strong>{actionLabel}</strong> diotorisasi sesuai pemisahan
            tugas penggajian (HR Payroll / Pejabat Penyetuju / Treasury /
            Akuntansi).
          </div>
        )}

        <div className={styles.drawerActions}>
          {period.journalNumber && canSeeGl && (
            <Link
              href={`/finance/journals?search=${encodeURIComponent(period.journalNumber)}`}
              className={styles.secondaryButton}
            >
              Buka Jurnal {period.journalNumber} di Buku Besar
            </Link>
          )}
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => onOpenChange(false)}
          >
            Tutup
          </button>
          {actionLabel && (
            <button
              type="button"
              className={styles.primaryButton}
              disabled={!canExecute}
              onClick={() => {
                onAdvancePeriod(period.id);
                onOpenChange(false);
              }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </DrawerShell>
  );
}
