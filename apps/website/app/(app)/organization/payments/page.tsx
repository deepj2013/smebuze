'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';

type PaymentsSettings = {
  enabled: boolean;
  configured: boolean;
  merchant_key: string;
  salt_set: boolean;
  accept_partial: boolean;
  min_partial_rupees: number;
  return_url: string;
  env: 'test' | 'prod';
};

export default function PaymentsSetupPage() {
  const [settings, setSettings] = useState<PaymentsSettings | null>(null);
  const [merchantKey, setMerchantKey] = useState('');
  const [salt, setSalt] = useState('');
  const [env, setEnv] = useState<'test' | 'prod'>('test');
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
        setMerchantKey(r.data.merchant_key || '');
        setEnabled(r.data.enabled);
        setEnv(r.data.env === 'prod' ? 'prod' : 'test');
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
      key: merchantKey.trim(),
      env,
      accept_partial: acceptPartial,
      min_partial_rupees: minPartial,
    };
    if (salt.trim()) body.salt = salt.trim();
    const { data, error: err } = await apiPatch<PaymentsSettings>('organization/payments', body);
    setSaving(false);
    if (err) {
      setError(Array.isArray(err) ? err.join(' ') : err);
      return;
    }
    if (data) {
      setSettings(data);
      setMerchantKey(data.merchant_key || '');
      setSalt('');
      setEnabled(data.enabled);
      setEnv(data.env === 'prod' ? 'prod' : 'test');
      setAcceptPartial(data.accept_partial !== false);
      setMinPartial(data.min_partial_rupees || 1);
      setOk(
        data.enabled
          ? 'Scan to pay is on. Unpaid invoices show a QR and pay link. Money goes to your PayU account.'
          : 'Scan to pay is off. Keys are saved if you entered them.',
      );
    }
  }

  async function copyReturnUrl() {
    if (!settings?.return_url) return;
    try {
      await navigator.clipboard.writeText(settings.return_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy. Select the return URL and copy it yourself.');
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/organization/companies" className="text-sm text-slate-600 hover:text-slate-900">← Organization</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Scan to pay</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connect <strong>your</strong> PayU merchant account. Customers scan the QR on the invoice or open the pay link.
          Settlements go to you — SMEBUZE does not collect this money.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Paying for the SMEBUZE workspace after the trial is separate:{' '}
          <Link href="/billing" className="text-brand-600 underline">Organization → SMEBUZE plan</Link>.
        </p>
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {ok && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{ok}</p>}

      <section className="rounded-xl border bg-white p-5 space-y-3 text-sm text-slate-600">
        <h2 className="font-semibold text-slate-900">What we need from you</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Copy your <strong>Merchant Key</strong> and <strong>Salt</strong> from the{' '}
            <a className="text-brand-600 underline" href="https://docs.payu.in/docs" target="_blank" rel="noreferrer">PayU dashboard</a>{' '}
            (test or live).
          </li>
          <li>Paste them below and turn the feature on.</li>
          <li>
            Set PayU surl/furl to{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs break-all">{settings?.return_url || '…'}</code>
            {' '}(SMEBUZE verifies payment and updates the invoice).
          </li>
        </ol>
        <button type="button" onClick={copyReturnUrl} className="rounded-lg border px-3 py-2 text-sm min-h-[40px]">
          {copied ? 'Copied' : 'Copy return URL'}
        </button>
      </section>

      <form onSubmit={save} className="rounded-xl border bg-white p-5 space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enable scan-to-pay on invoices
        </label>
        <label className="block text-sm">
          Merchant key
          <input value={merchantKey} onChange={(e) => setMerchantKey(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <label className="block text-sm">
          Merchant salt {settings?.salt_set ? '(saved — leave blank to keep)' : '*'}
          <input type="password" value={salt} onChange={(e) => setSalt(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" autoComplete="new-password" />
        </label>
        <label className="block text-sm">
          Environment
          <select value={env} onChange={(e) => setEnv(e.target.value === 'prod' ? 'prod' : 'test')} className="mt-1 w-full rounded-lg border px-3 py-2">
            <option value="test">Test</option>
            <option value="prod">Live</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={acceptPartial} onChange={(e) => setAcceptPartial(e.target.checked)} />
          Allow partial payments
        </label>
        {acceptPartial && (
          <label className="block text-sm">
            Minimum partial (₹)
            <input type="number" min={1} value={minPartial} onChange={(e) => setMinPartial(Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
        )}
        <button type="submit" disabled={saving} className="rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
          {saving ? 'Saving…' : 'Save PayU settings'}
        </button>
      </form>
    </div>
  );
}
