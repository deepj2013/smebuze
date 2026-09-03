/** Shop-type colour defaults. Keep in sync with apps/website/lib/variant-theme.ts */

export type VariantTheme = {
  primary: string;
  accent: string;
};

export const VARIANT_THEMES: Record<string, VariantTheme> = {
  dine_restaurant: { primary: '#c2410c', accent: '#9a3412' },
  sweet_shop: { primary: '#db2777', accent: '#be185d' },
  garment_shop: { primary: '#7c3aed', accent: '#6d28d9' },
  retail_shop: { primary: '#15803d', accent: '#166534' },
  department_store: { primary: '#0f766e', accent: '#115e59' },
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
