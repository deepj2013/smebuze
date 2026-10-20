'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { businessTypeMeta, isInvoicingLiteBusinessType, isPosBusinessType } from '@/lib/business-types';
import { themeForBusinessType } from '@/lib/variant-theme';

interface DashboardData {
  summary: {
    receivables: { totalInvoiced: number; totalReceived: number; totalPending: number; pendingCount: number; invoiceCount: number };
    payables: { totalPayable: number; payableCount: number };
    lowStockCount?: number;
    dueTodayReceivables?: number;
    dueTodayReceivablesAmount?: number;
    dueTodayPayables?: number;
    dueTodayPayablesAmount?: number;
  };
  pendingReceivables: { id: string; number: string; buyer: string; taxable_value?: number; cgst?: number; sgst?: number; igst?: number; total: number; paid: number; due: number; due_date?: string }[];
  pendingPayables: { id: string; number: string; vendor: string; total: number; paid: number; due: number }[];
}

interface OnboardingStep {
  id: string;
  label: string;
  done: boolean;
  href: string;
}

interface OnboardingChecklist {
  steps: OnboardingStep[];
  onboardingCompletedAt: string | null;
  showOnboarding: boolean;
  tenantSlug?: string;
}

type CashPeriod = {
  sales: number;
  cost: number;
  profit: number;
  bills: number;
  cash: number;
  upi: number;
  card: number;
  credit: number;
};

type CashCounterReport = {
  date: string;
  day: CashPeriod;
  week: CashPeriod;
  month: CashPeriod;
};

type DeskSummary = {
  site: { shop_url: string; site_url: string; slug: string; is_published: boolean; shop_enabled: boolean };
  listed_items: number;
  open_orders: number;
  delivered_orders: number;
  leads: number;
  recent_orders: Array<{
    id: string;
    number: string;
    buyer_status: string;
    total: string | number;
    customer?: { name?: string | null } | null;
  }>;
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingChecklist | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [shopType, setShopType] = useState<string>('trading');
  const [cashReport, setCashReport] = useState<CashCounterReport | null>(null);
  const [renewals, setRenewals] = useState<Array<{ registration_no?: string; doc_type: string; days_left: number; urgency: string; expires_on: string }>>([]);
  const [desk, setDesk] = useState<DeskSummary | null>(null);

  useEffect(() => {
    (async () => {
      const { data: res, error: err } = await apiGet<DashboardData>('reports/dashboard');
      if (err) setError(err);
      else if (res) setData(res);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('smebuzz_token') : null;
    if (!token) return;
    fetch(`${API_URL}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const t = d?.tenant?.settings?.business_type;
        if (typeof t === 'string' && t) {
          setShopType(t);
          if (isInvoicingLiteBusinessType(t)) router.replace('/invoice-lite');
        }
        if (t === 'transport') {
          void apiGet<typeof renewals>('transport/renewals?within_days=45').then((r) => {
            if (Array.isArray(r.data)) setRenewals(r.data.slice(0, 5));
          });
        }
        if (typeof t === 'string' && isPosBusinessType(t)) {
          void apiGet<CashCounterReport>('reports/cash-counter').then((r) => {
            if (r.data) setCashReport(r.data);
          });
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: ob } = await apiGet<OnboardingChecklist>('onboarding/checklist');
      if (ob) setOnboarding(ob);
    })();
    void apiGet<DeskSummary>('growth/desk').then((r) => {
      if (r.data) setDesk(r.data);
    });
  }, []);

  const handleCompleteOnboarding = async () => {
    const { error: err } = await apiPost('onboarding/complete', {});
    if (!err) {
      setOnboarding((prev) => prev ? { ...prev, showOnboarding: false, onboardingCompletedAt: new Date().toISOString() } : null);
      setOnboardingDismissed(true);
    }
  };

  const showOnboardingCard = onboarding?.showOnboarding && !onboardingDismissed && onboarding.steps.length > 0;
  const isPosTenant = isPosBusinessType(shopType);
  const meta = businessTypeMeta(shopType);
  const theme = themeForBusinessType(shopType);

  return (
    <div>
      <section
        className="mb-6 rounded-2xl p-5 sm:p-6 text-white overflow-hidden relative"
        style={{ background: `linear-gradient(135deg, var(--tenant-hero-from, ${theme.heroFrom}), var(--tenant-hero-to, ${theme.heroTo}))` }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-white/80">{theme.label}</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold">{meta.title}</h1>
        <p className="mt-1 text-sm text-white/90 max-w-xl">{theme.tagline}</p>
        {isPosTenant && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/pos"
              className="inline-flex items-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold min-h-[44px]"
              style={{ color: theme.accent }}
            >
              Open billing counter
            </Link>
            <Link
              href="/pos/cash-counter"
              className="inline-flex items-center rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white min-h-[44px] hover:bg-white/25"
            >
              Cash counter / day close
            </Link>
          </div>
        )}
        {shopType === 'transport' && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/transport/trips" className="inline-flex rounded-xl bg-white/15 px-3 py-2 text-sm font-medium hover:bg-white/25">Add trip</Link>
            <Link href="/transport/vehicles" className="inline-flex rounded-xl bg-white/15 px-3 py-2 text-sm font-medium hover:bg-white/25">Vehicles</Link>
            <Link href="/transport/renewals" className="inline-flex rounded-xl bg-white/15 px-3 py-2 text-sm font-medium hover:bg-white/25">Renewals</Link>
            <Link href="/hr/payroll" className="inline-flex rounded-xl bg-white/15 px-3 py-2 text-sm font-medium hover:bg-white/25">Driver payroll</Link>
          </div>
        )}
      </section>

      {shopType === 'transport' && renewals.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-amber-950">Document renewals due</h2>
            <Link href="/transport/renewals" className="text-sm text-amber-900 underline">View all</Link>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-amber-950">
            {renewals.map((r, i) => (
              <li key={i}>
                <strong>{r.registration_no}</strong> · {r.doc_type} · {r.expires_on}
                {' '}({r.days_left < 0 ? `expired ${Math.abs(r.days_left)}d` : `${r.days_left}d left`})
              </li>
            ))}
          </ul>
        </div>
      )}

      {desk && (
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Your website & selling page</h2>
              <p className="mt-1 text-sm text-slate-600">
                Buyers order on your shop; you update delivery here. Their name and phone land in Customers.
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <a className="text-brand-600 hover:underline" href={desk.site.site_url} target="_blank" rel="noreferrer">
                  Website
                </a>
                <a className="text-brand-600 hover:underline" href={desk.site.shop_url} target="_blank" rel="noreferrer">
                  Selling page
                </a>
                <Link href="/website" className="text-slate-700 hover:underline">Edit website</Link>
                <Link href="/catalog" className="text-slate-700 hover:underline">List products</Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              <Link href="/catalog" className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-lg font-semibold tabular-nums">{desk.listed_items}</p>
                <p className="text-xs text-slate-500">Listed</p>
              </Link>
              <Link href="/sales/portal-orders" className="rounded-lg bg-amber-50 px-3 py-2">
                <p className="text-lg font-semibold tabular-nums">{desk.open_orders}</p>
                <p className="text-xs text-slate-500">To deliver</p>
              </Link>
              <Link href="/sales/portal-orders" className="rounded-lg bg-emerald-50 px-3 py-2">
                <p className="text-lg font-semibold tabular-nums">{desk.delivered_orders}</p>
                <p className="text-xs text-slate-500">Delivered</p>
              </Link>
              <Link href="/crm/lead-hub" className="rounded-lg bg-sky-50 px-3 py-2">
                <p className="text-lg font-semibold tabular-nums">{desk.leads}</p>
                <p className="text-xs text-slate-500">Leads</p>
              </Link>
            </div>
          </div>
          {desk.recent_orders.length > 0 && (
            <ul className="mt-4 divide-y divide-slate-100 text-sm">
              {desk.recent_orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href="/sales/portal-orders" className="font-medium text-slate-800 hover:underline">
                    {o.number} · {o.customer?.name ?? 'Buyer'}
                  </Link>
                  <span className="capitalize text-slate-600">
                    {o.buyer_status?.replace(/_/g, ' ')} · ₹{Number(o.total).toFixed(0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {showOnboardingCard && (
        <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50/50 p-4">
          <h2 className="font-semibold text-slate-900 mb-2">Welcome to SMEBUZE</h2>
          <p className="text-sm text-slate-600 mb-4">Set up your workspace in a few steps:</p>
          <ul className="space-y-2 mb-4">
            {onboarding!.steps.map((step) => (
              <li key={step.id} className="flex items-center gap-2 text-sm">
                {step.done ? (
                  <span className="text-green-600" aria-hidden>✓</span>
                ) : (
                  <span className="w-4 h-4 rounded-full border-2 border-slate-300" aria-hidden />
                )}
                {step.done ? (
                  <span className="text-slate-500 line-through">{step.label}</span>
                ) : (
                  <Link href={step.href} className="text-brand-600 hover:underline">{step.label}</Link>
                )}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleCompleteOnboarding}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            I’ll do this later
          </button>
        </div>
      )}

      {loading && <p className="text-slate-600">Loading dashboard…</p>}
      {error && !loading && (
        <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>
      )}
      {!loading && data && (
        <>
          {isPosTenant && cashReport && (
            <section className="mb-6 grid gap-3 sm:grid-cols-3">
              {(
                [
                  ['Today', cashReport.day],
                  ['This week', cashReport.week],
                  ['This month', cashReport.month],
                ] as const
              ).map(([label, p]) => (
                <Link
                  key={label}
                  href="/pos/cash-counter"
                  className="rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-300"
                >
                  <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">₹{p.sales.toFixed(0)}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Cash ₹{p.cash.toFixed(0)} · UPI ₹{p.upi.toFixed(0)} · Credit ₹{p.credit.toFixed(0)}
                  </p>
                  <p className={`mt-2 text-sm font-semibold tabular-nums ${p.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    Profit ₹{p.profit.toFixed(0)}
                  </p>
                </Link>
              ))}
            </section>
          )}
          <section className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6 sm:mb-8">
            <div className="rounded-xl bg-white border border-slate-200 border-l-4 p-4 min-h-[88px]" style={{ borderLeftColor: 'var(--tenant-primary)' }}>
              <p className="text-xs font-medium text-slate-500 uppercase">Total invoiced</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">₹{data.summary.receivables.totalInvoiced.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 border-l-4 p-4" style={{ borderLeftColor: 'var(--tenant-accent)' }}>
              <p className="text-xs font-medium text-slate-500 uppercase">Receivables pending</p>
              <p className="mt-2 text-2xl font-semibold text-amber-700">₹{data.summary.receivables.totalPending.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase">Payables pending</p>
              <p className="mt-2 text-2xl font-semibold text-rose-700">₹{data.summary.payables.totalPayable.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase">Low stock</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{data.summary.lowStockCount ?? 0} item(s)</p>
              <Link href="/inventory/stock" className="mt-2 inline-block text-sm text-brand-600 hover:underline">View stock →</Link>
            </div>
            {(data.summary.dueTodayReceivables ?? 0) > 0 && (
              <div className="rounded-xl bg-white border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500 uppercase">Due today (receivables)</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">₹{data.summary.dueTodayReceivablesAmount?.toFixed(2) ?? '0.00'}</p>
                <Link href="/sales/invoices/pending" className="mt-2 inline-block text-sm text-brand-600 hover:underline">Pending receivables →</Link>
              </div>
            )}
            {(data.summary.dueTodayPayables ?? 0) > 0 && (
              <div className="rounded-xl bg-white border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500 uppercase">Due today (payables)</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">₹{data.summary.dueTodayPayablesAmount?.toFixed(2) ?? '0.00'}</p>
                <Link href="/purchase/payables" className="mt-2 inline-block text-sm text-brand-600 hover:underline">Payables →</Link>
              </div>
            )}
          </section>
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900 mb-2 text-sm">Top pending invoices</h2>
              {data.pendingReceivables.length === 0 ? (
                <p className="text-sm text-slate-500">No pending receivables.</p>
              ) : (
                <div className="responsive-table-wrap overflow-x-auto">
                  <table className="w-full text-xs table-min-width">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-1 pr-2 text-left">Invoice</th>
                        <th className="py-1 pr-2 text-left">Buyer</th>
                        <th className="py-1 pr-2 text-right">Taxable</th>
                        <th className="py-1 pr-2 text-right">CGST</th>
                        <th className="py-1 pr-2 text-right">SGST</th>
                        <th className="py-1 pr-2 text-right">IGST</th>
                        <th className="py-1 pr-2 text-right">Invoice value</th>
                        <th className="py-1 pr-2 text-right">Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.pendingReceivables.map((inv) => (
                        <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-1 pr-2">{inv.number}</td>
                          <td className="py-1 pr-2">{inv.buyer}</td>
                          <td className="py-1 pr-2 text-right">₹{Number(inv.taxable_value ?? 0).toFixed(2)}</td>
                          <td className="py-1 pr-2 text-right">₹{Number(inv.cgst ?? 0).toFixed(2)}</td>
                          <td className="py-1 pr-2 text-right">₹{Number(inv.sgst ?? 0).toFixed(2)}</td>
                          <td className="py-1 pr-2 text-right">₹{Number(inv.igst ?? 0).toFixed(2)}</td>
                          <td className="py-1 pr-2 text-right">₹{inv.total.toFixed(2)}</td>
                          <td className="py-1 pr-2 text-right text-amber-700">₹{inv.due.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900 mb-2 text-sm">Top pending payables</h2>
              {data.pendingPayables.length === 0 ? (
                <p className="text-sm text-slate-500">No pending payables.</p>
              ) : (
                <div className="responsive-table-wrap overflow-x-auto">
                  <table className="w-full text-xs table-min-width">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-1 pr-2 text-left">PO</th>
                        <th className="py-1 pr-2 text-left">Vendor</th>
                        <th className="py-1 pr-2 text-right">Total</th>
                        <th className="py-1 pr-2 text-right">Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.pendingPayables.map((po) => (
                        <tr key={po.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-1 pr-2">{po.number}</td>
                          <td className="py-1 pr-2">{po.vendor}</td>
                          <td className="py-1 pr-2 text-right">₹{po.total.toFixed(2)}</td>
                          <td className="py-1 pr-2 text-right text-rose-700">₹{po.due.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
