/** Mirrors API tenant business types for signup, nav and POS copy. */

export const POS_BUSINESS_TYPES = ['dine_restaurant', 'sweet_shop', 'garment_shop', 'retail_shop'] as const;
export type PosBusinessType = (typeof POS_BUSINESS_TYPES)[number];

export const SIGNUP_BUSINESS_TYPES = [
  {
    id: 'dine_restaurant',
    title: 'Dine-in restaurant',
    blurb: 'Show the menu, bill at the table or counter, take cash / UPI like a POS.',
    itemLabel: 'menu item',
    itemsLabel: 'Menu',
    counterLabel: 'Restaurant billing',
  },
  {
    id: 'sweet_shop',
    title: 'Sweet shop',
    blurb: 'Counter billing for mithai, namkeen and boxes. Cash entry and stock on each sale.',
    itemLabel: 'sweet / item',
    itemsLabel: 'Sweets & items',
    counterLabel: 'Sweet shop POS',
  },
  {
    id: 'garment_shop',
    title: 'Garment shop',
    blurb: 'Single-store clothing billing — scan or tap items, cash or UPI, stock out on sale.',
    itemLabel: 'garment',
    itemsLabel: 'Garments',
    counterLabel: 'Garment billing',
  },
  {
    id: 'retail_shop',
    title: 'Kirana / single store',
    blurb: 'One shop, one counter. Fast cash billing, barcode, and a simple day close.',
    itemLabel: 'product',
    itemsLabel: 'Products',
    counterLabel: 'Store POS',
  },
  {
    id: 'trading',
    title: 'Trading / wholesale',
    blurb: 'Quotations, GST invoices, purchase and godown stock — the full desk.',
    itemLabel: 'item',
    itemsLabel: 'Items',
    counterLabel: 'Sales',
  },
  {
    id: 'services',
    title: 'Services / general',
    blurb: 'CRM, invoices and books for a service firm or mixed business.',
    itemLabel: 'item',
    itemsLabel: 'Items',
    counterLabel: 'Sales',
  },
] as const;

export type SignupBusinessTypeId = (typeof SIGNUP_BUSINESS_TYPES)[number]['id'];

export function isPosBusinessType(type: unknown): type is PosBusinessType {
  return typeof type === 'string' && (POS_BUSINESS_TYPES as readonly string[]).includes(type);
}

export function businessTypeMeta(type: unknown) {
  return SIGNUP_BUSINESS_TYPES.find((t) => t.id === type) ?? SIGNUP_BUSINESS_TYPES.find((t) => t.id === 'trading')!;
}

export function posSellingRate(item: {
  sale_price?: string | number | null;
  mrp?: string | number | null;
  discount_percent?: string | number | null;
}): number {
  const base = Number(item.sale_price ?? item.mrp ?? 0);
  if (!Number.isFinite(base) || base < 0) return 0;
  const disc = Number(item.discount_percent ?? 0);
  if (Number.isFinite(disc) && disc > 0) return Math.round(Math.max(0, base * (1 - disc / 100)) * 100) / 100;
  return base;
}
