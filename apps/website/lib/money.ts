/** Money, rates and GST % use 2 decimal places. Quantity is whole pieces only. */

export const MONEY_DECIMALS = 2;

export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function roundQty(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

export function moneyStr(n: number | string | null | undefined): string {
  return round2(Number(n) || 0).toFixed(MONEY_DECIMALS);
}

export function formatMoney(n: number | string | null | undefined): string {
  return `₹${moneyStr(n)}`;
}

export function formatQty(n: number | string | null | undefined): string {
  return roundQty(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/** Keep at most 2 digits after the decimal while typing. Allows '', '-', '.', '12.' */
export function limitDecimalPlaces(raw: string, decimals = MONEY_DECIMALS): string {
  let s = String(raw ?? '').replace(/[^\d.-]/g, '');
  const neg = s.startsWith('-');
  s = s.replace(/-/g, '');
  if (neg) s = `-${s}`;
  const dot = s.indexOf('.');
  if (dot === -1) return s;
  const head = s.slice(0, dot + 1);
  const frac = s.slice(dot + 1).replace(/\./g, '').slice(0, decimals);
  return head + frac;
}

/** Digits only (optional leading minus). Drops any decimal. */
export function limitInteger(raw: string): string {
  let s = String(raw ?? '').replace(/[^\d-]/g, '');
  const neg = s.startsWith('-');
  s = s.replace(/-/g, '');
  if (neg) s = `-${s}`;
  return s;
}

export function hasMoreThan2Decimals(raw: string): boolean {
  const m = String(raw).trim().match(/\.(\d+)/);
  return Boolean(m && m[1].length > MONEY_DECIMALS);
}

export function parseMoney(raw: string | number | null | undefined): number {
  if (raw == null || raw === '') return 0;
  return round2(typeof raw === 'number' ? raw : Number(raw));
}

export function parseQty(raw: string | number | null | undefined): number {
  if (raw == null || raw === '') return 0;
  return roundQty(typeof raw === 'number' ? raw : Number(raw));
}
