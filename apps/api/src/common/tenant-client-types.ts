/**
 * Tenant business types. Signup asks how the shop will use SMEBUZE,
 * then the workspace is shaped around that (POS counter vs full ERP).
 */
export const TENANT_CLIENT_TYPES = {
  STANDARD: 'standard',
  TRADING: 'trading',
  SERVICES: 'services',
  DINE_RESTAURANT: 'dine_restaurant',
  CAFE: 'cafe',
  SWEET_SHOP: 'sweet_shop',
  BAKERY: 'bakery',
  GARMENT_SHOP: 'garment_shop',
  RETAIL_SHOP: 'retail_shop',
  DEPARTMENT_STORE: 'department_store',
  PHARMACY: 'pharmacy',
  HARDWARE_SHOP: 'hardware_shop',
  ELECTRONICS_SHOP: 'electronics_shop',
  JEWELLERY_SHOP: 'jewellery_shop',
  AUTO_PARTS: 'auto_parts',
  FLORIST: 'florist',
  STATIONERY_SHOP: 'stationery_shop',
  SALON: 'salon',
  CLINIC: 'clinic',
  COACHING: 'coaching',
  HOTEL: 'hotel',
  MANUFACTURING: 'manufacturing',
  RESTAURANT_WHOLESALE: 'restaurant_wholesale',
  ICE_CREST: 'ice_crest',
} as const;

export type TenantClientType = (typeof TENANT_CLIENT_TYPES)[keyof typeof TENANT_CLIENT_TYPES];

/** Counter / POS home after login. */
export const POS_BUSINESS_TYPES: readonly string[] = [
  TENANT_CLIENT_TYPES.DINE_RESTAURANT,
  TENANT_CLIENT_TYPES.CAFE,
  TENANT_CLIENT_TYPES.SWEET_SHOP,
  TENANT_CLIENT_TYPES.BAKERY,
  TENANT_CLIENT_TYPES.GARMENT_SHOP,
  TENANT_CLIENT_TYPES.RETAIL_SHOP,
  TENANT_CLIENT_TYPES.DEPARTMENT_STORE,
  TENANT_CLIENT_TYPES.PHARMACY,
  TENANT_CLIENT_TYPES.HARDWARE_SHOP,
  TENANT_CLIENT_TYPES.ELECTRONICS_SHOP,
  TENANT_CLIENT_TYPES.JEWELLERY_SHOP,
  TENANT_CLIENT_TYPES.AUTO_PARTS,
  TENANT_CLIENT_TYPES.FLORIST,
  TENANT_CLIENT_TYPES.STATIONERY_SHOP,
  TENANT_CLIENT_TYPES.SALON,
  TENANT_CLIENT_TYPES.CLINIC,
];

/** Shops that should deduct stock when a bill is made, if stock is on hand. */
export const STOCK_TRACKED_POS_TYPES: readonly string[] = [
  TENANT_CLIENT_TYPES.SWEET_SHOP,
  TENANT_CLIENT_TYPES.BAKERY,
  TENANT_CLIENT_TYPES.GARMENT_SHOP,
  TENANT_CLIENT_TYPES.RETAIL_SHOP,
  TENANT_CLIENT_TYPES.DEPARTMENT_STORE,
  TENANT_CLIENT_TYPES.PHARMACY,
  TENANT_CLIENT_TYPES.HARDWARE_SHOP,
  TENANT_CLIENT_TYPES.ELECTRONICS_SHOP,
  TENANT_CLIENT_TYPES.JEWELLERY_SHOP,
  TENANT_CLIENT_TYPES.AUTO_PARTS,
  TENANT_CLIENT_TYPES.FLORIST,
  TENANT_CLIENT_TYPES.STATIONERY_SHOP,
];

export const SIGNUP_BUSINESS_TYPES = [
  TENANT_CLIENT_TYPES.DINE_RESTAURANT,
  TENANT_CLIENT_TYPES.CAFE,
  TENANT_CLIENT_TYPES.SWEET_SHOP,
  TENANT_CLIENT_TYPES.BAKERY,
  TENANT_CLIENT_TYPES.GARMENT_SHOP,
  TENANT_CLIENT_TYPES.RETAIL_SHOP,
  TENANT_CLIENT_TYPES.DEPARTMENT_STORE,
  TENANT_CLIENT_TYPES.PHARMACY,
  TENANT_CLIENT_TYPES.HARDWARE_SHOP,
  TENANT_CLIENT_TYPES.ELECTRONICS_SHOP,
  TENANT_CLIENT_TYPES.JEWELLERY_SHOP,
  TENANT_CLIENT_TYPES.AUTO_PARTS,
  TENANT_CLIENT_TYPES.FLORIST,
  TENANT_CLIENT_TYPES.STATIONERY_SHOP,
  TENANT_CLIENT_TYPES.SALON,
  TENANT_CLIENT_TYPES.CLINIC,
  TENANT_CLIENT_TYPES.COACHING,
  TENANT_CLIENT_TYPES.HOTEL,
  TENANT_CLIENT_TYPES.MANUFACTURING,
  TENANT_CLIENT_TYPES.TRADING,
  TENANT_CLIENT_TYPES.SERVICES,
] as const;

export const ALL_BUSINESS_TYPE_IDS: readonly string[] = Object.values(TENANT_CLIENT_TYPES);

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

/** Table + kitchen ticket flow (waiter / KDS / cashier). */
export const FLOOR_BUSINESS_TYPES: readonly string[] = [
  TENANT_CLIENT_TYPES.DINE_RESTAURANT,
  TENANT_CLIENT_TYPES.CAFE,
];

export function isFloorBusinessType(type: unknown): boolean {
  return typeof type === 'string' && FLOOR_BUSINESS_TYPES.includes(type);
}
