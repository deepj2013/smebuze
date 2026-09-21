/** Shop-type colour defaults. Keep in sync with apps/website/lib/variant-theme.ts */

export type VariantTheme = {
  primary: string;
  accent: string;
};

export const VARIANT_THEMES: Record<string, VariantTheme> = {
  dine_restaurant: { primary: '#c2410c', accent: '#9a3412' },
  cafe: { primary: '#78350f', accent: '#92400e' },
  sweet_shop: { primary: '#db2777', accent: '#be185d' },
  bakery: { primary: '#d97706', accent: '#b45309' },
  garment_shop: { primary: '#7c3aed', accent: '#6d28d9' },
  retail_shop: { primary: '#15803d', accent: '#166534' },
  department_store: { primary: '#0f766e', accent: '#115e59' },
  pharmacy: { primary: '#047857', accent: '#065f46' },
  hardware_shop: { primary: '#57534e', accent: '#44403c' },
  electronics_shop: { primary: '#2563eb', accent: '#1d4ed8' },
  jewellery_shop: { primary: '#a16207', accent: '#854d0e' },
  auto_parts: { primary: '#1e3a8a', accent: '#1e40af' },
  florist: { primary: '#c026d3', accent: '#a21caf' },
  stationery_shop: { primary: '#0ea5e9', accent: '#0284c7' },
  salon: { primary: '#e11d48', accent: '#be123c' },
  clinic: { primary: '#155e75', accent: '#164e63' },
  coaching: { primary: '#4338ca', accent: '#3730a3' },
  hotel: { primary: '#1e293b', accent: '#0f172a' },
  manufacturing: { primary: '#3f3f46', accent: '#27272a' },
  trading: { primary: '#0284c7', accent: '#0369a1' },
  services: { primary: '#4f46e5', accent: '#3730a3' },
  ice_crest: { primary: '#0891b2', accent: '#0e7490' },
};

const KNOWN_PRIMARIES = new Set(Object.values(VARIANT_THEMES).map((t) => t.primary));

export function themeForBusinessType(type: unknown): VariantTheme {
  const key = typeof type === 'string' ? type : '';
  return VARIANT_THEMES[key] ?? VARIANT_THEMES.trading;
}

export function shouldApplyVariantBranding(existing?: Record<string, unknown> | null): boolean {
  const branding = (existing?.branding ?? {}) as { primary_color?: unknown };
  const primary = typeof branding.primary_color === 'string' ? branding.primary_color.toLowerCase() : '';
  if (!primary) return true;
  return KNOWN_PRIMARIES.has(primary);
}

export function brandingForBusinessType(
  type: string,
  existing?: Record<string, unknown> | null,
): Record<string, unknown> {
  const current = ((existing?.branding ?? {}) as Record<string, unknown>) || {};
  if (!shouldApplyVariantBranding(existing)) return current;
  const theme = themeForBusinessType(type);
  return {
    ...current,
    primary_color: theme.primary,
    accent_color: theme.accent,
  };
}
