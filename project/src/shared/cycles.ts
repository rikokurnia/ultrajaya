/** Navigation foundations only; business workflows are owned by the cycle agents. */
export const CYCLES = [
  {
    key: "pendapatan",
    title: "Pendapatan",
    description: "Pesanan hingga penagihan",
    path: "/cycles/pendapatan",
  },
  {
    key: "pengeluaran",
    title: "Pengeluaran",
    description: "Permintaan pembelian hingga pembayaran",
    path: "/cycles/pengeluaran",
  },
  {
    key: "produksi",
    title: "Produksi",
    description: "Perencanaan hingga rilis batch dan HPP",
    path: "/cycles/produksi",
  },
  {
    key: "penggajian",
    title: "Penggajian",
    description: "Absensi hingga pembayaran gaji dan jurnal",
    path: "/cycles/penggajian",
  },
] as const;
export type CycleKey = (typeof CYCLES)[number]["key"];
