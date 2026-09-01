export const PLAN_LABELS: Record<string, string> = {
  basic: 'Starter',
  advanced: 'Growth',
  enterprise: 'Business',
  ai_pro: 'Custom',
};

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

/** Annual prepay discount (10–15% range). Applied only to yearly. */
export const YEARLY_DISCOUNT_PERCENT = 15;

export type PlanQuote = {
  list_rupees: number;
  amount_rupees: number;
  amount_paise: number;
  discount_percent: number;
  savings_rupees: number;
};

export function payablePlan(plan: string): boolean {
  return Boolean(PLAN_PRICE_RUPEES[plan]);
}

export function quotePlan(plan: string, interval: string): PlanQuote | null {
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
    amount_paise: amount_rupees * 100,
    discount_percent,
    savings_rupees: list_rupees - amount_rupees,
  };
}

export function planAmountRupees(plan: string, interval: string): number | null {
  return quotePlan(plan, interval)?.amount_rupees ?? null;
}

export function planAmountPaise(plan: string, interval: string): number | null {
  return quotePlan(plan, interval)?.amount_paise ?? null;
}

export function extendSubscriptionFrom(now: Date, currentEnd: Date | null, interval: string): Date {
  const months = INTERVAL_MONTHS[interval] || 1;
  const base = currentEnd && currentEnd.getTime() > now.getTime() ? new Date(currentEnd) : new Date(now);
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function subscriptionStatus(endsAt: Date | null | undefined, now = new Date()) {
  if (!endsAt) {
    return { expired: false, ends_at: null as string | null, days_left: null as number | null };
  }
  const end = new Date(endsAt);
  const ms = end.getTime() - now.getTime();
  const days_left = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return {
    expired: ms < 0,
    ends_at: end.toISOString(),
    days_left,
  };
}
