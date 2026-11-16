export type PendapatanTab = "ringkasan" | "pesanan" | "piutang";

export type PeriodOption = "30d" | "7d" | "90d";
export type ReceivablesDateOption = "2026-11-16" | "2026-11-30" | "2026-10-31";

export type TaskStatus = "Sedang berjalan" | "Perlu ditinjau" | "Belum dimulai";
export type OrderStatus =
  "Menunggu verifikasi" | "Perlu cek stok" | "Siap dikirim" | "Dikirim";
export type InvoiceStatus =
  "Perlu pencocokan" | "Menunggu pembayaran" | "Lewat jatuh tempo" | "Lunas";

export interface TrendPoint {
  label: string;
  orderMillions: number;
  paymentMillions: number;
}

export interface PeriodDataset {
  key: PeriodOption;
  label: string;
  orderValue: number;
  paymentReceived: number;
  openReceivables: number;
  yMaxMillions: number;
  yTicksMillions: number[];
  series: TrendPoint[];
}

export interface QueueTask {
  id: string;
  task: string;
  reference: string;
  status: TaskStatus;
  actionLabel: string;
  targetTab: PendapatanTab;
  description: string;
  ownerRole: string;
}

export interface FollowUpItem {
  id: string;
  label: string;
  actionLabel: string;
  targetTab: PendapatanTab;
  reference?: string;
}

export interface CustomerRecord {
  id: string;
  code: string;
  name: string;
  city: string;
  creditLimit: number;
  activeExposure: number;
  paymentTermsDays: number;
  status: "Aktif" | "Menunggu verifikasi";
}

export interface SalesOrderItem {
  createdByUserId?: string;
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  dateLabel: string;
  amount: number;
  status: OrderStatus;
  actionLabel: string;
  warehouse: string;
  itemsSummary: string;
  creditNote: string;
  stockNote: string;
}

export interface AgingBucketRow {
  label: string;
  amount: number;
  tone: "current" | "overdue";
}

export interface CollectionPriorityItem {
  id: string;
  customerName: string;
  invoiceNumber: string;
  overdueDays: number;
  amount: number;
}

export interface ReceivablesSnapshot {
  key: ReceivablesDateOption;
  label: string;
  totalReceivables: number;
  overdueReceivables: number;
  paymentsThisMonth: number;
  aging: AgingBucketRow[];
  priorities: CollectionPriorityItem[];
}

export interface InvoiceRecord {
  id: string;
  number: string;
  customerName: string;
  soNumber: string;
  doNumber: string;
  dueDateLabel: string;
  totalAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
  actionLabel: string;
  matchingNote: string;
  inTable: boolean;
}

export function formatRupiahFull(amount: number): string {
  const formatted = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(amount)));
  return `Rp${formatted}`;
}

export function formatRupiahCompact(amount: number): string {
  if (amount <= 0) return "Rp0";
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const formatted = new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(millions);
    return `Rp${formatted} jt`;
  }
  return formatRupiahFull(amount);
}

export const PENDAPATAN_TABS: readonly {
  key: PendapatanTab;
  label: string;
  bannerTitle: string;
}[] = [
  {
    key: "ringkasan",
    label: "Ringkasan",
    bannerTitle: "Ringkasan Pendapatan",
  },
  {
    key: "pesanan",
    label: "Pesanan",
    bannerTitle: "Pesanan",
  },
  {
    key: "piutang",
    label: "Piutang",
    bannerTitle: "Piutang",
  },
];

export const PERIOD_DATASETS: Record<PeriodOption, PeriodDataset> = {
  "30d": {
    key: "30d",
    label: "30 hari terakhir",
    orderValue: 1_280_000_000,
    paymentReceived: 960_000_000,
    openReceivables: 320_000_000,
    yMaxMillions: 400,
    yTicksMillions: [0, 100, 200, 300, 400],
    series: [
      { label: "Pekan 1", orderMillions: 240, paymentMillions: 180 },
      { label: "Pekan 2", orderMillions: 310, paymentMillions: 220 },
      { label: "Pekan 3", orderMillions: 330, paymentMillions: 250 },
      { label: "Pekan 4", orderMillions: 400, paymentMillions: 310 },
    ],
  },
  "7d": {
    key: "7d",
    label: "7 hari terakhir",
    orderValue: 400_000_000,
    paymentReceived: 310_000_000,
    openReceivables: 90_000_000,
    yMaxMillions: 160,
    yTicksMillions: [0, 40, 80, 120, 160],
    series: [
      { label: "Sen–Sel", orderMillions: 95, paymentMillions: 72 },
      { label: "Rab–Kam", orderMillions: 112, paymentMillions: 84 },
      { label: "Jum", orderMillions: 103, paymentMillions: 79 },
      { label: "Sab–Min", orderMillions: 90, paymentMillions: 75 },
    ],
  },
  "90d": {
    key: "90d",
    label: "90 hari terakhir",
    orderValue: 3_640_000_000,
    paymentReceived: 3_160_000_000,
    openReceivables: 480_000_000,
    yMaxMillions: 1600,
    yTicksMillions: [0, 400, 800, 1200, 1600],
    series: [
      { label: "Sep", orderMillions: 1080, paymentMillions: 960 },
      { label: "Okt", orderMillions: 1280, paymentMillions: 1120 },
      { label: "Nov (s.d. 16)", orderMillions: 1280, paymentMillions: 1080 },
      { label: "Proyeksi", orderMillions: 1420, paymentMillions: 1210 },
    ],
  },
};

export const SUMMARY_FOLLOW_UPS: readonly FollowUpItem[] = [
  {
    id: "fu-credit",
    label: "Verifikasi kredit pelanggan",
    actionLabel: "Buka tugas",
    targetTab: "pesanan",
    reference: "SO-0241",
  },
  {
    id: "fu-recon",
    label: "Rekonsiliasi pembayaran masuk",
    actionLabel: "Buka tugas",
    targetTab: "piutang",
    reference: "INV-0188",
  },
  {
    id: "fu-aging",
    label: "Tinjau aging piutang",
    actionLabel: "Buka tugas",
    targetTab: "piutang",
    reference: "INV-0185",
  },
];

export const TODAY_TASK_QUEUE: readonly QueueTask[] = [
  {
    id: "task-so-0242",
    task: "Cek stok pesanan",
    reference: "SO-0242",
    status: "Sedang berjalan",
    actionLabel: "Buka tugas",
    targetTab: "pesanan",
    description:
      "Konfirmasi ketersediaan stok UHT Full Cream & Teh Kotak di Gudang Distribusi Bandung untuk pesanan CV Mitra Niaga.",
    ownerRole: "Gudang / Logistik",
  },
  {
    id: "task-inv-0187",
    task: "Cocokkan SO, DO, dan invoice",
    reference: "INV-0187",
    status: "Perlu ditinjau",
    actionLabel: "Buka tugas",
    targetTab: "piutang",
    description:
      "Verifikasi kesesuaian kuantitas dan nilai antara Sales Order, Delivery Order bertanda tangan, dan draft invoice PT Sinar Retail.",
    ownerRole: "Piutang Dagang (AR)",
  },
  {
    id: "task-ag-0016",
    task: "Tinjau aging piutang",
    reference: "AG-0016",
    status: "Belum dimulai",
    actionLabel: "Buka tugas",
    targetTab: "piutang",
    description:
      "Evaluasi tagihan lewat jatuh tempo (>60 hari) untuk prioritas penagihan PT Prima Distribusi dan CV Sentosa Mart.",
    ownerRole: "Piutang Dagang & Credit Manager",
  },
];

export const ORDER_STAGE_BASE_COUNTS: Record<
  Exclude<OrderStatus, "Dikirim">,
  number
> = {
  "Menunggu verifikasi": 4,
  "Perlu cek stok": 6,
  "Siap dikirim": 8,
};

export const ORDER_FOLLOW_UPS: readonly FollowUpItem[] = [
  {
    id: "ofu-credit",
    label: "Verifikasi kredit pelanggan",
    actionLabel: "SO-0241",
    targetTab: "pesanan",
    reference: "SO-0241",
  },
  {
    id: "ofu-stock",
    label: "Konfirmasi ketersediaan stok",
    actionLabel: "SO-0242",
    targetTab: "pesanan",
    reference: "SO-0242",
  },
];

export const INITIAL_CUSTOMERS: readonly CustomerRecord[] = [
  {
    id: "cust-sinar",
    code: "PLG-001",
    name: "PT Sinar Retail",
    city: "Jakarta Selatan",
    creditLimit: 250_000_000,
    activeExposure: 95_000_000,
    paymentTermsDays: 30,
    status: "Menunggu verifikasi",
  },
  {
    id: "cust-mitra",
    code: "PLG-002",
    name: "CV Mitra Niaga",
    city: "Bandung",
    creditLimit: 180_000_000,
    activeExposure: 57_500_000,
    paymentTermsDays: 30,
    status: "Aktif",
  },
  {
    id: "cust-prima",
    code: "PLG-003",
    name: "PT Prima Distribusi",
    city: "Surabaya",
    creditLimit: 320_000_000,
    activeExposure: 89_000_000,
    paymentTermsDays: 45,
    status: "Aktif",
  },
  {
    id: "cust-sentosa",
    code: "PLG-004",
    name: "CV Sentosa Mart",
    city: "Semarang",
    creditLimit: 120_000_000,
    activeExposure: 15_000_000,
    paymentTermsDays: 14,
    status: "Aktif",
  },
];

export const INITIAL_SALES_ORDERS: readonly SalesOrderItem[] = [
  {
    id: "so-0241",
    number: "SO-0241",
    customerId: "cust-sinar",
    customerName: "PT Sinar Retail",
    dateLabel: "16 Nov 2026",
    amount: 42_500_000,
    status: "Menunggu verifikasi",
    actionLabel: "Tinjau kredit",
    warehouse: "Gudang Jadi Cimahi",
    itemsSummary: "Ultra Milk Full Cream 1L (1.250 karton)",
    creditNote:
      "Limit Rp250 jt, eksposur aktif Rp95 jt, proyeksi setelah SO Rp137,5 jt (dalam batas limit).",
    stockNote: "Menunggu persetujuan kredit sebelum reservasi stok.",
  },
  {
    id: "so-0242",
    number: "SO-0242",
    customerId: "cust-mitra",
    customerName: "CV Mitra Niaga",
    dateLabel: "16 Nov 2026",
    amount: 28_750_000,
    status: "Perlu cek stok",
    actionLabel: "Cek stok",
    warehouse: "Gudang Distribusi Bandung",
    itemsSummary: "Teh Kotak Jasmine 300ml (950 karton)",
    creditNote: "Kredit disetujui (eksposur 32% dari limit).",
    stockNote: "Stok tersedia 1.420 karton; siap dikonfirmasi untuk alokasi.",
  },
  {
    id: "so-0243",
    number: "SO-0243",
    customerId: "cust-prima",
    customerName: "PT Prima Distribusi",
    dateLabel: "15 Nov 2026",
    amount: 64_000_000,
    status: "Siap dikirim",
    actionLabel: "Buat DO",
    warehouse: "Gudang Jadi Cimahi",
    itemsSummary: "Ultra Milk Cokelat 250ml (2.000 karton)",
    creditNote: "Kredit disetujui oleh Credit Manager.",
    stockNote: "Stok tereservasi penuh; siap diterbitkan Delivery Order.",
  },
  {
    id: "so-0244",
    number: "SO-0244",
    customerId: "cust-sentosa",
    customerName: "CV Sentosa Mart",
    dateLabel: "14 Nov 2026",
    amount: 19_800_000,
    status: "Dikirim",
    actionLabel: "Lihat pesanan",
    warehouse: "Gudang Distribusi Semarang",
    itemsSummary: "Sari Kacang Ijo 250ml (660 karton)",
    creditNote: "Kredit disetujui.",
    stockNote: "Telah dikirim melalui armada internal (DO-0192).",
  },
];

export const RECEIVABLES_SNAPSHOTS: Record<
  ReceivablesDateOption,
  ReceivablesSnapshot
> = {
  "2026-11-16": {
    key: "2026-11-16",
    label: "16 Nov 2026",
    totalReceivables: 480_000_000,
    overdueReceivables: 160_000_000,
    paymentsThisMonth: 215_000_000,
    aging: [
      { label: "Belum jatuh tempo", amount: 320_000_000, tone: "current" },
      { label: "1–30 hari", amount: 75_000_000, tone: "overdue" },
      { label: "31–60 hari", amount: 45_000_000, tone: "overdue" },
      { label: "61–90 hari", amount: 25_000_000, tone: "overdue" },
      { label: ">90 hari", amount: 15_000_000, tone: "overdue" },
    ],
    priorities: [
      {
        id: "prio-inv-0185",
        customerName: "PT Prima Distribusi",
        invoiceNumber: "INV-0185",
        overdueDays: 68,
        amount: 25_000_000,
      },
      {
        id: "prio-inv-0186",
        customerName: "CV Sentosa Mart",
        invoiceNumber: "INV-0186",
        overdueDays: 96,
        amount: 15_000_000,
      },
    ],
  },
  "2026-11-30": {
    key: "2026-11-30",
    label: "30 Nov 2026",
    totalReceivables: 510_000_000,
    overdueReceivables: 185_000_000,
    paymentsThisMonth: 290_000_000,
    aging: [
      { label: "Belum jatuh tempo", amount: 325_000_000, tone: "current" },
      { label: "1–30 hari", amount: 90_000_000, tone: "overdue" },
      { label: "31–60 hari", amount: 50_000_000, tone: "overdue" },
      { label: "61–90 hari", amount: 30_000_000, tone: "overdue" },
      { label: ">90 hari", amount: 15_000_000, tone: "overdue" },
    ],
    priorities: [
      {
        id: "prio-inv-0185",
        customerName: "PT Prima Distribusi",
        invoiceNumber: "INV-0185",
        overdueDays: 82,
        amount: 25_000_000,
      },
      {
        id: "prio-inv-0186",
        customerName: "CV Sentosa Mart",
        invoiceNumber: "INV-0186",
        overdueDays: 110,
        amount: 15_000_000,
      },
    ],
  },
  "2026-10-31": {
    key: "2026-10-31",
    label: "31 Okt 2026",
    totalReceivables: 445_000_000,
    overdueReceivables: 130_000_000,
    paymentsThisMonth: 340_000_000,
    aging: [
      { label: "Belum jatuh tempo", amount: 315_000_000, tone: "current" },
      { label: "1–30 hari", amount: 60_000_000, tone: "overdue" },
      { label: "31–60 hari", amount: 35_000_000, tone: "overdue" },
      { label: "61–90 hari", amount: 20_000_000, tone: "overdue" },
      { label: ">90 hari", amount: 15_000_000, tone: "overdue" },
    ],
    priorities: [
      {
        id: "prio-inv-0185",
        customerName: "PT Prima Distribusi",
        invoiceNumber: "INV-0185",
        overdueDays: 52,
        amount: 25_000_000,
      },
      {
        id: "prio-inv-0186",
        customerName: "CV Sentosa Mart",
        invoiceNumber: "INV-0186",
        overdueDays: 80,
        amount: 15_000_000,
      },
    ],
  },
};

export const INITIAL_INVOICES: readonly InvoiceRecord[] = [
  {
    id: "inv-0187",
    number: "INV-0187",
    customerName: "PT Sinar Retail",
    soNumber: "SO-0238",
    doNumber: "DO-0189",
    dueDateLabel: "30 Nov 2026",
    totalAmount: 42_500_000,
    remainingAmount: 42_500_000,
    status: "Perlu pencocokan",
    actionLabel: "Cocokkan dokumen",
    matchingNote:
      "Menunggu pencocokan akhir bukti tanda terima DO-0189 terhadap kuantitas faktur.",
    inTable: true,
  },
  {
    id: "inv-0188",
    number: "INV-0188",
    customerName: "CV Mitra Niaga",
    soNumber: "SO-0239",
    doNumber: "DO-0190",
    dueDateLabel: "25 Nov 2026",
    totalAmount: 28_750_000,
    remainingAmount: 28_750_000,
    status: "Menunggu pembayaran",
    actionLabel: "Catat pembayaran",
    matchingNote:
      "3-way matching SO, DO, dan invoice terverifikasi lengkap; siap menerima pelunasan.",
    inTable: true,
  },
  {
    id: "inv-0185",
    number: "INV-0185",
    customerName: "PT Prima Distribusi",
    soNumber: "SO-0219",
    doNumber: "DO-0164",
    dueDateLabel: "9 Sep 2026",
    totalAmount: 25_000_000,
    remainingAmount: 25_000_000,
    status: "Lewat jatuh tempo",
    actionLabel: "Catat pembayaran",
    matchingNote:
      "Terlambat 68 hari dari jatuh tempo; surat pengingat penagihan tahap 2 telah dikirim.",
    inTable: true,
  },
  {
    id: "inv-0184",
    number: "INV-0184",
    customerName: "CV Sentosa Mart",
    soNumber: "SO-0231",
    doNumber: "DO-0178",
    dueDateLabel: "12 Nov 2026",
    totalAmount: 19_800_000,
    remainingAmount: 0,
    status: "Lunas",
    actionLabel: "Lihat invoice",
    matchingNote:
      "Pembayaran lunas tervalidasi Treasury melalui transfer bank BCA.",
    inTable: true,
  },
  {
    id: "inv-0186",
    number: "INV-0186",
    customerName: "CV Sentosa Mart",
    soNumber: "SO-0204",
    doNumber: "DO-0151",
    dueDateLabel: "12 Agu 2026",
    totalAmount: 15_000_000,
    remainingAmount: 15_000_000,
    status: "Lewat jatuh tempo",
    actionLabel: "Catat pembayaran",
    matchingNote:
      "Terlambat 96 hari; masuk daftar prioritas penagihan dan evaluasi kredit.",
    inTable: false,
  },
];
