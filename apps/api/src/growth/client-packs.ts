export type ClientPack = {
  id: string;
  title: string;
  blurb: string;
  modules: string[];
  features: string[];
  shop_checkout: boolean;
  list_existing_items: boolean;
  website: {
    hero_title: string;
    hero_subtitle: string;
    about: string;
  };
};

export type ClientPackId = string;

const ERP = ['dashboard', 'crm', 'sales', 'purchase', 'inventory', 'accounting', 'reports'];
const POS = ['dashboard', 'sales', 'inventory', 'reports'];
/** Floor / dine-in: menu + tables, no purchase/accounts clutter. */
const FLOOR = ['dashboard', 'sales', 'inventory', 'crm', 'reports', 'onboarding'];
/** Service counter (salon/clinic): bill services, leads; light stock for retail add-ons. */
const SERVICE_POS = ['dashboard', 'sales', 'crm', 'reports', 'onboarding'];

const POS_SHOP = {
  modules: [...POS, 'crm', 'onboarding'],
  features: ['sales', 'inventory', 'crm', 'reports', 'storefront', 'catalog', 'lead_hub'],
  shop_checkout: true,
  list_existing_items: true,
};

const POS_ENQUIRY = {
  modules: [...POS, 'crm', 'onboarding'],
  features: ['sales', 'inventory', 'crm', 'reports', 'storefront', 'lead_hub'],
  shop_checkout: false,
  list_existing_items: true,
};

const FLOOR_ENQUIRY = {
  modules: FLOOR,
  features: ['sales', 'inventory', 'crm', 'reports', 'storefront', 'lead_hub'],
  shop_checkout: false,
  list_existing_items: true,
};

const SERVICE_ENQUIRY = {
  modules: SERVICE_POS,
  features: ['sales', 'crm', 'reports', 'storefront', 'lead_hub'],
  shop_checkout: false,
  list_existing_items: true,
};

const DESK_SHOP = {
  modules: [...ERP, 'onboarding'],
  features: ['crm', 'sales', 'purchase', 'inventory', 'accounting', 'reports', 'storefront', 'catalog', 'lead_hub', 'whatsapp'],
  shop_checkout: true,
  list_existing_items: false,
};

const DESK_ENQUIRY = {
  modules: ['dashboard', 'crm', 'sales', 'accounting', 'reports', 'onboarding'],
  features: ['crm', 'sales', 'accounting', 'reports', 'storefront', 'lead_hub', 'whatsapp'],
  shop_checkout: false,
  list_existing_items: false,
};

type PackKind =
  | typeof POS_SHOP
  | typeof POS_ENQUIRY
  | typeof FLOOR_ENQUIRY
  | typeof SERVICE_ENQUIRY
  | typeof DESK_SHOP
  | typeof DESK_ENQUIRY;

function pack(
  id: string,
  title: string,
  blurb: string,
  kind: PackKind,
  website: ClientPack['website'],
  extra?: Partial<ClientPack>,
): ClientPack {
  return { id, title, blurb, ...kind, website, ...extra };
}

export const CLIENT_PACKS: ClientPack[] = [
  pack('trading', 'Trading / wholesale', 'GST desk plus a public catalog so buyers can order online.', DESK_SHOP, {
    hero_title: 'Order from our catalog',
    hero_subtitle: 'Wholesale supply with GST invoices and tracked delivery.',
    about: 'Browse our items, place an order, and we will confirm stock and delivery.',
  }),
  pack(
    'restaurant_wholesale',
    'Restaurant / HORECA wholesale',
    'B2B catalog, portal orders, delivery challan, monthly bill.',
    DESK_SHOP,
    {
      hero_title: 'Restaurant supply, on time',
      hero_subtitle: 'Order for your kitchen. We deliver with a signed challan.',
      about: 'Built for hotels, restaurants and caterers who reorder every week.',
    },
    { list_existing_items: true },
  ),
  pack('retail_shop', 'Kirana / single store', 'Counter POS plus an online catalog for the same stock.', POS_SHOP, {
    hero_title: 'Shop our store',
    hero_subtitle: 'Same prices as the counter. Order and pick up or get delivery.',
    about: 'Your neighbourhood store — now also online.',
  }),
  pack('garment_shop', 'Garment shop', 'Counter billing plus a public catalog of garments.', POS_SHOP, {
    hero_title: 'New arrivals',
    hero_subtitle: 'Browse garments and place an order. We confirm size and delivery.',
    about: 'Single-store clothing — counter and online from one stock list.',
  }),
  pack('sweet_shop', 'Sweet shop', 'POS plus pre-order catalog for boxes and mithai.', POS_SHOP, {
    hero_title: 'Fresh mithai, made to order',
    hero_subtitle: 'Pre-order boxes for festivals, gifting and daily counter pickup.',
    about: 'Order online, collect from the shop or ask us to deliver.',
  }),
  pack('bakery', 'Bakery', 'POS plus pre-order for cakes, breads and daily bake.', POS_SHOP, {
    hero_title: 'Fresh from the oven',
    hero_subtitle: 'Order cakes and daily bread. Collect from the shop or we deliver.',
    about: 'Same bakery counter, now with online pre-order.',
  }),
  pack('pharmacy', 'Pharmacy / medical store', 'Medicine counter plus an OTC catalog.', POS_SHOP, {
    hero_title: 'Your neighbourhood pharmacy',
    hero_subtitle: 'Order OTC and wellness items. Prescription medicines at the counter.',
    about: 'Same stock as the shop. We confirm availability before dispatch.',
  }),
  pack('hardware_shop', 'Hardware / sanitary', 'SKU counter plus a public parts catalog.', POS_SHOP, {
    hero_title: 'Tools, pipes and fittings',
    hero_subtitle: 'Browse SKUs and place an order for pickup or delivery.',
    about: 'Hardware and sanitary — counter and catalog from one list.',
  }),
  pack('electronics_shop', 'Electronics / mobiles', 'Counter plus catalog for phones and accessories.', POS_SHOP, {
    hero_title: 'Phones, gadgets and accessories',
    hero_subtitle: 'See what’s in stock. Order online or walk in to the counter.',
    about: 'Authorised accessories and devices from our shop floor.',
  }),
  pack('jewellery_shop', 'Jewellery shop', 'Catalog of pieces plus counter billing.', POS_SHOP, {
    hero_title: 'See our collection',
    hero_subtitle: 'Browse designs and send an enquiry or reserve a piece.',
    about: 'Visit the store to try on. Online orders are confirmed by our staff.',
  }),
  pack('auto_parts', 'Auto parts', 'Spare-parts counter plus a public catalog.', POS_SHOP, {
    hero_title: 'Genuine spare parts',
    hero_subtitle: 'Search parts and order for your workshop or vehicle.',
    about: 'Counter stock, now searchable online.',
  }),
  pack('florist', 'Florist / gifts', 'Bouquets and gifts — counter plus same-day catalog orders.', POS_SHOP, {
    hero_title: 'Flowers for every occasion',
    hero_subtitle: 'Order bouquets and gifts for pickup or local delivery.',
    about: 'Same florist counter. Tell us the time and we arrange it.',
  }),
  pack('stationery_shop', 'Stationery / books', 'School and office supplies — POS plus catalog.', POS_SHOP, {
    hero_title: 'Stationery and school supplies',
    hero_subtitle: 'Order notebooks, pens and kits. Collect from the shop.',
    about: 'Your neighbourhood stationery store, now online.',
  }),
  pack('department_store', 'Department store', 'Multi-department POS plus online catalog.', POS_SHOP, {
    hero_title: 'Shop by department',
    hero_subtitle: 'Browse products and place an order for pickup or delivery.',
    about: 'One catalog for the floor and the website.',
  }, { modules: [...POS, 'crm', 'purchase', 'onboarding'], features: ['sales', 'inventory', 'purchase', 'crm', 'reports', 'storefront', 'catalog', 'lead_hub'], list_existing_items: false }),
  pack('dine_restaurant', 'Dine-in restaurant', 'Waiter · kitchen · floor · POS — public menu for bookings, not a cart.', FLOOR_ENQUIRY, {
    hero_title: 'Our menu',
    hero_subtitle: 'See what we serve. Book a table or send an enquiry.',
    about: 'Dine in with us. Use this page for the menu and reservations.',
  }),
  pack('cafe', 'Cafe / QSR', 'Floor + counter billing — public menu for walk-in and catering enquiry.', FLOOR_ENQUIRY, {
    hero_title: 'Coffee, bites and takeaway',
    hero_subtitle: 'See the menu. Visit us or send an enquiry for catering.',
    about: 'Walk in for the counter. This page is for the menu and bookings.',
  }),
  pack('salon', 'Salon / spa', 'Service menu and booking enquiry — bills at the desk (no purchase/accounts clutter).', SERVICE_ENQUIRY, {
    hero_title: 'Look your best',
    hero_subtitle: 'See our services and send a booking request.',
    about: 'Walk in or enquire here. We bill packages at the salon desk.',
  }),
  pack('clinic', 'Clinic / diagnostic', 'Appointment leads + reception billing — no retail purchase stack.', SERVICE_ENQUIRY, {
    hero_title: 'Book a visit',
    hero_subtitle: 'See our services and send an appointment request.',
    about: 'Reception bills consultations and tests. Use this page to reach us.',
  }),
  pack('services', 'Services / agency', 'Public website and lead hub — no product cart.', DESK_ENQUIRY, {
    hero_title: 'How can we help?',
    hero_subtitle: 'Tell us what you need. We will get back with a quote.',
    about: 'Service firm website with a central inbox for every lead source.',
  }),
  pack('coaching', 'Coaching / tuition', 'Course pages and a lead inbox for admissions.', DESK_ENQUIRY, {
    hero_title: 'Learn with us',
    hero_subtitle: 'See batches and send an enquiry. We call you back with fees and seats.',
    about: 'Coaching institute website — leads land in one inbox.',
  }),
  pack('hotel', 'Hotel / lodging', 'Rooms and enquiry — invoices on the desk, not a shop cart.', DESK_ENQUIRY, {
    hero_title: 'Stay with us',
    hero_subtitle: 'See rooms and send a booking enquiry. We confirm rates and dates.',
    about: 'Hotel website with a central inbox for website, WhatsApp and walk-in leads.',
  }),
  pack('manufacturing', 'Manufacturing / job work', 'Finished-goods catalog plus GST desk.', DESK_SHOP, {
    hero_title: 'Our products',
    hero_subtitle: 'Order finished goods. We confirm MOQ, lead time and GST invoice.',
    about: 'Factory catalog for buyers. Stock and billing stay in SMEBUZE.',
  }, { list_existing_items: true }),
  pack('ice_crest', 'Ice Crest / ice wholesale', 'Existing ice vertical: website enquiry, stock, billing.', {
    modules: ['dashboard', 'crm', 'sales', 'inventory', 'reports', 'onboarding'],
    features: ['crm', 'sales', 'inventory', 'reports', 'storefront', 'lead_hub', 'whatsapp'],
    shop_checkout: false,
    list_existing_items: true,
  }, {
    hero_title: 'Crystal-clear ice. Delivered on time.',
    hero_subtitle: 'Cubes, highballs and spheres for hotels, bars and events.',
    about: 'Tell us what you need — we confirm stock and delivery.',
  }),
];

export function getClientPack(id: string): ClientPack | undefined {
  return CLIENT_PACKS.find((p) => p.id === id);
}
