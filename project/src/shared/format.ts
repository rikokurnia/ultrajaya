/** Money is a nonnegative safe integer in IDR minor units (1 rupiah = 100 minor units). */
export const formatCurrency = (minor: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: minor % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(minor / 100);
export const formatQuantity = (value: string, unit: string) =>
  `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 3 }).format(Number(value))} ${unit}`;
export const formatDate = (value: string | Date, includeTime = false) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
    ...(includeTime
      ? { hour: "2-digit", minute: "2-digit", hour12: false }
      : {}),
  }).format(new Date(value)) + (includeTime ? " WIB" : "");
export const statusLabel = (status: string) =>
  status
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
