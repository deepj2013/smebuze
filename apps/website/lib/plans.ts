/** Keep in sync with apps/api/src/common/plans.ts */
export const PLAN_PRICE_RUPEES: Record<string, number> = {
  basic: 999,
  advanced: 2499,
  enterprise: 4999,
};

export const INTERVAL_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

export const YEARLY_DISCOUNT_PERCENT = 15;

export function quotePlan(plan: string, interval: string): {
  list_rupees: number;
  amount_rupees: number;
  discount_percent: number;
  savings_rupees: number;
} | null {
  const monthly = PLAN_PRICE_RUPEES[plan];
  if (!monthly) return null;
  const months = INTERVAL_MONTHS[interval] || 1;
  const list_rupees = monthly * months;
  const discount_percent = interval === 'yearly' ? YEARLY_DISCOUNT_PERCENT : 0;
  const amount_rupees = discount_percent
    ? Math.round((list_rupees * (100 - discount_percent)) / 100)
    : list_rupees;
  return {
    list_rupees,
    amount_rupees,
    discount_percent,
    savings_rupees: list_rupees - amount_rupees,
  };
}
