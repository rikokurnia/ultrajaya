"use client";

import { useId } from "react";
import {
  computeBatchTotalCost,
  formatNumberId,
  formatQuantityWithUnit,
  formatRupiahCompact,
  formatRupiahFull,
  type MrpRequirementItem,
  type ProductionBatchRecord,
  type SummarySeriesDataset,
} from "./data";
import styles from "./produksi.module.css";

export function TargetVsRealisasiChart({
  dataset,
}: {
  dataset: SummarySeriesDataset;
}) {
  const baseId = useId();
  const width = 640;
  const height = 216;
  const padLeft = 98;
  const padRight = 24;
  const padTop = 26;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const maxY = dataset.yMax || 1000;

  const yFor = (val: number) =>
    padTop + plotH - Math.min(1, Math.max(0, val / maxY)) * plotH;

  const groupWidth = plotW / Math.max(1, dataset.points.length);
  const barWidth = Math.min(34, Math.max(18, groupWidth * 0.27));
  const barGap = 6;

  return (
    <div className={styles.chartBox}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={styles.chartSvg}
        role="img"
        aria-label={`Grafik Target vs Realisasi Produksi (${dataset.unit}) untuk ${dataset.productLabel}, ${dataset.periodLabel}`}
      >
        <defs>
          <linearGradient id={`${baseId}-target`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a9c9ff" />
            <stop offset="100%" stopColor="#7eb0ff" />
          </linearGradient>
          <linearGradient id={`${baseId}-actual`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0061ff" />
            <stop offset="100%" stopColor="#004ad6" />
          </linearGradient>
        </defs>

        {dataset.yTicks.map((tick) => {
          const y = yFor(tick);
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke={tick === 0 ? "#b8cae8" : "#e4ecf8"}
                strokeWidth="1"
              />
              <text
                x={padLeft - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="11.5"
                fill="#2b3f66"
                fontWeight="500"
              >
                {`${formatNumberId(tick)} ${dataset.unit}`}
              </text>
            </g>
          );
        })}

        {dataset.points.map((pt, idx) => {
          const centerX = padLeft + groupWidth * idx + groupWidth / 2;
          const targetX = centerX - barWidth - barGap / 2;
          const actualX = centerX + barGap / 2;
          const targetY = yFor(pt.targetKarton);
          const actualY = yFor(pt.actualKarton);
          const targetH = Math.max(3, padTop + plotH - targetY);
          const actualH = Math.max(3, padTop + plotH - actualY);

          return (
            <g key={pt.label}>
              <rect
                x={targetX}
                y={targetY}
                width={barWidth}
                height={targetH}
                rx="4"
                fill={`url(#${baseId}-target)`}
                stroke="#5893f7"
                strokeWidth="1"
              >
                <title>{`${pt.label} — Target Produksi: ${formatQuantityWithUnit(pt.targetKarton, dataset.unit)}`}</title>
              </rect>
              <text
                x={targetX + barWidth / 2}
                y={targetY - 6}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#2c57a8"
              >
                {formatNumberId(pt.targetKarton)}
              </text>

              <rect
                x={actualX}
                y={actualY}
                width={barWidth}
                height={actualH}
                rx="4"
                fill={`url(#${baseId}-actual)`}
              >
                <title>{`${pt.label} — Realisasi Produksi: ${formatQuantityWithUnit(pt.actualKarton, dataset.unit)}`}</title>
              </rect>
              <text
                x={actualX + barWidth / 2}
                y={actualY - 6}
                textAnchor="middle"
                fontSize="11.5"
                fontWeight="700"
                fill="#0045c4"
              >
                {formatNumberId(pt.actualKarton)}
              </text>

              <text
                x={centerX}
                y={height - 10}
                textAnchor="middle"
                fontSize="12"
                fill="#081e50"
                fontWeight="600"
              >
                {pt.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className={styles.chartLegend}>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatchTarget} aria-hidden />
          Target Produksi ({dataset.unit})
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatchActual} aria-hidden />
          Realisasi Produksi ({dataset.unit})
        </span>
      </div>
    </div>
  );
}

export function MaterialReadinessPanel({
  items,
  onSelectOrder,
}: {
  items: MrpRequirementItem[];
  onSelectOrder: (orderNumber: string) => void;
}) {
  const readyCount = items.filter((item) => item.shortageQty === 0).length;
  const shortCount = items.filter((item) => item.shortageQty > 0).length;

  return (
    <div>
      <div className={styles.readinessSummaryCounts}>
        <span className={`${styles.pill} ${styles.pillSuccess}`}>
          {readyCount} bahan siap
        </span>
        <span className={`${styles.pill} ${styles.pillWarning}`}>
          {shortCount} bahan kurang stok
        </span>
      </div>

      <div className={styles.readinessList}>
        {items.map((item) => {
          const pct = Math.min(
            100,
            Math.max(
              6,
              Math.round((item.availableStock / Math.max(1, item.requiredTotal)) * 100),
            ),
          );
          const isShort = item.shortageQty > 0;
          return (
            <div className={styles.readinessRow} key={item.id}>
              <div className={styles.readinessTop}>
                <span className={styles.readinessName}>
                  {item.code} · {item.name}
                </span>
                <div className={styles.readinessStats}>
                  <span>
                    Tersedia {formatQuantityWithUnit(item.availableStock, item.unit)} /{" "}
                    Kebutuhan {formatQuantityWithUnit(item.requiredTotal, item.unit)}
                  </span>
                  {isShort ? (
                    <span className={`${styles.pill} ${styles.pillDanger}`}>
                      Kurang {formatQuantityWithUnit(item.shortageQty, item.unit)}
                    </span>
                  ) : (
                    <span className={`${styles.pill} ${styles.pillSuccess}`}>
                      Siap (100%)
                    </span>
                  )}
                </div>
              </div>

              <div
                className={styles.progressTrack}
                role="progressbar"
                aria-label={`Kesiapan ${item.name}: ${pct}%`}
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={
                    isShort ? styles.progressFillShort : styles.progressFillReady
                  }
                  style={{ width: `${pct}%` }}
                />
              </div>

              {isShort && item.affectedOrderNumbers.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                    fontSize: 12,
                    color: "#36476a",
                  }}
                >
                  <span>Order terdampak:</span>
                  {item.affectedOrderNumbers.map((ord) => (
                    <button
                      key={ord}
                      type="button"
                      className={styles.codeLink}
                      onClick={() => onSelectOrder(ord)}
                    >
                      {ord}
                    </button>
                  ))}
                  {item.fpbbReference && (
                    <span>· Ref: {item.fpbbReference}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BatchStageBreakdownVisual({
  batches,
}: {
  batches: ProductionBatchRecord[];
}) {
  const inProcess = batches.filter((b) => b.status === "Dalam Proses");
  const waitingQc = batches.filter((b) => b.status === "Menunggu QC");
  const held = batches.filter((b) => b.status === "Ditahan");
  const released = batches.filter((b) => b.status === "Dirilis QC");

  const totalCount = Math.max(1, batches.length);
  const rows = [
    {
      label: "Dalam Proses",
      count: inProcess.length,
      karton: inProcess.reduce((acc, b) => acc + b.actualQty, 0),
      color: "#0061ff",
    },
    {
      label: "Menunggu QC",
      count: waitingQc.length,
      karton: waitingQc.reduce((acc, b) => acc + b.actualQty, 0),
      color: "#d97706",
    },
    {
      label: "Ditahan (Hold)",
      count: held.length,
      karton: held.reduce((acc, b) => acc + b.actualQty, 0),
      color: "#b42336",
    },
    {
      label: "Dirilis QC",
      count: released.length,
      karton: released.reduce((acc, b) => acc + b.actualQty, 0),
      color: "#0c9b6b",
    },
  ];

  return (
    <div className={styles.stageBarList}>
      {rows.map((row) => {
        const pct = Math.max(8, Math.round((row.count / totalCount) * 100));
        return (
          <div className={styles.stageBarRow} key={row.label}>
            <span className={styles.stageBarLabel}>{row.label}</span>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-label={`${row.label}: ${row.count} batch (${formatNumberId(row.karton)} karton)`}
              aria-valuenow={row.count}
              aria-valuemin={0}
              aria-valuemax={totalCount}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  borderRadius: "999px",
                  background: row.color,
                }}
              />
            </div>
            <span className={styles.stageBarValue}>
              {row.count} batch
            </span>
          </div>
        );
      })}
      <div
        style={{
          marginTop: 4,
          paddingTop: 10,
          borderTop: "1px solid #e4ecf8",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          fontSize: 12.5,
          color: "#2b3f66",
        }}
      >
        <span>
          Alur: <strong>1. Inspeksi &amp; Persiapan Bahan</strong> →{" "}
          <strong>2. UHT &amp; Pengemasan</strong> →{" "}
          <strong>3. Uji Batch &amp; Rilis QC</strong>
        </span>
      </div>
    </div>
  );
}

export function WarehouseSyncFlowVisual({
  batches,
}: {
  batches: ProductionBatchRecord[];
}) {
  const qcReleased = batches.filter((b) => b.qcReleaseState === "Dirilis QC");
  const storedAsrs = batches.filter(
    (b) => b.storageState === "Tersimpan di AS/RS",
  );
  const syncedStock = batches.filter(
    (b) => b.inventorySyncState === "Tersinkron ke Stok",
  );
  const totalBatches = Math.max(1, batches.length);

  const stages = [
    {
      label: "1. Rilis QC",
      count: qcReleased.length,
      karton: qcReleased.reduce((acc, b) => acc + b.actualQty, 0),
      color: "#0061ff",
    },
    {
      label: "2. Penyimpanan AS/RS",
      count: storedAsrs.length,
      karton: storedAsrs.reduce((acc, b) => acc + b.storedQty, 0),
      color: "#0ea5e9",
    },
    {
      label: "3. Sinkronisasi Stok",
      count: syncedStock.length,
      karton: syncedStock.reduce((acc, b) => acc + b.storedQty, 0),
      color: "#0c9b6b",
    },
  ];

  return (
    <div className={styles.stageBarList}>
      {stages.map((stage) => {
        const pct = Math.max(8, Math.round((stage.count / totalBatches) * 100));
        return (
          <div className={styles.stageBarRow} key={stage.label}>
            <span className={styles.stageBarLabel}>{stage.label}</span>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-label={`${stage.label}: ${stage.count} dari ${totalBatches} batch`}
              aria-valuenow={stage.count}
              aria-valuemin={0}
              aria-valuemax={totalBatches}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  borderRadius: "999px",
                  background: stage.color,
                }}
              />
            </div>
            <span className={styles.stageBarValue}>
              {stage.count}/{totalBatches} batch
            </span>
          </div>
        );
      })}
      <div
        style={{
          marginTop: 4,
          paddingTop: 10,
          borderTop: "1px solid #e4ecf8",
          fontSize: 12.5,
          color: "#2b3f66",
        }}
      >
        Total tersimpan &amp; tersinkron di AS/RS:{" "}
        <strong>
          {formatNumberId(
            syncedStock.reduce((acc, b) => acc + b.storedQty, 0),
          )}{" "}
          karton
        </strong>
      </div>
    </div>
  );
}

export function CostBreakdownVisual({
  batches,
}: {
  batches: ProductionBatchRecord[];
}) {
  const totalMaterial = batches.reduce((acc, b) => acc + b.materialCost, 0);
  const totalLabor = batches.reduce((acc, b) => acc + b.laborCost, 0);
  const totalOverhead = batches.reduce((acc, b) => acc + b.overheadCost, 0);
  const grandTotal = Math.max(1, totalMaterial + totalLabor + totalOverhead);

  const matShare = Math.round((totalMaterial / grandTotal) * 1000) / 10;
  const labShare = Math.round((totalLabor / grandTotal) * 1000) / 10;
  const ovhShare = Math.max(
    0,
    Math.round((100 - matShare - labShare) * 10) / 10,
  );

  const totalKarton = batches.reduce((acc, b) => acc + b.actualQty, 0);
  const avgHpp = totalKarton > 0 ? Math.round(grandTotal / totalKarton) : 0;

  return (
    <div className={styles.costBreakdownWrap}>
      <div
        className={styles.stackedBar}
        role="img"
        aria-label={`Komposisi HPP: Bahan Baku ${matShare}%, Tenaga Kerja ${labShare}%, Overhead ${ovhShare}%`}
      >
        <div
          className={styles.segMaterial}
          style={{ width: `${matShare}%` }}
          title={`Bahan Baku: ${formatRupiahFull(totalMaterial)} (${matShare}%)`}
        />
        <div
          className={styles.segLabor}
          style={{ width: `${labShare}%` }}
          title={`Tenaga Kerja Langsung: ${formatRupiahFull(totalLabor)} (${labShare}%)`}
        />
        <div
          className={styles.segOverhead}
          style={{ width: `${ovhShare}%` }}
          title={`Overhead Pabrik: ${formatRupiahFull(totalOverhead)} (${ovhShare}%)`}
        />
      </div>

      <div className={styles.costLegendGrid}>
        <div className={styles.costMetricBox}>
          <span className={styles.costMetricLabel}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: "#0057eb",
                display: "inline-block",
              }}
              aria-hidden
            />
            Biaya Bahan Baku
          </span>
          <strong className={styles.costMetricValue}>
            {formatRupiahCompact(totalMaterial)}
          </strong>
          <span className={styles.costMetricShare}>
            {matShare}% dari total HPP
          </span>
        </div>

        <div className={styles.costMetricBox}>
          <span className={styles.costMetricLabel}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: "#0ea5e9",
                display: "inline-block",
              }}
              aria-hidden
            />
            Tenaga Kerja Langsung
          </span>
          <strong className={styles.costMetricValue}>
            {formatRupiahCompact(totalLabor)}
          </strong>
          <span className={styles.costMetricShare}>
            {labShare}% dari total HPP
          </span>
        </div>

        <div className={styles.costMetricBox}>
          <span className={styles.costMetricLabel}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: "#0c9b6b",
                display: "inline-block",
              }}
              aria-hidden
            />
            Overhead Pabrik
          </span>
          <strong className={styles.costMetricValue}>
            {formatRupiahCompact(totalOverhead)}
          </strong>
          <span className={styles.costMetricShare}>
            {ovhShare}% · Rata-rata {formatRupiahFull(avgHpp)}/karton
          </span>
        </div>
      </div>
    </div>
  );
}

export { computeBatchTotalCost };
