/**
 * Exact scaled decimal arithmetic for UltraOps inventory.
 * Stores and calculates quantities with up to 3 decimal places using scaled BigInt integers.
 * Never uses floating-point numbers for inventory quantity totals.
 */

const SCALE = 1000n;

export function parseDecimalToScaled(value: string | number): bigint {
  const str = String(value).trim();
  if (!str) return 0n;
  const match = str.match(/^(-)?(0|[1-9]\d*)(\.\d{1,3})?$/);
  if (!match) {
    throw new Error(`Invalid decimal quantity string: "${value}"`);
  }
  const isNegative = !!match[1];
  const wholePart = match[2];
  const fractionPart = (match[3] || ".").slice(1).padEnd(3, "0");
  const scaled = BigInt(wholePart) * SCALE + BigInt(fractionPart);
  return isNegative ? -scaled : scaled;
}

export function formatScaledToDecimal(scaled: bigint, decimals: number = 3): string {
  const isNegative = scaled < 0n;
  const abs = isNegative ? -scaled : scaled;
  const whole = abs / SCALE;
  const fraction = abs % SCALE;
  const fractionStr = fraction.toString().padStart(3, "0");
  const formattedFraction = decimals === 3 ? fractionStr : fractionStr.slice(0, decimals);
  const sign = isNegative ? "-" : "";
  return `${sign}${whole}.${formattedFraction}`;
}

export function formatQuantityExact(value: string | number): string {
  const scaled = parseDecimalToScaled(value);
  return formatScaledToDecimal(scaled, 3);
}

export function addQuantity(a: string | number, b: string | number): string {
  const res = parseDecimalToScaled(a) + parseDecimalToScaled(b);
  return formatScaledToDecimal(res, 3);
}

export function subQuantity(a: string | number, b: string | number): string {
  const res = parseDecimalToScaled(a) - parseDecimalToScaled(b);
  if (res < 0n) {
    throw new Error(`Negative quantity result not allowed: ${a} - ${b}`);
  }
  return formatScaledToDecimal(res, 3);
}

export function compareQuantity(a: string | number, b: string | number): -1 | 0 | 1 {
  const diff = parseDecimalToScaled(a) - parseDecimalToScaled(b);
  if (diff < 0n) return -1;
  if (diff > 0n) return 1;
  return 0;
}

export function isQuantityGte(a: string | number, b: string | number): boolean {
  return parseDecimalToScaled(a) >= parseDecimalToScaled(b);
}

export function isQuantityGt(a: string | number, b: string | number): boolean {
  return parseDecimalToScaled(a) > parseDecimalToScaled(b);
}

export function isQuantityLte(a: string | number, b: string | number): boolean {
  return parseDecimalToScaled(a) <= parseDecimalToScaled(b);
}

export function isQuantityLt(a: string | number, b: string | number): boolean {
  return parseDecimalToScaled(a) < parseDecimalToScaled(b);
}

export function isQuantityZero(a: string | number): boolean {
  return parseDecimalToScaled(a) === 0n;
}
