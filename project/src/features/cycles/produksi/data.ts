export type ProduksiTab = "ringkasan" | "perencanaan" | "batch" | "gudang-hpp";

export type PeriodOption = "30d" | "7d" | "90d";
export type ProductFilterOption =
  | "ALL"
  | "PRD-FC1L"
  | "PRD-COK250"
  | "PRD-TK300"
  | "PRD-KI250";

export type PlanningViewOption = "orders" | "mps" | "mrp";
export type GudangHppViewOption = "gudang" | "hpp";

export type TaskStatus =
  | "Sedang berjalan"
  | "Perlu ditinjau"
  | "Menunggu QC"
  | "Siap disimpan";

export type ProductionOrderStatus =
  | "Kekurangan bahan"
  | "Menunggu bahan (FPBB)"
  | "Siap dirilis"
  | "Dirilis ke produksi";

export type BatchStatus =
  | "Dalam Proses"
  | "Menunggu QC"
  | "Ditahan"
  | "Dirilis QC";

export type BatchNextActionType =
  | "CATAT_HASIL"
  | "TINJAU_UJI"
  | "RILIS_BATCH"
  | "NONE";

export type QcReleaseState = "Dirilis QC" | "Menunggu QC" | "Ditahan";
export type StorageState =
  | "Tersimpan di AS/RS"
  | "Siap disimpan"
  | "Karantina QC"
  | "Belum di gudang";
export type InventorySyncState =
  | "Tersinkron ke Stok"
  | "Menunggu konfirmasi"
  | "Ditangguhkan";

export type HppAuditStatus =
  | "Terverifikasi Audit"
  | "Perlu tinjauan HPP"
  | "Menunggu penyelesaian batch";

export interface ProductCatalogItem {
  id: Exclude<ProductFilterOption, "ALL">;
  name: string;
  shortName: string;
  unit: "karton";
  packSpec: string;
  defaultLine: string;
  standardHppPerUnit: number;
}

export interface TargetActualPoint {
  label: string;
  targetKarton: number;
  actualKarton: number;
}

export interface SummarySeriesDataset {
  period: PeriodOption;
  periodLabel: string;
  product: ProductFilterOption;
  productLabel: string;
  unit: "karton";
  targetTotal: number;
  actualTotal: number;
  yMax: number;
  yTicks: number[];
  points: TargetActualPoint[];
}

export interface ProductionTaskItem {
  id: string;
  task: string;
  reference: string;
  referenceType: "order" | "batch";
  stage: string;
  status: TaskStatus;
  actionLabel: string;
  targetTab: ProduksiTab;
  targetSubView?: PlanningViewOption | GudangHppViewOption;
  ownerRole: string;
  description: string;
}

export interface OrderMaterialRequirement {
  materialId: string;
  code: string;
  name: string;
  unit: "L" | "kg" | "pcs";
  requiredQty: number;
  availableQty: number;
  shortQty: number;
}

export interface ProductionOrderRecord {
  id: string;
  number: string;
  mpsCode: string;
  productId: Exclude<ProductFilterOption, "ALL">;
  productName: string;
  productionLine: string;
  scheduleDateLabel: string;
  shiftLabel: string;
  plannedQty: number;
  unit: "karton";
  status: ProductionOrderStatus;
  warehouseName: string;
  fpbbReference?: string;
  linkedBatchNumber?: string;
  materials: OrderMaterialRequirement[];
  planningNote: string;
}

export interface MpsScheduleRow {
  id: string;
  mpsCode: string;
  periodWindow: string;
  scheduleDateLabel: string;
  shiftLabel: string;
  productionLine: string;
  productId: Exclude<ProductFilterOption, "ALL">;
  productName: string;
  plannedQty: number;
  unit: "karton";
  orderNumber: string;
  status: ProductionOrderStatus;
}

export interface MrpRequirementItem {
  id: string;
  materialId: string;
  code: string;
  name: string;
  warehouseName: string;
  unit: "L" | "kg" | "pcs";
  requiredTotal: number;
  availableStock: number;
  shortageQty: number;
  affectedOrderNumbers: string[];
  fpbbReference?: string;
  status: "Tersedia lengkap" | "Kekurangan stok" | "FPBB diajukan";
}

export interface BatchTimelineStep {
  key: "inspeksi" | "uht" | "qc";
  title:
    | "Inspeksi & Persiapan Bahan"
    | "UHT & Pengemasan"
    | "Uji Batch & Rilis QC";
  state: "completed" | "current" | "held" | "upcoming";
  timestampLabel: string;
  actorLabel: string;
  resultSummary: string;
}

export interface ProductionBatchRecord {
  id: string;
  batchNumber: string;
  orderNumber: string;
  productId: Exclude<ProductFilterOption, "ALL">;
  productName: string;
  productionLine: string;
  dateLabel: string;
  shiftLabel: string;
  plannedQty: number;
  actualQty: number;
  rejectQty: number;
  unit: "karton";
  status: BatchStatus;
  nextAction: BatchNextActionType;
  uhtTempCelsius: string;
  phLevel: string;
  microbiologyResult: string;
  sealIntegrityResult: string;
  holdReason?: string;
  holdZone?: string;
  timeline: BatchTimelineStep[];
  // Gudang & AS/RS fields
  qcReleaseState: QcReleaseState;
  storageState: StorageState;
  inventorySyncState: InventorySyncState;
  asrsZone: string;
  asrsLocation: string;
  storedQty: number;
  fgReceiptRef?: string;
  // HPP / Cost Accounting fields
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  standardHppPerUnit: number;
  hppAuditStatus: HppAuditStatus;
  hppJournalRef: string;
  hppControllerNote: string;
}

export const PRODUKSI_TABS: readonly {
  key: ProduksiTab;
  label: string;
  bannerTitle: string;
}[] = [
  {
    key: "ringkasan",
    label: "Ringkasan",
    bannerTitle: "Ringkasan Produksi",
  },
  {
    key: "perencanaan",
    label: "Perencanaan",
    bannerTitle: "Perencanaan Produksi",
  },
  {
    key: "batch",
    label: "Batch Produksi",
    bannerTitle: "Batch Produksi",
  },
  {
    key: "gudang-hpp",
    label: "Gudang & HPP",
    bannerTitle: "Gudang & HPP",
  },
];

export const PRODUCT_CATALOG: readonly ProductCatalogItem[] = [
  {
    id: "PRD-FC1L",
    name: "Ultra Milk Full Cream 1L",
    shortName: "Full Cream 1L",
    unit: "karton",
    packSpec: "12 × 1L Aseptik",
    defaultLine: "Lini Aseptik UHT 1",
    standardHppPerUnit: 54_000,
  },
  {
    id: "PRD-COK250",
    name: "Ultra Milk Cokelat 250ml",
    shortName: "Cokelat 250ml",
    unit: "karton",
    packSpec: "24 × 250ml Aseptik",
    defaultLine: "Lini Aseptik UHT 2",
    standardHppPerUnit: 48_500,
  },
  {
    id: "PRD-TK300",
    name: "Teh Kotak Jasmine 300ml",
    shortName: "Teh Kotak 300ml",
    unit: "karton",
    packSpec: "24 × 300ml Aseptik",
    defaultLine: "Lini Minuman Ringan 1",
    standardHppPerUnit: 36_000,
  },
  {
    id: "PRD-KI250",
    name: "Sari Kacang Ijo 250ml",
    shortName: "Kacang Ijo 250ml",
    unit: "karton",
    packSpec: "24 × 250ml Aseptik",
    defaultLine: "Lini Minuman Ringan 2",
    standardHppPerUnit: 39_500,
  },
];

export function formatNumberId(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatQuantityWithUnit(
  value: number,
  unit: "karton" | "L" | "kg" | "pcs",
): string {
  return `${formatNumberId(value)} ${unit}`;
}

export function formatRupiahFull(amount: number): string {
  const formatted = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(amount)));
  return `Rp${formatted}`;
}

export function formatRupiahCompact(amount: number): string {
  if (amount <= 0) return "Rp0";
  if (amount >= 1_000_000_000) {
    const billions = amount / 1_000_000_000;
    const formatted = new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(billions);
    return `Rp${formatted} M`;
  }
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

const PERIOD_BUCKET_LABELS: Record<PeriodOption, string[]> = {
  "30d": ["Pekan 1", "Pekan 2", "Pekan 3", "Pekan 4"],
  "7d": ["Sen–Sel", "Rab–Kam", "Jumat", "Sab–Min"],
  "90d": ["September", "Oktober", "Nov (s.d. 16)", "Target Akhir Nov"],
};

const PERIOD_LABELS: Record<PeriodOption, string> = {
  "30d": "30 hari terakhir",
  "7d": "7 hari terakhir",
  "90d": "90 hari terakhir",
};

const PRODUCT_SERIES_BY_PERIOD: Record<
  PeriodOption,
  Record<Exclude<ProductFilterOption, "ALL">, { target: number[]; actual: number[] }>
> = {
  "30d": {
    "PRD-FC1L": {
      target: [2100, 2200, 2300, 2400],
      actual: [2060, 2180, 2240, 2280],
    },
    "PRD-COK250": {
      target: [1500, 1600, 1650, 1750],
      actual: [1450, 1540, 1520, 1590],
    },
    "PRD-TK300": {
      target: [1200, 1300, 1350, 1400],
      actual: [1180, 1270, 1310, 1360],
    },
    "PRD-KI250": {
      target: [750, 800, 820, 880],
      actual: [720, 760, 790, 820],
    },
  },
  "7d": {
    "PRD-FC1L": {
      target: [600, 650, 580, 570],
      actual: [590, 630, 560, 500],
    },
    "PRD-COK250": {
      target: [450, 480, 420, 400],
      actual: [430, 450, 390, 320],
    },
    "PRD-TK300": {
      target: [350, 380, 340, 330],
      actual: [340, 370, 330, 320],
    },
    "PRD-KI250": {
      target: [220, 240, 210, 210],
      actual: [210, 225, 195, 190],
    },
  },
  "90d": {
    "PRD-FC1L": {
      target: [8200, 8600, 9000, 9200],
      actual: [8050, 8490, 8760, 8920],
    },
    "PRD-COK250": {
      target: [5800, 6100, 6500, 6600],
      actual: [5650, 5940, 6100, 6320],
    },
    "PRD-TK300": {
      target: [4800, 5000, 5250, 5400],
      actual: [4720, 4910, 5120, 5260],
    },
    "PRD-KI250": {
      target: [2900, 3100, 3250, 3400],
      actual: [2810, 2980, 3090, 3240],
    },
  },
};

export function buildSummaryDataset(
  period: PeriodOption,
  product: ProductFilterOption,
  extraActualByProduct?: Partial<Record<Exclude<ProductFilterOption, "ALL">, number>>,
): SummarySeriesDataset {
  const labels = PERIOD_BUCKET_LABELS[period];
  const byProd = PRODUCT_SERIES_BY_PERIOD[period];
  const productIds: Exclude<ProductFilterOption, "ALL">[] =
    product === "ALL"
      ? ["PRD-FC1L", "PRD-COK250", "PRD-TK300", "PRD-KI250"]
      : [product];

  const points: TargetActualPoint[] = labels.map((label, idx) => {
    let targetKarton = 0;
    let actualKarton = 0;
    for (const pid of productIds) {
      targetKarton += byProd[pid].target[idx] ?? 0;
      actualKarton += byProd[pid].actual[idx] ?? 0;
      if (idx === labels.length - 1 && extraActualByProduct?.[pid]) {
        actualKarton += extraActualByProduct[pid] ?? 0;
      }
    }
    return { label, targetKarton, actualKarton };
  });

  const targetTotal = points.reduce((acc, p) => acc + p.targetKarton, 0);
  const actualTotal = points.reduce((acc, p) => acc + p.actualKarton, 0);
  const maxVal = Math.max(100, ...points.flatMap((p) => [p.targetKarton, p.actualKarton]));

  // Compute clean 4-step axis ceiling
  const stepRaw = maxVal / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(stepRaw)));
  const normalized = stepRaw / magnitude;
  const niceStep =
    (normalized <= 1
      ? 1
      : normalized <= 2
        ? 2
        : normalized <= 2.5
          ? 2.5
          : normalized <= 5
            ? 5
            : 10) * magnitude;
  const yMax = Math.ceil(maxVal / niceStep) * niceStep;
  const yTicks = [0, 1, 2, 3, 4].map((i) => Math.round((yMax * i) / 4));

  const productLabel =
    product === "ALL"
      ? "Semua produk"
      : (PRODUCT_CATALOG.find((p) => p.id === product)?.name ?? "Semua produk");

  return {
    period,
    periodLabel: PERIOD_LABELS[period],
    product,
    productLabel,
    unit: "karton",
    targetTotal,
    actualTotal,
    yMax,
    yTicks,
    points,
  };
}

export const INITIAL_PRODUCTION_ORDERS: readonly ProductionOrderRecord[] = [
  {
    id: "po-prd-001",
    number: "PRD-2611-001",
    mpsCode: "MPS-2611-W3-01",
    productId: "PRD-FC1L",
    productName: "Ultra Milk Full Cream 1L",
    productionLine: "Lini Aseptik UHT 1",
    scheduleDateLabel: "16 Nov 2026",
    shiftLabel: "Shift 1 (06:00–14:00)",
    plannedQty: 2400,
    unit: "karton",
    status: "Dirilis ke produksi",
    warehouseName: "Bandung RM",
    linkedBatchNumber: "BATCH-261116-01",
    materials: [
      {
        materialId: "mat_fresh_milk",
        code: "RM-001",
        name: "Fresh Milk (Susu Segar)",
        unit: "L",
        requiredQty: 28800,
        availableQty: 62000,
        shortQty: 0,
      },
      {
        materialId: "mat_milk_powder",
        code: "RM-002",
        name: "Milk Powder (Susu Bubuk Skim)",
        unit: "kg",
        requiredQty: 1440,
        availableQty: 11500,
        shortQty: 0,
      },
      {
        materialId: "mat_cartons",
        code: "PK-001",
        name: "Packaging Cartons 1L Aseptik",
        unit: "pcs",
        requiredQty: 28800,
        availableQty: 95000,
        shortQty: 0,
      },
    ],
    planningNote:
      "Order telah dirilis ke Lini Aseptik UHT 1; sedang diproses pada BATCH-261116-01.",
  },
  {
    id: "po-prd-002",
    number: "PRD-2611-002",
    mpsCode: "MPS-2611-W3-02",
    productId: "PRD-TK300",
    productName: "Teh Kotak Jasmine 300ml",
    productionLine: "Lini Minuman Ringan 1",
    scheduleDateLabel: "16 Nov 2026",
    shiftLabel: "Shift 2 (14:00–22:00)",
    plannedQty: 1800,
    unit: "karton",
    status: "Siap dirilis",
    warehouseName: "Bandung RM",
    materials: [
      {
        materialId: "mat_jasmine_tea",
        code: "RM-004",
        name: "Daun Teh Jasmine & Gula Rafinasi",
        unit: "kg",
        requiredQty: 1620,
        availableQty: 4200,
        shortQty: 0,
      },
      {
        materialId: "mat_cartons",
        code: "PK-001",
        name: "Packaging Cartons 300ml Aseptik",
        unit: "pcs",
        requiredQty: 43200,
        availableQty: 74000,
        shortQty: 0,
      },
    ],
    planningNote:
      "Seluruh bahan baku daun teh, gula rafinasi, dan kemasan 300ml tersedia penuh di Gudang Bandung RM. Siap dirilis ke lantai produksi.",
  },
  {
    id: "po-prd-003",
    number: "PRD-2611-003",
    mpsCode: "MPS-2611-W3-03",
    productId: "PRD-COK250",
    productName: "Ultra Milk Cokelat 250ml",
    productionLine: "Lini Aseptik UHT 2",
    scheduleDateLabel: "17 Nov 2026",
    shiftLabel: "Shift 1 (06:00–14:00)",
    plannedQty: 2000,
    unit: "karton",
    status: "Kekurangan bahan",
    warehouseName: "Bandung RM",
    fpbbReference: "FPBB-261116-0191",
    materials: [
      {
        materialId: "mat_fresh_milk",
        code: "RM-001",
        name: "Fresh Milk (Susu Segar)",
        unit: "L",
        requiredQty: 12000,
        availableQty: 33200,
        shortQty: 0,
      },
      {
        materialId: "mat_cocoa_powder",
        code: "RM-003",
        name: "Bubuk Kakao Alkalized",
        unit: "kg",
        requiredQty: 1800,
        availableQty: 1450,
        shortQty: 350,
      },
      {
        materialId: "mat_cartons",
        code: "PK-001",
        name: "Packaging Cartons 250ml Aseptik",
        unit: "pcs",
        requiredQty: 48000,
        availableQty: 53000,
        shortQty: 0,
      },
    ],
    planningNote:
      "Terdapat kekurangan 350 kg Bubuk Kakao Alkalized (RM-003). Perlu tinjauan kebutuhan bahan dan pengajuan FPBB ke Gudang/Purchasing.",
  },
  {
    id: "po-prd-004",
    number: "PRD-2611-004",
    mpsCode: "MPS-2611-W3-04",
    productId: "PRD-FC1L",
    productName: "Ultra Milk Full Cream 1L",
    productionLine: "Lini Aseptik UHT 1",
    scheduleDateLabel: "17 Nov 2026",
    shiftLabel: "Shift 2 (14:00–22:00)",
    plannedQty: 1600,
    unit: "karton",
    status: "Siap dirilis",
    warehouseName: "Bandung RM",
    materials: [
      {
        materialId: "mat_fresh_milk",
        code: "RM-001",
        name: "Fresh Milk (Susu Segar)",
        unit: "L",
        requiredQty: 19200,
        availableQty: 33200,
        shortQty: 0,
      },
      {
        materialId: "mat_milk_powder",
        code: "RM-002",
        name: "Milk Powder (Susu Bubuk Skim)",
        unit: "kg",
        requiredQty: 960,
        availableQty: 10060,
        shortQty: 0,
      },
      {
        materialId: "mat_cartons",
        code: "PK-001",
        name: "Packaging Cartons 1L Aseptik",
        unit: "pcs",
        requiredQty: 19200,
        availableQty: 66200,
        shortQty: 0,
      },
    ],
    planningNote:
      "Kuota susu segar Koperasi Susu Sejahtera telah diterima dan lolos QC; order siap dirilis.",
  },
  {
    id: "po-prd-005",
    number: "PRD-2611-005",
    mpsCode: "MPS-2611-W3-05",
    productId: "PRD-KI250",
    productName: "Sari Kacang Ijo 250ml",
    productionLine: "Lini Minuman Ringan 2",
    scheduleDateLabel: "18 Nov 2026",
    shiftLabel: "Shift 1 (06:00–14:00)",
    plannedQty: 1500,
    unit: "karton",
    status: "Kekurangan bahan",
    warehouseName: "Bandung RM",
    fpbbReference: "FPBB-261116-0192",
    materials: [
      {
        materialId: "mat_mung_bean",
        code: "RM-005",
        name: "Kacang Hijau Pilihan & Gula Aren",
        unit: "kg",
        requiredQty: 1350,
        availableQty: 2100,
        shortQty: 0,
      },
      {
        materialId: "mat_cartons",
        code: "PK-001",
        name: "Packaging Cartons 250ml Kacang Ijo",
        unit: "pcs",
        requiredQty: 36000,
        availableQty: 18000,
        shortQty: 18000,
      },
    ],
    planningNote:
      "Kekurangan 18.000 pcs kemasan aseptik 250ml desain Sari Kacang Ijo (PK-001). Perlu peninjauan MRP untuk jadwal kedatangan PO PT Kemas Prima.",
  },
];

export const INITIAL_MRP_SUMMARY: readonly MrpRequirementItem[] = [
  {
    id: "mrp-rm-001",
    materialId: "mat_fresh_milk",
    code: "RM-001",
    name: "Fresh Milk (Susu Segar)",
    warehouseName: "Bandung RM",
    unit: "L",
    requiredTotal: 60000,
    availableStock: 62000,
    shortageQty: 0,
    affectedOrderNumbers: ["PRD-2611-001", "PRD-2611-003", "PRD-2611-004"],
    status: "Tersedia lengkap",
  },
  {
    id: "mrp-rm-002",
    materialId: "mat_milk_powder",
    code: "RM-002",
    name: "Milk Powder (Susu Bubuk Skim)",
    warehouseName: "Bandung RM",
    unit: "kg",
    requiredTotal: 2400,
    availableStock: 11500,
    shortageQty: 0,
    affectedOrderNumbers: ["PRD-2611-001", "PRD-2611-004"],
    status: "Tersedia lengkap",
  },
  {
    id: "mrp-rm-003",
    materialId: "mat_cocoa_powder",
    code: "RM-003",
    name: "Bubuk Kakao Alkalized",
    warehouseName: "Bandung RM",
    unit: "kg",
    requiredTotal: 1800,
    availableStock: 1450,
    shortageQty: 350,
    affectedOrderNumbers: ["PRD-2611-003"],
    fpbbReference: "FPBB-261116-0191",
    status: "Kekurangan stok",
  },
  {
    id: "mrp-pk-001",
    materialId: "mat_cartons",
    code: "PK-001",
    name: "Packaging Cartons (Kemasan Aseptik)",
    warehouseName: "Bandung RM",
    unit: "pcs",
    requiredTotal: 175200,
    availableStock: 157200,
    shortageQty: 18000,
    affectedOrderNumbers: ["PRD-2611-005"],
    fpbbReference: "FPBB-261116-0192",
    status: "Kekurangan stok",
  },
  {
    id: "mrp-rm-004",
    materialId: "mat_jasmine_tea",
    code: "RM-004",
    name: "Daun Teh Jasmine & Gula Rafinasi",
    warehouseName: "Bandung RM",
    unit: "kg",
    requiredTotal: 1620,
    availableStock: 4200,
    shortageQty: 0,
    affectedOrderNumbers: ["PRD-2611-002"],
    status: "Tersedia lengkap",
  },
];

export const INITIAL_BATCHES: readonly ProductionBatchRecord[] = [
  {
    id: "batch-261116-01",
    batchNumber: "BATCH-261116-01",
    orderNumber: "PRD-2611-001",
    productId: "PRD-FC1L",
    productName: "Ultra Milk Full Cream 1L",
    productionLine: "Lini Aseptik UHT 1",
    dateLabel: "16 Nov 2026",
    shiftLabel: "Shift 1 (06:00–14:00)",
    plannedQty: 2400,
    actualQty: 2360,
    rejectQty: 18,
    unit: "karton",
    status: "Dalam Proses",
    nextAction: "CATAT_HASIL",
    uhtTempCelsius: "138,5°C · 4 dtk",
    phLevel: "6,68 (Standar 6,60–6,75)",
    microbiologyResult: "Sampel in-line negatif; menunggu akhir pengemasan",
    sealIntegrityResult: "Uji vakum & lipatan aseptik normal",
    timeline: [
      {
        key: "inspeksi",
        title: "Inspeksi & Persiapan Bahan",
        state: "completed",
        timestampLabel: "16 Nov 2026 · 06:15 WIB",
        actorLabel: "Operator Produksi & QC RM",
        resultSummary:
          "28.800 L susu segar (suhu 3,7°C, uji alkohol negatif) dan 28.800 pcs kemasan 1L lolos verifikasi pra-produksi.",
      },
      {
        key: "uht",
        title: "UHT & Pengemasan",
        state: "current",
        timestampLabel: "16 Nov 2026 · 10:40 WIB",
        actorLabel: "Operator Lini Aseptik UHT 1",
        resultSummary:
          "Sterilisasi UHT 138,5°C berjalan stabil; 2.360 karton telah dikemas, menunggu pencatatan hasil akhir shift.",
      },
      {
        key: "qc",
        title: "Uji Batch & Rilis QC",
        state: "upcoming",
        timestampLabel: "Menunggu penyelesaian pengemasan",
        actorLabel: "Tim QC / QA Lab",
        resultSummary:
          "Pengujian akhir batch dan rilis QC akan dilakukan setelah hasil produksi dicatat.",
      },
    ],
    qcReleaseState: "Menunggu QC",
    storageState: "Belum di gudang",
    inventorySyncState: "Menunggu konfirmasi",
    asrsZone: "Zona A-01 (High-Bay UHT)",
    asrsLocation: "ASRS-A01-R08 (Terjadwal)",
    storedQty: 0,
    materialCost: 92_400_000,
    laborCost: 15_200_000,
    overheadCost: 20_320_000,
    standardHppPerUnit: 54_000,
    hppAuditStatus: "Menunggu penyelesaian batch",
    hppJournalRef: "JRN-HPP-261116-01",
    hppControllerNote:
      "Akumulasi biaya WIP berjalan; finalisasi HPP per karton dilakukan setelah batch selesai.",
  },
  {
    id: "batch-261116-02",
    batchNumber: "BATCH-261116-02",
    orderNumber: "PRD-2611-000",
    productId: "PRD-COK250",
    productName: "Ultra Milk Cokelat 250ml",
    productionLine: "Lini Aseptik UHT 2",
    dateLabel: "16 Nov 2026",
    shiftLabel: "Shift 1 (06:00–14:00)",
    plannedQty: 2000,
    actualQty: 1975,
    rejectQty: 25,
    unit: "karton",
    status: "Menunggu QC",
    nextAction: "TINJAU_UJI",
    uhtTempCelsius: "139,0°C · 4 dtk",
    phLevel: "6,65 (Memenuhi standar)",
    microbiologyResult: "Inkubasi cepat B0 negatif (0 CFU/ml)",
    sealIntegrityResult: "Lulus uji tekan & konduktivitas 24/24 sampel",
    timeline: [
      {
        key: "inspeksi",
        title: "Inspeksi & Persiapan Bahan",
        state: "completed",
        timestampLabel: "16 Nov 2026 · 05:50 WIB",
        actorLabel: "Operator Produksi",
        resultSummary:
          "Susu segar, bubuk kakao alkalized, dan kemasan 250ml terverifikasi sesuai formula.",
      },
      {
        key: "uht",
        title: "UHT & Pengemasan",
        state: "completed",
        timestampLabel: "16 Nov 2026 · 11:10 WIB",
        actorLabel: "Operator Lini Aseptik UHT 2",
        resultSummary:
          "Proses UHT 139,0°C selesai. Output bersih tercatat 1.975 karton layak dan 25 karton reject awal.",
      },
      {
        key: "qc",
        title: "Uji Batch & Rilis QC",
        state: "current",
        timestampLabel: "16 Nov 2026 · 11:30 WIB",
        actorLabel: "Inspector QC Lab",
        resultSummary:
          "Hasil uji pH 6,65, viskositas 18 cP, dan mikrobiologi B0 telah diinput; menunggu tinjauan hasil uji QC.",
      },
    ],
    qcReleaseState: "Menunggu QC",
    storageState: "Belum di gudang",
    inventorySyncState: "Menunggu konfirmasi",
    asrsZone: "Zona A-02 (High-Bay Flavored)",
    asrsLocation: "ASRS-A02-R14 (Menunggu QC)",
    storedQty: 0,
    materialCost: 68_500_000,
    laborCost: 11_400_000,
    overheadCost: 15_100_000,
    standardHppPerUnit: 48_500,
    hppAuditStatus: "Perlu tinjauan HPP",
    hppJournalRef: "JRN-HPP-261116-02",
    hppControllerNote:
      "Output fisik 1.975 karton telah tercatat; menunggu verifikasi Akuntan Biaya atas varians efisiensi -0,8%.",
  },
  {
    id: "batch-261116-03",
    batchNumber: "BATCH-261116-03",
    orderNumber: "PRD-2610-098",
    productId: "PRD-KI250",
    productName: "Sari Kacang Ijo 250ml",
    productionLine: "Lini Minuman Ringan 2",
    dateLabel: "15 Nov 2026",
    shiftLabel: "Shift 2 (14:00–22:00)",
    plannedQty: 1500,
    actualQty: 1485,
    rejectQty: 15,
    unit: "karton",
    status: "Menunggu QC",
    nextAction: "RILIS_BATCH",
    uhtTempCelsius: "137,8°C · 4 dtk",
    phLevel: "6,58 (Memenuhi standar)",
    microbiologyResult: "Lulus uji sterilitas komersial & organoleptik",
    sealIntegrityResult: "Lulus uji kebocoran & kode kedaluwarsa",
    timeline: [
      {
        key: "inspeksi",
        title: "Inspeksi & Persiapan Bahan",
        state: "completed",
        timestampLabel: "15 Nov 2026 · 14:10 WIB",
        actorLabel: "Operator Produksi",
        resultSummary:
          "Ekstrak kacang hijau, gula aren, dan kemasan 250ml lulus pemeriksaan standar.",
      },
      {
        key: "uht",
        title: "UHT & Pengemasan",
        state: "completed",
        timestampLabel: "15 Nov 2026 · 19:45 WIB",
        actorLabel: "Operator Lini Minuman Ringan 2",
        resultSummary:
          "Pengolahan UHT dan pengemasan menghasilkan 1.485 karton layak simpan.",
      },
      {
        key: "qc",
        title: "Uji Batch & Rilis QC",
        state: "current",
        timestampLabel: "16 Nov 2026 · 09:20 WIB",
        actorLabel: "Supervisor QA/QC",
        resultSummary:
          "Seluruh parameter uji laboratorium telah ditinjau dan memenuhi kriteria SNI. Siap otorisasi Rilis Batch.",
      },
    ],
    qcReleaseState: "Menunggu QC",
    storageState: "Belum di gudang",
    inventorySyncState: "Menunggu konfirmasi",
    asrsZone: "Zona B-02 (Minuman Nabati)",
    asrsLocation: "ASRS-B02-R05 (Menunggu Rilis)",
    storedQty: 0,
    materialCost: 41_800_000,
    laborCost: 7_200_000,
    overheadCost: 9_360_000,
    standardHppPerUnit: 39_500,
    hppAuditStatus: "Perlu tinjauan HPP",
    hppJournalRef: "JRN-HPP-261115-03",
    hppControllerNote:
      "Biaya bahan baku, tenaga kerja, dan overhead telah lengkap; siap ditinjau oleh Akuntan Biaya / Financial Controller.",
  },
  {
    id: "batch-261115-04",
    batchNumber: "BATCH-261115-04",
    orderNumber: "PRD-2610-096",
    productId: "PRD-TK300",
    productName: "Teh Kotak Jasmine 300ml",
    productionLine: "Lini Minuman Ringan 1",
    dateLabel: "15 Nov 2026",
    shiftLabel: "Shift 1 (06:00–14:00)",
    plannedQty: 2200,
    actualQty: 2180,
    rejectQty: 20,
    unit: "karton",
    status: "Dirilis QC",
    nextAction: "NONE",
    uhtTempCelsius: "136,5°C · 4 dtk",
    phLevel: "6,12 (Standar teh 6,00–6,30)",
    microbiologyResult: "Bebas cemaran mikroba; organoleptik melati standar",
    sealIntegrityResult: "100% palet lolos inspeksi seal & berat bersih",
    timeline: [
      {
        key: "inspeksi",
        title: "Inspeksi & Persiapan Bahan",
        state: "completed",
        timestampLabel: "15 Nov 2026 · 06:05 WIB",
        actorLabel: "Operator Produksi",
        resultSummary:
          "Seduhan daun teh melati dan sirup gula rafinasi lulus uji Brix 8,2°.",
      },
      {
        key: "uht",
        title: "UHT & Pengemasan",
        state: "completed",
        timestampLabel: "15 Nov 2026 · 12:15 WIB",
        actorLabel: "Operator Lini Minuman Ringan 1",
        resultSummary:
          "Pengemasan selesai dengan realisasi 2.180 karton baik dan 20 karton sampel/reject.",
      },
      {
        key: "qc",
        title: "Uji Batch & Rilis QC",
        state: "completed",
        timestampLabel: "15 Nov 2026 · 17:10 WIB",
        actorLabel: "Supervisor QC",
        resultSummary:
          "Status Released ditetapkan. Sertifikat analisis CoA-261115-04 diterbitkan untuk Gudang AS/RS.",
      },
    ],
    qcReleaseState: "Dirilis QC",
    storageState: "Siap disimpan",
    inventorySyncState: "Menunggu konfirmasi",
    asrsZone: "Zona B-01 (High-Bay Beverage)",
    asrsLocation: "ASRS-B01-R03",
    storedQty: 2180,
    fgReceiptRef: "FG-RCV-261115-04",
    materialCost: 55_600_000,
    laborCost: 9_400_000,
    overheadCost: 12_826_000,
    standardHppPerUnit: 36_000,
    hppAuditStatus: "Perlu tinjauan HPP",
    hppJournalRef: "JRN-HPP-261115-04",
    hppControllerNote:
      "Batch telah dirilis QC dan siap konfirmasi penyimpanan AS/RS; perhitungan HPP Rp35.700/karton menunggu pengesahan audit biaya.",
  },
  {
    id: "batch-261115-03",
    batchNumber: "BATCH-261115-03",
    orderNumber: "PRD-2610-095",
    productId: "PRD-FC1L",
    productName: "Ultra Milk Full Cream 1L",
    productionLine: "Lini Aseptik UHT 1",
    dateLabel: "15 Nov 2026",
    shiftLabel: "Shift 1 (06:00–14:00)",
    plannedQty: 2500,
    actualQty: 2480,
    rejectQty: 20,
    unit: "karton",
    status: "Dirilis QC",
    nextAction: "NONE",
    uhtTempCelsius: "138,4°C · 4 dtk",
    phLevel: "6,69 (Memenuhi standar)",
    microbiologyResult: "Negatif (0 CFU/ml); sterilitas komersial terpenuhi",
    sealIntegrityResult: "Lulus uji integritas kemasan aseptik",
    timeline: [
      {
        key: "inspeksi",
        title: "Inspeksi & Persiapan Bahan",
        state: "completed",
        timestampLabel: "15 Nov 2026 · 06:00 WIB",
        actorLabel: "Operator Produksi",
        resultSummary:
          "30.000 L susu segar & bahan penolong terverifikasi lengkap.",
      },
      {
        key: "uht",
        title: "UHT & Pengemasan",
        state: "completed",
        timestampLabel: "15 Nov 2026 · 12:30 WIB",
        actorLabel: "Operator Lini Aseptik UHT 1",
        resultSummary: "Output 2.480 karton selesai dikemas di palet otomatis.",
      },
      {
        key: "qc",
        title: "Uji Batch & Rilis QC",
        state: "completed",
        timestampLabel: "15 Nov 2026 · 16:00 WIB",
        actorLabel: "Supervisor QC",
        resultSummary:
          "Batch dirilis penuh (Released) dan telah ditransfer ke crane AS/RS Zona A-01.",
      },
    ],
    qcReleaseState: "Dirilis QC",
    storageState: "Tersimpan di AS/RS",
    inventorySyncState: "Tersinkron ke Stok",
    asrsZone: "Zona A-01 (High-Bay UHT)",
    asrsLocation: "ASRS-A01-R04",
    storedQty: 2480,
    fgReceiptRef: "FG-RCV-261115-03",
    materialCost: 96_800_000,
    laborCost: 16_100_000,
    overheadCost: 21_268_000,
    standardHppPerUnit: 54_000,
    hppAuditStatus: "Terverifikasi Audit",
    hppJournalRef: "JRN-HPP-261115-02",
    hppControllerNote:
      "Terverifikasi oleh Financial Controller; HPP Rp54.100/karton (+0,18% terhadap anggaran standar) telah diposting ke buku besar.",
  },
  {
    id: "batch-261114-05",
    batchNumber: "BATCH-261114-05",
    orderNumber: "PRD-2610-092",
    productId: "PRD-COK250",
    productName: "Ultra Milk Cokelat 250ml",
    productionLine: "Lini Aseptik UHT 2",
    dateLabel: "14 Nov 2026",
    shiftLabel: "Shift 2 (14:00–22:00)",
    plannedQty: 1800,
    actualQty: 1740,
    rejectQty: 60,
    unit: "karton",
    status: "Ditahan",
    nextAction: "NONE",
    uhtTempCelsius: "136,1°C · Fluktuasi katup uap",
    phLevel: "6,48 (Di bawah batas minimum 6,60)",
    microbiologyResult: "Deviasi pH & indikasi ketidakstabilan pada inkubasi 55°C",
    sealIntegrityResult: "Ditemukan 14 sampel micro-leak pada palet ke-4",
    holdReason:
      "Deviasi pH (6,48 vs standar 6,60–6,75) dan temuan micro-leak pada sampel palet ke-4 akibat fluktuasi tekanan katup uap UHT. Seluruh 1.740 karton ditahan di Area Karantina Blok K-02 untuk sortir 100% dan uji ulang QA.",
    holdZone: "Area Karantina Blok K-02",
    timeline: [
      {
        key: "inspeksi",
        title: "Inspeksi & Persiapan Bahan",
        state: "completed",
        timestampLabel: "14 Nov 2026 · 14:05 WIB",
        actorLabel: "Operator Produksi",
        resultSummary:
          "Bahan baku susu segar dan kakao memenuhi spesifikasi awal.",
      },
      {
        key: "uht",
        title: "UHT & Pengemasan",
        state: "completed",
        timestampLabel: "14 Nov 2026 · 20:15 WIB",
        actorLabel: "Operator Lini Aseptik UHT 2",
        resultSummary:
          "Tercatat fluktuasi suhu singkat pada menit ke-140; output fisik 1.740 karton.",
      },
      {
        key: "qc",
        title: "Uji Batch & Rilis QC",
        state: "held",
        timestampLabel: "15 Nov 2026 · 08:30 WIB",
        actorLabel: "Kepala QC / QA",
        resultSummary:
          "Ditetapkan status HOLD (Ditahan). Dilarang masuk ke AS/RS barang jadi sampai investigasi CAPA selesai.",
      },
    ],
    qcReleaseState: "Ditahan",
    storageState: "Karantina QC",
    inventorySyncState: "Ditangguhkan",
    asrsZone: "Area Karantina (Non-AS/RS)",
    asrsLocation: "KARANTINA-K02",
    storedQty: 0,
    materialCost: 61_200_000,
    laborCost: 10_400_000,
    overheadCost: 14_138_000,
    standardHppPerUnit: 48_500,
    hppAuditStatus: "Menunggu penyelesaian batch",
    hppJournalRef: "JRN-HPP-261114-05",
    hppControllerNote:
      "Biaya batch sebesar Rp85,74 jt ditangguhkan pada akun Persediaan Dalam Karantina hingga keputusan disposisi QA.",
  },
];

export const INITIAL_PRODUCTION_TASKS: readonly ProductionTaskItem[] = [
  {
    id: "task-prd-003",
    task: "Tinjau kekurangan bubuk kakao & ajukan FPBB",
    reference: "PRD-2611-003",
    referenceType: "order",
    stage: "Perencanaan & MRP",
    status: "Perlu ditinjau",
    actionLabel: "Tinjau bahan",
    targetTab: "perencanaan",
    targetSubView: "orders",
    ownerRole: "PPIC / Produksi",
    description:
      "Order Ultra Milk Cokelat 250ml membutuhkan 1.800 kg Bubuk Kakao Alkalized sementara stok tersedia 1.450 kg (kurang 350 kg).",
  },
  {
    id: "task-batch-01",
    task: "Catat hasil akhir pengolahan UHT & pengemasan",
    reference: "BATCH-261116-01",
    referenceType: "batch",
    stage: "UHT & Pengemasan",
    status: "Sedang berjalan",
    actionLabel: "Catat hasil",
    targetTab: "batch",
    ownerRole: "Operator Produksi",
    description:
      "Verifikasi output karton layak simpan dan reject kemasan untuk Shift 1 pada Lini Aseptik UHT 1.",
  },
  {
    id: "task-batch-02",
    task: "Tinjau hasil uji laboratorium & rilis QC",
    reference: "BATCH-261116-02",
    referenceType: "batch",
    stage: "Uji Batch & Rilis QC",
    status: "Menunggu QC",
    actionLabel: "Tinjau uji QC",
    targetTab: "batch",
    ownerRole: "Quality Control (QC)",
    description:
      "Evaluasi parameter pH, mikrobiologi B0, dan integritas seal untuk 1.975 karton Ultra Milk Cokelat 250ml.",
  },
  {
    id: "task-batch-04",
    task: "Konfirmasi penyimpanan palet AS/RS & sinkronisasi stok",
    reference: "BATCH-261115-04",
    referenceType: "batch",
    stage: "Penyimpanan AS/RS",
    status: "Siap disimpan",
    actionLabel: "Konfirmasi simpan",
    targetTab: "gudang-hpp",
    targetSubView: "gudang",
    ownerRole: "Gudang / Logistik",
    description:
      "Batch Teh Kotak Jasmine 300ml (2.180 karton) telah dirilis QC dan menunggu konfirmasi lokasi rak ASRS-B01-R03.",
  },
  {
    id: "task-hpp-04",
    task: "Tinjau perhitungan HPP & varians biaya batch",
    reference: "BATCH-261116-03",
    referenceType: "batch",
    stage: "Akuntansi Biaya (HPP)",
    status: "Perlu ditinjau",
    actionLabel: "Tinjau HPP",
    targetTab: "gudang-hpp",
    targetSubView: "hpp",
    ownerRole: "Akuntansi Biaya / Controller",
    description:
      "Periksa rincian biaya bahan baku, tenaga kerja langsung, dan overhead pabrik untuk Sari Kacang Ijo 250ml.",
  },
];

export function computeBatchTotalCost(batch: ProductionBatchRecord): number {
  return batch.materialCost + batch.laborCost + batch.overheadCost;
}

export function computeBatchUnitHpp(batch: ProductionBatchRecord): number {
  const qty = batch.actualQty > 0 ? batch.actualQty : batch.plannedQty;
  if (qty <= 0) return 0;
  return Math.round(computeBatchTotalCost(batch) / qty);
}
