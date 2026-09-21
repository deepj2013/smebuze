/**
 * Public marketing copy: every shop type we can touch, and how SMEBUZE helps.
 * Keep in sync with signup business types + special verticals.
 */
import { SIGNUP_BUSINESS_TYPES, SIGNUP_GROUPS } from './business-types';

export type PublicUseCase = {
  id: string;
  title: string;
  group: string;
  /** Short tag for login aside / chip lists */
  tag: string;
  /** How SMEBUZE helps this business */
  help: string;
  /** What they open day one */
  gets: string[];
};

const HELP: Record<string, { tag: string; help: string; gets: string[] }> = {
  dine_restaurant: {
    tag: 'Floor + kitchen',
    help: 'Table to waiter to kitchen ticket to bill. Staff only see their screen; you keep GST bills and day reports in one place.',
    gets: ['Floor & tables', 'Waiter orders', 'Kitchen tickets', 'POS bill & print'],
  },
  cafe: {
    tag: 'Cafe counter',
    help: 'Fast counter billing for coffee and takeaway, plus a public menu for walk-ins and catering enquiries.',
    gets: ['Counter POS', 'Public menu', 'Takeaway bills', 'Day close'],
  },
  sweet_shop: {
    tag: 'Mithai POS',
    help: 'Bill boxes and mithai as they go — cash or UPI — with stock down on each sale and a festival pre-order catalog when you want it.',
    gets: ['Counter POS', 'Stock on sale', 'Pre-order catalog', 'Printer at till'],
  },
  bakery: {
    tag: 'Bake + pre-order',
    help: 'Daily bake on the counter, cakes and breads online for pickup or delivery — same item list for both.',
    gets: ['Bakery POS', 'Online pre-order', 'Stock', 'Day bills'],
  },
  hotel: {
    tag: 'Rooms & desk',
    help: 'Website for rooms and booking enquiries, invoices and CRM on the desk — not a food cart.',
    gets: ['Public website', 'Lead inbox', 'GST invoices', 'Follow-ups'],
  },
  garment_shop: {
    tag: 'Apparel counter',
    help: 'Scan or tap garments, settle cash / UPI, keep stock honest without an accountant on the floor.',
    gets: ['Garment POS', 'Stock out on sale', 'Catalog', 'Day close'],
  },
  retail_shop: {
    tag: 'Kirana POS',
    help: 'One shop, one counter — barcode, cash received and change, day bills in one list.',
    gets: ['Store POS', 'Barcode', 'Stock', 'Day close'],
  },
  department_store: {
    tag: 'Barcode till',
    help: 'USB or Bluetooth scanner at the till (or phone camera). Stock by department, receive goods, sell like a normal store.',
    gets: ['Department POS', 'Barcode / camera', 'Purchase receive', 'Online catalog'],
  },
  pharmacy: {
    tag: 'Medicine counter',
    help: 'Medicine billing with barcode and stock, plus an OTC catalog customers can browse online.',
    gets: ['Pharmacy POS', 'Stock', 'OTC catalog', 'Day reports'],
  },
  hardware_shop: {
    tag: 'SKU counter',
    help: 'Nuts, pipes and tools on the counter — searchable SKU catalog for pickup or delivery orders.',
    gets: ['Hardware POS', 'SKU catalog', 'Stock', 'Orders'],
  },
  electronics_shop: {
    tag: 'Mobiles & gadgets',
    help: 'Phones and accessories at the counter, same stock on a shop page for walk-in or online checkout.',
    gets: ['Electronics POS', 'Shop catalog', 'Stock', 'Service SKUs'],
  },
  jewellery_shop: {
    tag: 'Pieces & making',
    help: 'Show the collection online, take enquiries or reserves, bill pieces and making charges at the counter.',
    gets: ['Jewellery POS', 'Collection catalog', 'Enquiries', 'Bills'],
  },
  auto_parts: {
    tag: 'Spare parts',
    help: 'Search parts at the counter and online — workshops and walk-ins order from the same list.',
    gets: ['Parts counter', 'Public catalog', 'Stock', 'Orders'],
  },
  florist: {
    tag: 'Same-day gifts',
    help: 'Bouquets and gifts at the till, plus same-day catalog orders for pickup or local delivery.',
    gets: ['Florist POS', 'Catalog orders', 'Delivery notes', 'Day close'],
  },
  stationery_shop: {
    tag: 'School & office',
    help: 'Notebooks, pens and kits — barcode counter plus a catalog for school and office orders.',
    gets: ['Stationery POS', 'Barcode', 'Catalog', 'Stock'],
  },
  salon: {
    tag: 'Packages & bookings',
    help: 'Bill packages at the desk; public page for the service menu and booking enquiries — no purchase clutter.',
    gets: ['Salon billing', 'Service menu', 'Booking leads', 'Day reports'],
  },
  clinic: {
    tag: 'Reception desk',
    help: 'Bill consultations and tests at reception; website for appointments that land in one lead inbox.',
    gets: ['Clinic billing', 'Appointment leads', 'Invoices', 'Follow-ups'],
  },
  coaching: {
    tag: 'Batches & fees',
    help: 'Course pages and admission enquiries online; fee invoices and follow-ups on the desk.',
    gets: ['Course website', 'Lead inbox', 'Fee invoices', 'CRM'],
  },
  services: {
    tag: 'Service firm',
    help: 'CRM, GST invoices and books for consultants, agencies and mixed firms — website leads in one hub.',
    gets: ['CRM', 'GST invoices', 'Lead hub', 'Reports'],
  },
  trading: {
    tag: 'Wholesale desk',
    help: 'Quotations to GST invoices, purchase and godown stock, plus a buyer catalog so customers reorder online.',
    gets: ['Quotations', 'GST invoices', 'Purchase & stock', 'Buyer portal'],
  },
  manufacturing: {
    tag: 'Finished goods',
    help: 'Finished-goods catalog for buyers, GST desk and godown — MOQ and lead time confirmed by your team.',
    gets: ['Product catalog', 'GST invoices', 'Stock', 'Buyer orders'],
  },
  restaurant_wholesale: {
    tag: 'HORECA supply',
    help: 'B2B kitchen supply: portal orders, delivery challan, consolidate bill — built for hotels and restaurants.',
    gets: ['B2B catalog', 'Portal orders', 'Delivery challan', 'Monthly bill'],
  },
  ice_crest: {
    tag: 'Ice wholesale',
    help: 'Ice plant vertical: stock movements, delivery, website enquiry and billing — a live industry pack.',
    gets: ['Ice dashboard', 'Stock in/out', 'Leads', 'Invoices'],
  },
};

const EXTRA: { id: string; title: string; group: string }[] = [
  { id: 'restaurant_wholesale', title: 'Restaurant / HORECA wholesale', group: 'desk' },
  { id: 'ice_crest', title: 'Ice plant / ice wholesale', group: 'desk' },
];

export const PUBLIC_USE_CASES: PublicUseCase[] = [
  ...SIGNUP_BUSINESS_TYPES.map((t) => {
    const h = HELP[t.id] ?? {
      tag: 'Workspace',
      help: t.blurb,
      gets: ['Billing', 'Stock or CRM', 'Reports'],
    };
    return { id: t.id, title: t.title, group: t.group, ...h };
  }),
  ...EXTRA.map((t) => {
    const h = HELP[t.id]!;
    return { id: t.id, title: t.title, group: t.group, ...h };
  }),
];

const EXTRA_IDS = new Set(EXTRA.map((e) => e.id));

export const PUBLIC_USE_CASE_GROUPS = [
  ...SIGNUP_GROUPS.map((g) => ({
    id: g.id,
    label: g.label,
    items: PUBLIC_USE_CASES.filter((u) => u.group === g.id && !EXTRA_IDS.has(u.id)),
  })),
  {
    id: 'special',
    label: 'Industry packs',
    items: PUBLIC_USE_CASES.filter((u) => EXTRA_IDS.has(u.id)),
  },
].filter((g) => g.items.length > 0);

/** All titles for chips / login aside */
export const PUBLIC_USE_CASE_TAGS = PUBLIC_USE_CASES.map((u) => u.title);
