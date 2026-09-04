import { apiGet } from './api';
import { hasMoreThan2Decimals, round2 } from './money';

export type PricedItem = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  category?: string | null;
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
    const c = round2(cgst);
    const s = round2(sgst);
    return { cgst: c, sgst: s, tax: round2(c + s) };
  }
  const tax = round2(Number(item.tax_rate ?? 0) || 0);
  const cgstHalf = round2(tax / 2);
  return { cgst: cgstHalf, sgst: round2(tax - cgstHalf), tax };
}

export function defaultItemRate(item: PricedItem): number {
  const sale = item.sale_price != null && item.sale_price !== '' ? Number(item.sale_price) : NaN;
  if (Number.isFinite(sale) && sale > 0) return round2(sale);
  const mrp = item.mrp != null && item.mrp !== '' ? Number(item.mrp) : NaN;
  return Number.isFinite(mrp) && mrp > 0 ? round2(mrp) : Number.isFinite(sale) ? round2(sale) : 0;
}

export type InvoiceItemLinePatch = {
  item_id: string;
  item_sku: string | null;
  item_name: string;
  item_image_url: string | null;
  hsn_sac?: string;
  description?: string;
  unit?: string;
  rate: number;
  cgst_rate: number;
  sgst_rate: number;
  customer_rate: boolean;
};

export function invoiceLinePatchFromItem(item: PricedItem, customRate: number | null): InvoiceItemLinePatch {
  const gst = splitItemGst(item);
  const rate = customRate ?? defaultItemRate(item);
  return {
    item_id: item.id,
    item_sku: item.sku ?? null,
    item_name: item.name,
    item_image_url: Array.isArray(item.image_urls) && item.image_urls[0] ? item.image_urls[0] : null,
    hsn_sac: item.hsn_sac ?? undefined,
    description: item.description || item.name,
    unit: item.unit || undefined,
    rate: Number.isFinite(rate) ? rate : 0,
    cgst_rate: gst.cgst,
    sgst_rate: gst.sgst,
    customer_rate: customRate != null,
  };
}

export function unwrapItemList<T>(data: T[] | { data?: T[] } | undefined | null): T[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as { data?: T[] }).data)) return (data as { data: T[] }).data;
  return [];
}

export async function lookupCustomerRate(customerId: string | undefined | null, itemId: string): Promise<number | null> {
  if (!customerId || !itemId) return null;
  const { data } = await apiGet<{ rate?: string | number | null }>(
    `crm/item-rates?customer_id=${encodeURIComponent(customerId)}&item_id=${encodeURIComponent(itemId)}`,
  );
  if (data?.rate == null || data.rate === '') return null;
  const n = Number(data.rate);
  return Number.isFinite(n) ? round2(n) : null;
}

export function parseNonNeg(raw: string, label: string, opts?: { max?: number; required?: boolean }): string | null {
  if (!raw.trim()) return opts?.required ? `${label} is required` : null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return `${label} must be a number 0 or greater`;
  if (hasMoreThan2Decimals(raw)) return `${label} can have at most 2 decimal places`;
  if (opts?.max != null && n > opts.max) return `${label} must be at most ${opts.max}`;
  return null;
}
