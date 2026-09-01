'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';

type PaymentsSettings = {
  enabled: boolean;
  configured: boolean;
  key_id: string;
  key_secret_set: boolean;
  webhook_secret_set: boolean;
  accept_partial: boolean;
  min_partial_rupees: number;
  webhook_url: string;
};

export default function PaymentsSetupPage() {
  const [settings, setSettings] = useState<PaymentsSettings | null>(null);
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [acceptPartial, setAcceptPartial] = useState(true);
  const [minPartial, setMinPartial] = useState(1);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiGet<PaymentsSettings>('organization/payments').then((r) => {
      if (r.error) setError(Array.isArray(r.error) ? r.error.join(' ') : r.error);
      else if (r.data) {
        setSettings(r.data);
        setKeyId(r.data.key_id || '');
        setEnabled(r.data.enabled);
        setAcceptPartial(r.data.accept_partial !== false);
        setMinPartial(r.data.min_partial_rupees || 1);
      }
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setOk('');
    const body: Record<string, unknown> = {
      enabled,
      key_id: keyId.trim(),
      accept_partial: acceptPartial,
      min_partial_rupees: minPartial,
    };
    if (keySecret.trim()) body.key_secret = keySecret.trim();
    if (webhookSecret.trim()) body.webhook_secret = webhookSecret.trim();
    const { data, error: err } = await apiPatch<PaymentsSettings>('organization/payments', body);
    setSaving(false);
    if (err) {
      setError(Array.isArray(err) ? err.join(' ') : err);
      return;
    }
    if (data) {
      setSettings(data);
      setKeyId(data.key_id || '');
      setKeySecret('');
      setWebhookSecret('');
      setEnabled(data.enabled);
      setAcceptPartial(data.accept_partial !== false);
      setMinPartial(data.min_partial_rupees || 1);
      setOk(
        data.enabled
          ? 'Scan to pay is on. Unpaid invoices will show a QR and a pay link. Money goes to this Razorpay account.'
          : 'Scan to pay is off. Keys are saved if you entered them.',
      );
    }
  }

  async function copyWebhook() {
    if (!settings?.webhook_url) return;
    try {
      await navigator.clipboard.writeText(settings.webhook_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy. Select the webhook URL and copy it yourself.');
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/organization/companies" className="text-sm text-slate-600 hover:text-slate-900">← Organization</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Scan to pay</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connect <strong>your</strong> Razorpay account. Customers scan the QR on the invoice or open the pay link.
          Settlements go to you — SMEBUZE does not collect this money.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Paying for the SMEBUZE workspace after the 7-day trial is separate:{' '}
          <Link href="/billing" className="text-brand-600 underline">Organization → SMEBUZE plan</Link>.
        </p>
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {ok && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{ok}</p>}

      <section className="rounded-xl border bg-white p-5 space-y-3 text-sm text-slate-600">
        <h2 className="font-semibold text-slate-900">What we need from you</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Open the <a className="text-brand-600 underline" href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noreferrer">Razorpay Dashboard → API Keys</a> and copy Key ID plus Key Secret (test or live).</li>
          <li>Paste them below and turn the feature on. We check the keys with Razorpay before saving.</li>
          <li>
            Add a webhook in Razorpay for{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs break-all">{settings?.webhook_url || '…'}</code>
            {' '}with events <strong>payment.captured</strong> and <strong>qr_code.credited</strong>. Paste the webhook secret here.
          </li>
        </ol>
        <button type="button" onClick={copyWebhook} className="rounded-lg border px-3 py-2 text-sm min-h-[40px]">
          {copied ? 'Copied' : 'Copy webhook URL'}
        </button>
      </section>

      <form onSubmit={save} className="rounded-xl border bg-white p-5 space-y-4">
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4" />
          Enable scan to pay on invoices
        </label>

        <label className="block text-sm">
          Key ID
          <input
            value={keyId}
            onChange={(e) => setKeyId(e.target.value)}
            placeholder="rzp_live_… or rzp_test_…"
            className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
            autoComplete="off"
          />
        </label>

        <label className="block text-sm">
          Key secret {settings?.key_secret_set ? <span className="font-normal text-slate-500">(saved — leave blank to keep)</span> : null}
          <input
            type="password"
            value={keySecret}
            onChange={(e) => setKeySecret(e.target.value)}
            placeholder={settings?.key_secret_set ? '••••••••' : 'Enter Key Secret'}
            className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
            autoComplete="new-password"
          />
        </label>

        <label className="block text-sm">
          Webhook secret {settings?.webhook_secret_set ? <span className="font-normal text-slate-500">(saved — leave blank to keep)</span> : null}
          <input
            type="password"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder={settings?.webhook_secret_set ? '••••••••' : 'From Razorpay webhook settings'}
            className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
            autoComplete="new-password"
          />
        </label>

        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" checked={acceptPartial} onChange={(e) => setAcceptPartial(e.target.checked)} className="h-4 w-4" />
          Allow partial payments
        </label>

        {acceptPartial && (
          <label className="block text-sm">
            Minimum partial payment (₹)
            <input
              type="number"
              min={1}
              step="1"
              value={minPartial}
              onChange={(e) => setMinPartial(Number(e.target.value) || 1)}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </label>
        )}

        <p className="text-xs text-slate-500">
          Secrets are stored encrypted and never shown again. Use live keys on production; test keys only for trials.
        </p>

        <button disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 min-h-[44px]">
          {saving ? 'Saving…' : 'Save payment setup'}
        </button>
      </form>
    </div>
  );
}
