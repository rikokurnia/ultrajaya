export type PengeluaranTab =
  | "ringkasan"
  | "pembelian"
  | "penerimaan"
  | "utang";

export type PurchasingDocType = "fpbb" | "rfq" | "po";

export type PeriodOption = "30d" | "7d" | "90d";
export type PayablesDateOption = "2026-11-16" | "2026-11-30" | "2026-10-31";

export type TaskStatus = "Sedang berjalan" | "Perlu ditinjau" | "Belum dimulai";

export type RequestPriority = "Mendesak" | "Tinggi" | "Normal";
export type RequestStatus =
  | "Menunggu verifikasi"
  | "Terverifikasi"
  | "Sudah dibuat RFQ"
  | "Stok mencukupi";

export type RfqStatus =
  | "Menunggu penawaran"
  | "Perlu evaluasi"
  | "Pemasok terpilih"
  | "PO diterbitkan";

export type PoStatus =
  | "Menunggu persetujuan"
  | "Perlu revisi"
  | "Disetujui"
  | "Dikirim ke pemasok";

export type QcStatus = "Menunggu Inspeksi" | "Lolos QC" | "Ditahan";

export type VendorInvoiceStatus =
  | "Perlu pencocokan"
  | "Selisih ditahan"
  | "Siap dicatat utang"
  | "Siap dibayar"
  | "Lewat jatuh tempo"
  | "Lunas";

export type AgingBucketKey =
  | "Belum jatuh tempo"
  | "1–30 hari"
  | "31–60 hari"
  | "61–90 hari"
  | ">90 hari";

export interface PengeluaranTrendPoint {
  label: string;
  poMillions: number;
  paymentMillions: number;
}

export interface PengeluaranPeriodDataset {
  key: PeriodOption;
  label: string;
  periodEndLabel: string;
  poValue: number;
  vendorPayment: number;
  openPayables: number;
  yMaxMillions: number;
  yTicksMillions: number[];
  series: PengeluaranTrendPoint[];
}

export interface PengeluaranFollowUpItem {
  id: string;
  label: string;
  sublabel: string;
  actionLabel: string;
  targetTab: PengeluaranTab;
  targetDocType?: PurchasingDocType;
  reference: string;
  tone: "warning" | "danger" | "info";
}

export interface PengeluaranQueueTask {
  id: string;
  task: string;
  reference: string;
  stageLabel: string;
  ownerRole: string;
  status: TaskStatus;
  actionLabel: string;
  targetTab: PengeluaranTab;
  targetDocType?: PurchasingDocType;
  description: string;
}

export interface SupplierRecord {
  id: string;
  code: string;
  name: string;
  city: string;
  npwp: string;
  qualificationStatus: "Terkualifikasi" | "Perlu pembaruan dokumen";
  legalValidUntil: string;
  riskLevel: "Rendah" | "Sedang";
  rating: number;
  onTimeRatePercent: number;
  paymentTermsDays: number;
}

export interface PurchaseRequestRecord {
  id: string;
  number: string;
  materialId: string;
  materialName: string;
  quantity: number;
  unit: "L" | "kg" | "pcs";
  warehouseName: string;
  availableStock: number;
  minimumStock: number;
  productionRef: string;
  requiredDateLabel: string;
  createdDateLabel: string;
  priority: RequestPriority;
  status: RequestStatus;
  purpose: string;
  verificationNote: string;
  linkedRfqNumber?: string;
}

export interface VendorOffer {
  id: string;
  quotationNumber: string;
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  totalPrice: number;
  leadTimeDays: number;
  validUntilLabel: string;
  paymentTerms: string;
  qualityScore: number;
  deliveryScore: number;
  priceScore: number;
  overallScore: number;
  qualificationStatus: "Terkualifikasi" | "Perlu pembaruan dokumen";
  riskLevel: "Rendah" | "Sedang";
  evaluationNotes: string;
  isSelected: boolean;
}

export interface RfqRecord {
  id: string;
  number: string;
  requestId: string;
  requestNumber: string;
  materialId: string;
  materialName: string;
  quantity: number;
  unit: "L" | "kg" | "pcs";
  dueDateLabel: string;
  createdDateLabel: string;
  status: RfqStatus;
  selectedOfferId?: string;
  awardReason?: string;
  linkedPoNumber?: string;
  offers: VendorOffer[];
}

export interface PoLineItem {
  id: string;
  materialName: string;
  quantity: number;
  unit: "L" | "kg" | "pcs";
  unitPrice: number;
  totalPrice: number;
}

export interface PoApprovalStep {
  id: string;
  sequence: number;
  roleTitle: string;
  actorName: string;
  status: "Disetujui" | "Menunggu" | "Perlu revisi" | "Berikutnya";
  timestampLabel: string;
  note: string;
}

export interface PurchaseOrderRecord {
  id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  requestNumber: string;
  rfqNumber: string;
  dateLabel: string;
  warehouseName: string;
  paymentTerms: string;
  deliveryTerms: string;
  totalAmount: number;
  approvalStageLabel: string;
  status: PoStatus;
  revision: number;
  createdByUserId: string;
  createdByName: string;
  lines: PoLineItem[];
  approvalSteps: PoApprovalStep[];
  notes: string;
}

export interface ReceiptLineItem {
  id: string;
  materialName: string;
  unit: "L" | "kg" | "pcs";
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  heldQty: number;
  unitPrice: number;
  batchNumber: string;
  storageLocation: string;
  holdReason?: string;
}

export interface QcParameterCheck {
  parameter: string;
  result: string;
  passed: boolean;
}

export interface GoodsReceiptRecord {
  id: string;
  number: string;
  poId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  dateLabel: string;
  deliveryNoteNumber: string;
  warehouseName: string;
  qcStatus: QcStatus;
  qcInspector?: string;
  qcNotes: string;
  lines: ReceiptLineItem[];
  qcChecks: QcParameterCheck[];
}

export interface ThreeWayMatchLine {
  id: string;
  materialName: string;
  unit: "L" | "kg" | "pcs";
  poOrderedQty: number;
  poUnitPrice: number;
  grnReceivedQty: number;
  grnAcceptedQty: number;
  grnHeldQty: number;
  invoiceBilledQty: number;
  invoiceUnitPrice: number;
  eligibleSubtotal: number;
  billedSubtotal: number;
  discrepancyType: "NONE" | "QUANTITY" | "PRICE" | "BOTH";
  discrepancyAmount: number;
  discrepancyNote: string;
}

export interface VendorInvoiceRecord {
  id: string;
  number: string;
  supplierInvoiceNumber: string;
  supplierId: string;
  supplierName: string;
  poNumber: string;
  grnNumber: string;
  issuedDateLabel: string;
  dueDateLabel: string;
  agingBucket: AgingBucketKey;
  daysFromDue: number; // positive = overdue days, negative = days until due
  totalAmount: number;
  eligibleAmount: number;
  heldAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: VendorInvoiceStatus;
  matchingSummary: string;
  discrepancyResolutionNote?: string;
  apJournalNumber?: string;
  lastPaymentNumber?: string;
  lines: ThreeWayMatchLine[];
}

export interface PayablesAgingRow {
  label: AgingBucketKey;
  amount: number;
  tone: "current" | "warning" | "overdue";
}

export interface PriorityPayableItem {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  supplierName: string;
  dueStatusLabel: string;
  tone: "warning" | "danger";
  amount: number;
}

export interface PayablesSnapshot {
  key: PayablesDateOption;
  label: string;
  totalOpenPayables: number;
  overduePayables: number;
  paymentsThisMonth: number;
  aging: PayablesAgingRow[];
  priorities: PriorityPayableItem[];
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

export function formatQty(qty: number, unit: string): string {
  const formatted = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(qty)));
  return `${formatted} ${unit}`;
}

export const PENGELUARAN_TABS: readonly {
  key: PengeluaranTab;
  label: string;
  bannerTitle: string;
}[] = [
  {
    key: "ringkasan",
    label: "Ringkasan",
    bannerTitle: "Ringkasan Pengeluaran",
  },
  {
    key: "pembelian",
    label: "Pembelian",
    bannerTitle: "Pembelian",
  },
  {
    key: "penerimaan",
    label: "Penerimaan",
    bannerTitle: "Penerimaan",
  },
  {
    key: "utang",
    label: "Utang & Pembayaran",
    bannerTitle: "Utang & Pembayaran",
  },
];

export const PURCHASING_DOC_OPTIONS: readonly {
  key: PurchasingDocType;
  label: string;
  shortLabel: string;
}[] = [
  {
    key: "fpbb",
    label: "Permintaan Pembelian",
    shortLabel: "FPBB",
  },
  {
    key: "rfq",
    label: "RFQ & Penawaran",
    shortLabel: "RFQ",
  },
  {
    key: "po",
    label: "Purchase Order",
    shortLabel: "PO",
  },
];

export const PENGELUARAN_PERIOD_DATASETS: Record<
  PeriodOption,
  PengeluaranPeriodDataset
> = {
  "30d": {
    key: "30d",
    label: "30 hari terakhir",
    periodEndLabel: "Saldo per akhir periode (16 Nov 2026)",
    poValue: 1_100_000_000,
    vendorPayment: 660_000_000,
    openPayables: 640_000_000,
    yMaxMillions: 400,
    yTicksMillions: [0, 100, 200, 300, 400],
    series: [
      { label: "Pekan 1", poMillions: 200, paymentMillions: 120 },
      { label: "Pekan 2", poMillions: 360, paymentMillions: 180 },
      { label: "Pekan 3", poMillions: 240, paymentMillions: 150 },
      { label: "Pekan 4", poMillions: 300, paymentMillions: 210 },
    ],
  },
  "7d": {
    key: "7d",
    label: "7 hari terakhir",
    periodEndLabel: "Saldo per akhir periode (16 Nov 2026)",
    poValue: 300_000_000,
    vendorPayment: 210_000_000,
    openPayables: 640_000_000,
    yMaxMillions: 120,
    yTicksMillions: [0, 30, 60, 90, 120],
    series: [
      { label: "Sen–Sel", poMillions: 80, paymentMillions: 55 },
      { label: "Rab–Kam", poMillions: 100, paymentMillions: 65 },
      { label: "Jum", poMillions: 70, paymentMillions: 50 },
      { label: "Sab–Min", poMillions: 50, paymentMillions: 40 },
    ],
  },
  "90d": {
    key: "90d",
    label: "90 hari terakhir",
    periodEndLabel: "Saldo per akhir periode (16 Nov 2026)",
    poValue: 3_180_000_000,
    vendorPayment: 2_540_000_000,
    openPayables: 640_000_000,
    yMaxMillions: 1200,
    yTicksMillions: [0, 300, 600, 900, 1200],
    series: [
      { label: "Agu", poMillions: 720, paymentMillions: 580 },
      { label: "Sep", poMillions: 820, paymentMillions: 660 },
      { label: "Okt", poMillions: 920, paymentMillions: 740 },
      { label: "Nov (s.d. 16)", poMillions: 720, paymentMillions: 560 },
    ],
  },
};

export const SUMMARY_FOLLOW_UPS: readonly PengeluaranFollowUpItem[] = [
  {
    id: "fu-approve-po",
    label: "Setujui PO",
    sublabel: "PO-261029-0045 · PT Kemas Prima (Rp120 jt)",
    actionLabel: "Setujui PO",
    targetTab: "pembelian",
    targetDocType: "po",
    reference: "PO-261029-0045",
    tone: "warning",
  },
  {
    id: "fu-review-qc",
    label: "Tinjau hasil QC",
    sublabel: "GRN-261029-0069 · Koperasi Susu Sejahtera (22.500 L)",
    actionLabel: "Tinjau hasil QC",
    targetTab: "penerimaan",
    reference: "GRN-261029-0069",
    tone: "warning",
  },
  {
    id: "fu-match-inv",
    label: "Cocokkan invoice vendor",
    sublabel: "INV-KSS-1027-041 · Koperasi Susu Sejahtera (Rp180 jt)",
    actionLabel: "Cocokkan invoice",
    targetTab: "utang",
    reference: "INV-KSS-1027-041",
    tone: "info",
  },
  {
    id: "fu-discrepancy-inv",
    label: "Tinjau selisih tagihan vendor",
    sublabel: "INV-SP-1028-087 · PT Sumber Pangan (Selisih Rp4 jt)",
    actionLabel: "Tinjau selisih",
    targetTab: "utang",
    reference: "INV-SP-1028-087",
    tone: "danger",
  },
];

export const TODAY_TASK_QUEUE: readonly PengeluaranQueueTask[] = [
  {
    id: "task-po-0045",
    task: "Setujui PO kemasan karton aseptik",
    reference: "PO-261029-0045",
    stageLabel: "Persetujuan PO",
    ownerRole: "Manajer Keuangan (Approver)",
    status: "Perlu ditinjau",
    actionLabel: "Setujui PO",
    targetTab: "pembelian",
    targetDocType: "po",
    description:
      "Otorisasi tingkat Manajer Keuangan untuk PO-261029-0045 (1.000.000 pcs Packaging Cartons @ Rp120/pcs = Rp120.000.000) kepada PT Kemas Prima.",
  },
  {
    id: "task-grn-0069",
    task: "Tinjau hasil QC penerimaan susu segar",
    reference: "GRN-261029-0069",
    stageLabel: "Penerimaan & QC",
    ownerRole: "Quality Control (QC)",
    status: "Sedang berjalan",
    actionLabel: "Tinjau Inspeksi",
    targetTab: "penerimaan",
    description:
      "Verifikasi hasil uji mikrobiologi, suhu rantai dingin, dan berat jenis untuk 22.500 L Fresh Milk dari Koperasi Susu Sejahtera.",
  },
  {
    id: "task-inv-0041",
    task: "Cocokkan PO, GRN, dan invoice vendor",
    reference: "INV-KSS-1027-041",
    stageLabel: "3-Way Matching",
    ownerRole: "Utang Usaha (AP)",
    status: "Perlu ditinjau",
    actionLabel: "Cocokkan Dokumen",
    targetTab: "utang",
    description:
      "Lakukan pencocokan tiga dokumen antara PO-261027-0043, GRN-261027-0067, dan faktur INV-KSS-1027-041 senilai Rp180.000.000.",
  },
  {
    id: "task-fpbb-0189",
    task: "Verifikasi stok gudang atas permintaan bahan baku",
    reference: "FPBB-261029-0189",
    stageLabel: "Permintaan Pembelian",
    ownerRole: "Gudang Bahan Baku",
    status: "Belum dimulai",
    actionLabel: "Verifikasi stok",
    targetTab: "pembelian",
    targetDocType: "fpbb",
    description:
      "Periksa saldo fisik Fresh Milk di Gudang Bandung RM terhadap batas minimum 50.000 L untuk permintaan mendesak WO-261029-0189.",
  },
];

export const INITIAL_SUPPLIERS: readonly SupplierRecord[] = [
  {
    id: "sup_kss",
    code: "SUP-001",
    name: "Koperasi Susu Sejahtera",
    city: "Lembang, Bandung Barat",
    npwp: "01.234.567.8-401.000",
    qualificationStatus: "Terkualifikasi",
    legalValidUntil: "31 Des 2027",
    riskLevel: "Rendah",
    rating: 4.9,
    onTimeRatePercent: 98,
    paymentTermsDays: 14,
  },
  {
    id: "sup_sumber_pangan",
    code: "SUP-002",
    name: "PT Sumber Pangan",
    city: "Cikarang, Bekasi",
    npwp: "02.345.678.9-402.000",
    qualificationStatus: "Terkualifikasi",
    legalValidUntil: "30 Jun 2028",
    riskLevel: "Rendah",
    rating: 4.8,
    onTimeRatePercent: 96,
    paymentTermsDays: 30,
  },
  {
    id: "sup_kemas_prima",
    code: "SUP-003",
    name: "PT Kemas Prima",
    city: "Jababeka, Bekasi",
    npwp: "03.456.789.0-403.000",
    qualificationStatus: "Terkualifikasi",
    legalValidUntil: "30 Sep 2027",
    riskLevel: "Rendah",
    rating: 4.9,
    onTimeRatePercent: 97,
    paymentTermsDays: 30,
  },
  {
    id: "sup_kemasan_sentosa",
    code: "SUP-004",
    name: "PT Kemasan Sentosa",
    city: "Tangerang",
    npwp: "04.567.890.1-404.000",
    qualificationStatus: "Perlu pembaruan dokumen",
    legalValidUntil: "31 Des 2026",
    riskLevel: "Sedang",
    rating: 4.5,
    onTimeRatePercent: 91,
    paymentTermsDays: 30,
  },
  {
    id: "sup_indopack",
    code: "SUP-005",
    name: "PT IndoPack",
    city: "Jakarta Barat",
    npwp: "05.678.901.2-405.000",
    qualificationStatus: "Terkualifikasi",
    legalValidUntil: "31 Mar 2027",
    riskLevel: "Rendah",
    rating: 4.4,
    onTimeRatePercent: 89,
    paymentTermsDays: 30,
  },
];

export const INITIAL_PURCHASE_REQUESTS: readonly PurchaseRequestRecord[] = [
  {
    id: "fpbb_261029_0189",
    number: "FPBB-261029-0189",
    materialId: "mat_fresh_milk",
    materialName: "Fresh Milk (Susu Segar Mentah)",
    quantity: 40_000,
    unit: "L",
    warehouseName: "Bandung RM",
    availableStock: 40_000,
    minimumStock: 50_000,
    productionRef: "WO-261029-0189",
    requiredDateLabel: "20 Nov 2026",
    createdDateLabel: "15 Nov 2026",
    priority: "Mendesak",
    status: "Menunggu verifikasi",
    purpose: "Penambahan stok penyangga susu segar untuk jadwal produksi akhir pekan UHT Full Cream.",
    verificationNote:
      "Menunggu verifikasi fisik Gudang Bandung RM (stok tersedia 40.000 L berada di bawah batas minimum 50.000 L).",
  },
  {
    id: "fpbb_261114_0190",
    number: "FPBB-261114-0190",
    materialId: "mat_milk_powder",
    materialName: "Milk Powder (Susu Bubuk Full Cream)",
    quantity: 6_000,
    unit: "kg",
    warehouseName: "Bandung RM",
    availableStock: 9_800,
    minimumStock: 12_000,
    productionRef: "PRD-BATCH-915",
    requiredDateLabel: "22 Nov 2026",
    createdDateLabel: "14 Nov 2026",
    priority: "Tinggi",
    status: "Terverifikasi",
    purpose: "Kebutuhan bahan baku susu bubuk untuk rencana produksi Batch PRD-915.",
    verificationNote:
      "Terverifikasi oleh Gudang Bandung RM: stok bersih 9.800 kg di bawah batas aman 12.000 kg; perlu pembelian 6.000 kg.",
  },
  {
    id: "fpbb_261028_0188",
    number: "FPBB-261028-0188",
    materialId: "mat_cartons",
    materialName: "Packaging Cartons (Karton Aseptik 250ml)",
    quantity: 1_000_000,
    unit: "pcs",
    warehouseName: "Bandung RM",
    availableStock: 1_200_000,
    minimumStock: 1_500_000,
    productionRef: "WO-261028-0188",
    requiredDateLabel: "03 Nov 2026",
    createdDateLabel: "28 Okt 2026",
    priority: "Normal",
    status: "Sudah dibuat RFQ",
    purpose: "Pengisian ulang karton aseptik UHT Line 250ml sesuai buffer minimum 1,5 juta pcs.",
    verificationNote:
      "Terverifikasi oleh Gudang dan telah diteruskan ke Purchasing melalui RFQ-261028-0012.",
    linkedRfqNumber: "RFQ-261028-0012",
  },
  {
    id: "fpbb_261023_0185",
    number: "FPBB-261023-0185",
    materialId: "mat_milk_powder",
    materialName: "Milk Powder (Susu Bubuk Full Cream)",
    quantity: 10_000,
    unit: "kg",
    warehouseName: "Bandung RM",
    availableStock: 16_000,
    minimumStock: 12_000,
    productionRef: "PRD-BATCH-902",
    requiredDateLabel: "27 Okt 2026",
    createdDateLabel: "23 Okt 2026",
    priority: "Tinggi",
    status: "Sudah dibuat RFQ",
    purpose: "Replenishment susu bubuk untuk Batch PRD-902.",
    verificationNote:
      "Terverifikasi oleh Gudang; telah diproses menjadi PO-261026-0042 (PT Sumber Pangan).",
    linkedRfqNumber: "RFQ-261028-0012",
  },
  {
    id: "fpbb_261020_0182",
    number: "FPBB-261020-0182",
    materialId: "mat_cartons",
    materialName: "Packaging Cartons (Karton Aseptik 250ml)",
    quantity: 150_000,
    unit: "pcs",
    warehouseName: "Bandung RM",
    availableStock: 1_650_000,
    minimumStock: 1_500_000,
    productionRef: "WO-261020-0182",
    requiredDateLabel: "25 Okt 2026",
    createdDateLabel: "20 Okt 2026",
    priority: "Normal",
    status: "Stok mencukupi",
    purpose: "Permintaan tambahan kemasan untuk batch uji coba.",
    verificationNote:
      "Ditutup oleh Gudang: saldo tersedia mencukupi tanpa perlu pengadaan baru.",
  },
];

export const INITIAL_RFQS: readonly RfqRecord[] = [
  {
    id: "rfq_261114_0014",
    number: "RFQ-261114-0014",
    requestId: "fpbb_261114_0190",
    requestNumber: "FPBB-261114-0190",
    materialId: "mat_milk_powder",
    materialName: "Milk Powder (Susu Bubuk Full Cream)",
    quantity: 6_000,
    unit: "kg",
    dueDateLabel: "18 Nov 2026",
    createdDateLabel: "14 Nov 2026",
    status: "Perlu evaluasi",
    offers: [
      {
        id: "off_0014_1",
        quotationNumber: "QUOTE-261114-0021",
        supplierId: "sup_sumber_pangan",
        supplierName: "PT Sumber Pangan",
        unitPrice: 19_800,
        totalPrice: 118_800_000,
        leadTimeDays: 3,
        validUntilLabel: "30 Nov 2026",
        paymentTerms: "Net 30 Hari",
        qualityScore: 95,
        deliveryScore: 93,
        priceScore: 96,
        overallScore: 94.8,
        qualificationStatus: "Terkualifikasi",
        riskLevel: "Rendah",
        evaluationNotes:
          "Harga satuan paling kompetitif (Rp19.800/kg), sertifikat CoA & Halal lengkap, kapasitas pasokan stabil.",
        isSelected: false,
      },
      {
        id: "off_0014_2",
        quotationNumber: "QUOTE-261114-0022",
        supplierId: "sup_kss",
        supplierName: "Koperasi Susu Sejahtera",
        unitPrice: 20_200,
        totalPrice: 121_200_000,
        leadTimeDays: 2,
        validUntilLabel: "28 Nov 2026",
        paymentTerms: "Net 14 Hari",
        qualityScore: 94,
        deliveryScore: 97,
        priceScore: 89,
        overallScore: 92.6,
        qualificationStatus: "Terkualifikasi",
        riskLevel: "Rendah",
        evaluationNotes:
          "Waktu pengiriman tercepat (2 hari dari Bandung Barat), namun harga +Rp400/kg lebih tinggi dan termin 14 hari.",
        isSelected: false,
      },
      {
        id: "off_0014_3",
        quotationNumber: "QUOTE-261114-0023",
        supplierId: "sup_indopack",
        supplierName: "PT IndoPack",
        unitPrice: 20_500,
        totalPrice: 123_000_000,
        leadTimeDays: 5,
        validUntilLabel: "30 Nov 2026",
        paymentTerms: "Net 30 Hari",
        qualityScore: 86,
        deliveryScore: 82,
        priceScore: 84,
        overallScore: 84.3,
        qualificationStatus: "Terkualifikasi",
        riskLevel: "Rendah",
        evaluationNotes:
          "Lead time 5 hari kurang optimal untuk jadwal Batch PRD-915 dan harga total Rp4,2 juta lebih mahal.",
        isSelected: false,
      },
    ],
  },
  {
    id: "rfq_261115_0015",
    number: "RFQ-261115-0015",
    requestId: "fpbb_261029_0189",
    requestNumber: "FPBB-261029-0189",
    materialId: "mat_fresh_milk",
    materialName: "Fresh Milk (Susu Segar Mentah)",
    quantity: 25_000,
    unit: "L",
    dueDateLabel: "16 Nov 2026",
    createdDateLabel: "15 Nov 2026",
    status: "Pemasok terpilih",
    selectedOfferId: "off_0015_1",
    awardReason:
      "Koperasi Susu Sejahtera dipilih berdasarkan jaminan rantai dingin 4°C, lead time pengiriman harian 1 hari, dan harga terbaik Rp8.000/L.",
    offers: [
      {
        id: "off_0015_1",
        quotationNumber: "QUOTE-261115-0024",
        supplierId: "sup_kss",
        supplierName: "Koperasi Susu Sejahtera",
        unitPrice: 8_000,
        totalPrice: 200_000_000,
        leadTimeDays: 1,
        validUntilLabel: "30 Nov 2026",
        paymentTerms: "Net 14 Hari",
        qualityScore: 97,
        deliveryScore: 98,
        priceScore: 95,
        overallScore: 96.8,
        qualificationStatus: "Terkualifikasi",
        riskLevel: "Rendah",
        evaluationNotes:
          "Rantai dingin (cold-chain) terverifikasi, pengiriman 1 hari dari Lembang, tingkat kelolosan QC historis 99,2%.",
        isSelected: true,
      },
      {
        id: "off_0015_2",
        quotationNumber: "QUOTE-261115-0025",
        supplierId: "sup_sumber_pangan",
        supplierName: "PT Sumber Pangan",
        unitPrice: 8_350,
        totalPrice: 208_750_000,
        leadTimeDays: 2,
        validUntilLabel: "30 Nov 2026",
        paymentTerms: "Net 30 Hari",
        qualityScore: 90,
        deliveryScore: 88,
        priceScore: 87,
        overallScore: 88.6,
        qualificationStatus: "Terkualifikasi",
        riskLevel: "Rendah",
        evaluationNotes:
          "Jarak pengiriman lebih jauh (2 hari) dan harga satuan Rp350/L di atas penawaran Koperasi Susu Sejahtera.",
        isSelected: false,
      },
    ],
  },
  {
    id: "rfq_261116_0016",
    number: "RFQ-261116-0016",
    requestId: "fpbb_261028_0188",
    requestNumber: "FPBB-261028-0188",
    materialId: "mat_cartons",
    materialName: "Packaging Cartons (Karton Aseptik 250ml)",
    quantity: 500_000,
    unit: "pcs",
    dueDateLabel: "19 Nov 2026",
    createdDateLabel: "16 Nov 2026",
    status: "Menunggu penawaran",
    offers: [
      {
        id: "off_0016_1",
        quotationNumber: "QUOTE-261116-0026",
        supplierId: "sup_kemas_prima",
        supplierName: "PT Kemas Prima",
        unitPrice: 120,
        totalPrice: 60_000_000,
        leadTimeDays: 2,
        validUntilLabel: "05 Des 2026",
        paymentTerms: "Net 30 Hari",
        qualityScore: 95,
        deliveryScore: 96,
        priceScore: 95,
        overallScore: 95.3,
        qualificationStatus: "Terkualifikasi",
        riskLevel: "Rendah",
        evaluationNotes:
          "Penawaran awal masuk sesuai spesifikasi aseptik; menunggu penawaran pembanding sebelum evaluasi akhir.",
        isSelected: false,
      },
    ],
  },
  {
    id: "rfq_261028_0012",
    number: "RFQ-261028-0012",
    requestId: "fpbb_261028_0188",
    requestNumber: "FPBB-261028-0188",
    materialId: "mat_cartons",
    materialName: "Packaging Cartons (Karton Aseptik 250ml)",
    quantity: 1_000_000,
    unit: "pcs",
    dueDateLabel: "01 Nov 2026",
    createdDateLabel: "28 Okt 2026",
    status: "PO diterbitkan",
    selectedOfferId: "quote_261028_0012",
    linkedPoNumber: "PO-261029-0045",
    awardReason:
      "PT Kemas Prima menunjukkan kepatuhan spesifikasi teknis tertinggi (95/100), lead time tercepat (2 hari), dan harga paling kompetitif Rp120/pcs.",
    offers: [
      {
        id: "quote_261028_0012",
        quotationNumber: "QUOTE-261028-0012",
        supplierId: "sup_kemas_prima",
        supplierName: "PT Kemas Prima",
        unitPrice: 120,
        totalPrice: 120_000_000,
        leadTimeDays: 2,
        validUntilLabel: "15 Nov 2026",
        paymentTerms: "Net 30 Hari",
        qualityScore: 95,
        deliveryScore: 96,
        priceScore: 98,
        overallScore: 96.1,
        qualificationStatus: "Terkualifikasi",
        riskLevel: "Rendah",
        evaluationNotes:
          "Pemasok terpilih: kualitas laminasi aseptik sangat baik, lead time 2 hari, harga terendah Rp120/pcs.",
        isSelected: true,
      },
      {
        id: "quote_261028_0013",
        quotationNumber: "QUOTE-261028-0013",
        supplierId: "sup_kemasan_sentosa",
        supplierName: "PT Kemasan Sentosa",
        unitPrice: 124,
        totalPrice: 124_000_000,
        leadTimeDays: 3,
        validUntilLabel: "15 Nov 2026",
        paymentTerms: "Net 30 Hari",
        qualityScore: 88,
        deliveryScore: 88,
        priceScore: 92,
        overallScore: 89.1,
        qualificationStatus: "Perlu pembaruan dokumen",
        riskLevel: "Sedang",
        evaluationNotes:
          "Dokumen izin industri perlu pembaruan akhir Desember 2026; harga +Rp4/pcs dan lead time 3 hari.",
        isSelected: false,
      },
      {
        id: "quote_261028_0014",
        quotationNumber: "QUOTE-261028-0014",
        supplierId: "sup_indopack",
        supplierName: "PT IndoPack",
        unitPrice: 128,
        totalPrice: 128_000_000,
        leadTimeDays: 4,
        validUntilLabel: "15 Nov 2026",
        paymentTerms: "Net 30 Hari",
        qualityScore: 85,
        deliveryScore: 80,
        priceScore: 85,
        overallScore: 83.8,
        qualificationStatus: "Terkualifikasi",
        riskLevel: "Rendah",
        evaluationNotes:
          "Total penawaran Rp8 juta lebih mahal dengan waktu pengiriman 4 hari kerja.",
        isSelected: false,
      },
    ],
  },
];

export const INITIAL_PURCHASE_ORDERS: readonly PurchaseOrderRecord[] = [
  {
    id: "po_261029_0045",
    number: "PO-261029-0045",
    supplierId: "sup_kemas_prima",
    supplierName: "PT Kemas Prima",
    requestNumber: "FPBB-261028-0188",
    rfqNumber: "RFQ-261028-0012",
    dateLabel: "29 Okt 2026",
    warehouseName: "Bandung RM",
    paymentTerms: "Net 30 Hari",
    deliveryTerms: "Franco Gudang Bandung RM",
    totalAmount: 120_000_000,
    approvalStageLabel: "Manajer Keuangan",
    status: "Menunggu persetujuan",
    revision: 1,
    createdByUserId: "usr_purchasing",
    createdByName: "Ayu Pratama (Purchasing)",
    notes: "Pengadaan 1.000.000 pcs karton aseptik sesuai hasil evaluasi RFQ-261028-0012.",
    lines: [
      {
        id: "pol_45_1",
        materialName: "Packaging Cartons (Karton Aseptik 250ml)",
        quantity: 1_000_000,
        unit: "pcs",
        unitPrice: 120,
        totalPrice: 120_000_000,
      },
    ],
    approvalSteps: [
      {
        id: "step_45_1",
        sequence: 1,
        roleTitle: "Manajer Pengadaan",
        actorName: "Dimas Saputra",
        status: "Disetujui",
        timestampLabel: "29 Okt 2026, 10:31 WIB",
        note: "Penawaran RFQ dan harga pemenang telah diverifikasi.",
      },
      {
        id: "step_45_2",
        sequence: 2,
        roleTitle: "Manajer Keuangan",
        actorName: "Sinta Maharani",
        status: "Menunggu",
        timestampLabel: "Menunggu keputusan",
        note: "Otorisasi anggaran pengadaan > Rp50 juta.",
      },
      {
        id: "step_45_3",
        sequence: 3,
        roleTitle: "Direktur Operasional",
        actorName: "Hendra Wijaya",
        status: "Berikutnya",
        timestampLabel: "Setelah Manajer Keuangan",
        note: "Persetujuan akhir sebelum pengiriman PO ke pemasok.",
      },
    ],
  },
  {
    id: "po_261028_0044",
    number: "PO-261028-0044",
    supplierId: "sup_kemas_prima",
    supplierName: "PT Kemas Prima",
    requestNumber: "FPBB-261025-0187",
    rfqNumber: "RFQ-261025-0011",
    dateLabel: "28 Okt 2026",
    warehouseName: "Bandung RM",
    paymentTerms: "Net 30 Hari",
    deliveryTerms: "Franco Gudang Bandung RM",
    totalAmount: 240_000_000,
    approvalStageLabel: "Disetujui Penuh",
    status: "Disetujui",
    revision: 1,
    createdByUserId: "usr_purchasing",
    createdByName: "Ayu Pratama (Purchasing)",
    notes: "Telah disetujui penuh; siap dikirim resmi ke pemasok.",
    lines: [
      {
        id: "pol_44_1",
        materialName: "Packaging Cartons (Karton Aseptik 250ml)",
        quantity: 2_000_000,
        unit: "pcs",
        unitPrice: 120,
        totalPrice: 240_000_000,
      },
    ],
    approvalSteps: [
      {
        id: "step_44_1",
        sequence: 1,
        roleTitle: "Manajer Pengadaan",
        actorName: "Dimas Saputra",
        status: "Disetujui",
        timestampLabel: "28 Okt 2026, 11:15 WIB",
        note: "Sesuai kontrak harga tahunan.",
      },
      {
        id: "step_44_2",
        sequence: 2,
        roleTitle: "Manajer Keuangan",
        actorName: "Sinta Maharani",
        status: "Disetujui",
        timestampLabel: "28 Okt 2026, 14:40 WIB",
        note: "Alokasi kas disetujui.",
      },
    ],
  },
  {
    id: "po_261112_0046",
    number: "PO-261112-0046",
    supplierId: "sup_kemasan_sentosa",
    supplierName: "PT Kemasan Sentosa",
    requestNumber: "FPBB-261110-0189",
    rfqNumber: "RFQ-261110-0013",
    dateLabel: "12 Nov 2026",
    warehouseName: "Bandung RM",
    paymentTerms: "Net 30 Hari",
    deliveryTerms: "Franco Gudang Bandung RM",
    totalAmount: 180_000_000,
    approvalStageLabel: "Perlu Revisi Termin",
    status: "Perlu revisi",
    revision: 1,
    createdByUserId: "usr_purchasing",
    createdByName: "Ayu Pratama (Purchasing)",
    notes:
      "Dikembalikan oleh Manajer Keuangan: mohon lampirkan pembaruan dokumen legalitas pemasok dan penyesuaian jadwal pengiriman bertahap.",
    lines: [
      {
        id: "pol_46_1",
        materialName: "Packaging Cartons (Master Box Corrugated)",
        quantity: 1_500_000,
        unit: "pcs",
        unitPrice: 120,
        totalPrice: 180_000_000,
      },
    ],
    approvalSteps: [
      {
        id: "step_46_1",
        sequence: 1,
        roleTitle: "Manajer Pengadaan",
        actorName: "Dimas Saputra",
        status: "Disetujui",
        timestampLabel: "12 Nov 2026, 09:20 WIB",
        note: "Disetujui dengan catatan konfirmasi jadwal pengiriman.",
      },
      {
        id: "step_46_2",
        sequence: 2,
        roleTitle: "Manajer Keuangan",
        actorName: "Sinta Maharani",
        status: "Perlu revisi",
        timestampLabel: "12 Nov 2026, 15:10 WIB",
        note: "Revisi diperlukan: perbarui dokumen kualifikasi pemasok sebelum persetujuan.",
      },
    ],
  },
  {
    id: "po_261027_0043",
    number: "PO-261027-0043",
    supplierId: "sup_kss",
    supplierName: "Koperasi Susu Sejahtera",
    requestNumber: "FPBB-261024-0186",
    rfqNumber: "RFQ-261024-0010",
    dateLabel: "27 Okt 2026",
    warehouseName: "Bandung RM",
    paymentTerms: "Net 14 Hari",
    deliveryTerms: "Pengiriman Bertahap Tangki Pendingin",
    totalAmount: 360_000_000,
    approvalStageLabel: "Selesai",
    status: "Dikirim ke pemasok",
    revision: 1,
    createdByUserId: "usr_purchasing",
    createdByName: "Ayu Pratama (Purchasing)",
    notes: "PO telah dikirim ke Koperasi Susu Sejahtera; pengiriman bertahap sedang berjalan.",
    lines: [
      {
        id: "pol_43_1",
        materialName: "Fresh Milk (Susu Segar Mentah)",
        quantity: 45_000,
        unit: "L",
        unitPrice: 8_000,
        totalPrice: 360_000_000,
      },
    ],
    approvalSteps: [
      {
        id: "step_43_1",
        sequence: 1,
        roleTitle: "Manajer Pengadaan",
        actorName: "Dimas Saputra",
        status: "Disetujui",
        timestampLabel: "27 Okt 2026, 10:00 WIB",
        note: "Disetujui.",
      },
      {
        id: "step_43_2",
        sequence: 2,
        roleTitle: "Manajer Keuangan",
        actorName: "Sinta Maharani",
        status: "Disetujui",
        timestampLabel: "27 Okt 2026, 13:15 WIB",
        note: "Disetujui.",
      },
      {
        id: "step_43_3",
        sequence: 3,
        roleTitle: "Direktur Operasional",
        actorName: "Hendra Wijaya",
        status: "Disetujui",
        timestampLabel: "27 Okt 2026, 15:45 WIB",
        note: "Disetujui untuk pengiriman bertahap.",
      },
    ],
  },
  {
    id: "po_261026_0042",
    number: "PO-261026-0042",
    supplierId: "sup_sumber_pangan",
    supplierName: "PT Sumber Pangan",
    requestNumber: "FPBB-261023-0185",
    rfqNumber: "RFQ-261023-0009",
    dateLabel: "26 Okt 2026",
    warehouseName: "Bandung RM",
    paymentTerms: "Net 30 Hari",
    deliveryTerms: "Franco Gudang Bandung RM",
    totalAmount: 200_000_000,
    approvalStageLabel: "Selesai",
    status: "Dikirim ke pemasok",
    revision: 1,
    createdByUserId: "usr_purchasing",
    createdByName: "Ayu Pratama (Purchasing)",
    notes:
      "PO telah dikirim ke PT Sumber Pangan. Penerimaan tahap 1 (8.000 kg) tercatat pada GRN-261028-0068; sisa 2.000 kg dijadwalkan menyusul.",
    lines: [
      {
        id: "pol_42_1",
        materialName: "Milk Powder (Susu Bubuk Full Cream)",
        quantity: 9_000,
        unit: "kg",
        unitPrice: 20_000,
        totalPrice: 180_000_000,
      },
      {
        id: "pol_42_2",
        materialName: "Milk Powder Skim Grade A",
        quantity: 1_000,
        unit: "kg",
        unitPrice: 19_600,
        totalPrice: 19_600_000,
      },
    ],
    approvalSteps: [
      {
        id: "step_42_1",
        sequence: 1,
        roleTitle: "Manajer Pengadaan",
        actorName: "Dimas Saputra",
        status: "Disetujui",
        timestampLabel: "26 Okt 2026, 11:00 WIB",
        note: "Disetujui.",
      },
      {
        id: "step_42_2",
        sequence: 2,
        roleTitle: "Manajer Keuangan",
        actorName: "Sinta Maharani",
        status: "Disetujui",
        timestampLabel: "26 Okt 2026, 13:30 WIB",
        note: "Disetujui.",
      },
    ],
  },
];

export const INITIAL_GOODS_RECEIPTS: readonly GoodsReceiptRecord[] = [
  {
    id: "grn_261029_0069",
    number: "GRN-261029-0069",
    poId: "po_261027_0043",
    poNumber: "PO-261027-0043",
    supplierId: "sup_kss",
    supplierName: "Koperasi Susu Sejahtera",
    dateLabel: "29 Okt 2026",
    deliveryNoteNumber: "SJ-KSS-261029-02",
    warehouseName: "Bandung RM",
    qcStatus: "Menunggu Inspeksi",
    qcNotes:
      "Barang diterima secara fisik di Tangki Silo Pendingin T-04; menunggu hasil uji laboratorium QC (suhu, berat jenis, dan mikrobiologi).",
    lines: [
      {
        id: "grnl_69_1",
        materialName: "Fresh Milk (Susu Segar Mentah)",
        unit: "L",
        orderedQty: 45_000,
        receivedQty: 22_500,
        acceptedQty: 0,
        heldQty: 0,
        unitPrice: 8_000,
        batchNumber: "FM-261029-02",
        storageLocation: "Bandung RM / Silo T-04",
      },
    ],
    qcChecks: [
      {
        parameter: "Suhu Penerimaan (≤ 4,0°C)",
        result: "3,6°C (Sampel awal)",
        passed: true,
      },
      {
        parameter: "Uji Alkohol & Berat Jenis",
        result: "Sedang diuji di lab QC",
        passed: true,
      },
      {
        parameter: "Total Plate Count (Mikrobiologi)",
        result: "Menunggu verifikasi analis QC",
        passed: true,
      },
    ],
  },
  {
    id: "grn_261029_0070",
    number: "GRN-261029-0070",
    poId: "po_261028_0044",
    poNumber: "PO-261028-0044",
    supplierId: "sup_kemas_prima",
    supplierName: "PT Kemas Prima",
    dateLabel: "29 Okt 2026",
    deliveryNoteNumber: "SJ-KP-261029-18",
    warehouseName: "Bandung RM",
    qcStatus: "Menunggu Inspeksi",
    qcNotes:
      "Pengiriman bertahap pertama 500.000 pcs karton aseptik; menunggu inspeksi dimensi lipatan dan uji sterilitas lapisan aluminium.",
    lines: [
      {
        id: "grnl_70_1",
        materialName: "Packaging Cartons (Karton Aseptik 250ml)",
        unit: "pcs",
        orderedQty: 2_000_000,
        receivedQty: 500_000,
        acceptedQty: 0,
        heldQty: 0,
        unitPrice: 120,
        batchNumber: "PK-261029-01",
        storageLocation: "Bandung RM / Blok C-01",
      },
    ],
    qcChecks: [
      {
        parameter: "Dimensi & Ketebalan Karton",
        result: "Menunggu pengukuran sampel AQL",
        passed: true,
      },
      {
        parameter: "Integritas Lapisan Aseptik",
        result: "Menunggu uji tekan",
        passed: true,
      },
    ],
  },
  {
    id: "grn_261028_0068",
    number: "GRN-261028-0068",
    poId: "po_261026_0042",
    poNumber: "PO-261026-0042",
    supplierId: "sup_sumber_pangan",
    supplierName: "PT Sumber Pangan",
    dateLabel: "28 Okt 2026",
    deliveryNoteNumber: "SJ-SP-261028-09",
    warehouseName: "Bandung RM",
    qcStatus: "Ditahan",
    qcInspector: "Rina Kartika (QC)",
    qcNotes:
      "Pengiriman bertahap 8.000 kg dari 10.000 kg pesanan PO. Sebanyak 7.800 kg (97,5%) lolos QC dan masuk stok tersedia; 200 kg (2,5%) ditahan di zona karantina karena sak robek/lembap saat pengiriman.",
    lines: [
      {
        id: "grnl_68_1",
        materialName: "Milk Powder (Susu Bubuk Full Cream)",
        unit: "kg",
        orderedQty: 9_000,
        receivedQty: 7_000,
        acceptedQty: 6_820,
        heldQty: 180,
        unitPrice: 20_000,
        batchNumber: "MP-261028-01",
        storageLocation: "Bandung RM / B-02-08",
        holdReason: "180 kg kemasan sak bagian luar lembap dan segel dalam terbuka.",
      },
      {
        id: "grnl_68_2",
        materialName: "Milk Powder Skim Grade A",
        unit: "kg",
        orderedQty: 1_000,
        receivedQty: 1_000,
        acceptedQty: 980,
        heldQty: 20,
        unitPrice: 19_600,
        batchNumber: "MP-261028-02",
        storageLocation: "Bandung RM / B-02-09",
        holdReason: "20 kg kemasan sobek saat pembongkaran palet.",
      },
    ],
    qcChecks: [
      {
        parameter: "Kadar Air / Moisture (Batas ≤ 4,5%)",
        result: "3,8% (Sesuai spesifikasi)",
        passed: true,
      },
      {
        parameter: "Uji Mikrobiologi & Kelarutan",
        result: "Dalam batas standar SNI",
        passed: true,
      },
      {
        parameter: "Integritas Kemasan Sak 25 kg",
        result: "200 kg (8 sak) rusak/lembap — dikarantina",
        passed: false,
      },
    ],
  },
  {
    id: "grn_261027_0067",
    number: "GRN-261027-0067",
    poId: "po_261027_0043",
    poNumber: "PO-261027-0043",
    supplierId: "sup_kss",
    supplierName: "Koperasi Susu Sejahtera",
    dateLabel: "27 Okt 2026",
    deliveryNoteNumber: "SJ-KSS-261027-01",
    warehouseName: "Bandung RM",
    qcStatus: "Lolos QC",
    qcInspector: "Rina Kartika (QC)",
    qcNotes:
      "Pengiriman tahap 1 sebanyak 22.500 L memenuhi seluruh parameter fisik, kimia, dan mikrobiologi. Seluruh kuantitas diterima masuk ke stok produksi.",
    lines: [
      {
        id: "grnl_67_1",
        materialName: "Fresh Milk (Susu Segar Mentah)",
        unit: "L",
        orderedQty: 45_000,
        receivedQty: 22_500,
        acceptedQty: 22_500,
        heldQty: 0,
        unitPrice: 8_000,
        batchNumber: "FM-261027-01",
        storageLocation: "Bandung RM / Silo T-02",
      },
    ],
    qcChecks: [
      {
        parameter: "Suhu Penerimaan (≤ 4,0°C)",
        result: "3,4°C (Lolos)",
        passed: true,
      },
      {
        parameter: "Kadar Lemak & Berat Jenis",
        result: "3,85% · BJ 1,028 (Lolos)",
        passed: true,
      },
      {
        parameter: "Uji Residu Antibiotik",
        result: "Negatif (Lolos)",
        passed: true,
      },
    ],
  },
  {
    id: "grn_261025_0064",
    number: "GRN-261025-0064",
    poId: "po_261028_0044",
    poNumber: "PO-261028-0044",
    supplierId: "sup_kemas_prima",
    supplierName: "PT Kemas Prima",
    dateLabel: "25 Okt 2026",
    deliveryNoteNumber: "SJ-KP-261025-11",
    warehouseName: "Bandung RM",
    qcStatus: "Lolos QC",
    qcInspector: "Rina Kartika (QC)",
    qcNotes:
      "Seluruh palet kemasan karton lolos pemeriksaan visual, dimensi, dan ketahanan segel.",
    lines: [
      {
        id: "grnl_64_1",
        materialName: "Packaging Cartons (Karton Aseptik 250ml)",
        unit: "pcs",
        orderedQty: 1_500_000,
        receivedQty: 1_500_000,
        acceptedQty: 1_500_000,
        heldQty: 0,
        unitPrice: 120,
        batchNumber: "PK-261025-04",
        storageLocation: "Bandung RM / Blok C-02",
      },
    ],
    qcChecks: [
      {
        parameter: "Dimensi & Presisi Lipatan",
        result: "100% sesuai toleransi mesin pengisi",
        passed: true,
      },
      {
        parameter: "Kualitas Cetak & Warna Brand",
        result: "Sesuai standar Ultrajaya",
        passed: true,
      },
    ],
  },
];

export const INITIAL_VENDOR_INVOICES: readonly VendorInvoiceRecord[] = [
  {
    id: "inv_kss_1027_041",
    number: "INV-KSS-1027-041",
    supplierInvoiceNumber: "FKT/KSS/X/2026/041",
    supplierId: "sup_kss",
    supplierName: "Koperasi Susu Sejahtera",
    poNumber: "PO-261027-0043",
    grnNumber: "GRN-261027-0067",
    issuedDateLabel: "27 Okt 2026",
    dueDateLabel: "24 Nov 2026",
    agingBucket: "Belum jatuh tempo",
    daysFromDue: -8,
    totalAmount: 180_000_000,
    eligibleAmount: 180_000_000,
    heldAmount: 0,
    paidAmount: 0,
    remainingAmount: 180_000_000,
    status: "Perlu pencocokan",
    matchingSummary:
      "Menunggu eksekusi 3-way matching oleh AP terhadap PO-261027-0043 dan bukti penerimaan lolos QC GRN-261027-0067 (22.500 L).",
    lines: [
      {
        id: "m_041_1",
        materialName: "Fresh Milk (Susu Segar Mentah — Tahap 1)",
        unit: "L",
        poOrderedQty: 45_000,
        poUnitPrice: 8_000,
        grnReceivedQty: 22_500,
        grnAcceptedQty: 22_500,
        grnHeldQty: 0,
        invoiceBilledQty: 22_500,
        invoiceUnitPrice: 8_000,
        eligibleSubtotal: 180_000_000,
        billedSubtotal: 180_000_000,
        discrepancyType: "NONE",
        discrepancyAmount: 0,
        discrepancyNote: "Kuantitas lolos QC (22.500 L) dan harga satuan (Rp8.000/L) cocok.",
      },
    ],
  },
  {
    id: "inv_sp_1028_087",
    number: "INV-SP-1028-087",
    supplierInvoiceNumber: "INV/SP/2026/10/087",
    supplierId: "sup_sumber_pangan",
    supplierName: "PT Sumber Pangan",
    poNumber: "PO-261026-0042",
    grnNumber: "GRN-261028-0068",
    issuedDateLabel: "28 Okt 2026",
    dueDateLabel: "27 Nov 2026",
    agingBucket: "Belum jatuh tempo",
    daysFromDue: -11,
    totalAmount: 160_000_000,
    eligibleAmount: 156_000_000,
    heldAmount: 4_000_000,
    paidAmount: 60_000_000,
    remainingAmount: 100_000_000,
    status: "Selisih ditahan",
    lastPaymentNumber: "PV-261029-0031",
    apJournalNumber: "JRN-261029-0001",
    matchingSummary:
      "Ditemukan selisih Rp4.000.000: pemasok menagih 8.000 kg penuh (Rp160 jt), sedangkan hasil QC hanya meloloskan 7.800 kg (Rp156 jt) dan terdapat selisih harga satuan pada baris Skim Grade A. Tagihan ditahan dari pembayaran baru sampai selisih diselesaikan.",
    lines: [
      {
        id: "m_087_1",
        materialName: "Milk Powder (Susu Bubuk Full Cream)",
        unit: "kg",
        poOrderedQty: 9_000,
        poUnitPrice: 20_000,
        grnReceivedQty: 7_000,
        grnAcceptedQty: 6_820,
        grnHeldQty: 180,
        invoiceBilledQty: 7_000,
        invoiceUnitPrice: 20_000,
        eligibleSubtotal: 136_400_000,
        billedSubtotal: 140_000_000,
        discrepancyType: "QUANTITY",
        discrepancyAmount: 3_600_000,
        discrepancyNote:
          "Selisih kuantitas +180 kg (ditagih 7.000 kg vs lolos QC 6.820 kg; 180 kg ditahan QC senilai Rp3.600.000).",
      },
      {
        id: "m_087_2",
        materialName: "Milk Powder Skim Grade A",
        unit: "kg",
        poOrderedQty: 1_000,
        poUnitPrice: 19_600,
        grnReceivedQty: 1_000,
        grnAcceptedQty: 1_000,
        grnHeldQty: 0,
        invoiceBilledQty: 1_000,
        invoiceUnitPrice: 20_000,
        eligibleSubtotal: 19_600_000,
        billedSubtotal: 20_000_000,
        discrepancyType: "PRICE",
        discrepancyAmount: 400_000,
        discrepancyNote:
          "Selisih harga satuan +Rp400/kg (faktur Rp20.000/kg vs kontrak PO Rp19.600/kg senilai Rp400.000).",
      },
    ],
  },
  {
    id: "inv_kp_1028_066",
    number: "INV-KP-1028-066",
    supplierInvoiceNumber: "FKT/KP/2026/1066",
    supplierId: "sup_kemas_prima",
    supplierName: "PT Kemas Prima",
    poNumber: "PO-261028-0044",
    grnNumber: "GRN-261025-0064",
    issuedDateLabel: "28 Okt 2026",
    dueDateLabel: "28 Nov 2026",
    agingBucket: "Belum jatuh tempo",
    daysFromDue: -12,
    totalAmount: 180_000_000,
    eligibleAmount: 180_000_000,
    heldAmount: 0,
    paidAmount: 60_000_000,
    remainingAmount: 120_000_000,
    status: "Siap dicatat utang",
    matchingSummary:
      "3-way matching antara PO-261028-0044, GRN-261025-0064 (1.500.000 pcs lolos QC), dan faktur INV-KP-1028-066 telah cocok 100%. Siap dicatat sebagai utang usaha dan jurnal persediaan.",
    lines: [
      {
        id: "m_066_1",
        materialName: "Packaging Cartons (Karton Aseptik 250ml)",
        unit: "pcs",
        poOrderedQty: 2_000_000,
        poUnitPrice: 120,
        grnReceivedQty: 1_500_000,
        grnAcceptedQty: 1_500_000,
        grnHeldQty: 0,
        invoiceBilledQty: 1_500_000,
        invoiceUnitPrice: 120,
        eligibleSubtotal: 180_000_000,
        billedSubtotal: 180_000_000,
        discrepancyType: "NONE",
        discrepancyAmount: 0,
        discrepancyNote: "Cocok penuh dengan kuantitas lolos QC dan harga PO.",
      },
    ],
  },
  {
    id: "inv_kss_1102_054",
    number: "INV-KSS-1102-054",
    supplierInvoiceNumber: "FKT/KSS/XI/2026/054",
    supplierId: "sup_kss",
    supplierName: "Koperasi Susu Sejahtera",
    poNumber: "PO-261027-0043",
    grnNumber: "GRN-261027-0067",
    issuedDateLabel: "05 Nov 2026",
    dueDateLabel: "19 Nov 2026",
    agingBucket: "Belum jatuh tempo",
    daysFromDue: -3,
    totalAmount: 80_000_000,
    eligibleAmount: 80_000_000,
    heldAmount: 0,
    paidAmount: 0,
    remainingAmount: 80_000_000,
    status: "Siap dibayar",
    apJournalNumber: "JRN-261105-0014",
    matchingSummary:
      "Utang usaha telah diakui (JRN-261105-0014). Jatuh tempo dalam 3 hari (19 Nov 2026); siap diproses pembayaran oleh Treasury.",
    lines: [
      {
        id: "m_054_1",
        materialName: "Fresh Milk (Pengiriman Tambahan Batch 1B)",
        unit: "L",
        poOrderedQty: 10_000,
        poUnitPrice: 8_000,
        grnReceivedQty: 10_000,
        grnAcceptedQty: 10_000,
        grnHeldQty: 0,
        invoiceBilledQty: 10_000,
        invoiceUnitPrice: 8_000,
        eligibleSubtotal: 80_000_000,
        billedSubtotal: 80_000_000,
        discrepancyType: "NONE",
        discrepancyAmount: 0,
        discrepancyNote: "Cocok penuh.",
      },
    ],
  },
  {
    id: "inv_ks_1025_049",
    number: "INV-KS-1025-049",
    supplierInvoiceNumber: "INV/KS/X/2026/049",
    supplierId: "sup_kemasan_sentosa",
    supplierName: "PT Kemasan Sentosa",
    poNumber: "PO-261015-0039",
    grnNumber: "GRN-261018-0060",
    issuedDateLabel: "19 Okt 2026",
    dueDateLabel: "02 Nov 2026",
    agingBucket: "1–30 hari",
    daysFromDue: 14,
    totalAmount: 45_000_000,
    eligibleAmount: 45_000_000,
    heldAmount: 0,
    paidAmount: 0,
    remainingAmount: 45_000_000,
    status: "Lewat jatuh tempo",
    apJournalNumber: "JRN-261020-0008",
    matchingSummary:
      "Melewati jatuh tempo 14 hari (umur utang 1–30 hari). Dokumen 3-way matching dan utang usaha telah terverifikasi; prioritas pembayaran.",
    lines: [
      {
        id: "m_049_1",
        materialName: "Master Box Corrugated UHT",
        unit: "pcs",
        poOrderedQty: 375_000,
        poUnitPrice: 120,
        grnReceivedQty: 375_000,
        grnAcceptedQty: 375_000,
        grnHeldQty: 0,
        invoiceBilledQty: 375_000,
        invoiceUnitPrice: 120,
        eligibleSubtotal: 45_000_000,
        billedSubtotal: 45_000_000,
        discrepancyType: "NONE",
        discrepancyAmount: 0,
        discrepancyNote: "Cocok penuh.",
      },
    ],
  },
  {
    id: "inv_ks_0918_032",
    number: "INV-KS-0918-032",
    supplierInvoiceNumber: "INV/KS/IX/2026/032",
    supplierId: "sup_kemasan_sentosa",
    supplierName: "PT Kemasan Sentosa",
    poNumber: "PO-260912-0031",
    grnNumber: "GRN-260916-0052",
    issuedDateLabel: "18 Sep 2026",
    dueDateLabel: "05 Okt 2026",
    agingBucket: "31–60 hari",
    daysFromDue: 42,
    totalAmount: 50_000_000,
    eligibleAmount: 50_000_000,
    heldAmount: 0,
    paidAmount: 0,
    remainingAmount: 50_000_000,
    status: "Lewat jatuh tempo",
    apJournalNumber: "JRN-260919-0004",
    matchingSummary:
      "Melewati jatuh tempo 42 hari (umur utang 31–60 hari). Telah diverifikasi AP dan masuk daftar tagihan prioritas pelunasan.",
    lines: [
      {
        id: "m_032_1",
        materialName: "Packaging Cartons (Karton Aseptik 200ml)",
        unit: "pcs",
        poOrderedQty: 400_000,
        poUnitPrice: 125,
        grnReceivedQty: 400_000,
        grnAcceptedQty: 400_000,
        grnHeldQty: 0,
        invoiceBilledQty: 400_000,
        invoiceUnitPrice: 125,
        eligibleSubtotal: 50_000_000,
        billedSubtotal: 50_000_000,
        discrepancyType: "NONE",
        discrepancyAmount: 0,
        discrepancyNote: "Cocok penuh.",
      },
    ],
  },
  {
    id: "inv_ip_0825_019",
    number: "INV-IP-0825-019",
    supplierInvoiceNumber: "INV/IP/VIII/2026/019",
    supplierId: "sup_indopack",
    supplierName: "PT IndoPack",
    poNumber: "PO-260820-0024",
    grnNumber: "GRN-260824-0044",
    issuedDateLabel: "25 Agu 2026",
    dueDateLabel: "09 Sep 2026",
    agingBucket: "61–90 hari",
    daysFromDue: 68,
    totalAmount: 45_000_000,
    eligibleAmount: 45_000_000,
    heldAmount: 0,
    paidAmount: 0,
    remainingAmount: 45_000_000,
    status: "Lewat jatuh tempo",
    apJournalNumber: "JRN-260826-0019",
    matchingSummary:
      "Melewati jatuh tempo 68 hari (umur utang 61–90 hari). Menunggu eksekusi pembayaran terjadwal Treasury.",
    lines: [
      {
        id: "m_019_1",
        materialName: "Outer Shrink Film Roll",
        unit: "pcs",
        poOrderedQty: 360_000,
        poUnitPrice: 125,
        grnReceivedQty: 360_000,
        grnAcceptedQty: 360_000,
        grnHeldQty: 0,
        invoiceBilledQty: 360_000,
        invoiceUnitPrice: 125,
        eligibleSubtotal: 45_000_000,
        billedSubtotal: 45_000_000,
        discrepancyType: "NONE",
        discrepancyAmount: 0,
        discrepancyNote: "Cocok penuh.",
      },
    ],
  },
  {
    id: "inv_ip_0715_011",
    number: "INV-IP-0715-011",
    supplierInvoiceNumber: "INV/IP/VII/2026/011",
    supplierId: "sup_indopack",
    supplierName: "PT IndoPack",
    poNumber: "PO-260710-0018",
    grnNumber: "GRN-260714-0031",
    issuedDateLabel: "15 Jul 2026",
    dueDateLabel: "10 Agu 2026",
    agingBucket: ">90 hari",
    daysFromDue: 98,
    totalAmount: 20_000_000,
    eligibleAmount: 20_000_000,
    heldAmount: 0,
    paidAmount: 0,
    remainingAmount: 20_000_000,
    status: "Lewat jatuh tempo",
    apJournalNumber: "JRN-260716-0005",
    matchingSummary:
      "Melewati jatuh tempo 98 hari (>90 hari). Klarifikasi rekonsiliasi saldo dengan PT IndoPack telah selesai; siap dilunasi.",
    lines: [
      {
        id: "m_011_1",
        materialName: "Pallet Stretch Hood Packaging",
        unit: "pcs",
        poOrderedQty: 160_000,
        poUnitPrice: 125,
        grnReceivedQty: 160_000,
        grnAcceptedQty: 160_000,
        grnHeldQty: 0,
        invoiceBilledQty: 160_000,
        invoiceUnitPrice: 125,
        eligibleSubtotal: 20_000_000,
        billedSubtotal: 20_000_000,
        discrepancyType: "NONE",
        discrepancyAmount: 0,
        discrepancyNote: "Cocok penuh.",
      },
    ],
  },
  {
    id: "inv_kp_1015_040",
    number: "INV-KP-1015-040",
    supplierInvoiceNumber: "FKT/KP/2026/1040",
    supplierId: "sup_kemas_prima",
    supplierName: "PT Kemas Prima",
    poNumber: "PO-261010-0038",
    grnNumber: "GRN-261025-0064",
    issuedDateLabel: "15 Okt 2026",
    dueDateLabel: "14 Nov 2026",
    agingBucket: "Belum jatuh tempo",
    daysFromDue: 0,
    totalAmount: 140_000_000,
    eligibleAmount: 140_000_000,
    heldAmount: 0,
    paidAmount: 140_000_000,
    remainingAmount: 0,
    status: "Lunas",
    apJournalNumber: "JRN-261016-0011",
    lastPaymentNumber: "PV-261112-0044",
    matchingSummary:
      "Telah dilunasi penuh melalui transfer Bank BCA Operasional (PV-261112-0044).",
    lines: [
      {
        id: "m_040_1",
        materialName: "Packaging Cartons (Karton Aseptik 1L)",
        unit: "pcs",
        poOrderedQty: 1_000_000,
        poUnitPrice: 140,
        grnReceivedQty: 1_000_000,
        grnAcceptedQty: 1_000_000,
        grnHeldQty: 0,
        invoiceBilledQty: 1_000_000,
        invoiceUnitPrice: 140,
        eligibleSubtotal: 140_000_000,
        billedSubtotal: 140_000_000,
        discrepancyType: "NONE",
        discrepancyAmount: 0,
        discrepancyNote: "Cocok penuh dan telah lunas.",
      },
    ],
  },
];

export const PAYABLES_DATE_ADJUSTMENTS: Record<
  PayablesDateOption,
  {
    label: string;
    paymentsThisMonthBase: number;
  }
> = {
  "2026-11-16": {
    label: "16 Nov 2026",
    paymentsThisMonthBase: 260_000_000,
  },
  "2026-11-30": {
    label: "30 Nov 2026 (Proyeksi)",
    paymentsThisMonthBase: 440_000_000,
  },
  "2026-10-31": {
    label: "31 Okt 2026",
    paymentsThisMonthBase: 400_000_000,
  },
};

const AGING_ORDER: readonly {
  key: AgingBucketKey;
  tone: "current" | "warning" | "overdue";
}[] = [
  { key: "Belum jatuh tempo", tone: "current" },
  { key: "1–30 hari", tone: "warning" },
  { key: "31–60 hari", tone: "overdue" },
  { key: "61–90 hari", tone: "overdue" },
  { key: ">90 hari", tone: "overdue" },
];

export function computePayablesSnapshot(
  invoices: readonly VendorInvoiceRecord[],
  dateKey: PayablesDateOption,
  extraPaidThisSession = 0,
): PayablesSnapshot {
  const bucketTotals = new Map<AgingBucketKey, number>();
  for (const item of AGING_ORDER) {
    bucketTotals.set(item.key, 0);
  }

  for (const inv of invoices) {
    if (inv.remainingAmount <= 0) continue;
    let bucket: AgingBucketKey = inv.agingBucket;
    if (dateKey === "2026-11-30" && bucket === "Belum jatuh tempo") {
      // By Nov 30, Nov due dates fall into 1–30 hari if still unpaid
      bucket = "1–30 hari";
    }
    bucketTotals.set(bucket, (bucketTotals.get(bucket) ?? 0) + inv.remainingAmount);
  }

  const aging: PayablesAgingRow[] = AGING_ORDER.map((item) => ({
    label: item.key,
    amount: bucketTotals.get(item.key) ?? 0,
    tone: item.tone,
  }));

  const totalOpenPayables = aging.reduce((sum, b) => sum + b.amount, 0);
  const overduePayables = aging
    .filter((b) => b.label !== "Belum jatuh tempo")
    .reduce((sum, b) => sum + b.amount, 0);

  const overdueList = invoices
    .filter((inv) => inv.remainingAmount > 0 && inv.daysFromDue > 0)
    .sort((a, b) => b.daysFromDue - a.daysFromDue)
    .slice(0, 2);
  const dueSoonList = invoices
    .filter(
      (inv) =>
        inv.remainingAmount > 0 &&
        inv.daysFromDue <= 0 &&
        inv.daysFromDue >= -7,
    )
    .sort((a, b) => b.daysFromDue - a.daysFromDue)
    .slice(0, 1);

  const priorities: PriorityPayableItem[] = [
    ...overdueList,
    ...dueSoonList,
  ].map((inv) => ({
      id: `prio-${inv.id}`,
      invoiceId: inv.id,
      invoiceNumber: inv.number,
      supplierName: inv.supplierName,
      dueStatusLabel:
        inv.daysFromDue > 0
          ? `${inv.daysFromDue} hari terlambat`
          : `Jatuh tempo ${Math.abs(inv.daysFromDue)} hari lagi`,
      tone: inv.daysFromDue > 0 ? "danger" : "warning",
      amount: inv.remainingAmount,
    }));

  const meta = PAYABLES_DATE_ADJUSTMENTS[dateKey];

  return {
    key: dateKey,
    label: meta.label,
    totalOpenPayables,
    overduePayables,
    paymentsThisMonth: meta.paymentsThisMonthBase + extraPaidThisSession,
    aging,
    priorities,
  };
}

export function actionLabelForRequest(status: RequestStatus): string | null {
  switch (status) {
    case "Menunggu verifikasi":
      return "Verifikasi stok";
    case "Terverifikasi":
      return "Buat RFQ";
    case "Sudah dibuat RFQ":
    case "Stok mencukupi":
      return null;
  }
}

export function actionLabelForRfq(status: RfqStatus): string | null {
  switch (status) {
    case "Menunggu penawaran":
      return "Catat penawaran";
    case "Perlu evaluasi":
      return "Evaluasi penawaran";
    case "Pemasok terpilih":
      return "Buat PO";
    case "PO diterbitkan":
      return null;
  }
}

export function actionLabelForPo(status: PoStatus): string | null {
  switch (status) {
    case "Menunggu persetujuan":
      return "Setujui PO";
    case "Perlu revisi":
      return "Revisi PO";
    case "Disetujui":
      return "Kirim PO";
    case "Dikirim ke pemasok":
      return null;
  }
}

export function actionLabelForReceipt(status: QcStatus): string | null {
  switch (status) {
    case "Menunggu Inspeksi":
      return "Tinjau Inspeksi";
    case "Lolos QC":
    case "Ditahan":
      return null;
  }
}

export function actionLabelForVendorInvoice(
  status: VendorInvoiceStatus,
): string | null {
  switch (status) {
    case "Perlu pencocokan":
      return "Cocokkan Dokumen";
    case "Selisih ditahan":
      return "Tinjau Selisih";
    case "Siap dicatat utang":
      return "Catat Utang";
    case "Siap dibayar":
    case "Lewat jatuh tempo":
      return "Proses Pembayaran";
    case "Lunas":
      return null;
  }
}
