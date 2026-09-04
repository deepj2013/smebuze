import { apiGet } from './api';

export type PricedItem = {
  id: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  unit?: string;
  hsn_sac?: string | null;
  image_urls?: string[];
  mrp?: string | number | null;
  sale_price?: string | number | null;
  tax_rate?: string | number | null;
  cgst_rate?: string | number | null;
  sgst_rate?: string | number | null;
  for_sale?: boolean;
  for_consume?: boolean;
};

export function splitItemGst(item: PricedItem): { cgst: number; sgst: number; tax: number } {
  const cgst = item.cgst_rate != null && item.cgst_rate !== '' ? Number(item.cgst_rate) : NaN;
  const sgst = item.sgst_rate != null && item.sgst_rate !== '' ? Number(item.sgst_rate) : NaN;
  if (Number.isFinite(cgst) && Number.isFinite(sgst)) {
    return { cgst, sgst, tax: cgst + sgst };
  }
  const tax = Number(item.tax_rate ?? 0) || 0;
  return { cgst: tax / 2, sgst: tax / 2, tax };
}

export function defaultItemRate(item: PricedItem): number {
  const sale = item.sale_price != null && item.sale_price !== '' ? Number(item.sale_price) : NaN;
  if (Number.isFinite(sale) && sale >= 0) return sale;
  const mrp = item.mrp != null && item.mrp !== '' ? Number(item.mrp) : NaN;
  return Number.isFinite(mrp) ? mrp : 0;
}

export async function lookupCustomerRate(customerId: string | undefined | null, itemId: string): Promise<number | null> {
  if (!customerId || !itemId) return null;
  const { data } = await apiGet<{ rate?: string | number | null }>(
    `crm/item-rates?customer_id=${encodeURIComponent(customerId)}&item_id=${encodeURIComponent(itemId)}`,
  );
  if (data?.rate == null || data.rate === '') return null;
  const n = Number(data.rate);
  return Number.isFinite(n) ? n : null;
}

export function parseNonNeg(raw: string, label: string, opts?: { max?: number; required?: boolean }): string | null {
  if (!raw.trim()) return opts?.required ? `${label} is required` : null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return `${label} must be a number 0 or greater`;
  if (opts?.max != null && n > opts.max) return `${label} must be at most ${opts.max}`;
  return null;
}
