export type PaidAddonId = 'whatsapp' | 'storefront' | 'recipe_production' | 'accounting_export' | 'ai';

export const PLAN_INCLUDED_FEATURES: Record<string, string[]> = {
  basic: ['GST billing', 'Stock', 'Purchase', 'Accounts', 'Reports'],
  advanced: ['Everything in Starter', 'Bulk upload', 'Public catalog'],
  enterprise: ['Everything in Growth', 'Audit log', 'Lead hub'],
};

export const PAID_ADDONS: Array<{
  id: PaidAddonId;
  label: string;
  hint: string;
  monthly_rupees: number;
}> = [
  { id: 'whatsapp', label: 'WhatsApp messages', hint: 'Campaigns and bill links', monthly_rupees: 499 },
  { id: 'storefront', label: 'Public shop / website', hint: 'Customer catalog URL', monthly_rupees: 799 },
  { id: 'recipe_production', label: 'Recipes / production', hint: 'Raw → finished goods', monthly_rupees: 399 },
  { id: 'accounting_export', label: 'Tally / Busy / Marg export', hint: 'Files for your CA', monthly_rupees: 299 },
  { id: 'ai', label: 'AI assistant', hint: 'Help on invoices and stock', monthly_rupees: 999 },
];

export function parsePaidAddons(value: unknown): PaidAddonId[] {
  const allowed = new Set(PAID_ADDONS.map((a) => a.id));
  const raw = Array.isArray(value) ? value : [];
  return raw.map((v) => String(v).trim() as PaidAddonId).filter((id) => allowed.has(id));
}
