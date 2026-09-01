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

export function parseTenantBranding(settings: Record<string, unknown> | null | undefined): TenantBranding {
  const raw = (settings?.branding ?? {}) as Partial<TenantBranding>;
  const hex = (v: unknown, fb: string) => {
    const s = String(v ?? '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : fb;
  };
  return {
    logo_url: typeof raw.logo_url === 'string' && raw.logo_url.trim() ? raw.logo_url.trim() : null,
    primary_color: hex(raw.primary_color, DEFAULT_BRANDING.primary_color),
    accent_color: hex(raw.accent_color, DEFAULT_BRANDING.accent_color),
    display_name: typeof raw.display_name === 'string' && raw.display_name.trim() ? raw.display_name.trim() : null,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : null,
  };
}
