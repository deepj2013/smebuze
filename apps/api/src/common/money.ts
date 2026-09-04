import { Transform } from 'class-transformer';

export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function roundQty(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

export function moneyStr(n: number | string | null | undefined): string {
  return round2(Number(n) || 0).toFixed(2);
}

export function optionalMoneyStr(n: number | string | null | undefined): string | null {
  if (n == null || n === '') return null;
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return round2(v).toFixed(2);
}

/** Round incoming JSON numbers/strings to whole pieces before validation. */
export function ToInteger() {
  return Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return value;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? Math.round(n) : value;
  });
}

/** Round incoming JSON numbers/strings to 2 decimal places before validation. */
export function To2Decimals() {
  return Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return value;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? round2(n) : value;
  });
}
