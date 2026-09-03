import { themeForBusinessType } from './variant-theme';

export type TenantBranding = {
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  display_name: string | null;
  updated_at: string | null;
};

export const DEFAULT_BRANDING: TenantBranding = {
  logo_url: null,
  primary_color: '#0284c7',
  accent_color: '#0369a1',
  display_name: null,
  updated_at: null,
};

const HEX = /^#([0-9a-fA-F]{6})$/;

export function sanitizeHex(value: unknown, fallback: string): string {
  const s = String(value ?? '').trim();
  return HEX.test(s) ? s.toLowerCase() : fallback;
}

export function parseTenantBranding(settings: Record<string, unknown> | null | undefined): TenantBranding {
  const raw = (settings?.branding ?? {}) as Partial<TenantBranding>;
  const type = typeof settings?.business_type === 'string' ? settings.business_type : '';
  const fallback = themeForBusinessType(type);
  return {
    logo_url: typeof raw.logo_url === 'string' && raw.logo_url.trim() ? raw.logo_url.trim() : null,
    primary_color: sanitizeHex(raw.primary_color, fallback.primary),
    accent_color: sanitizeHex(raw.accent_color, fallback.accent),
    display_name: typeof raw.display_name === 'string' && raw.display_name.trim() ? raw.display_name.trim() : null,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : null,
  };
}
