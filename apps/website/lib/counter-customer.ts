import { apiGet } from './api';
import { phoneKey } from './counter-desk';

export type CounterParty = {
  id: string;
  name: string;
  phone?: string | null;
  loyalty_card?: string | null;
  loyalty_points?: string | number | null;
  tags?: string[];
  segment?: string | null;
};

export function cardKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function loyaltyPts(value: string | number | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function matchLocalCustomers(list: CounterParty[], raw: string): CounterParty[] {
  const digits = phoneKey(raw);
  const card = cardKey(raw);
  const q = raw.trim().toLowerCase();
  if (!q) return [];
  return list.filter((c) => {
    if (digits && phoneKey(c.phone || '') === digits) return true;
    if (card.length >= 4 && cardKey(c.loyalty_card || '') === card) return true;
    if (q.length >= 2 && c.name.toLowerCase().includes(q)) return true;
    if (c.phone && c.phone.replace(/\D/g, '').includes(raw.replace(/\D/g, '')) && raw.replace(/\D/g, '').length >= 4) return true;
    return false;
  }).slice(0, 8);
}

/** Find by mobile or RFID/barcode. Server first, then local list. */
export async function lookupCounterCustomer(
  raw: string,
  local: CounterParty[],
): Promise<CounterParty | null> {
  const q = raw.trim();
  if (q.length < 4) return matchLocalCustomers(local, q)[0] ?? null;
  const { data } = await apiGet<CounterParty | null>(`crm/customers/lookup?q=${encodeURIComponent(q)}`);
  if (data?.id) return data;
  return matchLocalCustomers(local, q)[0] ?? null;
}
