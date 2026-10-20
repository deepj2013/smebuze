/** Day-one sidebar skin from business_type — keep in sync with client packs. */

export type ShopNavSkin =
  | 'ice_crest'
  | 'star_ice'
  | 'floor'
  | 'department'
  | 'pos_food'
  | 'pos_pharmacy'
  | 'pos_retail'
  | 'service_counter'
  | 'enquiry_desk'
  | 'desk';

const POS_RETAIL = new Set([
  'garment_shop',
  'retail_shop',
  'hardware_shop',
  'electronics_shop',
  'jewellery_shop',
  'auto_parts',
  'florist',
  'stationery_shop',
]);

export function shopNavSkin(type: unknown, slug?: string | null): ShopNavSkin {
  if (slug === 'star-ice') return 'star_ice';
  if (slug === 'ice-crest' || type === 'ice_crest') return 'ice_crest';
  if (type === 'dine_restaurant' || type === 'cafe') return 'floor';
  if (type === 'department_store') return 'department';
  if (type === 'sweet_shop' || type === 'bakery') return 'pos_food';
  if (type === 'pharmacy') return 'pos_pharmacy';
  if (type === 'salon' || type === 'clinic') return 'service_counter';
  if (type === 'hotel' || type === 'coaching') return 'enquiry_desk';
  if (typeof type === 'string' && POS_RETAIL.has(type)) return 'pos_retail';
  return 'desk';
}
