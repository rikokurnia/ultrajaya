"use client";
import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Download,
  CircleCheck,
  RefreshCw,
  Clock3,
} from "lucide-react";
import { CYCLES } from "@/shared/cycles";
import styles from "@/components/foundation.module.css";
/** Presentation fixtures transcribed from the supplied report reference, not live workflow records. */
const referenceTasks = [
  { task: "Cek stok pesanan", stage: "Pemrosesan Pesanan" },
  { task: "Cocokkan surat jalan dan faktur", stage: "Penagihan" },
  { task: "Tindak lanjuti pembayaran", stage: "Penerimaan Pembayaran" },
];
const statuses = [
  { label: "Selesai", count: 14, icon: CircleCheck },
  { label: "Sedang Berjalan", count: 6, icon: RefreshCw },
  { label: "Belum Dimulai", count: 4, icon: Clock3 },
];
export function ReportsPage() {
  const [cycle, setCycle] = useState("pendapatan");
  const [status, setStatus] = useState("Sedang Berjalan");
  const rows =
    cycle === "pendapatan" && status === "Sedang Berjalan"
      ? referenceTasks
      : [];
  function download() {
    const csv =
      "\uFEFFTugas,Tahap,Status\n" +
      rows
        .map((row) =>
          [row.task, row.stage, status]
            .map((value) => '"' + value.replaceAll('"', '""') + '"')
            .join(","),
        )
        .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${cycle}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section>
      <header className={styles.banner}>
        <h1>Laporan</h1>
      </header>
      <div
        className={styles.reportTabs}
        role="tablist"
        aria-label="Siklus laporan"
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          e.preventDefault();
          const index = CYCLES.findIndex((item) => item.key === cycle);
          const next = CYCLES[(index + (e.key === "ArrowRight" ? 1 : 3)) % 4];
          setCycle(next.key);
          document.getElementById(`report-tab-${next.key}`)?.focus();
        }}
      >
        {CYCLES.map((item, i) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            tabIndex={cycle === item.key ? 0 : -1}
            aria-selected={cycle === item.key}
            aria-controls="report-panel"
            id={`report-tab-${item.key}`}
            onClick={() => setCycle(item.key)}
          >
            {item.title}
            <span className={styles.count}>{[24, 18, 16, 12][i]}</span>
          </button>
        ))}
      </div>
      <div
        id="report-panel"
        role="tabpanel"
        aria-labelledby={`report-tab-${cycle}`}
      >
        <div className={styles.reportToolbar}>
          <label htmlFor="report-period">Periode</label>
          <div className={styles.periodControl}>
            <CalendarDays size={25} aria-hidden />
            <select id="report-period" defaultValue="november">
              <option value="november">1–16 Nov 2026</option>
            </select>
          </div>
          <button
            type="button"
            className={styles.exportButton}
            onClick={download}
          >
            <Download size={26} aria-hidden />
            Ekspor
          </button>
        </div>
        <div className={styles.reportStats}>
          {statuses.map((item) => (
            <button
              type="button"
              className={styles.statButton}
              key={item.label}
              aria-pressed={status === item.label}
              onClick={() => setStatus(item.label)}
            >
              <item.icon aria-hidden />
              <span>{item.label}</span>
              <strong>{cycle === "pendapatan" ? item.count : "—"}</strong>
            </button>
          ))}
        </div>
        <section className={styles.reportDetail}>
          <div className={styles.reportDetailHeader}>
            <h2>Rincian Tugas</h2>
            <span className={styles.pill}>{status}</span>
          </div>
          <div className={styles.reportTable}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Tugas</th>
                  <th scope="col">Tahap</th>
                  <th scope="col">Status</th>
                  <th scope="col">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.task}>
                    <td>{row.task}</td>
                    <td>{row.stage}</td>
                    <td>
                      <span className={styles.pill}>{status}</span>
                    </td>
                    <td>
                      <Link href={`/cycles/${cycle}`}>Lihat detail</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <div className={styles.reportEmpty} />}
          </div>
          {rows.length > 0 && (
            <p className={styles.reportFoot}>Menampilkan 3 dari 6 tugas</p>
          )}
        </section>
      </div>
    </section>
  );
}
