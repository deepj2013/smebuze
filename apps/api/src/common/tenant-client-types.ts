/**
 * Known tenant client types (tenant.settings.business_type).
 * Used to gate custom flows per tenant; tenants without a type (or 'standard') get the uniform product only.
 * See docs/TENANT_CLIENT_TYPES.md.
 */
export const TENANT_CLIENT_TYPES = {
  /** Standard/uniform product — no custom flows. */
  STANDARD: 'standard',
  /** Restaurant / wholesale: delivery challan lines, per-customer price, signed challan image, consolidated invoice. */
  RESTAURANT_WHOLESALE: 'restaurant_wholesale',
} as const;

export type TenantClientType = (typeof TENANT_CLIENT_TYPES)[keyof typeof TENANT_CLIENT_TYPES];

/** Returns true if tenant has a non-standard client type (has custom gated features). */
export function hasCustomClientType(settings: Record<string, unknown> | null | undefined): boolean {
  if (!settings?.business_type || typeof settings.business_type !== 'string') return false;
  return settings.business_type !== TENANT_CLIENT_TYPES.STANDARD;
}

/** Returns true if tenant is restaurant_wholesale type. */
export function isRestaurantWholesale(settings: Record<string, unknown> | null | undefined): boolean {
  return settings?.business_type === TENANT_CLIENT_TYPES.RESTAURANT_WHOLESALE;
}
