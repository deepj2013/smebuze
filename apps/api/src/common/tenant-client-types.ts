/**
 * Tenant business types. Signup asks how the shop will use SMEBUZZ,
 * then the workspace is shaped around that (POS counter vs full ERP).
 */
export const TENANT_CLIENT_TYPES = {
  STANDARD: 'standard',
  TRADING: 'trading',
  SERVICES: 'services',
  DINE_RESTAURANT: 'dine_restaurant',
  SWEET_SHOP: 'sweet_shop',
  GARMENT_SHOP: 'garment_shop',
  RETAIL_SHOP: 'retail_shop',
  DEPARTMENT_STORE: 'department_store',
  RESTAURANT_WHOLESALE: 'restaurant_wholesale',
  ICE_CREST: 'ice_crest',
} as const;

export type TenantClientType = (typeof TENANT_CLIENT_TYPES)[keyof typeof TENANT_CLIENT_TYPES];

export const POS_BUSINESS_TYPES: readonly string[] = [
  TENANT_CLIENT_TYPES.DINE_RESTAURANT,
  TENANT_CLIENT_TYPES.SWEET_SHOP,
  TENANT_CLIENT_TYPES.GARMENT_SHOP,
  TENANT_CLIENT_TYPES.RETAIL_SHOP,
  TENANT_CLIENT_TYPES.DEPARTMENT_STORE,
];

/** Shops that should deduct stock when a bill is made, if stock is on hand. */
export const STOCK_TRACKED_POS_TYPES: readonly string[] = [
  TENANT_CLIENT_TYPES.SWEET_SHOP,
  TENANT_CLIENT_TYPES.GARMENT_SHOP,
  TENANT_CLIENT_TYPES.RETAIL_SHOP,
  TENANT_CLIENT_TYPES.DEPARTMENT_STORE,
];

export const SIGNUP_BUSINESS_TYPES = [
  TENANT_CLIENT_TYPES.DINE_RESTAURANT,
  TENANT_CLIENT_TYPES.SWEET_SHOP,
  TENANT_CLIENT_TYPES.GARMENT_SHOP,
  TENANT_CLIENT_TYPES.RETAIL_SHOP,
  TENANT_CLIENT_TYPES.DEPARTMENT_STORE,
  TENANT_CLIENT_TYPES.TRADING,
  TENANT_CLIENT_TYPES.SERVICES,
] as const;

export function isPosBusinessType(type: unknown): boolean {
  return typeof type === 'string' && POS_BUSINESS_TYPES.includes(type);
}

export function isStockTrackedPos(type: unknown): boolean {
  return typeof type === 'string' && STOCK_TRACKED_POS_TYPES.includes(type);
}

export type TenantClientSettings = Record<string, unknown> | null | undefined;

export function getBusinessType(settings: TenantClientSettings): string {
  const t = settings?.business_type;
  return typeof t === 'string' ? t : TENANT_CLIENT_TYPES.STANDARD;
}

export function hasCustomClientType(settings: TenantClientSettings): boolean {
  const t = getBusinessType(settings);
  return t !== TENANT_CLIENT_TYPES.STANDARD && t !== TENANT_CLIENT_TYPES.TRADING && t !== TENANT_CLIENT_TYPES.SERVICES;
}

export function isRestaurantWholesale(settings: TenantClientSettings): boolean {
  return getBusinessType(settings) === TENANT_CLIENT_TYPES.RESTAURANT_WHOLESALE;
}

export function isPosTenant(settings: TenantClientSettings): boolean {
  return isPosBusinessType(getBusinessType(settings));
}
