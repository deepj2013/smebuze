/** Standard vs advanced packages. Paid add-ons raise the SMEBUZE subscription. */

export const PLAN_INCLUDED_FEATURES: Record<string, string[]> = {
  invoice_lite: ['crm', 'sales', 'inventory', 'reports'],
  basic: ['crm', 'sales', 'purchase', 'inventory', 'accounting', 'reports'],
  advanced: ['crm', 'sales', 'purchase', 'inventory', 'accounting', 'reports', 'bulk_upload', 'catalog'],
  enterprise: [
    'crm',
    'sales',
    'purchase',
    'inventory',
    'accounting',
    'reports',
    'bulk_upload',
    'catalog',
    'audit',
    'lead_hub',
  ],
  ai_pro: [
    'crm',
    'sales',
    'purchase',
    'inventory',
    'accounting',
    'reports',
    'bulk_upload',
    'catalog',
    'audit',
    'lead_hub',
    'ai',
    'whatsapp',
  ],
};

export type PaidAddonId = 'whatsapp' | 'storefront' | 'recipe_production' | 'accounting_export' | 'ai';

export const PAID_ADDONS: Record<
  PaidAddonId,
  { id: PaidAddonId; label: string; hint: string; monthly_rupees: number }
> = {
  whatsapp: {
    id: 'whatsapp',
    label: 'WhatsApp messages',
    hint: 'Campaigns and bill links on WhatsApp',
    monthly_rupees: 499,
  },
  storefront: {
    id: 'storefront',
    label: 'Public shop / website',
    hint: 'Customer catalog on your SMEBUZE shop URL',
    monthly_rupees: 799,
  },
  recipe_production: {
    id: 'recipe_production',
    label: 'Recipes / production costing',
    hint: 'Raw materials → finished goods',
    monthly_rupees: 399,
  },
  accounting_export: {
    id: 'accounting_export',
    label: 'Tally / Busy / Marg export',
    hint: 'Day-book files for your CA',
    monthly_rupees: 299,
  },
  ai: {
    id: 'ai',
    label: 'AI assistant',
    hint: 'In-app help on invoices and stock',
    monthly_rupees: 999,
  },
};

export const PAID_ADDON_IDS = Object.keys(PAID_ADDONS) as PaidAddonId[];

export function parsePaidAddons(value: unknown): PaidAddonId[] {
  const raw = Array.isArray(value) ? value : [];
  const set = new Set<PaidAddonId>();
  for (const item of raw) {
    const id = String(item).trim() as PaidAddonId;
    if (PAID_ADDONS[id]) set.add(id);
  }
  return PAID_ADDON_IDS.filter((id) => set.has(id));
}

export function addonMonthlyRupees(addons: PaidAddonId[]): number {
  return addons.reduce((sum, id) => sum + PAID_ADDONS[id].monthly_rupees, 0);
}

export function featuresForPlan(plan: string, addons: PaidAddonId[] = []): string[] {
  const base = PLAN_INCLUDED_FEATURES[plan] ?? PLAN_INCLUDED_FEATURES.basic;
  return Array.from(new Set([...base, ...addons]));
}

export function paidAddonCatalog() {
  return PAID_ADDON_IDS.map((id) => PAID_ADDONS[id]);
}
