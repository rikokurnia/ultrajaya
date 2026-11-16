"use client";

import { useId } from "react";
import {
  formatQty,
  formatRupiahCompact,
  formatRupiahFull,
  type GoodsReceiptRecord,
  type PayablesAgingRow,
  type PengeluaranPeriodDataset,
  type PurchaseOrderRecord,
  type PurchaseRequestRecord,
  type PurchasingDocType,
  type RfqRecord,
} from "./data";
import styles from "./pengeluaran.module.css";

export function PengeluaranTrendChart({
  dataset,
}: {
  dataset: PengeluaranPeriodDataset;
}) {
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

  const poPoints = dataset.series.map((pt, idx) => ({
    x: xFor(idx),
    y: yFor(pt.poMillions),
    val: pt.poMillions,
    label: pt.label,
  }));

  const paymentPoints = dataset.series.map((pt, idx) => ({
    x: xFor(idx),
    y: yFor(pt.paymentMillions),
    val: pt.paymentMillions,
    label: pt.label,
  }));

  const poLine = poPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const paymentLine = paymentPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    poPoints.length > 0
      ? `${poLine} L ${poPoints[poPoints.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${poPoints[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : "";

  return (
    <div className={styles.chartBox}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={styles.chartSvg}
        role="img"
        aria-label={`Grafik tren nilai PO diterbitkan dan pembayaran vendor untuk ${dataset.label}`}
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
          d={poLine}
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

        {poPoints.map((pt) => (
          <g key={`po-${pt.label}`}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r="5"
              fill="#ffffff"
              stroke="#0057eb"
              strokeWidth="2.5"
            >
              <title>{`${pt.label} — Nilai PO diterbitkan: Rp${pt.val} juta`}</title>
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
              <title>{`${pt.label} — Pembayaran vendor: Rp${pt.val} juta`}</title>
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
          Nilai PO diterbitkan
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDotGreen} aria-hidden />
          Pembayaran vendor
        </span>
      </div>
    </div>
  );
}

export function PurchasingStatusSummary({
  docType,
  requests,
  rfqs,
  orders,
}: {
  docType: PurchasingDocType;
  requests: readonly PurchaseRequestRecord[];
  rfqs: readonly RfqRecord[];
  orders: readonly PurchaseOrderRecord[];
}) {
  if (docType === "fpbb") {
    const pendingVerify = requests.filter(
      (r) => r.status === "Menunggu verifikasi",
    ).length;
    const verifiedReady = requests.filter(
      (r) => r.status === "Terverifikasi",
    ).length;
    const convertedRfq = requests.filter(
      (r) => r.status === "Sudah dibuat RFQ",
    ).length;
    const sufficientStock = requests.filter(
      (r) => r.status === "Stok mencukupi",
    ).length;
    const total = Math.max(1, requests.length);

    return (
      <section
        className={styles.compactSummaryCard}
        aria-label="Ringkasan status Permintaan Pembelian"
      >
        <div className={styles.summaryHeaderRow}>
          <div>
            <h2 className={styles.summaryTitle}>
              Ringkasan Status Permintaan Pembelian (FPBB)
            </h2>
            <span className={styles.summarySubtitle}>
              Total {requests.length} dokumen permintaan · Prioritaskan verifikasi
              gudang dan pembuatan RFQ
            </span>
          </div>
        </div>

        <div className={styles.summaryMetricsRow}>
          <div
            className={`${styles.summaryMetricItem} ${
              pendingVerify > 0 ? styles.summaryMetricAttention : ""
            }`}
          >
            <span className={styles.summaryMetricLabel}>
              Menunggu Verifikasi Gudang
            </span>
            <div className={styles.summaryMetricValueRow}>
              <strong className={styles.summaryMetricCount}>
                {pendingVerify}
              </strong>
              <span className={styles.summaryMetricNote}>Perlu cek stok</span>
            </div>
          </div>

          <div className={styles.summaryMetricItem}>
            <span className={styles.summaryMetricLabel}>
              Terverifikasi (Siap RFQ)
            </span>
            <div className={styles.summaryMetricValueRow}>
              <strong className={styles.summaryMetricCount}>
                {verifiedReady}
              </strong>
              <span className={styles.summaryMetricNote}>
                Diteruskan ke Purchasing
              </span>
            </div>
          </div>

          <div
            className={`${styles.summaryMetricItem} ${styles.summaryMetricSuccess}`}
          >
            <span className={styles.summaryMetricLabel}>Sudah Dibuat RFQ</span>
            <div className={styles.summaryMetricValueRow}>
              <strong className={styles.summaryMetricCount}>
                {convertedRfq}
              </strong>
              <span className={styles.summaryMetricNote}>Dalam proses tender</span>
            </div>
          </div>

          <div className={styles.summaryMetricItem}>
            <span className={styles.summaryMetricLabel}>Stok Mencukupi</span>
            <div className={styles.summaryMetricValueRow}>
              <strong className={styles.summaryMetricCount}>
                {sufficientStock}
              </strong>
              <span className={styles.summaryMetricNote}>Tanpa pembelian</span>
            </div>
          </div>
        </div>

        <div
          className={styles.segmentedBar}
          role="img"
          aria-label={`Proporsi status FPBB: ${pendingVerify} menunggu verifikasi, ${verifiedReady} terverifikasi, ${convertedRfq} sudah dibuat RFQ, ${sufficientStock} stok mencukupi`}
        >
          {pendingVerify > 0 && (
            <div
              className={styles.segmentAmber}
              style={{ width: `${(pendingVerify / total) * 100}%` }}
            />
          )}
          {verifiedReady > 0 && (
            <div
              className={styles.segmentBlue}
              style={{ width: `${(verifiedReady / total) * 100}%` }}
            />
          )}
          {convertedRfq > 0 && (
            <div
              className={styles.segmentGreen}
              style={{ width: `${(convertedRfq / total) * 100}%` }}
            />
          )}
          {sufficientStock > 0 && (
            <div
              className={styles.segmentNeutral}
              style={{ width: `${(sufficientStock / total) * 100}%` }}
            />
          )}
        </div>

        <div className={styles.segmentLegend}>
          <span className={styles.segmentLegendItem}>
            <span
              className={styles.swatch}
              style={{ background: "#e59324" }}
              aria-hidden
            />
            Menunggu verifikasi ({pendingVerify})
          </span>
          <span className={styles.segmentLegendItem}>
            <span
              className={styles.swatch}
              style={{ background: "#0061ff" }}
              aria-hidden
            />
            Terverifikasi ({verifiedReady})
          </span>
          <span className={styles.segmentLegendItem}>
            <span
              className={styles.swatch}
              style={{ background: "#0e8a58" }}
              aria-hidden
            />
            Sudah dibuat RFQ ({convertedRfq})
          </span>
          <span className={styles.segmentLegendItem}>
            <span
              className={styles.swatch}
              style={{ background: "#94a3b8" }}
              aria-hidden
            />
            Stok mencukupi ({sufficientStock})
          </span>
        </div>
      </section>
    );
  }

  if (docType === "rfq") {
    const waitingQuotes = rfqs.filter(
      (r) => r.status === "Menunggu penawaran",
    ).length;
    const needsEval = rfqs.filter((r) => r.status === "Perlu evaluasi").length;
    const awardedReadyPo = rfqs.filter(
      (r) => r.status === "Pemasok terpilih",
    ).length;
    const poIssued = rfqs.filter((r) => r.status === "PO diterbitkan").length;
    const total = Math.max(1, rfqs.length);

    return (
      <section
        className={styles.compactSummaryCard}
        aria-label="Ringkasan status RFQ dan Penawaran"
      >
        <div className={styles.summaryHeaderRow}>
          <div>
            <h2 className={styles.summaryTitle}>
              Ringkasan Status RFQ &amp; Evaluasi Penawaran Vendor
            </h2>
            <span className={styles.summarySubtitle}>
              Total {rfqs.length} dokumen RFQ · Bandingkan harga, lead time, dan
              catatan kualifikasi pemasok
            </span>
          </div>
        </div>

        <div className={styles.summaryMetricsRow}>
          <div
            className={`${styles.summaryMetricItem} ${
              needsEval > 0 ? styles.summaryMetricAttention : ""
            }`}
          >
            <span className={styles.summaryMetricLabel}>
              Perlu Evaluasi Penawaran
            </span>
            <div className={styles.summaryMetricValueRow}>
              <strong className={styles.summaryMetricCount}>{needsEval}</strong>
              <span className={styles.summaryMetricNote}>
                Bandingkan penawaran
              </span>
            </div>
          </div>

          <div
            className={`${styles.summaryMetricItem} ${
              waitingQuotes > 0 ? styles.summaryMetricAttention : ""
            }`}
          >
            <span className={styles.summaryMetricLabel}>
              Menunggu Penawaran
            </span>
            <div className={styles.summaryMetricValueRow}>
              <strong className={styles.summaryMetricCount}>
                {waitingQuotes}
              </strong>
              <span className={styles.summaryMetricNote}>Input kuotasi</span>
            </div>
          </div>

          <div className={styles.summaryMetricItem}>
            <span className={styles.summaryMetricLabel}>
              Pemasok Terpilih (Siap PO)
            </span>
            <div className={styles.summaryMetricValueRow}>
              <strong className={styles.summaryMetricCount}>
                {awardedReadyPo}
              </strong>
              <span className={styles.summaryMetricNote}>Siap terbitkan PO</span>
            </div>
          </div>

          <div
            className={`${styles.summaryMetricItem} ${styles.summaryMetricSuccess}`}
          >
            <span className={styles.summaryMetricLabel}>PO Diterbitkan</span>
            <div className={styles.summaryMetricValueRow}>
              <strong className={styles.summaryMetricCount}>{poIssued}</strong>
              <span className={styles.summaryMetricNote}>Selesai tender</span>
            </div>
          </div>
        </div>

        <div
          className={styles.segmentedBar}
          role="img"
          aria-label={`Proporsi status RFQ: ${needsEval} perlu evaluasi, ${waitingQuotes} menunggu penawaran, ${awardedReadyPo} pemasok terpilih, ${poIssued} PO diterbitkan`}
        >
          {needsEval + waitingQuotes > 0 && (
            <div
              className={styles.segmentAmber}
              style={{
                width: `${((needsEval + waitingQuotes) / total) * 100}%`,
              }}
            />
          )}
          {awardedReadyPo > 0 && (
            <div
              className={styles.segmentBlue}
              style={{ width: `${(awardedReadyPo / total) * 100}%` }}
            />
          )}
          {poIssued > 0 && (
            <div
              className={styles.segmentGreen}
              style={{ width: `${(poIssued / total) * 100}%` }}
            />
          )}
        </div>

        <div className={styles.segmentLegend}>
          <span className={styles.segmentLegendItem}>
            <span
              className={styles.swatch}
              style={{ background: "#e59324" }}
              aria-hidden
            />
            Perlu tindakan penawaran/evaluasi ({needsEval + waitingQuotes})
          </span>
          <span className={styles.segmentLegendItem}>
            <span
              className={styles.swatch}
              style={{ background: "#0061ff" }}
              aria-hidden
            />
            Pemasok terpilih ({awardedReadyPo})
          </span>
          <span className={styles.segmentLegendItem}>
            <span
              className={styles.swatch}
              style={{ background: "#0e8a58" }}
              aria-hidden
            />
            PO diterbitkan ({poIssued})
          </span>
        </div>
      </section>
    );
  }

  // Purchase Order summary
  const awaitingApproval = orders.filter(
    (o) => o.status === "Menunggu persetujuan",
  );
  const needsRevision = orders.filter((o) => o.status === "Perlu revisi");
  const approvedReadySend = orders.filter((o) => o.status === "Disetujui");
  const sentToVendor = orders.filter((o) => o.status === "Dikirim ke pemasok");
  const total = Math.max(1, orders.length);
  const totalPoValue = orders.reduce((acc, o) => acc + o.totalAmount, 0);

  return (
    <section
      className={styles.compactSummaryCard}
      aria-label="Ringkasan status Purchase Order"
    >
      <div className={styles.summaryHeaderRow}>
        <div>
          <h2 className={styles.summaryTitle}>
            Ringkasan Status Purchase Order (PO)
          </h2>
          <span className={styles.summarySubtitle}>
            Total {orders.length} PO senilai {formatRupiahFull(totalPoValue)} ·
            Pantau persetujuan berjenjang dan pengiriman ke pemasok
          </span>
        </div>
      </div>

      <div className={styles.summaryMetricsRow}>
        <div
          className={`${styles.summaryMetricItem} ${
            awaitingApproval.length > 0 ? styles.summaryMetricAttention : ""
          }`}
        >
          <span className={styles.summaryMetricLabel}>
            Menunggu Persetujuan
          </span>
          <div className={styles.summaryMetricValueRow}>
            <strong className={styles.summaryMetricCount}>
              {awaitingApproval.length}
            </strong>
            <span className={styles.summaryMetricNote}>
              {formatRupiahCompact(
                awaitingApproval.reduce((s, o) => s + o.totalAmount, 0),
              )}
            </span>
          </div>
        </div>

        <div
          className={`${styles.summaryMetricItem} ${
            needsRevision.length > 0 ? styles.summaryMetricDanger : ""
          }`}
        >
          <span className={styles.summaryMetricLabel}>Perlu Revisi</span>
          <div className={styles.summaryMetricValueRow}>
            <strong className={styles.summaryMetricCount}>
              {needsRevision.length}
            </strong>
            <span className={styles.summaryMetricNote}>
              {formatRupiahCompact(
                needsRevision.reduce((s, o) => s + o.totalAmount, 0),
              )}
            </span>
          </div>
        </div>

        <div className={styles.summaryMetricItem}>
          <span className={styles.summaryMetricLabel}>
            Disetujui (Siap Kirim)
          </span>
          <div className={styles.summaryMetricValueRow}>
            <strong className={styles.summaryMetricCount}>
              {approvedReadySend.length}
            </strong>
            <span className={styles.summaryMetricNote}>
              {formatRupiahCompact(
                approvedReadySend.reduce((s, o) => s + o.totalAmount, 0),
              )}
            </span>
          </div>
        </div>

        <div
          className={`${styles.summaryMetricItem} ${styles.summaryMetricSuccess}`}
        >
          <span className={styles.summaryMetricLabel}>Dikirim ke Pemasok</span>
          <div className={styles.summaryMetricValueRow}>
            <strong className={styles.summaryMetricCount}>
              {sentToVendor.length}
            </strong>
            <span className={styles.summaryMetricNote}>
              {formatRupiahCompact(
                sentToVendor.reduce((s, o) => s + o.totalAmount, 0),
              )}
            </span>
          </div>
        </div>
      </div>

      <div
        className={styles.segmentedBar}
        role="img"
        aria-label={`Proporsi status PO: ${awaitingApproval.length} menunggu persetujuan, ${needsRevision.length} perlu revisi, ${approvedReadySend.length} disetujui, ${sentToVendor.length} dikirim ke pemasok`}
      >
        {awaitingApproval.length > 0 && (
          <div
            className={styles.segmentAmber}
            style={{ width: `${(awaitingApproval.length / total) * 100}%` }}
          />
        )}
        {needsRevision.length > 0 && (
          <div
            className={styles.segmentRed}
            style={{ width: `${(needsRevision.length / total) * 100}%` }}
          />
        )}
        {approvedReadySend.length > 0 && (
          <div
            className={styles.segmentBlue}
            style={{ width: `${(approvedReadySend.length / total) * 100}%` }}
          />
        )}
        {sentToVendor.length > 0 && (
          <div
            className={styles.segmentGreen}
            style={{ width: `${(sentToVendor.length / total) * 100}%` }}
          />
        )}
      </div>

      <div className={styles.segmentLegend}>
        <span className={styles.segmentLegendItem}>
          <span
            className={styles.swatch}
            style={{ background: "#e59324" }}
            aria-hidden
          />
          Menunggu persetujuan ({awaitingApproval.length})
        </span>
        <span className={styles.segmentLegendItem}>
          <span
            className={styles.swatch}
            style={{ background: "#c63b4b" }}
            aria-hidden
          />
          Perlu revisi ({needsRevision.length})
        </span>
        <span className={styles.segmentLegendItem}>
          <span
            className={styles.swatch}
            style={{ background: "#0061ff" }}
            aria-hidden
          />
          Disetujui ({approvedReadySend.length})
        </span>
        <span className={styles.segmentLegendItem}>
          <span
            className={styles.swatch}
            style={{ background: "#0e8a58" }}
            aria-hidden
          />
          Dikirim ke pemasok ({sentToVendor.length})
        </span>
      </div>
    </section>
  );
}

export function QcOutcomeBreakdown({
  receipts,
  onSelectReceipt,
}: {
  receipts: readonly GoodsReceiptRecord[];
  onSelectReceipt: (receiptId: string) => void;
}) {
  const pendingList = receipts.filter(
    (r) => r.qcStatus === "Menunggu Inspeksi",
  );
  const passedList = receipts.filter((r) => r.qcStatus === "Lolos QC");
  const heldList = receipts.filter((r) => r.qcStatus === "Ditahan");

  const totalCount = Math.max(1, receipts.length);
  const maxBar = Math.max(
    4,
    pendingList.length,
    passedList.length,
    heldList.length,
  );

  const bars: {
    label: "Menunggu Inspeksi" | "Lolos QC" | "Ditahan";
    count: number;
    fillClass: string;
    note: string;
  }[] = [
    {
      label: "Menunggu Inspeksi",
      count: pendingList.length,
      fillClass: styles.agingFillWarning,
      note: "Perlu tindakan Tinjau Inspeksi oleh QC",
    },
    {
      label: "Lolos QC",
      count: passedList.length,
      fillClass: styles.agingFillCurrent,
      note: "Diterima masuk ke stok bahan baku siap produksi",
    },
    {
      label: "Ditahan",
      count: heldList.length,
      fillClass: styles.agingFillOverdue,
      note: "Sebagian/seluruh batch dikarantina & klaim pemasok",
    },
  ];

  return (
    <>
      <div className={styles.kpiGrid}>
        <article className={`${styles.kpiCard} ${styles.kpiCardAttention}`}>
          <span className={styles.kpiLabel}>Menunggu Inspeksi</span>
          <strong className={styles.kpiValue}>{pendingList.length}</strong>
          <span className={styles.kpiHint}>
            Dokumen penerimaan menunggu uji lab &amp; fisik QC
          </span>
        </article>
        <article className={`${styles.kpiCard} ${styles.kpiCardSuccess}`}>
          <span className={styles.kpiLabel}>Lolos QC</span>
          <strong className={styles.kpiValue}>{passedList.length}</strong>
          <span className={styles.kpiHint}>
            Memenuhi spesifikasi kualitas &amp; masuk stok tersedia
          </span>
        </article>
        <article className={`${styles.kpiCard} ${styles.kpiCardDanger}`}>
          <span className={styles.kpiLabel}>Ditahan</span>
          <strong className={styles.kpiValue}>{heldList.length}</strong>
          <span className={styles.kpiHint}>
            Terdapat kuantitas dikarantina (200 kg Milk Powder)
          </span>
        </article>
      </div>

      <div className={styles.splitGrid}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              Ringkasan Hasil QC Penerimaan Barang
            </h2>
          </div>

          <div className={styles.agingList}>
            {bars.map((bar) => {
              const pct = Math.max(8, Math.round((bar.count / maxBar) * 100));
              return (
                <div className={styles.agingRow} key={bar.label}>
                  <span className={styles.agingLabel}>{bar.label}</span>
                  <div
                    className={styles.agingTrack}
                    role="progressbar"
                    aria-label={`${bar.label}: ${bar.count} dari ${totalCount} dokumen penerimaan`}
                    aria-valuenow={bar.count}
                    aria-valuemin={0}
                    aria-valuemax={totalCount}
                  >
                    <div
                      className={bar.fillClass}
                      style={{
                        width: `${bar.count === 0 ? 0 : pct}%`,
                        background:
                          bar.label === "Lolos QC" ? "#0e8a58" : undefined,
                      }}
                    />
                  </div>
                  <span className={styles.agingValue}>
                    {bar.count} dokumen
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Perlu Ditindaklanjuti (QC)</h2>
          </div>
          <ul className={styles.followUpList}>
            {pendingList.map((rcpt) => {
              const firstLine = rcpt.lines[0];
              return (
                <li className={styles.followUpItem} key={rcpt.id}>
                  <div className={styles.followUpContent}>
                    <span className={styles.followUpText}>
                      Inspeksi {rcpt.number} ({rcpt.supplierName})
                    </span>
                    <span className={styles.followUpSubtext}>
                      {firstLine
                        ? `${firstLine.materialName} · Diterima ${formatQty(firstLine.receivedQty, firstLine.unit)}`
                        : rcpt.poNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.textLink}
                    onClick={() => onSelectReceipt(rcpt.id)}
                  >
                    Tinjau Inspeksi
                  </button>
                </li>
              );
            })}
            {heldList.map((rcpt) => {
              const totalHeld = rcpt.lines.reduce(
                (acc, l) => acc + l.heldQty,
                0,
              );
              const unit = rcpt.lines[0]?.unit ?? "kg";
              return (
                <li className={styles.followUpItem} key={rcpt.id}>
                  <div className={styles.followUpContent}>
                    <span className={styles.followUpText}>
                      Karantina QC {rcpt.number}
                    </span>
                    <span className={styles.followUpSubtext}>
                      {rcpt.supplierName} · Ditahan{" "}
                      {formatQty(totalHeld, unit)} dari PO {rcpt.poNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.textLink}
                    onClick={() => onSelectReceipt(rcpt.id)}
                  >
                    Lihat rincian
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}

export function PayablesAgingBars({
  buckets,
}: {
  buckets: readonly PayablesAgingRow[];
}) {
  const maxAmount = Math.max(1, ...buckets.map((b) => b.amount));
  return (
    <div className={styles.agingList}>
      {buckets.map((bucket) => {
        const pct =
          bucket.amount <= 0
            ? 0
            : Math.max(5, Math.round((bucket.amount / maxAmount) * 100));
        const fillClass =
          bucket.tone === "current"
            ? styles.agingFillCurrent
            : bucket.tone === "warning"
              ? styles.agingFillWarning
              : styles.agingFillOverdue;
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
              <div className={fillClass} style={{ width: `${pct}%` }} />
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
