/** Indian pincode helpers for SMEBUZE Mall “nearby” filtering. */

export type MallCoverage = 'local' | 'city' | 'pincode_list' | 'pan_india';

export const MALL_COVERAGE_LABELS: Record<MallCoverage, string> = {
  local: 'Nearby (same area — first 3 digits)',
  city: 'Wider city / district (first 2 digits)',
  pincode_list: 'Only listed pincodes',
  pan_india: 'All India (no pin filter)',
};

export function normalizePincode(raw: unknown): string | null {
  const s = String(raw ?? '').replace(/\D/g, '');
  if (s.length !== 6) return null;
  return s;
}

export function parseExtraPincodes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => normalizePincode(x)).filter((x): x is string => Boolean(x));
}

export function mallCoverage(raw: unknown): MallCoverage {
  const s = String(raw ?? 'local').toLowerCase();
  if (s === 'city' || s === 'pincode_list' || s === 'pan_india') return s;
  return 'local';
}

/** Whether a seller configured for mall should appear to a buyer at buyerPin. */
export function sellerDeliversToPin(
  buyerPin: string,
  originPin: string | null,
  coverage: MallCoverage,
  extraPincodes: string[],
): boolean {
  const buyer = normalizePincode(buyerPin);
  if (!buyer) return false;
  if (coverage === 'pan_india') return true;

  const origin = originPin ? normalizePincode(originPin) : null;
  const extras = new Set(extraPincodes);

  if (coverage === 'pincode_list') {
    if (buyer === origin) return true;
    return extras.has(buyer);
  }

  if (!origin) {
    // No origin configured — hide from pin-filtered mall (avoid odd far-away listings).
    return false;
  }

  if (buyer === origin) return true;
  if (coverage === 'local') {
    return buyer.slice(0, 3) === origin.slice(0, 3);
  }
  if (coverage === 'city') {
    return buyer.slice(0, 2) === origin.slice(0, 2);
  }
  return false;
}

export function pincodeFromAddress(addr: unknown): string | null {
  if (!addr || typeof addr !== 'object') return null;
  const a = addr as Record<string, unknown>;
  return normalizePincode(a.pincode ?? a.pin ?? a.zip);
}
