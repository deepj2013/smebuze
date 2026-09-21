/** Colour and dashboard mood per shop type. Custom Look & logo still overrides primary/accent. */

export type VariantTheme = {
  id: string;
  label: string;
  tagline: string;
  primary: string;
  accent: string;
  canvas: string;
  sidebar: string;
  tint50: string;
  tint100: string;
  tint200: string;
  heroFrom: string;
  heroTo: string;
};

export const VARIANT_THEMES: Record<string, VariantTheme> = {
  dine_restaurant: {
    id: 'dine_restaurant',
    label: 'Restaurant',
    tagline: 'Tables, kitchen and the billing counter.',
    primary: '#c2410c',
    accent: '#9a3412',
    canvas: '#fff7ed',
    sidebar: '#fffbeb',
    tint50: '#fff7ed',
    tint100: '#ffedd5',
    tint200: '#fed7aa',
    heroFrom: '#9a3412',
    heroTo: '#ea580c',
  },
  sweet_shop: {
    id: 'sweet_shop',
    label: 'Sweet shop',
    tagline: 'Boxes, mithai and a fast counter.',
    primary: '#db2777',
    accent: '#be185d',
    canvas: '#fdf2f8',
    sidebar: '#fff1f2',
    tint50: '#fdf2f8',
    tint100: '#fce7f3',
    tint200: '#fbcfe8',
    heroFrom: '#9d174d',
    heroTo: '#db2777',
  },
  garment_shop: {
    id: 'garment_shop',
    label: 'Garment shop',
    tagline: 'Racks, sizes and a boutique counter.',
    primary: '#7c3aed',
    accent: '#6d28d9',
    canvas: '#f5f3ff',
    sidebar: '#faf5ff',
    tint50: '#f5f3ff',
    tint100: '#ede9fe',
    tint200: '#ddd6fe',
    heroFrom: '#5b21b6',
    heroTo: '#7c3aed',
  },
  retail_shop: {
    id: 'retail_shop',
    label: 'Kirana',
    tagline: 'Neighbourhood shop, barcode and day close.',
    primary: '#15803d',
    accent: '#166534',
    canvas: '#f0fdf4',
    sidebar: '#f7fee7',
    tint50: '#f0fdf4',
    tint100: '#dcfce7',
    tint200: '#bbf7d0',
    heroFrom: '#14532d',
    heroTo: '#16a34a',
  },
  department_store: {
    id: 'department_store',
    label: 'Department store',
    tagline: 'Aisles, scanners and floor stock.',
    primary: '#0f766e',
    accent: '#115e59',
    canvas: '#f0fdfa',
    sidebar: '#ecfeff',
    tint50: '#f0fdfa',
    tint100: '#ccfbf1',
    tint200: '#99f6e4',
    heroFrom: '#134e4a',
    heroTo: '#0d9488',
  },
  trading: {
    id: 'trading',
    label: 'Trading',
    tagline: 'GST desk — quotes, purchase and godown.',
    primary: '#0284c7',
    accent: '#0369a1',
    canvas: '#f8fafc',
    sidebar: '#ffffff',
    tint50: '#f0f9ff',
    tint100: '#e0f2fe',
    tint200: '#bae6fd',
    heroFrom: '#075985',
    heroTo: '#0284c7',
  },
  services: {
    id: 'services',
    label: 'Services',
    tagline: 'Clients, invoices and the books.',
    primary: '#4f46e5',
    accent: '#3730a3',
    canvas: '#eef2ff',
    sidebar: '#f8fafc',
    tint50: '#eef2ff',
    tint100: '#e0e7ff',
    tint200: '#c7d2fe',
    heroFrom: '#312e81',
    heroTo: '#4f46e5',
  },
  ice_crest: {
    id: 'ice_crest',
    label: 'Ice Crest',
    tagline: 'Ice production, stock and CRM.',
    primary: '#0891b2',
    accent: '#0e7490',
    canvas: '#ecfeff',
    sidebar: '#f0fdfa',
    tint50: '#ecfeff',
    tint100: '#cffafe',
    tint200: '#a5f3fc',
    heroFrom: '#155e75',
    heroTo: '#0891b2',
  },
  cafe: {
    id: 'cafe',
    label: 'Cafe',
    tagline: 'Coffee, bites and the takeaway counter.',
    primary: '#78350f',
    accent: '#92400e',
    canvas: '#fffbeb',
    sidebar: '#fff7ed',
    tint50: '#fffbeb',
    tint100: '#fef3c7',
    tint200: '#fde68a',
    heroFrom: '#451a03',
    heroTo: '#b45309',
  },
  bakery: {
    id: 'bakery',
    label: 'Bakery',
    tagline: 'Daily bake, cakes and pre-order.',
    primary: '#d97706',
    accent: '#b45309',
    canvas: '#fffbeb',
    sidebar: '#fff7ed',
    tint50: '#fffbeb',
    tint100: '#fef3c7',
    tint200: '#fde68a',
    heroFrom: '#92400e',
    heroTo: '#f59e0b',
  },
  pharmacy: {
    id: 'pharmacy',
    label: 'Pharmacy',
    tagline: 'Medicines, OTC and the counter.',
    primary: '#047857',
    accent: '#065f46',
    canvas: '#ecfdf5',
    sidebar: '#f0fdf4',
    tint50: '#ecfdf5',
    tint100: '#d1fae5',
    tint200: '#a7f3d0',
    heroFrom: '#064e3b',
    heroTo: '#059669',
  },
  hardware_shop: {
    id: 'hardware_shop',
    label: 'Hardware',
    tagline: 'Tools, pipes and SKU billing.',
    primary: '#57534e',
    accent: '#44403c',
    canvas: '#fafaf9',
    sidebar: '#f5f5f4',
    tint50: '#fafaf9',
    tint100: '#e7e5e4',
    tint200: '#d6d3d1',
    heroFrom: '#292524',
    heroTo: '#78716c',
  },
  electronics_shop: {
    id: 'electronics_shop',
    label: 'Electronics',
    tagline: 'Phones, gadgets and accessories.',
    primary: '#2563eb',
    accent: '#1d4ed8',
    canvas: '#eff6ff',
    sidebar: '#f8fafc',
    tint50: '#eff6ff',
    tint100: '#dbeafe',
    tint200: '#bfdbfe',
    heroFrom: '#1e3a8a',
    heroTo: '#2563eb',
  },
  jewellery_shop: {
    id: 'jewellery_shop',
    label: 'Jewellery',
    tagline: 'Pieces, making charge and the counter.',
    primary: '#a16207',
    accent: '#854d0e',
    canvas: '#fffbeb',
    sidebar: '#fefce8',
    tint50: '#fffbeb',
    tint100: '#fef3c7',
    tint200: '#fde68a',
    heroFrom: '#713f12',
    heroTo: '#ca8a04',
  },
  auto_parts: {
    id: 'auto_parts',
    label: 'Auto parts',
    tagline: 'Spares for the workshop and counter.',
    primary: '#1e3a8a',
    accent: '#1e40af',
    canvas: '#eef2ff',
    sidebar: '#f8fafc',
    tint50: '#eef2ff',
    tint100: '#e0e7ff',
    tint200: '#c7d2fe',
    heroFrom: '#1e1b4b',
    heroTo: '#1d4ed8',
  },
  florist: {
    id: 'florist',
    label: 'Florist',
    tagline: 'Bouquets, gifts and same-day orders.',
    primary: '#c026d3',
    accent: '#a21caf',
    canvas: '#fdf4ff',
    sidebar: '#faf5ff',
    tint50: '#fdf4ff',
    tint100: '#fae8ff',
    tint200: '#f5d0fe',
    heroFrom: '#701a75',
    heroTo: '#d946ef',
  },
  stationery_shop: {
    id: 'stationery_shop',
    label: 'Stationery',
    tagline: 'School supplies, pens and kits.',
    primary: '#0ea5e9',
    accent: '#0284c7',
    canvas: '#f0f9ff',
    sidebar: '#f8fafc',
    tint50: '#f0f9ff',
    tint100: '#e0f2fe',
    tint200: '#bae6fd',
    heroFrom: '#075985',
    heroTo: '#0ea5e9',
  },
  salon: {
    id: 'salon',
    label: 'Salon',
    tagline: 'Packages, walk-ins and booking enquiries.',
    primary: '#e11d48',
    accent: '#be123c',
    canvas: '#fff1f2',
    sidebar: '#fdf2f8',
    tint50: '#fff1f2',
    tint100: '#ffe4e6',
    tint200: '#fecdd3',
    heroFrom: '#9f1239',
    heroTo: '#f43f5e',
  },
  clinic: {
    id: 'clinic',
    label: 'Clinic',
    tagline: 'Consultations, tests and reception billing.',
    primary: '#155e75',
    accent: '#164e63',
    canvas: '#ecfeff',
    sidebar: '#f0f9ff',
    tint50: '#ecfeff',
    tint100: '#cffafe',
    tint200: '#a5f3fc',
    heroFrom: '#164e63',
    heroTo: '#0891b2',
  },
  coaching: {
    id: 'coaching',
    label: 'Coaching',
    tagline: 'Batches, fees and admission leads.',
    primary: '#4338ca',
    accent: '#3730a3',
    canvas: '#eef2ff',
    sidebar: '#f8fafc',
    tint50: '#eef2ff',
    tint100: '#e0e7ff',
    tint200: '#c7d2fe',
    heroFrom: '#312e81',
    heroTo: '#6366f1',
  },
  hotel: {
    id: 'hotel',
    label: 'Hotel',
    tagline: 'Rooms, enquiries and front-desk invoices.',
    primary: '#1e293b',
    accent: '#0f172a',
    canvas: '#f8fafc',
    sidebar: '#ffffff',
    tint50: '#f1f5f9',
    tint100: '#e2e8f0',
    tint200: '#cbd5e1',
    heroFrom: '#020617',
    heroTo: '#334155',
  },
  manufacturing: {
    id: 'manufacturing',
    label: 'Manufacturing',
    tagline: 'Finished goods, MOQ and GST invoices.',
    primary: '#3f3f46',
    accent: '#27272a',
    canvas: '#fafafa',
    sidebar: '#f4f4f5',
    tint50: '#fafafa',
    tint100: '#f4f4f5',
    tint200: '#e4e4e7',
    heroFrom: '#18181b',
    heroTo: '#52525b',
  },
};

const HEX = /^#[0-9a-fA-F]{6}$/;

export function themeForBusinessType(type: unknown): VariantTheme {
  const key = typeof type === 'string' ? type : '';
  return VARIANT_THEMES[key] ?? VARIANT_THEMES.trading;
}

export function isKnownVariantPrimary(hex: string): boolean {
  const n = hex.toLowerCase();
  return Object.values(VARIANT_THEMES).some((t) => t.primary === n);
}

export function resolveWorkspaceTheme(settings?: Record<string, unknown> | null): VariantTheme {
  const base = themeForBusinessType(settings?.business_type);
  const raw = (settings?.branding ?? {}) as { primary_color?: unknown; accent_color?: unknown };
  const primary = typeof raw.primary_color === 'string' && HEX.test(raw.primary_color.trim())
    ? raw.primary_color.trim().toLowerCase()
    : base.primary;
  const accent = typeof raw.accent_color === 'string' && HEX.test(raw.accent_color.trim())
    ? raw.accent_color.trim().toLowerCase()
    : base.accent;
  if (primary === base.primary && accent === base.accent) return base;
  return { ...base, primary, accent };
}

export function applyWorkspaceThemeVars(theme: VariantTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--tenant-primary', theme.primary);
  root.style.setProperty('--tenant-accent', theme.accent);
  root.style.setProperty('--tenant-canvas', theme.canvas);
  root.style.setProperty('--tenant-sidebar', theme.sidebar);
  root.style.setProperty('--tenant-tint-50', theme.tint50);
  root.style.setProperty('--tenant-tint-100', theme.tint100);
  root.style.setProperty('--tenant-tint-200', theme.tint200);
  root.style.setProperty('--tenant-hero-from', theme.heroFrom);
  root.style.setProperty('--tenant-hero-to', theme.heroTo);
  root.dataset.shop = theme.id;
}
