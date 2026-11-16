"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { User } from "@/shared/contracts/auth";
import foundationStyles from "@/components/foundation.module.css";
import {
  INITIAL_CUSTOMERS,
  INITIAL_INVOICES,
  INITIAL_SALES_ORDERS,
  ORDER_FOLLOW_UPS,
  ORDER_STAGE_BASE_COUNTS,
  PENDAPATAN_TABS,
  PERIOD_DATASETS,
  RECEIVABLES_SNAPSHOTS,
  SUMMARY_FOLLOW_UPS,
  TODAY_TASK_QUEUE,
  formatRupiahCompact,
  formatRupiahFull,
  type InvoiceRecord,
  type InvoiceStatus,
  type OrderStatus,
  type PendapatanTab,
  type PeriodOption,
  type QueueTask,
  type ReceivablesDateOption,
  type SalesOrderItem,
} from "./data";
import { AgingBars, OrderStageBarChart, TrendLineChart } from "./trend-chart";
import {
  CreateOrderDrawer,
  CustomersDrawer,
  InvoiceDetailDrawer,
  InvoiceStatusPill,
  OrderDetailDrawer,
  OrderStatusPill,
  TaskDetailDrawer,
  TaskStatusPill,
} from "./drawers";
import styles from "./pendapatan.module.css";

function normalizeTab(raw?: string): PendapatanTab {
  if (raw === "pesanan" || raw === "piutang") return raw;
  return "ringkasan";
}

function actionLabelForOrderStatus(status: OrderStatus): string {
  switch (status) {
    case "Menunggu verifikasi":
      return "Tinjau kredit";
    case "Perlu cek stok":
      return "Cek stok";
    case "Siap dikirim":
      return "Buat DO";
    case "Dikirim":
      return "Lihat pesanan";
  }
}

export function PendapatanView({
  user,
  initialTab,
}: {
  user: User;
  initialTab?: string;
}) {
  const [activeTab, setActiveTab] = useState<PendapatanTab>(() =>
    normalizeTab(initialTab),
  );
  const [period, setPeriod] = useState<PeriodOption>("30d");
  const [receivablesDate, setReceivablesDate] =
    useState<ReceivablesDateOption>("2026-11-16");

  // Pesanan state
  const [orders, setOrders] = useState<SalesOrderItem[]>(() => [
    ...INITIAL_SALES_ORDERS,
  ]);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<
    "ALL" | OrderStatus
  >("ALL");
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [customersOpen, setCustomersOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Piutang state
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(() => [
    ...INITIAL_INVOICES,
  ]);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<
    "ALL" | InvoiceStatus
  >("ALL");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null,
  );

  // Task queue drawer
  const [selectedTask, setSelectedTask] = useState<QueueTask | null>(null);

  const activeTabMeta =
    PENDAPATAN_TABS.find((t) => t.key === activeTab) ?? PENDAPATAN_TABS[0];

  function selectTab(next: PendapatanTab) {
    setActiveTab(next);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (next === "ringkasan") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", next);
      }
      window.history.replaceState(null, "", url.toString());
    }
  }

  // Compute dynamic stage deltas from initial orders
  const stageCounts = (() => {
    const counts = { ...ORDER_STAGE_BASE_COUNTS };
    const initialById = new Map(INITIAL_SALES_ORDERS.map((o) => [o.id, o]));
    for (const order of orders) {
      const orig = initialById.get(order.id);
      if (!orig) {
        if (order.status !== "Dikirim") counts[order.status] += 1;
      } else if (orig.status !== order.status) {
        if (orig.status !== "Dikirim") {
          counts[orig.status] = Math.max(0, counts[orig.status] - 1);
        }
        if (order.status !== "Dikirim") {
          counts[order.status] += 1;
        }
      }
    }
    return counts;
  })();

  const filteredOrders = orders.filter((order) => {
    if (orderStatusFilter !== "ALL" && order.status !== orderStatusFilter) {
      return false;
    }
    const q = orderSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      order.number.toLowerCase().includes(q) ||
      order.customerName.toLowerCase().includes(q)
    );
  });

  const filteredInvoices = invoices.filter((inv) => {
    if (!inv.inTable) return false;
    if (invoiceStatusFilter !== "ALL" && inv.status !== invoiceStatusFilter) {
      return false;
    }
    const q = invoiceSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      inv.number.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q)
    );
  });

  const selectedOrder =
    orders.find((order) => order.id === selectedOrderId) ?? null;
  const selectedInvoice =
    invoices.find((inv) => inv.id === selectedInvoiceId) ?? null;

  const periodDataset = PERIOD_DATASETS[period];
  const receivablesSnapshot = RECEIVABLES_SNAPSHOTS[receivablesDate];

  function handleCreateOrder(input: {
    customerId: string;
    itemsSummary: string;
    amount: number;
    warehouse: string;
  }) {
    const customer = INITIAL_CUSTOMERS.find((c) => c.id === input.customerId);
    if (!customer) return;
    const nextNum = 241 + orders.length;
    const number = `SO-0${nextNum}`;
    const newOrder: SalesOrderItem = {
      id: `so-0${nextNum}`,
      number,
      customerId: customer.id,
      customerName: customer.name,
      dateLabel: "16 Nov 2026",
      amount: input.amount,
      status: "Menunggu verifikasi",
      actionLabel: "Tinjau kredit",
      warehouse: input.warehouse,
      itemsSummary: input.itemsSummary,
      creditNote: `Limit ${formatRupiahCompact(customer.creditLimit)}, menunggu tinjauan kredit.`,
      stockNote: "Menunggu verifikasi kredit sebelum reservasi stok.",
    };
    setOrders((prev) => [newOrder, ...prev]);
  }

  function handleAdvanceOrder(orderId: string, nextStatus: OrderStatus) {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: nextStatus,
              actionLabel: actionLabelForOrderStatus(nextStatus),
            }
          : order,
      ),
    );
  }

  function handleVerifyMatching(invoiceId: string) {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              status: "Menunggu pembayaran",
              actionLabel: "Catat pembayaran",
              matchingNote:
                "3-way matching SO, DO, dan invoice terverifikasi lengkap; siap menerima pelunasan.",
            }
          : inv,
      ),
    );
  }

  function handleRecordPayment(invoiceId: string, paidAmount: number) {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const remaining = Math.max(0, inv.remainingAmount - paidAmount);
        const nextStatus: InvoiceStatus =
          remaining === 0 ? "Lunas" : inv.status;
        return {
          ...inv,
          remainingAmount: remaining,
          status: nextStatus,
          actionLabel: remaining === 0 ? "Lihat invoice" : inv.actionLabel,
          matchingNote:
            remaining === 0
              ? "Pembayaran lunas dicatat dan menunggu validasi akhir Treasury."
              : `Pembayaran parsial ${formatRupiahCompact(paidAmount)} dicatat.`,
        };
      }),
    );
  }

  function handleOpenFollowUp(targetTab: PendapatanTab, reference?: string) {
    selectTab(targetTab);
    if (!reference) return;
    if (targetTab === "pesanan") {
      const match = orders.find((o) => o.number === reference);
      if (match) setSelectedOrderId(match.id);
    } else if (targetTab === "piutang") {
      const match = invoices.find((inv) => inv.number === reference);
      if (match) setSelectedInvoiceId(match.id);
    }
  }

  return (
    <section className={styles.page}>
      <header className={foundationStyles.banner}>
        <h1>{activeTabMeta.bannerTitle}</h1>
      </header>

      <div
        className={styles.tabBar}
        role="tablist"
        aria-label="Submenu Pendapatan"
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          e.preventDefault();
          const idx = PENDAPATAN_TABS.findIndex((t) => t.key === activeTab);
          const next =
            PENDAPATAN_TABS[
              (idx +
                (e.key === "ArrowRight" ? 1 : PENDAPATAN_TABS.length - 1)) %
                PENDAPATAN_TABS.length
            ];
          selectTab(next.key);
          document.getElementById(`pendapatan-tab-${next.key}`)?.focus();
        }}
      >
        {PENDAPATAN_TABS.map((tab) => (
          <button
            key={tab.key}
            id={`pendapatan-tab-${tab.key}`}
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
        aria-labelledby={`pendapatan-tab-${activeTab}`}
        className={styles.page}
      >
        {activeTab === "ringkasan" && (
          <>
            <div className={styles.filterBar}>
              <label htmlFor="pendapatan-period" className="sr-only">
                Periode ringkasan
              </label>
              <div className={styles.selectControl}>
                <select
                  id="pendapatan-period"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as PeriodOption)}
                >
                  <option value="30d">30 hari terakhir</option>
                  <option value="7d">7 hari terakhir</option>
                  <option value="90d">90 hari terakhir</option>
                </select>
              </div>
            </div>

            <div className={styles.kpiGrid}>
              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Nilai Pesanan</span>
                <strong className={styles.kpiValue}>
                  {formatRupiahFull(periodDataset.orderValue)}
                </strong>
              </article>
              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Pembayaran Diterima</span>
                <strong className={styles.kpiValue}>
                  {formatRupiahFull(periodDataset.paymentReceived)}
                </strong>
              </article>
              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Piutang Terbuka</span>
                <strong className={styles.kpiValue}>
                  {formatRupiahFull(periodDataset.openReceivables)}
                </strong>
              </article>
            </div>

            <div className={styles.splitGrid}>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    Tren Pesanan dan Pembayaran
                  </h2>
                </div>
                <TrendLineChart dataset={periodDataset} />
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Perlu Ditindaklanjuti</h2>
                </div>
                <ul className={styles.followUpList}>
                  {SUMMARY_FOLLOW_UPS.map((item) => (
                    <li className={styles.followUpItem} key={item.id}>
                      <span className={styles.followUpText}>{item.label}</span>
                      <button
                        type="button"
                        className={styles.textLink}
                        onClick={() =>
                          handleOpenFollowUp(item.targetTab, item.reference)
                        }
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
                      <th scope="col">Status</th>
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TODAY_TASK_QUEUE.map((row) => (
                      <tr key={row.id}>
                        <td>{row.task}</td>
                        <td className={styles.tabular}>{row.reference}</td>
                        <td>
                          <TaskStatusPill status={row.status} />
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.textLink}
                            onClick={() => setSelectedTask(row)}
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

        {activeTab === "pesanan" && (
          <>
            <div className={styles.toolbar}>
              <label className={styles.searchBox}>
                <Search aria-hidden />
                <span className="sr-only">Cari nomor SO atau pelanggan</span>
                <input
                  type="search"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Cari nomor SO atau pelanggan"
                />
              </label>

              <div className={styles.selectControl}>
                <label htmlFor="order-status-filter" className="sr-only">
                  Filter status pesanan
                </label>
                <select
                  id="order-status-filter"
                  value={orderStatusFilter}
                  onChange={(e) =>
                    setOrderStatusFilter(
                      e.target.value as "ALL" | OrderStatus,
                    )
                  }
                >
                  <option value="ALL">Semua status</option>
                  <option value="Menunggu verifikasi">
                    Menunggu verifikasi
                  </option>
                  <option value="Perlu cek stok">Perlu cek stok</option>
                  <option value="Siap dikirim">Siap dikirim</option>
                  <option value="Dikirim">Dikirim</option>
                </select>
              </div>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => setCreateOrderOpen(true)}
              >
                Buat Sales Order
              </button>
            </div>

            <div className={styles.kpiGrid}>
              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>
                  Menunggu Verifikasi Kredit
                </span>
                <strong className={styles.kpiValue}>
                  {stageCounts["Menunggu verifikasi"]}
                </strong>
              </article>
              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Perlu Cek Stok</span>
                <strong className={styles.kpiValue}>
                  {stageCounts["Perlu cek stok"]}
                </strong>
              </article>
              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Siap Dikirim</span>
                <strong className={styles.kpiValue}>
                  {stageCounts["Siap dikirim"]}
                </strong>
              </article>
            </div>

            <div className={styles.splitGrid}>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    Pesanan Terbuka per Tahap
                  </h2>
                </div>
                <OrderStageBarChart
                  stages={[
                    {
                      label: "Menunggu Verifikasi Kredit",
                      count: stageCounts["Menunggu verifikasi"],
                      gradient: ["#1e63f4", "#2985ff"],
                    },
                    {
                      label: "Perlu Cek Stok",
                      count: stageCounts["Perlu cek stok"],
                      gradient: ["#0a76f6", "#159ef7"],
                    },
                    {
                      label: "Siap Dikirim",
                      count: stageCounts["Siap dikirim"],
                      gradient: ["#0699f0", "#0ec4ec"],
                    },
                  ]}
                />
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Perlu Ditindaklanjuti</h2>
                </div>
                <ul className={styles.followUpList}>
                  {ORDER_FOLLOW_UPS.map((item) => (
                    <li className={styles.followUpItem} key={item.id}>
                      <span className={styles.followUpText}>{item.label}</span>
                      <button
                        type="button"
                        className={styles.textLink}
                        onClick={() => {
                          const target = orders.find(
                            (o) => o.number === item.reference,
                          );
                          if (target) setSelectedOrderId(target.id);
                        }}
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
                <h2 className={styles.cardTitle}>Daftar Pesanan</h2>
                <button
                  type="button"
                  className={`${styles.textLink} ${styles.underlinedLink}`}
                  onClick={() => setCustomersOpen(true)}
                >
                  Kelola pelanggan
                </button>
              </div>
              <div
                className={styles.tableWrap}
                role="region"
                tabIndex={0}
                aria-label="Daftar Pesanan"
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">No. SO</th>
                      <th scope="col">Pelanggan</th>
                      <th scope="col">Tanggal</th>
                      <th scope="col">Nilai Pesanan</th>
                      <th scope="col">Status</th>
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.emptyRow}>
                          Tidak ada Sales Order yang cocok dengan filter.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr key={order.id}>
                          <td className={styles.tabular}>{order.number}</td>
                          <td>{order.customerName}</td>
                          <td>{order.dateLabel}</td>
                          <td className={styles.tabular}>
                            {formatRupiahFull(order.amount)}
                          </td>
                          <td>
                            <OrderStatusPill status={order.status} />
                          </td>
                          <td>
                            <button
                              type="button"
                              className={styles.textLink}
                              onClick={() => setSelectedOrderId(order.id)}
                            >
                              {order.actionLabel}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {activeTab === "piutang" && (
          <>
            <div className={styles.filterBar}>
              <label htmlFor="receivables-date" className={styles.filterLabel}>
                Per tanggal
              </label>
              <div className={styles.selectControl}>
                <select
                  id="receivables-date"
                  value={receivablesDate}
                  onChange={(e) =>
                    setReceivablesDate(e.target.value as ReceivablesDateOption)
                  }
                >
                  <option value="2026-11-16">16 Nov 2026</option>
                  <option value="2026-11-30">30 Nov 2026</option>
                  <option value="2026-10-31">31 Okt 2026</option>
                </select>
              </div>
            </div>

            <div className={styles.kpiGrid}>
              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Total Piutang</span>
                <strong className={styles.kpiValue}>
                  {formatRupiahCompact(receivablesSnapshot.totalReceivables)}
                </strong>
              </article>
              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Lewat Jatuh Tempo</span>
                <strong className={styles.kpiValue}>
                  {formatRupiahCompact(receivablesSnapshot.overdueReceivables)}
                </strong>
              </article>
              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Pembayaran Bulan Ini</span>
                <strong className={styles.kpiValue}>
                  {formatRupiahCompact(receivablesSnapshot.paymentsThisMonth)}
                </strong>
              </article>
            </div>

            <div className={styles.splitGrid}>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Aging Piutang</h2>
                </div>
                <AgingBars buckets={receivablesSnapshot.aging} />
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Prioritas Penagihan</h2>
                </div>
                <ul className={styles.followUpList}>
                  {receivablesSnapshot.priorities.map((item) => (
                    <li className={styles.priorityItem} key={item.id}>
                      <div className={styles.priorityMain}>
                        <span className={styles.priorityCustomer}>
                          {item.customerName}
                        </span>
                        <span className={styles.priorityInvoice}>
                          {item.invoiceNumber}
                        </span>
                        <span className={`${styles.pill} ${styles.pillDanger}`}>
                          {item.overdueDays} hari terlambat
                        </span>
                      </div>
                      <div className={styles.priorityRight}>
                        <span className={styles.priorityAmount}>
                          {formatRupiahCompact(item.amount)}
                        </span>
                        <button
                          type="button"
                          className={styles.textLink}
                          onClick={() => {
                            const target = invoices.find(
                              (inv) => inv.number === item.invoiceNumber,
                            );
                            if (target) setSelectedInvoiceId(target.id);
                          }}
                        >
                          Lihat invoice
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Daftar Invoice</h2>
                <div className={styles.headerControls}>
                  <label className={styles.searchBox}>
                    <Search aria-hidden />
                    <span className="sr-only">
                      Cari invoice atau pelanggan
                    </span>
                    <input
                      type="search"
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      placeholder="Cari invoice atau pelanggan"
                    />
                  </label>
                  <div className={styles.selectControl}>
                    <label
                      htmlFor="invoice-status-filter"
                      className="sr-only"
                    >
                      Filter status invoice
                    </label>
                    <select
                      id="invoice-status-filter"
                      value={invoiceStatusFilter}
                      onChange={(e) =>
                        setInvoiceStatusFilter(
                          e.target.value as "ALL" | InvoiceStatus,
                        )
                      }
                    >
                      <option value="ALL">Semua status</option>
                      <option value="Perlu pencocokan">
                        Perlu pencocokan
                      </option>
                      <option value="Menunggu pembayaran">
                        Menunggu pembayaran
                      </option>
                      <option value="Lewat jatuh tempo">
                        Lewat jatuh tempo
                      </option>
                      <option value="Lunas">Lunas</option>
                    </select>
                  </div>
                </div>
              </div>
              <div
                className={styles.tableWrap}
                role="region"
                tabIndex={0}
                aria-label="Daftar Invoice"
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Invoice</th>
                      <th scope="col">Pelanggan</th>
                      <th scope="col">Jatuh Tempo</th>
                      <th scope="col">Sisa Tagihan</th>
                      <th scope="col">Status</th>
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.emptyRow}>
                          Tidak ada invoice yang cocok dengan filter.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => (
                        <tr key={inv.id}>
                          <td className={styles.tabular}>{inv.number}</td>
                          <td>{inv.customerName}</td>
                          <td>{inv.dueDateLabel}</td>
                          <td className={styles.tabular}>
                            {formatRupiahCompact(inv.remainingAmount)}
                          </td>
                          <td>
                            <InvoiceStatusPill status={inv.status} />
                          </td>
                          <td>
                            <button
                              type="button"
                              className={styles.textLink}
                              onClick={() => setSelectedInvoiceId(inv.id)}
                            >
                              {inv.actionLabel}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>

      <CreateOrderDrawer
        open={createOrderOpen}
        onOpenChange={setCreateOrderOpen}
        user={user}
        customers={[...INITIAL_CUSTOMERS]}
        onCreateOrder={handleCreateOrder}
      />
      <CustomersDrawer
        open={customersOpen}
        onOpenChange={setCustomersOpen}
        customers={[...INITIAL_CUSTOMERS]}
      />
      <OrderDetailDrawer
        order={selectedOrder}
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null);
        }}
        user={user}
        onAdvanceOrder={handleAdvanceOrder}
      />
      <InvoiceDetailDrawer
        invoice={selectedInvoice}
        onOpenChange={(open) => {
          if (!open) setSelectedInvoiceId(null);
        }}
        user={user}
        onRecordPayment={handleRecordPayment}
        onVerifyMatching={handleVerifyMatching}
      />
      <TaskDetailDrawer
        task={selectedTask}
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null);
        }}
        onNavigateTarget={handleOpenFollowUp}
      />
    </section>
  );
}
