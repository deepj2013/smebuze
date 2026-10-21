'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiUploadFile } from '@/lib/api';
import { quotePlan, YEARLY_DISCOUNT_PERCENT } from '@/lib/plans';
import CustomPlanEnquiry from '@/app/components/CustomPlanEnquiry';

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
  plans: Array<{ id: string; label: string; monthly_rupees: number; list_rupees?: number }>;
  intervals: Array<{ id: string; label: string; months: number; discount_percent?: number; is_minimum?: boolean }>;
  yearly_discount_percent?: number;
  auto_renew?: boolean;
  package_note?: string;
  gateways: { razorpay: boolean; phonepe: boolean };
  payment_status?: string;
  ecs?: { enabled: boolean; status: string | null; short_url?: string | null; next_charge_at?: string | null };
  ecs_note?: string;
  manual_pay?: {
    enabled: boolean;
    payee_name: string;
    upi_id: string | null;
    bank_name: string | null;
    branch: string | null;
    account_no: string | null;
    ifsc: string | null;
    qr_url: string | null;
    note: string;
  };
  pending_proof?: {
    payment_id: string;
    plan: string;
    interval: string;
    amount_rupees: number;
    method: string;
    reference?: string | null;
    proof_url?: string | null;
    submitted_at?: string | null;
  } | null;
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
  const [interval, setInterval] = useState('quarterly');
  const [autoRenew, setAutoRenew] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<'razorpay' | 'phonepe' | ''>('');
  const [scriptReady, setScriptReady] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofRef, setProofRef] = useState('');
  const [submittingProof, setSubmittingProof] = useState(false);

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
      setInterval(r.data.interval === 'monthly' ? 'quarterly' : r.data.interval || 'quarterly');
      setAutoRenew(r.data.auto_renew !== false);
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
          ? 'Pay SMEBUZE with Razorpay to keep invoices, stock and accounts running. Customer invoice payments still go to your own Razorpay account.'
          : 'Renew or change the plan. This payment is for SMEBUZE — not customer invoices.'}
      </p>
      {status?.package_note && (
        <p className="mt-2 text-sm text-slate-500">{status.package_note}</p>
      )}

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
                      <span className="block text-xs text-slate-500">
                        {p.list_rupees && p.list_rupees > p.monthly_rupees && (
                          <span className="line-through text-slate-400 mr-1">{inr(p.list_rupees)}</span>
                        )}
                        {inr(p.monthly_rupees)}/mo
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-sm font-medium text-slate-700">Bill for</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {status.intervals
                    .filter((i) => i.id === 'quarterly' || i.id === 'yearly')
                    .map((i) => (
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
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={autoRenew}
                  onChange={async (e) => {
                    const next = e.target.checked;
                    setAutoRenew(next);
                    await apiPost('billing/auto-renew', { auto_renew: next });
                  }}
                />
                <span>
                  <strong className="text-slate-900">Auto-renew with Razorpay</strong>
                  <span className="block text-slate-500 text-xs mt-0.5">
                    Remembers your package so the next renewal is one-click Razorpay checkout when the licence ends.
                  </span>
                </span>
              </label>
              <div className="rounded-lg border border-slate-200 p-3 space-y-2">
                <p className="text-sm font-medium text-slate-900">ECS / eMandate auto-debit</p>
                <p className="text-xs text-slate-500">{status.ecs_note || 'Authorise once; SMEBUZE plan renews automatically. Separate from shop customer payments.'}</p>
                {status.ecs?.status && <p className="text-xs">Status: {status.ecs.status}{status.ecs.next_charge_at ? ` · next ${status.ecs.next_charge_at.slice(0, 10)}` : ''}</p>}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={paying !== '' || !status.gateways.razorpay}
                    onClick={async () => {
                      setError('');
                      const r = await apiPost<{ short_url?: string | null; already_active?: boolean; message?: string }>('billing/ecs/setup', { plan, interval });
                      if (r.error) setError(Array.isArray(r.error) ? r.error.join(' ') : r.error);
                      else if (r.data?.short_url) window.open(r.data.short_url, '_blank');
                      else setOk(r.data?.message || 'ECS started');
                      load();
                    }}
                    className="rounded-lg bg-slate-900 text-white px-3 py-2 text-xs"
                  >
                    {status.ecs?.enabled ? 'ECS active' : 'Set up auto-debit'}
                  </button>
                  {status.ecs?.enabled && (
                    <button
                      type="button"
                      onClick={async () => {
                        await apiPost('billing/ecs/cancel', {});
                        load();
                      }}
                      className="rounded-lg border px-3 py-2 text-xs"
                    >
                      Cancel ECS
                    </button>
                  )}
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">
                  {quote ? inr(quote.amount_rupees) : '—'}
                  <span className="ml-2 text-sm font-normal text-slate-500">for {INTERVAL_HINT[interval] || interval}</span>
                </p>
                {quote && quote.savings_rupees > 0 && (
                  <p className="mt-1 text-sm text-emerald-700">
                    <span className="line-through text-slate-400 mr-2">{inr(quote.list_rupees)}</span>
                    You save {inr(quote.savings_rupees)}
                    {quote.discount_percent > 0 ? ` (${quote.discount_percent}% off)` : ''}
                    {interval === 'yearly' ? ` including ${yearlyOff}% yearly` : ''}
                  </p>
                )}
              </div>
              {status.pending_proof && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                  <p className="font-medium">Payment screenshot submitted</p>
                  <p className="mt-1 text-xs">
                    ₹{status.pending_proof.amount_rupees} · {status.pending_proof.plan} · waiting for SMEBUZE approval.
                  </p>
                </div>
              )}

              {status.manual_pay?.enabled && !status.pending_proof && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-900">Pay by UPI or bank transfer</p>
                  <p className="text-xs text-slate-600">{status.manual_pay.note}</p>
                  <div className="flex flex-wrap gap-4 items-start">
                    {status.manual_pay.qr_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={status.manual_pay.qr_url}
                        alt="SMEBUZE payment QR"
                        className="h-28 w-28 rounded-lg border bg-white object-contain p-1"
                      />
                    )}
                    <dl className="text-sm space-y-1 min-w-[200px]">
                      <div><dt className="text-slate-500 inline">Payee: </dt><dd className="inline font-medium">{status.manual_pay.payee_name}</dd></div>
                      {status.manual_pay.upi_id && (
                        <div><dt className="text-slate-500 inline">UPI: </dt><dd className="inline font-mono">{status.manual_pay.upi_id}</dd></div>
                      )}
                      {status.manual_pay.bank_name && (
                        <div><dt className="text-slate-500 inline">Bank: </dt><dd className="inline">{status.manual_pay.bank_name}{status.manual_pay.branch ? `, ${status.manual_pay.branch}` : ''}</dd></div>
                      )}
                      {status.manual_pay.account_no && (
                        <div><dt className="text-slate-500 inline">A/C: </dt><dd className="inline font-mono">{status.manual_pay.account_no}</dd></div>
                      )}
                      {status.manual_pay.ifsc && (
                        <div><dt className="text-slate-500 inline">IFSC: </dt><dd className="inline font-mono">{status.manual_pay.ifsc}</dd></div>
                      )}
                      {quote && (
                        <div className="pt-2 font-semibold text-slate-900">Amount: {inr(quote.amount_rupees)}</div>
                      )}
                    </dl>
                  </div>
                  <label className="block text-xs text-slate-600">
                    UTR / transaction reference (optional)
                    <input
                      value={proofRef}
                      onChange={(e) => setProofRef(e.target.value)}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white"
                      placeholder="e.g. 123456789012"
                    />
                  </label>
                  <label className="block text-xs text-slate-600">
                    Payment screenshot *
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="mt-1 block w-full text-sm"
                      onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={submittingProof || !proofFile || !quote}
                    className="w-full rounded-lg bg-slate-900 text-white py-2.5 text-sm font-semibold disabled:opacity-50"
                    onClick={async () => {
                      if (!proofFile) return;
                      setSubmittingProof(true);
                      setError('');
                      const res = await apiUploadFile<{ message?: string }>(
                        'billing/manual-payment/submit',
                        proofFile,
                        'proof',
                        {
                          plan,
                          interval,
                          reference: proofRef,
                          method: 'upi',
                        },
                      );
                      setSubmittingProof(false);
                      if (res.error) setError(res.error);
                      else {
                        setOk(res.data?.message || 'Screenshot submitted for approval.');
                        setProofFile(null);
                        await load();
                      }
                    }}
                  >
                    {submittingProof ? 'Uploading…' : 'Submit screenshot for approval'}
                  </button>
                </div>
              )}

              {(status.gateways.razorpay || status.gateways.phonepe) && (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={paying !== '' || !status.gateways.razorpay || !scriptReady}
                    onClick={() => void payRazorpay()}
                    className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 min-touch"
                  >
                    {paying === 'razorpay' ? 'Opening Razorpay…' : 'Pay with Razorpay'}
                  </button>
                  <button
                    type="button"
                    disabled={paying !== '' || !status.gateways.phonepe}
                    onClick={() => void payPhonePe()}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 min-touch"
                  >
                    {paying === 'phonepe' ? 'Redirecting to PhonePe…' : 'Pay with PhonePe'}
                  </button>
                </div>
              )}
              {!status.gateways.razorpay && !status.gateways.phonepe && !status.manual_pay?.enabled && (
                <p className="text-sm text-amber-800 bg-amber-50 rounded-lg p-3">
                  Online pay is not live on this server yet. Write to{' '}
                  <a className="underline" href={`mailto:${status.support_email}`}>{status.support_email}</a>.
                </p>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">Custom plans are quoted by SMEBUZE. Send a message and we will reply.</p>
              <CustomPlanEnquiry compact />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
