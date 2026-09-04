/** Keep in sync with apps/api/src/common/plans.ts */

export const PLAN_LIST_RUPEES: Record<string, number> = {
  basic: 1999,
  advanced: 3999,
  enterprise: 5999,
};

export const PLAN_PRICE_RUPEES: Record<string, number> = {
  basic: 1599,
  advanced: 2599,
  enterprise: 4599,
};

export const INTERVAL_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

export const YEARLY_DISCOUNT_PERCENT = 15;

export function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export function monthlyOffer(plan: string): { list: number; sale: number; savings: number; discount_percent: number } | null {
  const list = PLAN_LIST_RUPEES[plan];
  const sale = PLAN_PRICE_RUPEES[plan];
  if (!list || !sale) return null;
  return {
    list,
    sale,
    savings: list - sale,
    discount_percent: Math.round(((list - sale) / list) * 100),
  };
}

export function quotePlan(plan: string, interval: string): {
  list_rupees: number;
  amount_rupees: number;
  discount_percent: number;
  savings_rupees: number;
} | null {
  const saleMonthly = PLAN_PRICE_RUPEES[plan];
  if (!saleMonthly) return null;
  const listMonthly = PLAN_LIST_RUPEES[plan] ?? saleMonthly;
  const months = INTERVAL_MONTHS[interval] || 1;
  const list_rupees = listMonthly * months;
  let amount_rupees = saleMonthly * months;
  if (interval === 'yearly') {
    amount_rupees = Math.round((amount_rupees * (100 - YEARLY_DISCOUNT_PERCENT)) / 100);
  }
  return {
    list_rupees,
    amount_rupees,
    discount_percent: list_rupees > 0 ? Math.round(((list_rupees - amount_rupees) / list_rupees) * 100) : 0,
    savings_rupees: list_rupees - amount_rupees,
  };
}
