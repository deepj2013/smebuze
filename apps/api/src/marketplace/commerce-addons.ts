/** SaaS add-ons charged on top of the main SMEBUZE plan (platform Razorpay). */

export type CommerceAddonId = 'online_shop' | 'mall_listing';

export const COMMERCE_ADDONS: Record<
  CommerceAddonId,
  { id: CommerceAddonId; label: string; description: string; envPrice: string; defaultRupees: number }
> = {
  online_shop: {
    id: 'online_shop',
    label: 'Online shop',
    description: 'Your /shop storefront + portal orders (own delivery or SMEBUZE delivery).',
    envPrice: 'ADDON_ONLINE_SHOP_RUPEES',
    defaultRupees: 299,
  },
  mall_listing: {
    id: 'mall_listing',
    label: 'SMEBUZE Mall listing',
    description: 'Appear on /mall. Buyers pay SMEBUZE; we settle to you minus commission.',
    envPrice: 'ADDON_MALL_LISTING_RUPEES',
    defaultRupees: 199,
  },
};

export function addonPriceRupees(id: CommerceAddonId): number {
  const def = COMMERCE_ADDONS[id];
  const raw = Number(process.env[def.envPrice] || def.defaultRupees);
  if (!Number.isFinite(raw) || raw < 0) return def.defaultRupees;
  return Math.round(raw);
}

export function addonPricePaise(id: CommerceAddonId): number {
  return addonPriceRupees(id) * 100;
}

export function listAddonCatalog() {
  return (Object.keys(COMMERCE_ADDONS) as CommerceAddonId[]).map((id) => ({
    id,
    label: COMMERCE_ADDONS[id].label,
    description: COMMERCE_ADDONS[id].description,
    monthly_rupees: addonPriceRupees(id),
  }));
}

/** Extend paid-until by 30 days from max(now, current). */
export function extendPaidUntil(current: Date | null | undefined, months = 1): Date {
  const now = new Date();
  const base = current && current.getTime() > now.getTime() ? new Date(current) : now;
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function isPaidActive(until: Date | string | null | undefined): boolean {
  if (until == null) return true; // null = not gated / admin gifted
  return new Date(until).getTime() > Date.now();
}
