import {
  INTERVAL_MONTHS,
  PLAN_LABELS,
  PLAN_LIST_RUPEES,
  PLAN_PRICE_RUPEES,
  YEARLY_DISCOUNT_PERCENT,
  type PlanQuote,
} from './plans';

export const INVOICE_LITE_PLAN_ID = 'invoice_lite';

/** Fixed yearly totals (not monthly × 12 with discount). */
export const DEFAULT_YEARLY_TOTAL_RUPEES: Record<string, number> = {
  [INVOICE_LITE_PLAN_ID]: 1800,
};

export type PlanCatalogOverrides = {
  monthly_rupees?: Record<string, number>;
  list_monthly_rupees?: Record<string, number>;
  yearly_total_rupees?: Record<string, number>;
};

export type ResolvedPlanCatalog = {
  monthly_rupees: Record<string, number>;
  list_monthly_rupees: Record<string, number>;
  yearly_total_rupees: Record<string, number>;
  labels: Record<string, string>;
};

const BASE_MONTHLY: Record<string, number> = {
  ...PLAN_PRICE_RUPEES,
  [INVOICE_LITE_PLAN_ID]: 200,
};

const BASE_LIST: Record<string, number> = {
  ...PLAN_LIST_RUPEES,
  [INVOICE_LITE_PLAN_ID]: 200,
};

const BASE_LABELS: Record<string, string> = {
  ...PLAN_LABELS,
  [INVOICE_LITE_PLAN_ID]: 'Invoice Lite',
};

export function tenantBusinessType(settings: Record<string, unknown> | null | undefined): string {
  return typeof settings?.business_type === 'string' ? settings.business_type.trim() : '';
}

export function isInvoicingLiteWorkspace(settings: Record<string, unknown> | null | undefined): boolean {
  return tenantBusinessType(settings) === 'invoicing_lite';
}

export function defaultPlanForWorkspace(settings: Record<string, unknown> | null | undefined): string {
  return isInvoicingLiteWorkspace(settings) ? INVOICE_LITE_PLAN_ID : 'basic';
}

export function minBillingIntervalForWorkspace(settings: Record<string, unknown> | null | undefined): string {
  return isInvoicingLiteWorkspace(settings) ? 'monthly' : 'quarterly';
}

export function planIdsForWorkspace(settings: Record<string, unknown> | null | undefined): string[] {
  if (isInvoicingLiteWorkspace(settings)) return [INVOICE_LITE_PLAN_ID];
  return Object.keys(PLAN_PRICE_RUPEES);
}

export function resolvePlanCatalog(platformSettings: Record<string, unknown> | null | undefined): ResolvedPlanCatalog {
  const raw = (platformSettings?.billing_plan_catalog ?? platformSettings?.plan_catalog ?? {}) as PlanCatalogOverrides;
  const monthly = { ...BASE_MONTHLY, ...(raw.monthly_rupees ?? {}) };
  const list = { ...BASE_LIST, ...(raw.list_monthly_rupees ?? {}) };
  const yearly = { ...DEFAULT_YEARLY_TOTAL_RUPEES, ...(raw.yearly_total_rupees ?? {}) };
  return {
    monthly_rupees: monthly,
    list_monthly_rupees: list,
    yearly_total_rupees: yearly,
    labels: { ...BASE_LABELS },
  };
}

export function payablePlanInCatalog(catalog: ResolvedPlanCatalog, plan: string): boolean {
  return typeof catalog.monthly_rupees[plan] === 'number' && catalog.monthly_rupees[plan] > 0;
}

export function quotePlanWithCatalog(
  catalog: ResolvedPlanCatalog,
  plan: string,
  interval: string,
  addonMonthly = 0,
): PlanQuote | null {
  const saleMonthly = catalog.monthly_rupees[plan];
  if (!saleMonthly) return null;
  const listMonthly = catalog.list_monthly_rupees[plan] ?? saleMonthly;
  const months = INTERVAL_MONTHS[interval] || 1;
  const extra = Math.max(0, Math.round(addonMonthly)) * months;
  const fixedYear = catalog.yearly_total_rupees[plan];
  if (interval === 'yearly' && fixedYear != null && fixedYear > 0) {
    const amount_rupees = fixedYear + extra;
    const list_rupees = listMonthly * 12 + extra;
    return {
      list_rupees,
      amount_rupees,
      amount_paise: Math.round(amount_rupees * 100),
      discount_percent: list_rupees > 0 ? Math.round(((list_rupees - amount_rupees) / list_rupees) * 100) : 0,
      savings_rupees: list_rupees - amount_rupees,
    };
  }
  const list_rupees = listMonthly * months + extra;
  let amount_rupees = saleMonthly * months + extra;
  if (interval === 'yearly') {
    const planOnly = saleMonthly * months;
    const planYear = Math.round((planOnly * (100 - YEARLY_DISCOUNT_PERCENT)) / 100);
    amount_rupees = planYear + extra;
  }
  return {
    list_rupees,
    amount_rupees,
    amount_paise: Math.round(amount_rupees * 100),
    discount_percent: list_rupees > 0 ? Math.round(((list_rupees - amount_rupees) / list_rupees) * 100) : 0,
    savings_rupees: list_rupees - amount_rupees,
  };
}

export function catalogFromEnv(): PlanCatalogOverrides {
  const out: PlanCatalogOverrides = { monthly_rupees: {}, yearly_total_rupees: {} };
  const m = Number(process.env.PLAN_INVOICE_LITE_MONTHLY_RUPEES);
  const y = Number(process.env.PLAN_INVOICE_LITE_YEARLY_RUPEES);
  if (Number.isFinite(m) && m > 0) out.monthly_rupees![INVOICE_LITE_PLAN_ID] = m;
  if (Number.isFinite(y) && y > 0) out.yearly_total_rupees![INVOICE_LITE_PLAN_ID] = y;
  return out;
}

export function applyEnvOverrides(catalog: ResolvedPlanCatalog): ResolvedPlanCatalog {
  const env = catalogFromEnv();
  return {
    ...catalog,
    monthly_rupees: { ...catalog.monthly_rupees, ...(env.monthly_rupees ?? {}) },
    yearly_total_rupees: { ...catalog.yearly_total_rupees, ...(env.yearly_total_rupees ?? {}) },
  };
}

/** PayU test checkout amount when PAYU_ENV=test and BILLING_PAYU_SMOKE_RUPEES is set (e.g. 10). */
export function payuSmokeAmountRupees(): number | null {
  if (String(process.env.PAYU_ENV || 'test').toLowerCase() !== 'test') return null;
  const n = Number(process.env.BILLING_PAYU_SMOKE_RUPEES);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.round(n * 100) / 100;
}
