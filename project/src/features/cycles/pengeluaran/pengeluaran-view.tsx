"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { User } from "@/shared/contracts/auth";
import foundationStyles from "@/components/foundation.module.css";
import {
  INITIAL_GOODS_RECEIPTS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_PURCHASE_REQUESTS,
  INITIAL_RFQS,
  INITIAL_SUPPLIERS,
  INITIAL_VENDOR_INVOICES,
  PENGELUARAN_PERIOD_DATASETS,
  PENGELUARAN_TABS,
  PURCHASING_DOC_OPTIONS,
  SUMMARY_FOLLOW_UPS,
  TODAY_TASK_QUEUE,
  actionLabelForPo,
  actionLabelForReceipt,
  actionLabelForRequest,
  actionLabelForRfq,
  actionLabelForVendorInvoice,
  computePayablesSnapshot,
  formatQty,
  formatRupiahCompact,
  formatRupiahFull,
  type GoodsReceiptRecord,
  type PayablesDateOption,
  type PengeluaranTab,
  type PeriodOption,
  type PoStatus,
  type PurchaseOrderRecord,
  type PurchaseRequestRecord,
  type PurchasingDocType,
  type QcStatus,
  type RequestPriority,
  type RequestStatus,
  type RfqRecord,
  type RfqStatus,
  type VendorInvoiceRecord,
  type VendorInvoiceStatus,
} from "./data";
import {
  PayablesAgingBars,
  PengeluaranTrendChart,
  PurchasingStatusSummary,
  QcOutcomeBreakdown,
} from "./charts";
import {
  CreatePoDrawer,
  CreateRequestDrawer,
  CreateRfqDrawer,
  InvoiceDetailDrawer,
  PoDetailDrawer,
  PoStatusPill,
  QcStatusPill,
  ReceiptDetailDrawer,
  RecordReceiptDrawer,
  RequestDetailDrawer,
  RequestPriorityPill,
  RequestStatusPill,
  RfqDetailDrawer,
  RfqStatusPill,
  SuppliersDrawer,
  TaskStatusPill,
  VendorInvoiceStatusPill,
} from "./drawers";
import styles from "./pengeluaran.module.css";

function normalizeTab(raw?: string): PengeluaranTab {
  if (raw === "pembelian" || raw === "penerimaan" || raw === "utang") {
    return raw;
  }
  return "ringkasan";
}

function normalizeDocType(raw?: string): PurchasingDocType {
  if (raw === "rfq" || raw === "po" || raw === "fpbb") {
    return raw;
  }
  return "fpbb";
}

export function PengeluaranView({
  user,
  initialTab,
  initialDocType,
}: {
  user: User;
  initialTab?: string;
  initialDocType?: string;
}) {
  const [activeTab, setActiveTab] = useState<PengeluaranTab>(() =>
    normalizeTab(initialTab),
  );
  const [period, setPeriod] = useState<PeriodOption>("30d");
  const [payablesDate, setPayablesDate] =
    useState<PayablesDateOption>("2026-11-16");

  // Pembelian document selector & filters
  const [docType, setDocType] = useState<PurchasingDocType>(() =>
    normalizeDocType(initialDocType),
  );
  const [purchasingSearch, setPurchasingSearch] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState<
    "ALL" | RequestStatus
  >("ALL");
  const [rfqStatusFilter, setRfqStatusFilter] = useState<"ALL" | RfqStatus>(
    "ALL",
  );
  const [poStatusFilter, setPoStatusFilter] = useState<"ALL" | PoStatus>("ALL");

  // Penerimaan filters
  const [receiptSearch, setReceiptSearch] = useState("");
  const [qcStatusFilter, setQcStatusFilter] = useState<"ALL" | QcStatus>("ALL");

  // Utang & Pembayaran filters
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<
    "ALL" | VendorInvoiceStatus
  >("ALL");

  // Domain state
  const [requests, setRequests] = useState<PurchaseRequestRecord[]>(() => [
    ...INITIAL_PURCHASE_REQUESTS,
  ]);
  const [rfqs, setRfqs] = useState<RfqRecord[]>(() => [...INITIAL_RFQS]);
  const [orders, setOrders] = useState<PurchaseOrderRecord[]>(() => [
    ...INITIAL_PURCHASE_ORDERS,
  ]);
  const [receipts, setReceipts] = useState<GoodsReceiptRecord[]>(() => [
    ...INITIAL_GOODS_RECEIPTS,
  ]);
  const [invoices, setInvoices] = useState<VendorInvoiceRecord[]>(() => [
    ...INITIAL_VENDOR_INVOICES,
  ]);
  const [extraPaidThisSession, setExtraPaidThisSession] = useState(0);

  // Drawer open states
  const [suppliersOpen, setSuppliersOpen] = useState(false);
  const [createRequestOpen, setCreateRequestOpen] = useState(false);
  const [createRfqOpen, setCreateRfqOpen] = useState(false);
  const [createRfqInitialReqId, setCreateRfqInitialReqId] = useState<
    string | undefined
  >(undefined);
  const [createPoOpen, setCreatePoOpen] = useState(false);
  const [recordReceiptOpen, setRecordReceiptOpen] = useState(false);

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(
    null,
  );
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null,
  );

  const activeTabMeta =
    PENGELUARAN_TABS.find((t) => t.key === activeTab) ?? PENGELUARAN_TABS[0];

  function syncUrl(nextTab: PengeluaranTab, nextDoc?: PurchasingDocType) {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (nextTab === "ringkasan") {
      url.searchParams.delete("tab");
      url.searchParams.delete("doc");
    } else {
      url.searchParams.set("tab", nextTab);
      if (nextTab === "pembelian" && nextDoc) {
        url.searchParams.set("doc", nextDoc);
      } else {
        url.searchParams.delete("doc");
      }
    }
    window.history.replaceState(null, "", url.toString());
  }

  function selectTab(next: PengeluaranTab, nextDoc?: PurchasingDocType) {
    setActiveTab(next);
    if (nextDoc) {
      setDocType(nextDoc);
    }
    syncUrl(next, nextDoc ?? docType);
  }

  function selectDocType(nextDoc: PurchasingDocType) {
    setDocType(nextDoc);
    setPurchasingSearch("");
    syncUrl(activeTab, nextDoc);
  }

  // Navigate to any document across all tabs from follow-ups, task queue, or cross-links
  function handleOpenDocumentByRef(
    targetTab: PengeluaranTab,
    reference: string,
    targetDoc?: PurchasingDocType,
  ) {
    selectTab(targetTab, targetDoc);
    if (reference.startsWith("FPBB-")) {
      setDocType("fpbb");
      const found = requests.find((r) => r.number === reference);
      if (found) setSelectedRequestId(found.id);
    } else if (reference.startsWith("RFQ-")) {
      setDocType("rfq");
      const found = rfqs.find((r) => r.number === reference);
      if (found) setSelectedRfqId(found.id);
    } else if (reference.startsWith("PO-")) {
      if (targetTab === "pembelian") setDocType("po");
      const found = orders.find((o) => o.number === reference);
      if (found) setSelectedPoId(found.id);
    } else if (reference.startsWith("GRN-")) {
      const found = receipts.find((g) => g.number === reference);
      if (found) setSelectedReceiptId(found.id);
    } else if (reference.startsWith("INV-")) {
      const found = invoices.find((inv) => inv.number === reference);
      if (found) setSelectedInvoiceId(found.id);
    }
  }

  // Computed live payables snapshot
  const payablesSnapshot = computePayablesSnapshot(
    invoices,
    payablesDate,
    extraPaidThisSession,
  );

  // Period dataset with live open payables & session payment adjustments
  const baseDataset = PENGELUARAN_PERIOD_DATASETS[period];
  const livePeriodDataset = {
    ...baseDataset,
    vendorPayment: baseDataset.vendorPayment + extraPaidThisSession,
    openPayables: payablesSnapshot.totalOpenPayables,
  };

  // Filtered lists for Pembelian
  const queryText = purchasingSearch.trim().toLowerCase();

  const filteredRequests = requests.filter((req) => {
    if (requestStatusFilter !== "ALL" && req.status !== requestStatusFilter) {
      return false;
    }
    if (!queryText) return true;
    return (
      req.number.toLowerCase().includes(queryText) ||
      req.materialName.toLowerCase().includes(queryText) ||
      req.productionRef.toLowerCase().includes(queryText)
    );
  });

  const filteredRfqs = rfqs.filter((rfq) => {
    if (rfqStatusFilter !== "ALL" && rfq.status !== rfqStatusFilter) {
      return false;
    }
    if (!queryText) return true;
    return (
      rfq.number.toLowerCase().includes(queryText) ||
      rfq.requestNumber.toLowerCase().includes(queryText) ||
      rfq.materialName.toLowerCase().includes(queryText) ||
      rfq.offers.some((o) => o.supplierName.toLowerCase().includes(queryText))
    );
  });

  const filteredOrders = orders.filter((po) => {
    if (poStatusFilter !== "ALL" && po.status !== poStatusFilter) {
      return false;
    }
    if (!queryText) return true;
    return (
      po.number.toLowerCase().includes(queryText) ||
      po.supplierName.toLowerCase().includes(queryText) ||
      po.requestNumber.toLowerCase().includes(queryText) ||
      po.rfqNumber.toLowerCase().includes(queryText)
    );
  });

  // Filtered list for Penerimaan
  const filteredReceipts = receipts.filter((rcpt) => {
    if (qcStatusFilter !== "ALL" && rcpt.qcStatus !== qcStatusFilter) {
      return false;
    }
    const q = receiptSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      rcpt.number.toLowerCase().includes(q) ||
      rcpt.poNumber.toLowerCase().includes(q) ||
      rcpt.supplierName.toLowerCase().includes(q) ||
      rcpt.lines.some((l) => l.materialName.toLowerCase().includes(q))
    );
  });

  // Filtered list for Utang & Pembayaran
  const filteredInvoices = invoices.filter((inv) => {
    if (invoiceStatusFilter !== "ALL" && inv.status !== invoiceStatusFilter) {
      return false;
    }
    const q = invoiceSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      inv.number.toLowerCase().includes(q) ||
      inv.supplierName.toLowerCase().includes(q) ||
      inv.poNumber.toLowerCase().includes(q) ||
      inv.grnNumber.toLowerCase().includes(q)
    );
  });

  // Selected records for drawers
  const selectedRequest =
    requests.find((r) => r.id === selectedRequestId) ?? null;
  const selectedRfq = rfqs.find((r) => r.id === selectedRfqId) ?? null;
  const selectedPo = orders.find((o) => o.id === selectedPoId) ?? null;
  const selectedReceipt =
    receipts.find((g) => g.id === selectedReceiptId) ?? null;
  const selectedInvoice =
    invoices.find((i) => i.id === selectedInvoiceId) ?? null;

  // Mutation handlers
  function handleCreateRequest(input: {
    materialId: string;
    materialName: string;
    quantity: number;
    unit: "L" | "kg" | "pcs";
    availableStock: number;
    minimumStock: number;
    productionRef: string;
    requiredDateLabel: string;
    priority: RequestPriority;
    purpose: string;
  }) {
    const nextSeq = 191 + requests.length;
    const number = `FPBB-261116-0${nextSeq}`;
    const newReq: PurchaseRequestRecord = {
      id: `fpbb_261116_0${nextSeq}`,
      number,
      materialId: input.materialId,
      materialName: input.materialName,
      quantity: input.quantity,
      unit: input.unit,
      warehouseName: "Bandung RM",
      availableStock: input.availableStock,
      minimumStock: input.minimumStock,
      productionRef: input.productionRef,
      requiredDateLabel: input.requiredDateLabel,
      createdDateLabel: "16 Nov 2026",
      priority: input.priority,
      status: "Menunggu verifikasi",
      purpose: input.purpose,
      verificationNote: "Baru diajukan oleh Produksi; menunggu verifikasi stok Gudang.",
    };
    setRequests((prev) => [newReq, ...prev]);
  }

  function handleVerifyRequest(
    requestId: string,
    outcome: "Terverifikasi" | "Stok mencukupi",
    note: string,
  ) {
    setRequests((prev) =>
      prev.map((req) =>
        req.id === requestId
          ? {
              ...req,
              status: outcome,
              verificationNote: note,
            }
          : req,
      ),
    );
  }

  function handleCreateRfq(input: {
    requestId: string;
    dueDateLabel: string;
    invitedSupplierIds: string[];
  }) {
    const req = requests.find((r) => r.id === input.requestId);
    if (!req) return;
    const nextSeq = 17 + rfqs.length;
    const rfqNumber = `RFQ-261116-00${nextSeq}`;
    const defaultPrice =
      req.unit === "L" ? 8_000 : req.unit === "kg" ? 19_800 : 120;
    const sup =
      INITIAL_SUPPLIERS.find((s) => s.id === input.invitedSupplierIds[0]) ??
      INITIAL_SUPPLIERS[0];

    const newRfq: RfqRecord = {
      id: `rfq_261116_00${nextSeq}`,
      number: rfqNumber,
      requestId: req.id,
      requestNumber: req.number,
      materialId: req.materialId,
      materialName: req.materialName,
      quantity: req.quantity,
      unit: req.unit,
      dueDateLabel: input.dueDateLabel,
      createdDateLabel: "16 Nov 2026",
      status: "Menunggu penawaran",
      offers: [
        {
          id: `off_${nextSeq}_1`,
          quotationNumber: `QUOTE-261116-00${nextSeq}`,
          supplierId: sup.id,
          supplierName: sup.name,
          unitPrice: defaultPrice,
          totalPrice: defaultPrice * req.quantity,
          leadTimeDays: 2,
          validUntilLabel: "30 Nov 2026",
          paymentTerms: `Net ${sup.paymentTermsDays} Hari`,
          qualityScore: 95,
          deliveryScore: 95,
          priceScore: 94,
          overallScore: 94.7,
          qualificationStatus: sup.qualificationStatus,
          riskLevel: sup.riskLevel,
          evaluationNotes: "Penawaran awal tercatat; menunggu penawaran pembanding.",
          isSelected: false,
        },
      ],
    };

    setRfqs((prev) => [newRfq, ...prev]);
    setRequests((prev) =>
      prev.map((r) =>
        r.id === req.id
          ? { ...r, status: "Sudah dibuat RFQ", linkedRfqNumber: rfqNumber }
          : r,
      ),
    );
    setDocType("rfq");
  }

  function handleRecordOffer(
    rfqId: string,
    offerInput: {
      supplierId: string;
      unitPrice: number;
      leadTimeDays: number;
      evaluationNotes: string;
    },
  ) {
    const sup =
      INITIAL_SUPPLIERS.find((s) => s.id === offerInput.supplierId) ??
      INITIAL_SUPPLIERS[0];
    setRfqs((prev) =>
      prev.map((rfq) => {
        if (rfq.id !== rfqId) return rfq;
        const newOffer = {
          id: `off_${rfq.id}_${rfq.offers.length + 1}`,
          quotationNumber: `QUOTE-261116-00${30 + rfq.offers.length}`,
          supplierId: sup.id,
          supplierName: sup.name,
          unitPrice: offerInput.unitPrice,
          totalPrice: offerInput.unitPrice * rfq.quantity,
          leadTimeDays: offerInput.leadTimeDays,
          validUntilLabel: "05 Des 2026",
          paymentTerms: `Net ${sup.paymentTermsDays} Hari`,
          qualityScore: 90,
          deliveryScore: 89,
          priceScore: 91,
          overallScore: 90.0,
          qualificationStatus: sup.qualificationStatus,
          riskLevel: sup.riskLevel,
          evaluationNotes: offerInput.evaluationNotes,
          isSelected: false,
        };
        return {
          ...rfq,
          status: "Perlu evaluasi",
          offers: [...rfq.offers, newOffer],
        };
      }),
    );
  }

  function handleSelectWinningOffer(
    rfqId: string,
    offerId: string,
    awardReason: string,
  ) {
    setRfqs((prev) =>
      prev.map((rfq) => {
        if (rfq.id !== rfqId) return rfq;
        return {
          ...rfq,
          status: "Pemasok terpilih",
          selectedOfferId: offerId,
          awardReason,
          offers: rfq.offers.map((o) => ({
            ...o,
            isSelected: o.id === offerId,
          })),
        };
      }),
    );
  }

  function handleCreatePo(input: {
    rfqId?: string;
    supplierId: string;
    materialName: string;
    quantity: number;
    unit: "L" | "kg" | "pcs";
    unitPrice: number;
    paymentTerms: string;
    deliveryTerms: string;
  }) {
    const sup =
      INITIAL_SUPPLIERS.find((s) => s.id === input.supplierId) ??
      INITIAL_SUPPLIERS[0];
    const linkedRfq = rfqs.find((r) => r.id === input.rfqId);
    const nextSeq = 47 + orders.length;
    const poNumber = `PO-261116-00${nextSeq}`;
    const totalAmount = input.quantity * input.unitPrice;

    const newPo: PurchaseOrderRecord = {
      id: `po_261116_00${nextSeq}`,
      number: poNumber,
      supplierId: sup.id,
      supplierName: sup.name,
      requestNumber: linkedRfq?.requestNumber ?? "FPBB-261114-0190",
      rfqNumber: linkedRfq?.number ?? "RFQ-KONTRAK",
      dateLabel: "16 Nov 2026",
      warehouseName: "Bandung RM",
      paymentTerms: input.paymentTerms,
      deliveryTerms: input.deliveryTerms,
      totalAmount,
      approvalStageLabel: "Manajer Pengadaan",
      status: "Menunggu persetujuan",
      revision: 1,
      createdByUserId: user.id,
      createdByName: `${user.name} (${user.role})`,
      notes: `PO baru diterbitkan dari ${linkedRfq?.number ?? "kontrak pengadaan"} dan menunggu persetujuan berjenjang.`,
      lines: [
        {
          id: `pol_${nextSeq}_1`,
          materialName: input.materialName,
          quantity: input.quantity,
          unit: input.unit,
          unitPrice: input.unitPrice,
          totalPrice: totalAmount,
        },
      ],
      approvalSteps: [
        {
          id: `step_${nextSeq}_1`,
          sequence: 1,
          roleTitle: "Manajer Pengadaan",
          actorName: "Dimas Saputra",
          status: "Menunggu",
          timestampLabel: "Menunggu persetujuan",
          note: "Verifikasi kesesuaian kuotasi dan anggaran.",
        },
        {
          id: `step_${nextSeq}_2`,
          sequence: 2,
          roleTitle: "Manajer Keuangan",
          actorName: "Sinta Maharani",
          status: "Berikutnya",
          timestampLabel: "Setelah Manajer Pengadaan",
          note: "Otorisasi keuangan.",
        },
      ],
    };

    setOrders((prev) => [newPo, ...prev]);
    if (linkedRfq) {
      setRfqs((prev) =>
        prev.map((r) =>
          r.id === linkedRfq.id
            ? { ...r, status: "PO diterbitkan", linkedPoNumber: poNumber }
            : r,
        ),
      );
    }
    setDocType("po");
  }

  function handleCreatePoFromRfq(rfqId: string) {
    const targetRfq = rfqs.find((r) => r.id === rfqId);
    if (!targetRfq) return;
    const win =
      targetRfq.offers.find((o) => o.isSelected) ?? targetRfq.offers[0];
    if (!win) return;
    handleCreatePo({
      rfqId: targetRfq.id,
      supplierId: win.supplierId,
      materialName: targetRfq.materialName,
      quantity: targetRfq.quantity,
      unit: targetRfq.unit,
      unitPrice: win.unitPrice,
      paymentTerms: win.paymentTerms,
      deliveryTerms: "Franco Gudang Bandung RM",
    });
  }

  function handleApprovePo(poId: string, note: string) {
    setOrders((prev) =>
      prev.map((po) =>
        po.id === poId
          ? {
              ...po,
              status: "Disetujui",
              approvalStageLabel: "Disetujui Penuh",
              notes: `PO telah disetujui (${note}). Siap dikirim resmi ke pemasok.`,
              approvalSteps: po.approvalSteps.map((s) => ({
                ...s,
                status: "Disetujui",
                timestampLabel:
                  s.status === "Disetujui"
                    ? s.timestampLabel
                    : "16 Nov 2026, 12:15 WIB",
                note: s.status === "Disetujui" ? s.note : note,
              })),
            }
          : po,
      ),
    );
  }

  function handleRequestRevisionPo(poId: string, reason: string) {
    setOrders((prev) =>
      prev.map((po) =>
        po.id === poId
          ? {
              ...po,
              status: "Perlu revisi",
              approvalStageLabel: "Dikembalikan untuk Revisi",
              notes: `Perlu revisi: ${reason}`,
            }
          : po,
      ),
    );
  }

  function handleResubmitRevisedPo(poId: string, note: string) {
    setOrders((prev) =>
      prev.map((po) =>
        po.id === poId
          ? {
              ...po,
              status: "Menunggu persetujuan",
              revision: po.revision + 1,
              approvalStageLabel: "Manajer Keuangan",
              notes: note,
            }
          : po,
      ),
    );
  }

  function handleSendPoToVendor(poId: string) {
    setOrders((prev) =>
      prev.map((po) =>
        po.id === poId
          ? {
              ...po,
              status: "Dikirim ke pemasok",
              approvalStageLabel: "Selesai",
              notes:
                "PO resmi telah dikirimkan kepada pemasok; menunggu kedatangan barang di Gudang.",
            }
          : po,
      ),
    );
  }

  function handleRecordReceipt(input: {
    poId: string;
    receivedQty: number;
    deliveryNoteNumber: string;
    batchNumber: string;
    storageLocation: string;
  }) {
    const po = orders.find((p) => p.id === input.poId);
    if (!po) return;
    const firstLine = po.lines[0];
    if (!firstLine) return;
    const nextSeq = 71 + receipts.length;
    const grnNumber = `GRN-261116-00${nextSeq}`;

    const newReceipt: GoodsReceiptRecord = {
      id: `grn_261116_00${nextSeq}`,
      number: grnNumber,
      poId: po.id,
      poNumber: po.number,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      dateLabel: "16 Nov 2026",
      deliveryNoteNumber: input.deliveryNoteNumber,
      warehouseName: po.warehouseName,
      qcStatus: "Menunggu Inspeksi",
      qcNotes:
        "Barang fisik baru diterima di dermaga gudang; menunggu pemeriksaan kualitas oleh tim QC.",
      lines: [
        {
          id: `grnl_${nextSeq}_1`,
          materialName: firstLine.materialName,
          unit: firstLine.unit,
          orderedQty: firstLine.quantity,
          receivedQty: input.receivedQty,
          acceptedQty: 0,
          heldQty: 0,
          unitPrice: firstLine.unitPrice,
          batchNumber: input.batchNumber,
          storageLocation: input.storageLocation,
        },
      ],
      qcChecks: [
        {
          parameter: "Pemeriksaan Fisik & Segel Kemasan",
          result: "Menunggu verifikasi petugas QC",
          passed: true,
        },
        {
          parameter: "Uji Spesifikasi Mutu Laboratorium",
          result: "Menunggu hasil uji sampel",
          passed: true,
        },
      ],
    };

    setReceipts((prev) => [newReceipt, ...prev]);
  }

  function handleCompleteInspection(
    receiptId: string,
    acceptedQty: number,
    heldQty: number,
    qcNotes: string,
  ) {
    setReceipts((prev) =>
      prev.map((rcpt) => {
        if (rcpt.id !== receiptId) return rcpt;
        const nextStatus: QcStatus = heldQty > 0 ? "Ditahan" : "Lolos QC";
        return {
          ...rcpt,
          qcStatus: nextStatus,
          qcInspector: `${user.name} (QC)`,
          qcNotes,
          lines: rcpt.lines.map((line, idx) =>
            idx === 0
              ? {
                  ...line,
                  acceptedQty,
                  heldQty,
                  holdReason:
                    heldQty > 0
                      ? `${formatQty(heldQty, line.unit)} ditahan di area karantina sesuai temuan QC.`
                      : undefined,
                }
              : line,
          ),
          qcChecks: rcpt.qcChecks.map((chk) => ({
            ...chk,
            result:
              heldQty > 0
                ? `${formatQty(acceptedQty, rcpt.lines[0]?.unit ?? "unit")} lolos, ${formatQty(heldQty, rcpt.lines[0]?.unit ?? "unit")} ditahan`
                : "Memenuhi standar mutu Ultrajaya (100% Lolos)",
            passed: heldQty === 0,
          })),
        };
      }),
    );
  }

  function handleMatchInvoice(invoiceId: string) {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const hasMismatch = inv.lines.some(
          (l) => l.discrepancyType !== "NONE",
        );
        return {
          ...inv,
          status: hasMismatch ? "Selisih ditahan" : "Siap dicatat utang",
          matchingSummary: hasMismatch
            ? "3-way matching menemukan selisih kuantitas/harga; faktur ditahan untuk peninjauan."
            : "3-way matching PO, GRN lolos QC, dan invoice vendor dinyatakan cocok 100%; siap dicatat sebagai utang usaha.",
        };
      }),
    );
  }

  function handleResolveDiscrepancy(invoiceId: string, resolutionNote: string) {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const adjustedRemaining = Math.max(0, inv.remainingAmount - inv.heldAmount);
        return {
          ...inv,
          totalAmount: inv.eligibleAmount,
          heldAmount: 0,
          remainingAmount: adjustedRemaining,
          status: inv.apJournalNumber ? "Siap dibayar" : "Siap dicatat utang",
          discrepancyResolutionNote: resolutionNote,
          matchingSummary: `Selisih telah diselesaikan melalui Debit Memo: ${resolutionNote}`,
          lines: inv.lines.map((l) => ({
            ...l,
            invoiceBilledQty: l.grnAcceptedQty,
            invoiceUnitPrice: l.poUnitPrice,
            billedSubtotal: l.eligibleSubtotal,
            discrepancyType: "NONE",
            discrepancyAmount: 0,
            discrepancyNote:
              "Telah disesuaikan ke nilai layak bayar melalui Nota Potongan (Debit Memo).",
          })),
        };
      }),
    );
  }

  function handleRecordPayable(invoiceId: string) {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        return {
          ...inv,
          status: "Siap dibayar",
          apJournalNumber: inv.apJournalNumber ?? "JRN-261116-0021",
          matchingSummary:
            "Utang usaha dan jurnal persediaan bahan baku (JRN-261116-0021) telah dibukukan. Siap diproses pembayaran oleh Treasury.",
        };
      }),
    );
  }

  function handleProcessPayment(
    invoiceId: string,
    paidAmount: number,
    bankAccount: string,
    bankRef: string,
  ) {
    setExtraPaidThisSession((prev) => prev + paidAmount);
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const nextPaid = inv.paidAmount + paidAmount;
        const nextRemaining = Math.max(0, inv.remainingAmount - paidAmount);
        const nextStatus: VendorInvoiceStatus =
          nextRemaining === 0 ? "Lunas" : inv.status;
        return {
          ...inv,
          paidAmount: nextPaid,
          remainingAmount: nextRemaining,
          status: nextStatus,
          lastPaymentNumber: "PV-261116-0048",
          matchingSummary:
            nextRemaining === 0
              ? `Pembayaran lunas Rp${new Intl.NumberFormat("id-ID").format(paidAmount)} melalui ${bankAccount} (${bankRef}) tercatat pada PV-261116-0048.`
              : `Pembayaran sebagian ${formatRupiahCompact(paidAmount)} (${bankRef}) tercatat; sisa saldo terutang ${formatRupiahCompact(nextRemaining)}.`,
        };
      }),
    );
  }

  // Counts for Pembelian document selector badges
  const fpbbAttentionCount = requests.filter(
    (r) => r.status === "Menunggu verifikasi",
  ).length;
  const rfqAttentionCount = rfqs.filter(
    (r) => r.status === "Perlu evaluasi" || r.status === "Menunggu penawaran",
  ).length;
  const poAttentionCount = orders.filter(
    (o) => o.status === "Menunggu persetujuan" || o.status === "Perlu revisi",
  ).length;

  return (
    <section className={styles.page}>
      <header className={foundationStyles.banner}>
        <h1>{activeTabMeta.bannerTitle}</h1>
      </header>

      <div
        className={styles.tabBar}
        role="tablist"
        aria-label="Submenu Siklus Pengeluaran"
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          e.preventDefault();
          const idx = PENGELUARAN_TABS.findIndex((t) => t.key === activeTab);
          const next =
            PENGELUARAN_TABS[
              (idx +
                (e.key === "ArrowRight" ? 1 : PENGELUARAN_TABS.length - 1)) %
                PENGELUARAN_TABS.length
            ];
          selectTab(next.key);
          document.getElementById(`pengeluaran-tab-${next.key}`)?.focus();
        }}
      >
        {PENGELUARAN_TABS.map((tab) => (
          <button
            key={tab.key}
            id={`pengeluaran-tab-${tab.key}`}
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
        aria-labelledby={`pengeluaran-tab-${activeTab}`}
        className={styles.page}
      >
        {/* ================= 1. RINGKASAN ================= */}
        {activeTab === "ringkasan" && (
          <>
            <div className={styles.filterBar}>
              <label htmlFor="pengeluaran-period" className="sr-only">
                Periode ringkasan pengeluaran
              </label>
              <div className={styles.selectControl}>
                <select
                  id="pengeluaran-period"
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
                <span className={styles.kpiLabel}>Nilai PO Diterbitkan</span>
                <strong className={styles.kpiValue}>
                  {formatRupiahFull(livePeriodDataset.poValue)}
                </strong>
                <span className={styles.kpiHint}>
                  Akumulasi nilai PO pada {livePeriodDataset.label}
                </span>
              </article>

              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Pembayaran Vendor</span>
                <strong className={styles.kpiValue}>
                  {formatRupiahFull(livePeriodDataset.vendorPayment)}
                </strong>
                <span className={styles.kpiHint}>
                  Realisasi pencairan pembayaran ke pemasok
                </span>
              </article>

              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Utang Terbuka</span>
                <strong className={styles.kpiValue}>
                  {formatRupiahFull(livePeriodDataset.openPayables)}
                </strong>
                <span className={styles.kpiHint}>
                  {livePeriodDataset.periodEndLabel}
                </span>
              </article>
            </div>

            <div className={styles.splitGrid}>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    Tren Nilai PO dan Pembayaran Vendor
                  </h2>
                </div>
                <PengeluaranTrendChart dataset={livePeriodDataset} />
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Perlu Ditindaklanjuti</h2>
                </div>
                <ul className={styles.followUpList}>
                  {SUMMARY_FOLLOW_UPS.map((item) => (
                    <li className={styles.followUpItem} key={item.id}>
                      <div className={styles.followUpContent}>
                        <span className={styles.followUpText}>
                          {item.label}
                        </span>
                        <span className={styles.followUpSubtext}>
                          {item.sublabel}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={styles.textLink}
                        onClick={() =>
                          handleOpenDocumentByRef(
                            item.targetTab,
                            item.reference,
                            item.targetDocType,
                          )
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
                      <th scope="col">Tahap &amp; Peran</th>
                      <th scope="col">Status</th>
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TODAY_TASK_QUEUE.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <span className={styles.cellPrimary}>{row.task}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.docLink}
                            onClick={() =>
                              handleOpenDocumentByRef(
                                row.targetTab,
                                row.reference,
                                row.targetDocType,
                              )
                            }
                          >
                            {row.reference}
                          </button>
                        </td>
                        <td>
                          <span>{row.stageLabel}</span>
                          <span className={styles.cellSub}>
                            {row.ownerRole}
                          </span>
                        </td>
                        <td>
                          <TaskStatusPill status={row.status} />
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.textLink}
                            onClick={() =>
                              handleOpenDocumentByRef(
                                row.targetTab,
                                row.reference,
                                row.targetDocType,
                              )
                            }
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

        {/* ================= 2. PEMBELIAN ================= */}
        {activeTab === "pembelian" && (
          <>
            <div className={styles.docSelectorBar}>
              <div
                className={styles.docSelectorGroup}
                role="group"
                aria-label="Pilih jenis dokumen pembelian"
              >
                {PURCHASING_DOC_OPTIONS.map((opt) => {
                  const isActive = docType === opt.key;
                  const count =
                    opt.key === "fpbb"
                      ? requests.length
                      : opt.key === "rfq"
                        ? rfqs.length
                        : orders.length;
                  const needsAttention =
                    opt.key === "fpbb"
                      ? fpbbAttentionCount > 0
                      : opt.key === "rfq"
                        ? rfqAttentionCount > 0
                        : poAttentionCount > 0;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      className={`${styles.docSelectorBtn} ${
                        isActive ? styles.docSelectorBtnActive : ""
                      }`}
                      aria-pressed={isActive}
                      onClick={() => selectDocType(opt.key)}
                    >
                      <span>{opt.label}</span>
                      <span
                        className={`${styles.docCountBadge} ${
                          needsAttention ? styles.docCountBadgeAttention : ""
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className={`${styles.textLink} ${styles.underlinedLink}`}
                onClick={() => setSuppliersOpen(true)}
              >
                Kelola pemasok
              </button>
            </div>

            <div className={styles.toolbar}>
              <label className={styles.searchBox}>
                <Search aria-hidden />
                <span className="sr-only">
                  {docType === "fpbb"
                    ? "Cari nomor FPBB, bahan baku, atau referensi produksi"
                    : docType === "rfq"
                      ? "Cari nomor RFQ, FPBB, atau pemasok"
                      : "Cari nomor PO, pemasok, atau referensi"}
                </span>
                <input
                  type="search"
                  value={purchasingSearch}
                  onChange={(e) => setPurchasingSearch(e.target.value)}
                  placeholder={
                    docType === "fpbb"
                      ? "Cari nomor FPBB, bahan baku, atau ref. produksi"
                      : docType === "rfq"
                        ? "Cari nomor RFQ, FPBB, atau pemasok"
                        : "Cari nomor PO, pemasok, atau referensi"
                  }
                />
              </label>

              <div className={styles.selectControl}>
                <label htmlFor="purchasing-status-filter" className="sr-only">
                  Filter status dokumen pembelian
                </label>
                {docType === "fpbb" && (
                  <select
                    id="purchasing-status-filter"
                    value={requestStatusFilter}
                    onChange={(e) =>
                      setRequestStatusFilter(
                        e.target.value as "ALL" | RequestStatus,
                      )
                    }
                  >
                    <option value="ALL">Semua status FPBB</option>
                    <option value="Menunggu verifikasi">
                      Menunggu verifikasi
                    </option>
                    <option value="Terverifikasi">Terverifikasi</option>
                    <option value="Sudah dibuat RFQ">Sudah dibuat RFQ</option>
                    <option value="Stok mencukupi">Stok mencukupi</option>
                  </select>
                )}

                {docType === "rfq" && (
                  <select
                    id="purchasing-status-filter"
                    value={rfqStatusFilter}
                    onChange={(e) =>
                      setRfqStatusFilter(e.target.value as "ALL" | RfqStatus)
                    }
                  >
                    <option value="ALL">Semua status RFQ</option>
                    <option value="Menunggu penawaran">
                      Menunggu penawaran
                    </option>
                    <option value="Perlu evaluasi">Perlu evaluasi</option>
                    <option value="Pemasok terpilih">Pemasok terpilih</option>
                    <option value="PO diterbitkan">PO diterbitkan</option>
                  </select>
                )}

                {docType === "po" && (
                  <select
                    id="purchasing-status-filter"
                    value={poStatusFilter}
                    onChange={(e) =>
                      setPoStatusFilter(e.target.value as "ALL" | PoStatus)
                    }
                  >
                    <option value="ALL">Semua status PO</option>
                    <option value="Menunggu persetujuan">
                      Menunggu persetujuan
                    </option>
                    <option value="Perlu revisi">Perlu revisi</option>
                    <option value="Disetujui">Disetujui</option>
                    <option value="Dikirim ke pemasok">
                      Dikirim ke pemasok
                    </option>
                  </select>
                )}
              </div>

              {docType === "fpbb" && (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => setCreateRequestOpen(true)}
                >
                  Buat Permintaan Pembelian
                </button>
              )}

              {docType === "rfq" && (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => {
                    setCreateRfqInitialReqId(undefined);
                    setCreateRfqOpen(true);
                  }}
                >
                  Buat RFQ
                </button>
              )}

              {docType === "po" && (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => setCreatePoOpen(true)}
                >
                  Buat Purchase Order
                </button>
              )}
            </div>

            <PurchasingStatusSummary
              docType={docType}
              requests={requests}
              rfqs={rfqs}
              orders={orders}
            />

            {/* Table 2A: Permintaan Pembelian (FPBB) */}
            {docType === "fpbb" && (
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    Daftar Permintaan Pembelian Bahan Baku (FPBB)
                  </h2>
                </div>
                <div
                  className={styles.tableWrap}
                  role="region"
                  tabIndex={0}
                  aria-label="Daftar Permintaan Pembelian"
                >
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">No. FPBB</th>
                        <th scope="col">Bahan Baku &amp; Kuantitas</th>
                        <th scope="col">Ref. Produksi</th>
                        <th scope="col">Tgl Dibutuhkan</th>
                        <th scope="col">Prioritas</th>
                        <th scope="col">Status</th>
                        <th scope="col">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.length === 0 ? (
                        <tr>
                          <td colSpan={7} className={styles.emptyRow}>
                            Tidak ada Permintaan Pembelian (FPBB) yang cocok
                            dengan filter.
                          </td>
                        </tr>
                      ) : (
                        filteredRequests.map((req) => {
                          const actionLabel = actionLabelForRequest(req.status);
                          return (
                            <tr key={req.id}>
                              <td>
                                <button
                                  type="button"
                                  className={styles.docLink}
                                  onClick={() => setSelectedRequestId(req.id)}
                                >
                                  {req.number}
                                </button>
                              </td>
                              <td>
                                <span className={styles.cellPrimary}>
                                  {req.materialName}
                                </span>
                                <span className={styles.cellSub}>
                                  Diminta: {formatQty(req.quantity, req.unit)} ·
                                  Stok gudang:{" "}
                                  {formatQty(req.availableStock, req.unit)}
                                </span>
                              </td>
                              <td className={styles.tabular}>
                                {req.productionRef}
                              </td>
                              <td>{req.requiredDateLabel}</td>
                              <td>
                                <RequestPriorityPill priority={req.priority} />
                              </td>
                              <td>
                                <RequestStatusPill status={req.status} />
                              </td>
                              <td>
                                {actionLabel ? (
                                  <button
                                    type="button"
                                    className={styles.textLink}
                                    onClick={() => {
                                      if (req.status === "Terverifikasi") {
                                        setCreateRfqInitialReqId(req.id);
                                        setCreateRfqOpen(true);
                                      } else {
                                        setSelectedRequestId(req.id);
                                      }
                                    }}
                                  >
                                    {actionLabel}
                                  </button>
                                ) : (
                                  <span
                                    className={styles.dashCell}
                                    aria-label="Tidak ada aksi lanjutan"
                                  >
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Table 2B: RFQ & Penawaran */}
            {docType === "rfq" && (
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    Daftar RFQ &amp; Evaluasi Penawaran Vendor
                  </h2>
                </div>
                <div
                  className={styles.tableWrap}
                  role="region"
                  tabIndex={0}
                  aria-label="Daftar RFQ dan Penawaran"
                >
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">No. RFQ</th>
                        <th scope="col">Ref. FPBB</th>
                        <th scope="col">Bahan Baku &amp; Kuantitas</th>
                        <th scope="col">Batas Penawaran</th>
                        <th scope="col">Penawaran Masuk</th>
                        <th scope="col">Status</th>
                        <th scope="col">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRfqs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className={styles.emptyRow}>
                            Tidak ada dokumen RFQ yang cocok dengan filter.
                          </td>
                        </tr>
                      ) : (
                        filteredRfqs.map((rfq) => {
                          const actionLabel = actionLabelForRfq(rfq.status);
                          const bestOffer = [...rfq.offers].sort(
                            (a, b) => a.unitPrice - b.unitPrice,
                          )[0];
                          return (
                            <tr key={rfq.id}>
                              <td>
                                <button
                                  type="button"
                                  className={styles.docLink}
                                  onClick={() => setSelectedRfqId(rfq.id)}
                                >
                                  {rfq.number}
                                </button>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className={styles.docLink}
                                  onClick={() => {
                                    const linkedReq = requests.find(
                                      (r) => r.number === rfq.requestNumber,
                                    );
                                    if (linkedReq) {
                                      setSelectedRequestId(linkedReq.id);
                                    } else {
                                      setSelectedRfqId(rfq.id);
                                    }
                                  }}
                                >
                                  {rfq.requestNumber}
                                </button>
                              </td>
                              <td>
                                <span className={styles.cellPrimary}>
                                  {rfq.materialName}
                                </span>
                                <span className={styles.cellSub}>
                                  Volume: {formatQty(rfq.quantity, rfq.unit)}
                                </span>
                              </td>
                              <td>{rfq.dueDateLabel}</td>
                              <td>
                                <span className={styles.cellPrimary}>
                                  {rfq.offers.length} penawaran pemasok
                                </span>
                                {bestOffer && (
                                  <span className={styles.cellSub}>
                                    Terendah:{" "}
                                    {formatRupiahFull(bestOffer.unitPrice)}/
                                    {rfq.unit} ({bestOffer.leadTimeDays} hari)
                                  </span>
                                )}
                              </td>
                              <td>
                                <RfqStatusPill status={rfq.status} />
                              </td>
                              <td>
                                {actionLabel ? (
                                  <button
                                    type="button"
                                    className={styles.textLink}
                                    onClick={() => setSelectedRfqId(rfq.id)}
                                  >
                                    {actionLabel}
                                  </button>
                                ) : (
                                  <span
                                    className={styles.dashCell}
                                    aria-label="Tidak ada aksi lanjutan"
                                  >
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Table 2C: Purchase Order */}
            {docType === "po" && (
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    Daftar Purchase Order (PO)
                  </h2>
                </div>
                <div
                  className={styles.tableWrap}
                  role="region"
                  tabIndex={0}
                  aria-label="Daftar Purchase Order"
                >
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">No. PO</th>
                        <th scope="col">Pemasok</th>
                        <th scope="col">Referensi</th>
                        <th scope="col">Tanggal</th>
                        <th scope="col">Nilai PO</th>
                        <th scope="col">Tahap Persetujuan</th>
                        <th scope="col">Status</th>
                        <th scope="col">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={8} className={styles.emptyRow}>
                            Tidak ada Purchase Order yang cocok dengan filter.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((po) => {
                          const actionLabel = actionLabelForPo(po.status);
                          return (
                            <tr key={po.id}>
                              <td>
                                <button
                                  type="button"
                                  className={styles.docLink}
                                  onClick={() => setSelectedPoId(po.id)}
                                >
                                  {po.number}
                                </button>
                              </td>
                              <td>
                                <span className={styles.cellPrimary}>
                                  {po.supplierName}
                                </span>
                                <span className={styles.cellSub}>
                                  {po.lines[0]?.materialName}
                                </span>
                              </td>
                              <td className={styles.tabular}>
                                {po.requestNumber}
                                <span className={styles.cellSub}>
                                  {po.rfqNumber}
                                </span>
                              </td>
                              <td>{po.dateLabel}</td>
                              <td className={styles.tabular}>
                                <strong>
                                  {formatRupiahFull(po.totalAmount)}
                                </strong>
                              </td>
                              <td>{po.approvalStageLabel}</td>
                              <td>
                                <PoStatusPill status={po.status} />
                              </td>
                              <td>
                                {actionLabel ? (
                                  <button
                                    type="button"
                                    className={styles.textLink}
                                    onClick={() => setSelectedPoId(po.id)}
                                  >
                                    {actionLabel}
                                  </button>
                                ) : (
                                  <span
                                    className={styles.dashCell}
                                    aria-label="Tidak ada aksi lanjutan"
                                  >
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        {/* ================= 3. PENERIMAAN ================= */}
        {activeTab === "penerimaan" && (
          <>
            <div className={styles.toolbar}>
              <label className={styles.searchBox}>
                <Search aria-hidden />
                <span className="sr-only">
                  Cari nomor penerimaan, PO, atau pemasok
                </span>
                <input
                  type="search"
                  value={receiptSearch}
                  onChange={(e) => setReceiptSearch(e.target.value)}
                  placeholder="Cari nomor GRN, PO, atau pemasok"
                />
              </label>

              <div className={styles.selectControl}>
                <label htmlFor="qc-status-filter" className="sr-only">
                  Filter status QC penerimaan
                </label>
                <select
                  id="qc-status-filter"
                  value={qcStatusFilter}
                  onChange={(e) =>
                    setQcStatusFilter(e.target.value as "ALL" | QcStatus)
                  }
                >
                  <option value="ALL">Semua status QC</option>
                  <option value="Menunggu Inspeksi">Menunggu Inspeksi</option>
                  <option value="Lolos QC">Lolos QC</option>
                  <option value="Ditahan">Ditahan</option>
                </select>
              </div>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => setRecordReceiptOpen(true)}
              >
                Catat Penerimaan
              </button>
            </div>

            <QcOutcomeBreakdown
              receipts={receipts}
              onSelectReceipt={(id) => setSelectedReceiptId(id)}
            />

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  Daftar Penerimaan Barang (GRN &amp; Inspeksi QC)
                </h2>
              </div>
              <div
                className={styles.tableWrap}
                role="region"
                tabIndex={0}
                aria-label="Daftar Penerimaan Barang"
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">No. Penerimaan</th>
                      <th scope="col">No. PO</th>
                      <th scope="col">Pemasok &amp; Bahan Baku</th>
                      <th scope="col">Tanggal</th>
                      <th scope="col">Status QC</th>
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReceipts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.emptyRow}>
                          Tidak ada dokumen penerimaan barang yang cocok dengan
                          filter.
                        </td>
                      </tr>
                    ) : (
                      filteredReceipts.map((rcpt) => {
                        const actionLabel = actionLabelForReceipt(
                          rcpt.qcStatus,
                        );
                        const totalOrdered = rcpt.lines.reduce(
                          (s, l) => s + l.orderedQty,
                          0,
                        );
                        const totalReceived = rcpt.lines.reduce(
                          (s, l) => s + l.receivedQty,
                          0,
                        );
                        const totalAccepted = rcpt.lines.reduce(
                          (s, l) => s + l.acceptedQty,
                          0,
                        );
                        const totalHeld = rcpt.lines.reduce(
                          (s, l) => s + l.heldQty,
                          0,
                        );
                        const unit = rcpt.lines[0]?.unit ?? "kg";

                        return (
                          <tr key={rcpt.id}>
                            <td>
                              <button
                                type="button"
                                className={styles.docLink}
                                onClick={() => setSelectedReceiptId(rcpt.id)}
                              >
                                {rcpt.number}
                              </button>
                            </td>
                            <td>
                              <button
                                type="button"
                                className={styles.docLink}
                                onClick={() => {
                                  const linkedPo = orders.find(
                                    (o) => o.number === rcpt.poNumber,
                                  );
                                  if (linkedPo) {
                                    setSelectedPoId(linkedPo.id);
                                  } else {
                                    setSelectedReceiptId(rcpt.id);
                                  }
                                }}
                              >
                                {rcpt.poNumber}
                              </button>
                            </td>
                            <td>
                              <span className={styles.cellPrimary}>
                                {rcpt.supplierName}
                              </span>
                              <span className={styles.cellSub}>
                                {rcpt.lines[0]?.materialName} · Dipesan{" "}
                                {formatQty(totalOrdered, unit)}, Diterima{" "}
                                {formatQty(totalReceived, unit)}
                                {rcpt.qcStatus !== "Menunggu Inspeksi" &&
                                  ` (Lolos ${formatQty(totalAccepted, unit)}${
                                    totalHeld > 0
                                      ? `, Ditahan ${formatQty(totalHeld, unit)}`
                                      : ""
                                  })`}
                              </span>
                            </td>
                            <td>{rcpt.dateLabel}</td>
                            <td>
                              <QcStatusPill status={rcpt.qcStatus} />
                            </td>
                            <td>
                              {actionLabel ? (
                                <button
                                  type="button"
                                  className={styles.textLink}
                                  onClick={() => setSelectedReceiptId(rcpt.id)}
                                >
                                  {actionLabel}
                                </button>
                              ) : (
                                <span
                                  className={styles.dashCell}
                                  aria-label="Tidak ada aksi lanjutan"
                                >
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* ================= 4. UTANG & PEMBAYARAN ================= */}
        {activeTab === "utang" && (
          <>
            <div className={styles.filterBar}>
              <label htmlFor="payables-date" className={styles.filterLabel}>
                Per tanggal
              </label>
              <div className={styles.selectControl}>
                <select
                  id="payables-date"
                  value={payablesDate}
                  onChange={(e) =>
                    setPayablesDate(e.target.value as PayablesDateOption)
                  }
                >
                  <option value="2026-11-16">16 Nov 2026</option>
                  <option value="2026-11-30">30 Nov 2026 (Proyeksi)</option>
                  <option value="2026-10-31">31 Okt 2026</option>
                </select>
              </div>
            </div>

            <div className={styles.kpiGrid}>
              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Total Utang Terbuka</span>
                <strong className={styles.kpiValue}>
                  {formatRupiahCompact(payablesSnapshot.totalOpenPayables)}
                </strong>
                <span className={styles.kpiHint}>
                  Saldo utang usaha per {payablesSnapshot.label}
                </span>
              </article>

              <article className={`${styles.kpiCard} ${styles.kpiCardDanger}`}>
                <span className={styles.kpiLabel}>Lewat Jatuh Tempo</span>
                <strong className={styles.kpiValue}>
                  {formatRupiahCompact(payablesSnapshot.overduePayables)}
                </strong>
                <span className={styles.kpiHint}>
                  Tagihan pemasok melewati tanggal jatuh tempo
                </span>
              </article>

              <article className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Pembayaran Bulan Ini</span>
                <strong className={styles.kpiValue}>
                  {formatRupiahCompact(payablesSnapshot.paymentsThisMonth)}
                </strong>
                <span className={styles.kpiHint}>
                  Total pembayaran vendor tervalidasi Treasury
                </span>
              </article>
            </div>

            <div className={styles.splitGrid}>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Umur Utang</h2>
                </div>
                <PayablesAgingBars buckets={payablesSnapshot.aging} />
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Tagihan Prioritas</h2>
                </div>
                {payablesSnapshot.priorities.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13.5, color: "#52658a" }}>
                    Tidak ada tagihan jatuh tempo dekat atau lewat jatuh tempo.
                  </p>
                ) : (
                  <ul className={styles.followUpList}>
                    {payablesSnapshot.priorities.map((item) => (
                      <li className={styles.priorityItem} key={item.id}>
                        <div className={styles.priorityMain}>
                          <span className={styles.prioritySupplier}>
                            {item.supplierName}
                          </span>
                          <button
                            type="button"
                            className={styles.docLink}
                            onClick={() => setSelectedInvoiceId(item.invoiceId)}
                          >
                            {item.invoiceNumber}
                          </button>
                          <span
                            className={`${styles.pill} ${
                              item.tone === "danger"
                                ? styles.pillDanger
                                : styles.pillWarning
                            }`}
                          >
                            {item.dueStatusLabel}
                          </span>
                        </div>
                        <div className={styles.priorityRight}>
                          <span className={styles.priorityAmount}>
                            {formatRupiahCompact(item.amount)}
                          </span>
                          <button
                            type="button"
                            className={styles.textLink}
                            onClick={() => setSelectedInvoiceId(item.invoiceId)}
                          >
                            Lihat invoice
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Daftar Invoice Vendor</h2>
                <div className={styles.headerControls}>
                  <label className={styles.searchBox}>
                    <Search aria-hidden />
                    <span className="sr-only">
                      Cari nomor invoice, PO, atau pemasok
                    </span>
                    <input
                      type="search"
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      placeholder="Cari nomor invoice, PO, atau pemasok"
                    />
                  </label>
                  <div className={styles.selectControl}>
                    <label
                      htmlFor="vendor-invoice-status-filter"
                      className="sr-only"
                    >
                      Filter status invoice vendor
                    </label>
                    <select
                      id="vendor-invoice-status-filter"
                      value={invoiceStatusFilter}
                      onChange={(e) =>
                        setInvoiceStatusFilter(
                          e.target.value as "ALL" | VendorInvoiceStatus,
                        )
                      }
                    >
                      <option value="ALL">Semua status</option>
                      <option value="Perlu pencocokan">
                        Perlu pencocokan
                      </option>
                      <option value="Selisih ditahan">Selisih ditahan</option>
                      <option value="Siap dicatat utang">
                        Siap dicatat utang
                      </option>
                      <option value="Siap dibayar">Siap dibayar</option>
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
                aria-label="Daftar Invoice Vendor"
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">No. Invoice</th>
                      <th scope="col">Pemasok</th>
                      <th scope="col">Jatuh Tempo</th>
                      <th scope="col">Saldo Terutang</th>
                      <th scope="col">Status</th>
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.emptyRow}>
                          Tidak ada invoice vendor yang cocok dengan filter.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => {
                        const actionLabel = actionLabelForVendorInvoice(
                          inv.status,
                        );
                        return (
                          <tr key={inv.id}>
                            <td>
                              <button
                                type="button"
                                className={styles.docLink}
                                onClick={() => setSelectedInvoiceId(inv.id)}
                              >
                                {inv.number}
                              </button>
                            </td>
                            <td>
                              <span className={styles.cellPrimary}>
                                {inv.supplierName}
                              </span>
                              <span className={styles.cellSub}>
                                {inv.poNumber} · {inv.grnNumber}
                              </span>
                            </td>
                            <td>{inv.dueDateLabel}</td>
                            <td className={styles.tabular}>
                              <strong>
                                {formatRupiahFull(inv.remainingAmount)}
                              </strong>
                              {inv.heldAmount > 0 && (
                                <span
                                  className={styles.cellSub}
                                  style={{ color: "#b42336" }}
                                >
                                  Ditahan: {formatRupiahCompact(inv.heldAmount)}
                                </span>
                              )}
                            </td>
                            <td>
                              <VendorInvoiceStatusPill status={inv.status} />
                            </td>
                            <td>
                              {actionLabel ? (
                                <button
                                  type="button"
                                  className={styles.textLink}
                                  onClick={() => setSelectedInvoiceId(inv.id)}
                                >
                                  {actionLabel}
                                </button>
                              ) : (
                                <span
                                  className={styles.dashCell}
                                  aria-label="Tidak ada aksi lanjutan"
                                >
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>

      {/* ================= DRAWERS ================= */}
      <SuppliersDrawer
        open={suppliersOpen}
        onOpenChange={setSuppliersOpen}
        suppliers={INITIAL_SUPPLIERS}
      />

      <CreateRequestDrawer
        open={createRequestOpen}
        onOpenChange={setCreateRequestOpen}
        user={user}
        onCreateRequest={handleCreateRequest}
      />

      <RequestDetailDrawer
        request={selectedRequest}
        onOpenChange={(open) => {
          if (!open) setSelectedRequestId(null);
        }}
        user={user}
        onVerifyRequest={handleVerifyRequest}
        onStartCreateRfq={(req) => {
          setCreateRfqInitialReqId(req.id);
          setCreateRfqOpen(true);
        }}
      />

      <CreateRfqDrawer
        open={createRfqOpen}
        onOpenChange={setCreateRfqOpen}
        user={user}
        verifiedRequests={requests.filter((r) => r.status === "Terverifikasi")}
        suppliers={INITIAL_SUPPLIERS}
        initialRequestId={createRfqInitialReqId}
        onCreateRfq={handleCreateRfq}
      />

      <RfqDetailDrawer
        rfq={selectedRfq}
        onOpenChange={(open) => {
          if (!open) setSelectedRfqId(null);
        }}
        user={user}
        suppliers={INITIAL_SUPPLIERS}
        onRecordOffer={handleRecordOffer}
        onSelectWinningOffer={handleSelectWinningOffer}
        onCreatePoFromRfq={handleCreatePoFromRfq}
      />

      <CreatePoDrawer
        open={createPoOpen}
        onOpenChange={setCreatePoOpen}
        user={user}
        rfqsReadyForPo={rfqs.filter((r) => r.status === "Pemasok terpilih")}
        suppliers={INITIAL_SUPPLIERS}
        onCreatePo={handleCreatePo}
      />

      <PoDetailDrawer
        po={selectedPo}
        onOpenChange={(open) => {
          if (!open) setSelectedPoId(null);
        }}
        user={user}
        onApprovePo={handleApprovePo}
        onRequestRevisionPo={handleRequestRevisionPo}
        onResubmitRevisedPo={handleResubmitRevisedPo}
        onSendPoToVendor={handleSendPoToVendor}
      />

      <RecordReceiptDrawer
        open={recordReceiptOpen}
        onOpenChange={setRecordReceiptOpen}
        user={user}
        eligibleOrders={orders.filter(
          (o) => o.status === "Dikirim ke pemasok" || o.status === "Disetujui",
        )}
        onRecordReceipt={handleRecordReceipt}
      />

      <ReceiptDetailDrawer
        receipt={selectedReceipt}
        onOpenChange={(open) => {
          if (!open) setSelectedReceiptId(null);
        }}
        user={user}
        onCompleteInspection={handleCompleteInspection}
      />

      <InvoiceDetailDrawer
        invoice={selectedInvoice}
        onOpenChange={(open) => {
          if (!open) setSelectedInvoiceId(null);
        }}
        user={user}
        onMatchInvoice={handleMatchInvoice}
        onResolveDiscrepancy={handleResolveDiscrepancy}
        onRecordPayable={handleRecordPayable}
        onProcessPayment={handleProcessPayment}
      />
    </section>
  );
}
