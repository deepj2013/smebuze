const WEIGHT_UNITS = new Set(['kg', 'kgs', 'kilogram', 'kilograms', 'g', 'gm', 'gram', 'grams', 'ltr', 'l', 'litre', 'liter', 'litres', 'ml']);

/** True when the cashier must enter weight or a rupee amount instead of adding 1. */
export function isLooseItem(item: { unit?: string | null; metadata?: Record<string, unknown> | null }): boolean {
  const mode = item.metadata?.sale_mode;
  if (mode === 'loose') return true;
  if (mode === 'fixed') return false;
  return WEIGHT_UNITS.has(String(item.unit || '').trim().toLowerCase());
}

/** Weight uses the item unit. Rupees converts ₹50 at ₹320/kg into kilograms. */
export function looseQuantity(input: {
  mode: 'weight' | 'rupee';
  value: number;
  weightAs: 'g' | 'kg';
  unit: string;
  rate: number;
}): number {
  if (!(input.value > 0)) return 0;
  if (input.mode === 'rupee') {
    if (!(input.rate > 0)) return 0;
    return Math.round((input.value / input.rate) * 10000) / 10000;
  }
  const unit = input.unit.toLowerCase();
  const kg = unit === 'kg' || unit === 'kgs' || unit === 'kilogram' || unit === 'kilograms';
  const gram = unit === 'g' || unit === 'gm' || unit === 'gram' || unit === 'grams';
  let qty = input.value;
  if (kg && input.weightAs === 'g') qty = input.value / 1000;
  if (gram && input.weightAs === 'kg') qty = input.value * 1000;
  return Math.round(qty * 10000) / 10000;
}

export function formatLooseQty(qty: number, unit: string): string {
  const u = (unit || 'pcs').toLowerCase();
  if ((u === 'kg' || u === 'kgs' || u === 'kilogram' || u === 'kilograms') && qty > 0 && qty < 1) {
    return `${Math.round(qty * 1000)} g`;
  }
  const shown = Math.round(qty * 1000) / 1000;
  return `${shown} ${unit || ''}`.trim();
}
