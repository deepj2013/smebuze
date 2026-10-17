import type { CounterLang } from './counter-desk';

/** Languages staff can enter for a product label (English name stays the main field). */
export const ITEM_NAME_LANGS = [
  { id: 'hi', label: 'Hindi', native: 'हिंदी' },
  { id: 'mr', label: 'Marathi', native: 'मराठी' },
  { id: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { id: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { id: 'bn', label: 'Bengali', native: 'বাংলা' },
  { id: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { id: 'te', label: 'Telugu', native: 'తెలుగు' },
  { id: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { id: 'ml', label: 'Malayalam', native: 'മലയാളം' },
] as const;

export type ItemNameLangId = (typeof ITEM_NAME_LANGS)[number]['id'];

export type ItemNamesMap = Partial<Record<ItemNameLangId, string>>;

export type NamedItem = {
  name: string;
  brand?: string | null;
  variant_size?: string | null;
  variant_shape?: string | null;
  metadata?: { names?: ItemNamesMap; sale_mode?: string } | null;
};

export function readItemNames(meta: unknown): ItemNamesMap {
  if (!meta || typeof meta !== 'object') return {};
  const names = (meta as { names?: unknown }).names;
  if (!names || typeof names !== 'object') return {};
  const out: ItemNamesMap = {};
  for (const row of ITEM_NAME_LANGS) {
    const v = (names as Record<string, unknown>)[row.id];
    if (typeof v === 'string' && v.trim()) out[row.id] = v.trim();
  }
  return out;
}

/** Counter title for an item in the active language (falls back to English name). */
export function displayItemName(item: NamedItem, lang: CounterLang): string {
  if (lang !== 'en') {
    const names = readItemNames(item.metadata);
    const local = names[lang as ItemNameLangId];
    if (local) return local;
  }
  return item.name;
}

/** Line under the name: Catch · 50g · powder */
export function displayItemPackLine(item: NamedItem): string {
  return [item.brand, item.variant_size, item.variant_shape].filter(Boolean).join(' · ');
}

/** Search haystack includes English + all local names + brand + size. */
export function itemSearchExtras(item: NamedItem): string[] {
  const names = readItemNames(item.metadata);
  return [
    item.brand,
    item.variant_size,
    item.variant_shape,
    ...Object.values(names),
  ].filter((v): v is string => Boolean(v));
}
