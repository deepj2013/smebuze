import { PLAN_LABELS, subscriptionStatus } from './plans';

export type TenantSession = {
  slug: string;
  plan: string;
  plan_label: string;
  settings: Record<string, unknown>;
  subscription_ends_at: string | null;
  subscription_expired: boolean;
  days_left: number | null;
};

export function tenantSessionFrom(t: {
  slug: string;
  plan?: string | null;
  settings?: Record<string, unknown> | null;
  subscription_ends_at?: Date | string | null;
}): TenantSession {
  const status = subscriptionStatus(
    t.subscription_ends_at ? new Date(t.subscription_ends_at) : null,
  );
  const plan = t.plan || 'basic';
  return {
    slug: t.slug,
    plan,
    plan_label: PLAN_LABELS[plan] || plan,
    settings: t.settings ?? {},
    subscription_ends_at: status.ends_at,
    subscription_expired: status.expired,
    days_left: status.days_left,
  };
}
