'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';

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
  pendingReceivables: { id: string; number: string; buyer: string; total: number; paid: number; due: number; due_date?: string }[];
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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingChecklist | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: res, error: err } = await apiGet<DashboardData>('reports/dashboard');
      if (err) setError(err);
      else if (res) setData(res);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data: ob } = await apiGet<OnboardingChecklist>('onboarding/checklist');
      if (ob) setOnboarding(ob);
    })();
  }, []);

  const handleCompleteOnboarding = async () => {
    const { error: err } = await apiPost('onboarding/complete', {});
    if (!err) {
      setOnboarding((prev) => prev ? { ...prev, showOnboarding: false, onboardingCompletedAt: new Date().toISOString() } : null);
      setOnboardingDismissed(true);
    }
  };

  const showOnboardingCard = onboarding?.showOnboarding && !onboardingDismissed && onboarding.steps.length > 0;

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">Business overview</h1>

      {showOnboardingCard && (
        <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50/50 p-4">
          <h2 className="font-semibold text-slate-900 mb-2">Welcome to SMEBUZZ</h2>
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
          <section className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6 sm:mb-8">
            <div className="rounded-xl bg-white border border-slate-200 p-4 min-h-[88px]">
              <p className="text-xs font-medium text-slate-500 uppercase">Total invoiced</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">₹{data.summary.receivables.totalInvoiced.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-4">
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
                        <th className="py-1 pr-2 text-right">Total</th>
                        <th className="py-1 pr-2 text-right">Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.pendingReceivables.map((inv) => (
                        <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-1 pr-2">{inv.number}</td>
                          <td className="py-1 pr-2">{inv.buyer}</td>
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
