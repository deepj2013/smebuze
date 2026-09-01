'use client';

import { useCallback, useEffect, useState } from 'react';
import Script from 'next/script';
import { getApiUrl } from '@/lib/api';

type PayInvoice = {
  invoice_id: string;
  number: string;
  company: string;
  customer: string;
  total: number;
  paid: number;
  outstanding: number;
  accept_partial: boolean;
  min_partial_rupees: number;
  currency: string;
  status: string;
};

type RazorpayCheckout = {
  open: () => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

function apiMessage(json: { message?: string | string[] }): string {
  if (Array.isArray(json.message)) return json.message.join(' ');
  return json.message || 'Request failed';
}

export default function PayInvoicePage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [invoice, setInvoice] = useState<PayInvoice | null>(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  const load = useCallback(async () => {
    setError('');
    const res = await fetch(getApiUrl(`pay/${token}`));
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(apiMessage(json) || 'This payment link is not valid.');
      setInvoice(null);
      setLoading(false);
      return;
    }
    const data = json as PayInvoice;
    setInvoice(data);
    setAmount(data.outstanding.toFixed(2));
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function pay() {
    if (!invoice) return;
    setPaying(true);
    setError('');
    setOk('');
    const rupees = invoice.accept_partial ? Number(amount) : invoice.outstanding;
    const orderRes = await fetch(getApiUrl(`pay/${token}/order`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: rupees }),
    });
    const order = await orderRes.json().catch(() => ({}));
    if (!orderRes.ok) {
      setError(apiMessage(order));
      setPaying(false);
      return;
    }
    if (!window.Razorpay) {
      setError('Payment window failed to load. Refresh and try again.');
      setPaying(false);
      return;
    }
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
        const confirmRes = await fetch(getApiUrl(`pay/${token}/confirm`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response),
        });
        const confirm = await confirmRes.json().catch(() => ({}));
        if (!confirmRes.ok) {
          setError(apiMessage(confirm) || 'Paid, but we could not update the invoice yet. Please keep the receipt.');
        } else {
          setOk('Payment received. Thank you.');
          await load();
        }
        setPaying(false);
      },
      modal: {
        ondismiss: () => setPaying(false),
      },
    });
    checkout.open();
  }

  const paidOff = invoice != null && invoice.outstanding < 1;

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-10">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" onReady={() => setScriptReady(true)} />
      <div className="mx-auto max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Pay invoice</p>
        {loading && <p className="mt-4 text-sm text-slate-600">Loading…</p>}
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {ok && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{ok}</p>}
        {invoice && (
          <>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">{invoice.company}</h1>
            <p className="mt-1 text-sm text-slate-600">Invoice {invoice.number}{invoice.customer ? ` · ${invoice.customer}` : ''}</p>
            <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">Total</dt><dd className="font-semibold">₹{invoice.total.toFixed(2)}</dd></div>
              <div><dt className="text-slate-500">Paid</dt><dd className="font-semibold">₹{invoice.paid.toFixed(2)}</dd></div>
              <div className="col-span-2"><dt className="text-slate-500">Balance due</dt><dd className="text-xl font-bold">₹{invoice.outstanding.toFixed(2)}</dd></div>
            </dl>
            {paidOff ? (
              <p className="mt-6 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">This invoice is paid in full.</p>
            ) : (
              <form
                className="mt-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void pay();
                }}
              >
                {invoice.accept_partial ? (
                  <label className="block text-sm">
                    Amount to pay (₹)
                    <input
                      type="number"
                      min={invoice.min_partial_rupees}
                      max={invoice.outstanding}
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="mt-1 w-full rounded-lg border px-3 py-2.5"
                    />
                    <span className="mt-1 block text-xs text-slate-500">
                      You can pay part now (minimum ₹{invoice.min_partial_rupees}) or the full balance.
                    </span>
                  </label>
                ) : (
                  <p className="text-sm text-slate-600">This bill accepts the full balance only.</p>
                )}
                <button
                  type="submit"
                  disabled={paying || !scriptReady}
                  className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 min-h-[44px]"
                >
                  {paying ? 'Opening Razorpay…' : scriptReady ? 'Pay with Razorpay' : 'Loading payment…'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}
