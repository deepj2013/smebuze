/** Mirrors API tenant business types for signup, nav and POS copy. */

export const POS_BUSINESS_TYPES = [
  'dine_restaurant',
  'cafe',
  'sweet_shop',
  'bakery',
  'garment_shop',
  'retail_shop',
  'department_store',
  'pharmacy',
  'hardware_shop',
  'electronics_shop',
  'jewellery_shop',
  'auto_parts',
  'florist',
  'stationery_shop',
  'salon',
  'clinic',
] as const;
export type PosBusinessType = (typeof POS_BUSINESS_TYPES)[number];

export const STOCK_TRACKED_POS_TYPES = [
  'sweet_shop',
  'bakery',
  'garment_shop',
  'retail_shop',
  'department_store',
  'pharmacy',
  'hardware_shop',
  'electronics_shop',
  'jewellery_shop',
  'auto_parts',
  'florist',
  'stationery_shop',
] as const;

export const SIGNUP_GROUPS = [
  { id: 'food', label: 'Food & hospitality' },
  { id: 'retail', label: 'Retail shops' },
  { id: 'local', label: 'Local services' },
  { id: 'desk', label: 'Desk / wholesale' },
] as const;

export const SIGNUP_BUSINESS_TYPES = [
  {
    id: 'dine_restaurant',
    group: 'food',
    title: 'Dine-in restaurant',
    blurb: 'Show the menu, bill at the table or counter, take cash / UPI like a POS.',
    itemLabel: 'menu item',
    itemsLabel: 'Menu',
    counterLabel: 'Restaurant billing',
  },
  {
    id: 'cafe',
    group: 'food',
    title: 'Cafe / QSR',
    blurb: 'Counter billing for coffee, snacks and takeaway. Menu on the public page.',
    itemLabel: 'menu item',
    itemsLabel: 'Menu',
    counterLabel: 'Cafe billing',
  },
  {
    id: 'sweet_shop',
    group: 'food',
    title: 'Sweet shop',
    blurb: 'Counter billing for mithai, namkeen and boxes. Cash entry and stock on each sale.',
    itemLabel: 'sweet / item',
    itemsLabel: 'Sweets & items',
    counterLabel: 'Sweet shop POS',
  },
  {
    id: 'bakery',
    group: 'food',
    title: 'Bakery',
    blurb: 'Breads, cakes and daily bake. Counter POS plus online pre-order.',
    itemLabel: 'bake item',
    itemsLabel: 'Bakery items',
    counterLabel: 'Bakery POS',
  },
  {
    id: 'hotel',
    group: 'food',
    title: 'Hotel / lodging',
    blurb: 'Website and enquiries for rooms. Invoices and CRM on the desk — not a food cart.',
    itemLabel: 'service',
    itemsLabel: 'Services',
    counterLabel: 'Front desk',
  },
  {
    id: 'garment_shop',
    group: 'retail',
    title: 'Garment shop',
    blurb: 'Single-store clothing billing — scan or tap items, cash or UPI, stock out on sale.',
    itemLabel: 'garment',
    itemsLabel: 'Garments',
    counterLabel: 'Garment billing',
  },
  {
    id: 'retail_shop',
    group: 'retail',
    title: 'Kirana / single store',
    blurb: 'One shop, one counter. Fast cash billing, barcode, and a simple day close.',
    itemLabel: 'product',
    itemsLabel: 'Products',
    counterLabel: 'Store POS',
  },
  {
    id: 'department_store',
    group: 'retail',
    title: 'Department store / supermarket',
    blurb: 'Scan at the counter with a USB/Bluetooth reader, or use the phone camera. Stock by department like a normal store.',
    itemLabel: 'product',
    itemsLabel: 'Departments',
    counterLabel: 'Department store POS',
  },
  {
    id: 'pharmacy',
    group: 'retail',
    title: 'Pharmacy / medical store',
    blurb: 'Medicine counter with barcode, batch-style stock and a public catalog for OTC.',
    itemLabel: 'medicine',
    itemsLabel: 'Medicines',
    counterLabel: 'Pharmacy POS',
  },
  {
    id: 'hardware_shop',
    group: 'retail',
    title: 'Hardware / sanitary',
    blurb: 'Nuts, pipes and tools. Counter billing plus an online catalog of SKUs.',
    itemLabel: 'SKU',
    itemsLabel: 'Hardware',
    counterLabel: 'Hardware POS',
  },
  {
    id: 'electronics_shop',
    group: 'retail',
    title: 'Electronics / mobiles',
    blurb: 'Phones, accessories and service SKUs. Counter plus shop checkout.',
    itemLabel: 'product',
    itemsLabel: 'Electronics',
    counterLabel: 'Electronics POS',
  },
  {
    id: 'jewellery_shop',
    group: 'retail',
    title: 'Jewellery shop',
    blurb: 'Pieces and making-charge items. Catalog for viewing, counter for billing.',
    itemLabel: 'piece',
    itemsLabel: 'Jewellery',
    counterLabel: 'Jewellery billing',
  },
  {
    id: 'auto_parts',
    group: 'retail',
    title: 'Auto parts',
    blurb: 'Spare parts counter with SKU search and a public parts catalog.',
    itemLabel: 'part',
    itemsLabel: 'Parts',
    counterLabel: 'Parts counter',
  },
  {
    id: 'florist',
    group: 'retail',
    title: 'Florist / gifts',
    blurb: 'Bouquets and gift items. Online order for same-day pickup or delivery.',
    itemLabel: 'arrangement',
    itemsLabel: 'Flowers & gifts',
    counterLabel: 'Florist POS',
  },
  {
    id: 'stationery_shop',
    group: 'retail',
    title: 'Stationery / books',
    blurb: 'Notebooks, pens and school supplies. Barcode counter plus catalog.',
    itemLabel: 'product',
    itemsLabel: 'Stationery',
    counterLabel: 'Stationery POS',
  },
  {
    id: 'salon',
    group: 'local',
    title: 'Salon / spa',
    blurb: 'Bill packages at the desk. Public page for the menu and booking enquiries.',
    itemLabel: 'service',
    itemsLabel: 'Services',
    counterLabel: 'Salon billing',
  },
  {
    id: 'clinic',
    group: 'local',
    title: 'Clinic / diagnostic',
    blurb: 'Bill consultations and tests at the counter. Website for appointments.',
    itemLabel: 'service',
    itemsLabel: 'Services',
    counterLabel: 'Clinic billing',
  },
  {
    id: 'coaching',
    group: 'local',
    title: 'Coaching / tuition',
    blurb: 'Course pages and lead inbox. Fee invoices on the desk — no product cart.',
    itemLabel: 'course',
    itemsLabel: 'Courses',
    counterLabel: 'Fees',
  },
  {
    id: 'services',
    group: 'local',
    title: 'Services / general',
    blurb: 'CRM, invoices and books for a service firm or mixed business.',
    itemLabel: 'item',
    itemsLabel: 'Items',
    counterLabel: 'Sales',
  },
  {
    id: 'trading',
    group: 'desk',
    title: 'Trading / wholesale',
    blurb: 'Quotations, GST invoices, purchase and godown stock — the full desk.',
    itemLabel: 'item',
    itemsLabel: 'Items',
    counterLabel: 'Sales',
  },
  {
    id: 'manufacturing',
    group: 'desk',
    title: 'Manufacturing / job work',
    blurb: 'Finished goods catalog, GST invoices and godown. Buyers order from the shop.',
    itemLabel: 'SKU',
    itemsLabel: 'Finished goods',
    counterLabel: 'Sales',
  },
] as const;

export type SignupBusinessTypeId = (typeof SIGNUP_BUSINESS_TYPES)[number]['id'];

export function isPosBusinessType(type: unknown): type is PosBusinessType {
  return typeof type === 'string' && (POS_BUSINESS_TYPES as readonly string[]).includes(type);
}

export function isStockTrackedPos(type: unknown): boolean {
  return typeof type === 'string' && (STOCK_TRACKED_POS_TYPES as readonly string[]).includes(type);
}

export const FLOOR_BUSINESS_TYPES = ['dine_restaurant', 'cafe'] as const;

export function isFloorBusinessType(type: unknown): boolean {
  return typeof type === 'string' && (FLOOR_BUSINESS_TYPES as readonly string[]).includes(type);
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
