export const LEAD_SOURCES = [
  { id: 'website', label: 'Website' },
  { id: 'shop', label: 'Buyer portal / shop' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'instamart', label: 'Instamart' },
  { id: 'email', label: 'Email' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'google', label: 'Google' },
  { id: 'referral', label: 'Referral' },
  { id: 'other', label: 'Other' },
] as const;

export type LeadSourceId = (typeof LEAD_SOURCES)[number]['id'];

export function normalizeLeadSource(raw: unknown): string {
  const value = String(raw ?? '').trim().toLowerCase();
  if (LEAD_SOURCES.some((s) => s.id === value)) return value;
  return 'other';
}
