"use client";

import { useId } from "react";
import {
  formatRupiahCompact,
  type AgingBucketRow,
  type PeriodDataset,
} from "./data";
import styles from "./pendapatan.module.css";

export function TrendLineChart({ dataset }: { dataset: PeriodDataset }) {
  const gradientId = useId();
  const width = 640;
  const height = 224;
  const padLeft = 86;
  const padRight = 32;
  const padTop = 24;
  const padBottom = 32;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const maxY = dataset.yMaxMillions || 400;

  const xFor = (idx: number) =>
    dataset.series.length <= 1
      ? padLeft + plotW / 2
      : padLeft + (idx / (dataset.series.length - 1)) * plotW;

  const yFor = (val: number) =>
    padTop + plotH - Math.min(1, Math.max(0, val / maxY)) * plotH;

  const orderPoints = dataset.series.map((pt, idx) => ({
    x: xFor(idx),
    y: yFor(pt.orderMillions),
    val: pt.orderMillions,
    label: pt.label,
  }));

  const paymentPoints = dataset.series.map((pt, idx) => ({
    x: xFor(idx),
    y: yFor(pt.paymentMillions),
    val: pt.paymentMillions,
    label: pt.label,
  }));

  const orderLine = orderPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const paymentLine = paymentPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    orderPoints.length > 0
      ? `${orderLine} L ${orderPoints[orderPoints.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${orderPoints[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : "";

  return (
    <div className={styles.chartBox}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={styles.chartSvg}
        role="img"
        aria-label={`Grafik tren nilai pesanan dan pembayaran diterima untuk ${dataset.label}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0061ff" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#0061ff" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {dataset.yTicksMillions.map((tick) => {
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
                {`Rp${tick} juta`}
              </text>
            </g>
          );
        })}

        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

        <path
          d={orderLine}
          fill="none"
          stroke="#0057eb"
          strokeWidth="2.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={paymentLine}
          fill="none"
          stroke="#0c9b6b"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {orderPoints.map((pt) => (
          <g key={`order-${pt.label}`}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r="5"
              fill="#ffffff"
              stroke="#0057eb"
              strokeWidth="2.5"
            >
              <title>{`${pt.label} — Nilai pesanan: Rp${pt.val} juta`}</title>
            </circle>
            <text
              x={pt.x}
              y={pt.y - 12}
              textAnchor="middle"
              fontSize="12.5"
              fontWeight="700"
              fill="#004ad6"
            >
              {pt.val}
            </text>
          </g>
        ))}

        {paymentPoints.map((pt) => (
          <g key={`pay-${pt.label}`}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r="5"
              fill="#ffffff"
              stroke="#0c9b6b"
              strokeWidth="2.5"
            >
              <title>{`${pt.label} — Pembayaran diterima: Rp${pt.val} juta`}</title>
            </circle>
            <text
              x={pt.x}
              y={pt.y + 21}
              textAnchor="middle"
              fontSize="12.5"
              fontWeight="700"
              fill="#0a855c"
            >
              {pt.val}
            </text>
          </g>
        ))}

        {dataset.series.map((pt, idx) => (
          <text
            key={pt.label}
            x={xFor(idx)}
            y={height - 8}
            textAnchor="middle"
            fontSize="12"
            fill="#20345c"
            fontWeight="500"
          >
            {pt.label}
          </text>
        ))}
      </svg>

      <div className={styles.chartLegend}>
        <span className={styles.legendItem}>
          <span className={styles.legendDotBlue} aria-hidden />
          Nilai pesanan
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDotGreen} aria-hidden />
          Pembayaran diterima
        </span>
      </div>
    </div>
  );
}

export function OrderStageBarChart({
  stages,
}: {
  stages: { label: string; count: number; gradient: [string, string] }[];
}) {
  const baseId = useId();
  const width = 560;
  const height = 188;
  const padLeft = 186;
  const padRight = 36;
  const padTop = 12;
  const padBottom = 32;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxCount = Math.max(8, ...stages.map((s) => s.count));
  const axisMax = Math.ceil(maxCount / 2) * 2;
  const ticks = [0, 1, 2, 3, 4].map((step) => Math.round((axisMax * step) / 4));

  const rowH = plotH / stages.length;
  const barH = 22;

  return (
    <div className={styles.chartBox}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={styles.chartSvg}
        role="img"
        aria-label="Grafik jumlah pesanan terbuka per tahap"
      >
        <defs>
          {stages.map((stage, i) => (
            <linearGradient
              key={stage.label}
              id={`${baseId}-bar-${i}`}
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor={stage.gradient[0]} />
              <stop offset="100%" stopColor={stage.gradient[1]} />
            </linearGradient>
          ))}
        </defs>

        {ticks.map((tick) => {
          const x = padLeft + (tick / axisMax) * plotW;
          return (
            <g key={tick}>
              <line
                x1={x}
                x2={x}
                y1={padTop}
                y2={padTop + plotH}
                stroke={tick === 0 ? "#8da3c7" : "#e4ecf8"}
                strokeWidth="1"
              />
              <line
                x1={x}
                x2={x}
                y1={padTop + plotH}
                y2={padTop + plotH + 4}
                stroke="#8da3c7"
                strokeWidth="1"
              />
              <text
                x={x}
                y={height - 10}
                textAnchor="middle"
                fontSize="12"
                fill="#36476a"
                fontWeight="500"
              >
                {tick}
              </text>
            </g>
          );
        })}

        <line
          x1={padLeft}
          x2={width - padRight}
          y1={padTop + plotH}
          y2={padTop + plotH}
          stroke="#8da3c7"
          strokeWidth="1"
        />

        {stages.map((stage, i) => {
          const yCenter = padTop + rowH * i + rowH / 2;
          const barW = Math.max(4, (stage.count / axisMax) * plotW);
          return (
            <g key={stage.label}>
              <text
                x={padLeft - 12}
                y={yCenter + 4}
                textAnchor="end"
                fontSize="12.5"
                fill="#20345c"
                fontWeight="500"
              >
                {stage.label}
              </text>
              <rect
                x={padLeft}
                y={yCenter - barH / 2}
                width={barW}
                height={barH}
                rx="5"
                fill={`url(#${baseId}-bar-${i})`}
              >
                <title>{`${stage.label}: ${stage.count} pesanan`}</title>
              </rect>
              <text
                x={padLeft + barW + 10}
                y={yCenter + 5}
                fontSize="13.5"
                fontWeight="700"
                fill="#081e50"
              >
                {stage.count}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function AgingBars({ buckets }: { buckets: AgingBucketRow[] }) {
  const maxAmount = Math.max(1, ...buckets.map((b) => b.amount));
  return (
    <div className={styles.agingList}>
      {buckets.map((bucket) => {
        const pct = Math.max(4, Math.round((bucket.amount / maxAmount) * 100));
        return (
          <div className={styles.agingRow} key={bucket.label}>
            <span className={styles.agingLabel}>{bucket.label}</span>
            <div
              className={styles.agingTrack}
              role="progressbar"
              aria-label={`${bucket.label}: ${formatRupiahCompact(bucket.amount)}`}
              aria-valuenow={bucket.amount}
              aria-valuemin={0}
              aria-valuemax={maxAmount}
            >
              <div
                className={
                  bucket.tone === "current"
                    ? styles.agingFillCurrent
                    : styles.agingFillOverdue
                }
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={styles.agingValue}>
              {formatRupiahCompact(bucket.amount)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
