/** Ready-made shelves so a shop does not invent category names from scratch. */

export type CategorySuggestion = {
  /** Top-level category / department name */
  name: string;
  /** Optional subcategories (department store style) */
  subs?: string[];
};

const KIRANA: CategorySuggestion[] = [
  { name: 'Staples', subs: ['Rice & atta', 'Dal & pulses', 'Oil & ghee', 'Sugar & salt'] },
  { name: 'Snacks', subs: ['Namkeen', 'Biscuits', 'Chips', 'Chocolates'] },
  { name: 'Beverages', subs: ['Tea & coffee', 'Cold drinks', 'Juice', 'Water'] },
  { name: 'Dairy', subs: ['Milk', 'Curd & paneer', 'Butter'] },
  { name: 'Personal care', subs: ['Soap', 'Shampoo', 'Oral care'] },
  { name: 'Household', subs: ['Detergent', 'Cleaners', 'Pooja'] },
];

const DEPARTMENT_STORE: CategorySuggestion[] = [
  { name: 'Grocery', subs: ['Staples', 'Masala', 'Snacks', 'Beverages', 'Dairy', 'Frozen'] },
  { name: 'Personal care', subs: ['Bath', 'Hair', 'Oral', 'Skin'] },
  { name: 'Household', subs: ['Cleaners', 'Kitchen', 'Pooja'] },
  { name: 'Baby', subs: ['Diapers', 'Food', 'Care'] },
  { name: 'Stationery', subs: ['Notebooks', 'Pens', 'School'] },
  { name: 'Electronics accessories', subs: ['Cables', 'Earphones', 'Power banks'] },
];

const GARMENT: CategorySuggestion[] = [
  { name: "Men's wear", subs: ['Shirts', 'Trousers', 'T-shirts', 'Ethnic'] },
  { name: "Women's wear", subs: ['Kurtis', 'Tops', 'Sarees', 'Western'] },
  { name: 'Kids', subs: ['Boys', 'Girls', 'Infants'] },
  { name: 'Accessories', subs: ['Belts', 'Bags', 'Scarves'] },
];

const RESTAURANT: CategorySuggestion[] = [
  { name: 'Starters' },
  { name: 'Main course' },
  { name: 'Breads & rice' },
  { name: 'Beverages' },
  { name: 'Desserts' },
  { name: 'Combos' },
];

const PHARMACY: CategorySuggestion[] = [
  { name: 'OTC medicines' },
  { name: 'Prescription' },
  { name: 'Personal care' },
  { name: 'Baby care' },
  { name: 'Surgical & devices' },
];

const HARDWARE: CategorySuggestion[] = [
  { name: 'Pipes & fittings' },
  { name: 'Fasteners' },
  { name: 'Tools' },
  { name: 'Electrical' },
  { name: 'Paint & adhesives' },
  { name: 'Sanitary' },
];

const ELECTRONICS: CategorySuggestion[] = [
  { name: 'Mobiles' },
  { name: 'Accessories' },
  { name: 'Audio' },
  { name: 'Chargers & cables' },
  { name: 'Service parts' },
];

const DEFAULT: CategorySuggestion[] = [
  { name: 'General' },
  { name: 'Fast moving' },
  { name: 'Seasonal' },
];

const BY_TYPE: Record<string, CategorySuggestion[]> = {
  retail_shop: KIRANA,
  department_store: DEPARTMENT_STORE,
  garment_shop: GARMENT,
  b2b_garments: GARMENT,
  pharmacy: PHARMACY,
  hardware_shop: HARDWARE,
  electronics_shop: ELECTRONICS,
  restaurant: RESTAURANT,
  cafe: [
    { name: 'Coffee' },
    { name: 'Tea' },
    { name: 'Snacks' },
    { name: 'Desserts' },
    { name: 'Cold drinks' },
  ],
  bakery: [
    { name: 'Bread' },
    { name: 'Cakes' },
    { name: 'Cookies' },
    { name: 'Savouries' },
  ],
  ice_cream_parlour: [
    { name: 'Scoops' },
    { name: 'Cups & cones' },
    { name: 'Family packs' },
    { name: 'Toppings' },
  ],
};

export function categorySuggestionsFor(businessType?: string | null): CategorySuggestion[] {
  const key = (businessType || '').trim();
  return BY_TYPE[key] || DEFAULT;
}

/** One-line tip shown above the suggestion chips. */
export function categorySetupTip(businessType?: string | null): string {
  if (businessType === 'department_store') {
    return 'Tip: make a few big departments (Grocery, Personal care). Put products under a subcategory like Snacks or Dairy so the counter shelf stays tidy.';
  }
  if (businessType === 'garment_shop' || businessType === 'b2b_garments') {
    return 'Tip: start with Men / Women / Kids. Use subcategory for shirt, kurti, etc. Put size on the product, not as a category.';
  }
  if (businessType === 'restaurant' || businessType === 'cafe') {
    return 'Tip: categories are menu sections on the POS (Starters, Main course). Keep names short so waiters can tap fast.';
  }
  return 'Tip: keep 5–12 categories. Put the product type in the category (Snacks), and details in the item name (Taka Tak Chatpata Masala).';
}
