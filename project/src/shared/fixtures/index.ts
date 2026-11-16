/** Canonical identifiers. Domain agents seed these IDs in their own migrations/seed functions, preserving links. */
export const FIXTURE_IDS = {
  materials: {
    freshMilk: "mat_fresh_milk",
    milkPowder: "mat_milk_powder",
    cartons: "mat_cartons",
  },
  warehouses: { bandung: "wh_bandung_rm" },
  suppliers: {
    milkCoop: "sup_kss",
    pangan: "sup_sumber_pangan",
    kemas: "sup_kemas_prima",
  },
  customers: {
    indofood: "cust_indofood",
    mayora: "cust_mayora",
  },
  accounts: {
    cashBca: "acc_1101_cash_bca",
    ar: "acc_1103_ar",
    allowance: "acc_1104_allowance",
    ap: "acc_2101_ap",
    salesRevenue: "acc_4101_sales",
    salesReturns: "acc_4102_returns",
    badDebtExpense: "acc_6105_bad_debt",
  },
  documents: {
    request: "fpbb_261028_0188",
    rfq: "rfq_261028_0012",
    quotation: "quote_261028_0012",
    evaluation: "eval_261028_0012",
    order: "po_261026_0042",
    receipt: "grn_261028_0068",
    inspection: "qc_261028_0068",
    invoice: "inv_sp_1028_087",
    payment: "pay_261029_0031",
    journal: "jrn_261029_0001",
    // Revenue documents
    salesOrder: "so_261029_0001",
    reservation: "res_261029_0001",
    deliveryOrder: "do_261029_0001",
    customerInvoice: "cinv_261029_0001",
    incomingReceipt: "rcpt_261029_0001",
    returnClaim: "ret_261029_0001",
    creditNote: "cn_261029_0001",
    writeOff: "wroff_261029_0001",
    bankReconciliation: "brec_261029_0001",
  },
  users: {
    admin: "usr_admin",
    production: "usr_production",
    warehouse: "usr_warehouse",
    purchasing: "usr_purchasing",
    approver: "usr_approver",
    qc: "usr_qc",
    ap: "usr_ap",
    treasury: "usr_treasury",
    accounting: "usr_accounting",
    auditor: "usr_auditor",
    salesAdmin: "usr_sales_admin",
    creditManager: "usr_credit_manager",
    ar: "usr_ar",
    fam: "usr_fam",
  },
} as const;

export const masterFixtures = {
  materials: [
    {
      id: FIXTURE_IDS.materials.freshMilk,
      code: "RM-001",
      name: "Fresh Milk",
      unit: "L",
      minimum: "50000",
    },
    {
      id: FIXTURE_IDS.materials.milkPowder,
      code: "RM-002",
      name: "Milk Powder",
      unit: "kg",
      minimum: "12000",
    },
    {
      id: FIXTURE_IDS.materials.cartons,
      code: "PK-001",
      name: "Packaging Cartons",
      unit: "pcs",
      minimum: "1500000",
    },
  ],
  warehouses: [
    { id: FIXTURE_IDS.warehouses.bandung, code: "BDG-RM", name: "Bandung RM" },
  ],
  suppliers: [
    { id: FIXTURE_IDS.suppliers.milkCoop, name: "Koperasi Susu Sejahtera" },
    { id: FIXTURE_IDS.suppliers.pangan, name: "PT Sumber Pangan" },
    { id: FIXTURE_IDS.suppliers.kemas, name: "PT Kemas Prima" },
  ],
  customers: [
    {
      id: FIXTURE_IDS.customers.indofood,
      code: "CUST-001",
      name: "PT Indofood Sukses Makmur",
      email: "procurement@indofood.co.id",
      creditLimit: 50000000000, // Rp500,000,000 (IDR minor)
      paymentTermDays: 30,
      active: true,
    },
    {
      id: FIXTURE_IDS.customers.mayora,
      code: "CUST-002",
      name: "PT Mayora Indah Tbk",
      email: "purchasing@mayora.co.id",
      creditLimit: 30000000000, // Rp300,000,000 (IDR minor)
      paymentTermDays: 30,
      active: true,
    },
  ],
  accounts: [
    {
      id: FIXTURE_IDS.accounts.cashBca,
      code: "1101",
      name: "Bank BCA - Operating",
      type: "ASSET" as const,
      active: true,
    },
    {
      id: FIXTURE_IDS.accounts.ar,
      code: "1103",
      name: "Trade Accounts Receivable",
      type: "ASSET" as const,
      active: true,
    },
    {
      id: FIXTURE_IDS.accounts.allowance,
      code: "1104",
      name: "Allowance for Doubtful Accounts",
      type: "ASSET" as const,
      active: true,
    },
    {
      id: FIXTURE_IDS.accounts.ap,
      code: "2101",
      name: "Trade Accounts Payable",
      type: "LIABILITY" as const,
      active: true,
    },
    {
      id: FIXTURE_IDS.accounts.salesRevenue,
      code: "4101",
      name: "Commercial Sales Revenue",
      type: "REVENUE" as const,
      active: true,
    },
    {
      id: FIXTURE_IDS.accounts.salesReturns,
      code: "4102",
      name: "Sales Returns & Allowances",
      type: "REVENUE" as const,
      active: true,
    },
    {
      id: FIXTURE_IDS.accounts.badDebtExpense,
      code: "6105",
      name: "Bad Debt Expense",
      type: "EXPENSE" as const,
      active: true,
    },
  ],
  canonicalRevenueScenario: {
    customer: {
      id: FIXTURE_IDS.customers.indofood,
      creditLimitMinor: 50000000000, // Rp500M
      termsDays: 30,
    },
    salesOrder: {
      id: FIXTURE_IDS.documents.salesOrder,
      number: "SO-261029-0001",
      materialId: FIXTURE_IDS.materials.milkPowder,
      warehouseId: FIXTURE_IDS.warehouses.bandung,
      quantity: "5000.000",
      unitPriceMinor: 2500000, // Rp25,000/kg
      totalMinor: 12500000000, // Rp125,000,000
    },
    deliveryOrder: {
      id: FIXTURE_IDS.documents.deliveryOrder,
      number: "DO-261029-0001",
      dispatchedQuantity: "5000.000",
      signedRecipient: "Budi Santoso",
      evidenceRef: "proof_do_261029_0001.pdf",
    },
    customerInvoice: {
      id: FIXTURE_IDS.documents.customerInvoice,
      number: "CINV-261029-0001",
      totalMinor: 12500000000, // Rp125M
      issuedOn: "2026-10-29",
      dueOn: "2026-11-28",
    },
    incomingReceipt: {
      id: FIXTURE_IDS.documents.incomingReceipt,
      number: "RCPT-261029-0001",
      amountMinor: 10000000000, // Rp100M
      bankReference: "BCA-TRX-98231",
      allocatedToInvoiceMinor: 10000000000,
      remainingOutstandingMinor: 2500000000, // Rp25M
    },
    returnClaim: {
      id: FIXTURE_IDS.documents.returnClaim,
      number: "RET-261029-0001",
      claimedQuantity: "200.000",
      acceptedQuantity: "200.000",
      finding: "DAMAGED_IN_TRANSIT" as const,
    },
    creditNote: {
      id: FIXTURE_IDS.documents.creditNote,
      number: "CN-261029-0001",
      amountMinor: 500000000, // Rp5,000,000 (200 kg * Rp25,000)
      adjustedOutstandingMinor: 2000000000, // Rp20M
    },
    writeOff: {
      id: FIXTURE_IDS.documents.writeOff,
      number: "WROFF-261029-0001",
    },
    bankReconciliation: {
      id: FIXTURE_IDS.documents.bankReconciliation,
      number: "BREC-261029-0001",
      accountId: FIXTURE_IDS.accounts.cashBca,
    },
  },
} as const;
