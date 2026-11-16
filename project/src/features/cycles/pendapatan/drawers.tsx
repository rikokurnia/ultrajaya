"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { User } from "@/shared/contracts/auth";
import { can } from "@/lib/auth/permissions";
import {
  formatRupiahCompact,
  formatRupiahFull,
  type CustomerRecord,
  type InvoiceRecord,
  type OrderStatus,
  type PendapatanTab,
  type QueueTask,
  type SalesOrderItem,
} from "./data";
import styles from "./pendapatan.module.css";

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

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  const cls =
    status === "Menunggu verifikasi"
      ? styles.pillInfo
      : status === "Perlu cek stok"
        ? styles.pillWarning
        : status === "Siap dikirim"
          ? styles.pillSuccess
          : styles.pillNeutral;
  return <span className={`${styles.pill} ${cls}`}>{status}</span>;
}

export function InvoiceStatusPill({ status }: { status: InvoiceRecord["status"] }) {
  const cls =
    status === "Perlu pencocokan"
      ? styles.pillWarning
      : status === "Menunggu pembayaran"
        ? styles.pillInfo
        : status === "Lewat jatuh tempo"
          ? styles.pillDanger
          : styles.pillSuccess;
  return <span className={`${styles.pill} ${cls}`}>{status}</span>;
}

export function TaskStatusPill({ status }: { status: QueueTask["status"] }) {
  const cls =
    status === "Sedang berjalan"
      ? styles.pillInfo
      : status === "Perlu ditinjau"
        ? styles.pillWarning
        : styles.pillNeutral;
  return <span className={`${styles.pill} ${cls}`}>{status}</span>;
}

export function CreateOrderDrawer({
  open,
  onOpenChange,
  user,
  customers,
  onCreateOrder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  customers: CustomerRecord[];
  onCreateOrder: (input: {
    customerId: string;
    itemsSummary: string;
    amount: number;
    warehouse: string;
  }) => void;
}) {
  const canCreate = can(user, "sales_orders:write");
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [itemsSummary, setItemsSummary] = useState(
    "Ultra Milk Full Cream 1L (500 karton)",
  );
  const [amountInput, setAmountInput] = useState("25000000");
  const [warehouse, setWarehouse] = useState("Gudang Jadi Cimahi");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate) return;
    const numericAmount = Number(amountInput.replaceAll(/[^0-9]/g, ""));
    if (!customerId) {
      setError("Pilih pelanggan terlebih dahulu.");
      return;
    }
    if (!itemsSummary.trim()) {
      setError("Masukkan ringkasan produk pesanan.");
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Masukkan nilai pesanan yang valid.");
      return;
    }
    setError(null);
    onCreateOrder({
      customerId,
      itemsSummary: itemsSummary.trim(),
      amount: numericAmount,
      warehouse,
    });
    onOpenChange(false);
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Buat Sales Order"
      description="Formulir entri pesanan penjualan baru pada siklus Pendapatan."
    >
      <div className={styles.drawerStack}>
        {!canCreate && (
          <div className={styles.drawerNotice} role="status">
            Peran Anda saat ini bersifat hanya-baca untuk transaksi bisnis.
            Pembuatan Sales Order hanya diotorisasi untuk peran{" "}
            <strong>Sales Admin</strong>.
          </div>
        )}
        <form onSubmit={handleSubmit} className={styles.drawerForm}>
          <label>
            Pelanggan
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              disabled={!canCreate}
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </label>
          <label>
            Produk &amp; Kuantitas
            <input
              type="text"
              value={itemsSummary}
              onChange={(e) => setItemsSummary(e.target.value)}
              disabled={!canCreate}
              required
            />
          </label>
          <label>
            Nilai Pesanan (Rp)
            <input
              type="number"
              min={1000}
              step={1000}
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              disabled={!canCreate}
              required
            />
          </label>
          <label>
            Gudang Asal
            <select
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
              disabled={!canCreate}
            >
              <option value="Gudang Jadi Cimahi">Gudang Jadi Cimahi</option>
              <option value="Gudang Distribusi Bandung">
                Gudang Distribusi Bandung
              </option>
              <option value="Gudang Distribusi Semarang">
                Gudang Distribusi Semarang
              </option>
            </select>
          </label>
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
              disabled={!canCreate}
            >
              Simpan Sales Order
            </button>
          </div>
        </form>
      </div>
    </DrawerShell>
  );
}

export function CustomersDrawer({
  open,
  onOpenChange,
  customers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: CustomerRecord[];
}) {
  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Kelola Pelanggan"
      description="Daftar pelanggan aktif, limit kredit, eksposur berjalan, dan termin pembayaran."
    >
      <div className={styles.drawerStack}>
        {customers.map((customer) => (
          <div className={styles.customerCard} key={customer.id}>
            <div className={styles.customerCardTop}>
              <div>
                <strong style={{ color: "#081e50" }}>{customer.name}</strong>
                <div style={{ fontSize: 12, color: "#52658a" }}>
                  {customer.code} · {customer.city} · Termin{" "}
                  {customer.paymentTermsDays} hari
                </div>
              </div>
              <span
                className={`${styles.pill} ${
                  customer.status === "Aktif"
                    ? styles.pillSuccess
                    : styles.pillInfo
                }`}
              >
                {customer.status}
              </span>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span>Limit Kredit</span>
                <strong>{formatRupiahFull(customer.creditLimit)}</strong>
              </div>
              <div className={styles.metaItem}>
                <span>Eksposur Aktif</span>
                <strong>{formatRupiahFull(customer.activeExposure)}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DrawerShell>
  );
}

export function OrderDetailDrawer({
  order,
  onOpenChange,
  user,
  onAdvanceOrder,
}: {
  order: SalesOrderItem | null;
  onOpenChange: (open: boolean) => void;
  user: User;
  onAdvanceOrder: (orderId: string, nextStatus: OrderStatus) => void;
}) {
  if (!order) return null;

  const canApproveCredit = can(user, "sales_orders:approve");
  const canCheckStock = can(user, "dispatches:write");
  const canIssueDo = can(user, "dispatches:write");

  const nextAction: {
    label: string;
    nextStatus: OrderStatus;
    allowed: boolean;
    requiredRole: string;
  } | null =
    order.status === "Menunggu verifikasi"
      ? {
          label: "Setujui Kredit",
          nextStatus: "Perlu cek stok",
          allowed: canApproveCredit,
          requiredRole: "Credit Manager / Finance Manager",
        }
      : order.status === "Perlu cek stok"
        ? {
            label: "Konfirmasi Ketersediaan Stok",
            nextStatus: "Siap dikirim",
            allowed: canCheckStock,
            requiredRole: "Gudang / Logistik",
          }
        : order.status === "Siap dikirim"
          ? {
              label: "Terbitkan Delivery Order (DO)",
              nextStatus: "Dikirim",
              allowed: canIssueDo,
              requiredRole: "Gudang / Logistik",
            }
          : null;

  return (
    <DrawerShell
      open={!!order}
      onOpenChange={onOpenChange}
      title={`${order.number} — ${order.customerName}`}
      description={`Rincian Sales Order tanggal ${order.dateLabel}`}
    >
      <div className={styles.drawerStack}>
        <div className={styles.drawerSection}>
          <div className={styles.customerCardTop}>
            <h3>Ringkasan Pesanan</h3>
            <OrderStatusPill status={order.status} />
          </div>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span>Nomor SO</span>
              <strong>{order.number}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Nilai Pesanan</span>
              <strong>{formatRupiahFull(order.amount)}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Tanggal</span>
              <strong>{order.dateLabel}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Gudang</span>
              <strong>{order.warehouse}</strong>
            </div>
          </div>
        </div>

        <div className={styles.drawerSection}>
          <h3>Detail Produk</h3>
          <p style={{ margin: 0, fontSize: 14, color: "#081e50" }}>
            {order.itemsSummary}
          </p>
        </div>

        <div className={styles.drawerSection}>
          <h3>Status Kredit &amp; Stok</h3>
          <p style={{ margin: 0, fontSize: 13, color: "#36476a" }}>
            <strong>Kredit:</strong> {order.creditNote}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: "#36476a" }}>
            <strong>Stok:</strong> {order.stockNote}
          </p>
        </div>

        {nextAction && !nextAction.allowed && (
          <div className={styles.drawerNotice} role="status">
            Tindakan <strong>{nextAction.label}</strong> diotorisasi untuk peran{" "}
            <strong>{nextAction.requiredRole}</strong>. Akun Anda saat ini
            hanya dapat meninjau rincian dokumen.
          </div>
        )}

        <div className={styles.drawerActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => onOpenChange(false)}
          >
            Tutup
          </button>
          {nextAction && (
            <button
              type="button"
              className={styles.primaryButton}
              disabled={!nextAction.allowed}
              onClick={() => {
                onAdvanceOrder(order.id, nextAction.nextStatus);
                onOpenChange(false);
              }}
            >
              {nextAction.label}
            </button>
          )}
        </div>
      </div>
    </DrawerShell>
  );
}

export function InvoiceDetailDrawer({
  invoice,
  onOpenChange,
  user,
  onRecordPayment,
  onVerifyMatching,
}: {
  invoice: InvoiceRecord | null;
  onOpenChange: (open: boolean) => void;
  user: User;
  onRecordPayment: (invoiceId: string, paidAmount: number) => void;
  onVerifyMatching: (invoiceId: string) => void;
}) {
  const [paymentInput, setPaymentInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!invoice) return null;

  const canRecordPayment = can(user, "receipts_incoming:write");
  const canMatch = can(user, "customer_invoices:write");

  function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invoice || !canRecordPayment) return;
    const raw = paymentInput.trim()
      ? Number(paymentInput.replaceAll(/[^0-9]/g, ""))
      : invoice.remainingAmount;
    if (!Number.isFinite(raw) || raw <= 0 || raw > invoice.remainingAmount) {
      setError(
        `Masukkan nominal antara Rp1 hingga ${formatRupiahFull(invoice.remainingAmount)}.`,
      );
      return;
    }
    setError(null);
    onRecordPayment(invoice.id, raw);
    setPaymentInput("");
    onOpenChange(false);
  }

  return (
    <DrawerShell
      open={!!invoice}
      onOpenChange={onOpenChange}
      title={`${invoice.number} — ${invoice.customerName}`}
      description={`Rincian tagihan dan pencocokan dokumen penjualan`}
    >
      <div className={styles.drawerStack}>
        <div className={styles.drawerSection}>
          <div className={styles.customerCardTop}>
            <h3>Informasi Invoice</h3>
            <InvoiceStatusPill status={invoice.status} />
          </div>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span>Referensi SO / DO</span>
              <strong>
                {invoice.soNumber} · {invoice.doNumber}
              </strong>
            </div>
            <div className={styles.metaItem}>
              <span>Jatuh Tempo</span>
              <strong>{invoice.dueDateLabel}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Nilai Tagihan</span>
              <strong>{formatRupiahCompact(invoice.totalAmount)}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Sisa Tagihan</span>
              <strong>{formatRupiahCompact(invoice.remainingAmount)}</strong>
            </div>
          </div>
        </div>

        <div className={styles.drawerSection}>
          <h3>Status Pencocokan &amp; Penagihan</h3>
          <p style={{ margin: 0, fontSize: 13, color: "#36476a" }}>
            {invoice.matchingNote}
          </p>
        </div>

        {invoice.status === "Perlu pencocokan" && (
          <>
            {!canMatch && (
              <div className={styles.drawerNotice} role="status">
                Pencocokan SO, DO, dan invoice diotorisasi untuk peran{" "}
                <strong>Piutang Dagang (AR)</strong>.
              </div>
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
                type="button"
                className={styles.primaryButton}
                disabled={!canMatch}
                onClick={() => {
                  onVerifyMatching(invoice.id);
                  onOpenChange(false);
                }}
              >
                Selesaikan Pencocokan Dokumen
              </button>
            </div>
          </>
        )}

        {(invoice.status === "Menunggu pembayaran" ||
          invoice.status === "Lewat jatuh tempo") && (
          <form onSubmit={handlePaymentSubmit} className={styles.drawerForm}>
            {!canRecordPayment && (
              <div className={styles.drawerNotice} role="status">
                Pencatatan penerimaan pembayaran diotorisasi untuk peran{" "}
                <strong>Piutang Dagang (AR)</strong> dan divalidasi oleh{" "}
                <strong>Treasury</strong>.
              </div>
            )}
            <label>
              Nominal Pembayaran Diterima (Rp)
              <input
                type="number"
                min={1}
                max={invoice.remainingAmount}
                placeholder={String(invoice.remainingAmount)}
                value={paymentInput}
                onChange={(e) => setPaymentInput(e.target.value)}
                disabled={!canRecordPayment}
              />
            </label>
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
                disabled={!canRecordPayment}
              >
                Catat Pembayaran
              </button>
            </div>
          </form>
        )}

        {invoice.status === "Lunas" && (
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

export function TaskDetailDrawer({
  task,
  onOpenChange,
  onNavigateTarget,
}: {
  task: QueueTask | null;
  onOpenChange: (open: boolean) => void;
  onNavigateTarget: (tab: PendapatanTab, reference: string) => void;
}) {
  if (!task) return null;

  return (
    <DrawerShell
      open={!!task}
      onOpenChange={onOpenChange}
      title={task.task}
      description={`Referensi ${task.reference} · Penanggung jawab: ${task.ownerRole}`}
    >
      <div className={styles.drawerStack}>
        <div className={styles.drawerSection}>
          <div className={styles.customerCardTop}>
            <h3>Detail Tugas</h3>
            <TaskStatusPill status={task.status} />
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "#081e50" }}>
            {task.description}
          </p>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span>Referensi Dokumen</span>
              <strong>{task.reference}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Peran Terkait</span>
              <strong>{task.ownerRole}</strong>
            </div>
          </div>
        </div>
        <div className={styles.drawerActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => onOpenChange(false)}
          >
            Tutup
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => {
              onNavigateTarget(task.targetTab, task.reference);
              onOpenChange(false);
            }}
          >
            Buka Tab {task.targetTab === "pesanan" ? "Pesanan" : "Piutang"}
          </button>
        </div>
      </div>
    </DrawerShell>
  );
}
