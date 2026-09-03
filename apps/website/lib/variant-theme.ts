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
