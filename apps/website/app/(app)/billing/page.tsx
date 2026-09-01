'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { quotePlan, YEARLY_DISCOUNT_PERCENT } from '@/lib/plans';

type BillingStatus = {
  tenant_name: string;
  slug: string;
  plan: string;
  plan_label: string;
  interval: string;
  amount_rupees: number | null;
  payable: boolean;
  support_email: string;
  expired: boolean;
  ends_at: string | null;
  days_left: number | null;
  prices: Record<string, number>;
  plans: Array<{ id: string; label: string; monthly_rupees: number }>;
  intervals: Array<{ id: string; label: string; months: number; discount_percent?: number }>;
  yearly_discount_percent?: number;
  gateways: { razorpay: boolean; phonepe: boolean };
  payment_status?: string;
};

type RazorpayCheckout = { open: () => void };

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

const INTERVAL_HINT: Record<string, string> = {
  monthly: '1 month',
  quarterly: '3 months',
  yearly: '12 months',
};

function inr(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function apiMessage(err: string | undefined, fallback: string) {
  return err || fallback;
}

export default function BillingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [plan, setPlan] = useState('basic');
  const [interval, setInterval] = useState('monthly');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<'razorpay' | 'phonepe' | ''>('');
  const [scriptReady, setScriptReady] = useState(false);

  const quote = useMemo(() => quotePlan(plan, interval), [plan, interval]);
  const yearlyOff = status?.yearly_discount_percent ?? YEARLY_DISCOUNT_PERCENT;

  const load = useCallback(async () => {
    const r = await apiGet<BillingStatus>('billing/status');
    if (r.error) {
      setError(apiMessage(r.error, 'Could not load billing'));
      setLoading(false);
      return;
    }
    if (r.data) {
      setStatus(r.data);
      setPlan(r.data.plan && r.data.prices?.[r.data.plan] ? r.data.plan : 'basic');
      setInterval(r.data.interval || 'monthly');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    const txn = q.get('txn');
    if (q.get('phonepe') !== '1' || !txn) return;
    setPaying('phonepe');
    setError('');
    void (async () => {
      const r = await apiGet<BillingStatus>(`billing/phonepe/status?txn=${encodeURIComponent(txn)}`);
      setPaying('');
      if (r.error) {
        setError(apiMessage(r.error, 'PhonePe payment is still pending. You can try again.'));
        return;
      }
      if (r.data?.expired === false) {
        setOk('Payment received. Your workspace is active again.');
        setStatus(r.data);
        window.history.replaceState({}, '', '/billing');
        setTimeout(() => router.replace('/dashboard'), 1200);
      } else if (r.data) {
        setStatus(r.data);
        setError('PhonePe has not confirmed this payment yet. Wait a moment and refresh.');
      }
    })();
  }, [router]);

  async function payRazorpay() {
    setPaying('razorpay');
    setError('');
    setOk('');
    const orderRes = await apiPost<{
      key_id: string;
      order_id: string;
      amount: number;
      currency: string;
      name: string;
      description: string;
      prefill?: Record<string, string>;
    }>('billing/razorpay/order', { plan, interval });
    if (orderRes.error || !orderRes.data) {
      setError(apiMessage(orderRes.error, 'Could not start Razorpay'));
      setPaying('');
      return;
    }
    if (!window.Razorpay) {
      setError('Payment window failed to load. Refresh and try again.');
      setPaying('');
      return;
    }
    const order = orderRes.data;
    const checkout = new window.Razorpay({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      order_id: order.order_id,
      prefill: order.prefill,
      theme: { color: '#0284c7' },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        const confirm = await apiPost<{ paid?: boolean; subscription_ends_at?: string }>('billing/razorpay/confirm', response);
        if (confirm.error) {
          setError(apiMessage(confirm.error, 'Paid, but we could not unlock the workspace yet. Keep the receipt and write to support.'));
          setPaying('');
          return;
        }
        setOk('Payment received. Your workspace is active again.');
        await load();
        setPaying('');
        setTimeout(() => router.replace('/dashboard'), 1200);
      },
      modal: { ondismiss: () => setPaying('') },
    });
    checkout.open();
  }

  async function payPhonePe() {
    setPaying('phonepe');
    setError('');
    setOk('');
    const r = await apiPost<{ redirectUrl: string }>('billing/phonepe/start', { plan, interval });
    if (r.error || !r.data?.redirectUrl) {
      setError(apiMessage(r.error, 'Could not start PhonePe'));
      setPaying('');
      return;
    }
    window.location.href = r.data.redirectUrl;
  }

  const endsLabel = status?.ends_at
    ? new Date(status.ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <main className="mx-auto max-w-lg">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" onReady={() => setScriptReady(true)} />
      <p className="text-xs uppercase tracking-wide text-slate-500">SMEBUZE plan</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">
        {status?.expired ? 'Your trial has ended' : 'Pay for your workspace'}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {status?.expired
          ? 'Pay SMEBUZE to keep invoices, stock and accounts running. Customer invoice payments still go to your own Razorpay account.'
          : 'Renew or change the plan. This payment is for SMEBUZE — not customer invoices.'}
      </p>

      {loading && <p className="mt-6 text-sm text-slate-600">Loading…</p>}
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {ok && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{ok}</p>}

      {status && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
          <div>
            <p className="text-sm text-slate-500">{status.tenant_name}</p>
            <p className="font-semibold text-slate-900">
              {status.plan_label}
              {endsLabel ? ` · ${status.expired ? 'ended' : 'active until'} ${endsLabel}` : ''}
            </p>
          </div>

          {status.payable ? (
            <>
              <fieldset>
                <legend className="text-sm font-medium text-slate-700">Plan</legend>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {status.plans.map((p) => (
                    <label
                      key={p.id}
                      className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${
                        plan === p.id ? 'border-brand-500 bg-brand-50 text-brand-900' : 'border-slate-200'
                      }`}
                    >
                      <input type="radio" className="sr-only" name="plan" checked={plan === p.id} onChange={() => setPlan(p.id)} />
                      <span className="font-semibold">{p.label}</span>
                      <span className="block text-xs text-slate-500">{inr(p.monthly_rupees)}/mo</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-sm font-medium text-slate-700">Bill for</legend>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {status.intervals.map((i) => (
                    <label
                      key={i.id}
                      className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm ${
                        interval === i.id ? 'border-brand-500 bg-brand-50 text-brand-900' : 'border-slate-200'
                      }`}
                    >
                      <input type="radio" className="sr-only" name="interval" checked={interval === i.id} onChange={() => setInterval(i.id)} />
                      <span className="block">{i.label}</span>
                      {(i.discount_percent || (i.id === 'yearly' ? yearlyOff : 0)) > 0 && (
                        <span className="block text-xs font-semibold text-emerald-700">Save {i.discount_percent || yearlyOff}%</span>
                      )}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <p className="text-3xl font-bold text-slate-900">
                  {quote ? inr(quote.amount_rupees) : '—'}
                  <span className="ml-2 text-sm font-normal text-slate-500">for {INTERVAL_HINT[interval] || interval}</span>
                </p>
                {quote && quote.discount_percent > 0 && (
                  <p className="mt-1 text-sm text-emerald-700">
                    <span className="line-through text-slate-400 mr-2">{inr(quote.list_rupees)}</span>
                    {quote.discount_percent}% off yearly — you save {inr(quote.savings_rupees)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={paying !== '' || !status.gateways.razorpay || !scriptReady}
                  onClick={() => void payRazorpay()}
                  className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 min-touch"
                >
                  {paying === 'razorpay' ? 'Opening Razorpay…' : status.gateways.razorpay ? 'Pay with Razorpay' : 'Razorpay not configured'}
                </button>
                <button
                  type="button"
                  disabled={paying !== '' || !status.gateways.phonepe}
                  onClick={() => void payPhonePe()}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 min-touch"
                >
                  {paying === 'phonepe' ? 'Redirecting to PhonePe…' : status.gateways.phonepe ? 'Pay with PhonePe' : 'PhonePe not configured'}
                </button>
              </div>
              {!status.gateways.razorpay && !status.gateways.phonepe && (
                <p className="text-sm text-amber-800 bg-amber-50 rounded-lg p-3">
                  Online pay is not live on this server yet. Write to{' '}
                  <a className="underline" href={`mailto:${status.support_email}`}>{status.support_email}</a>.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-700">
              Custom plans are quoted by SMEBUZE. Write to{' '}
              <a className="font-medium text-brand-700 underline" href={`mailto:${status.support_email}`}>{status.support_email}</a>.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
