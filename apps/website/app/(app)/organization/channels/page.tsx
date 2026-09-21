'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';
import { PageHeader } from '../../components/PageHeader';

type Channels = {
  whatsapp: { mode: 'shared' | 'private'; private_configured: boolean };
  campaign: { mode: 'shared' | 'private'; private_configured: boolean };
  payments: { mode: 'shared' | 'private'; default_provider: string };
};

type Provider = {
  id: string;
  label: string;
  live: boolean;
  enabled: boolean;
  is_default: boolean;
  fields: Array<{ key: string; label: string; secret?: boolean; set?: boolean }>;
};

export default function ChannelsPage() {
  const [ch, setCh] = useState<Channels | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [waMode, setWaMode] = useState<'shared' | 'private'>('shared');
  const [campMode, setCampMode] = useState<'shared' | 'private'>('shared');
  const [waLicense, setWaLicense] = useState('');
  const [waKey, setWaKey] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [cred, setCred] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    apiGet<Channels>('growth/channels').then((r) => {
      if (r.data) {
        setCh(r.data);
        setWaMode(r.data.whatsapp.mode);
        setCampMode(r.data.campaign.mode);
      }
    });
    apiGet<Provider[]>('growth/payments/providers').then((r) => {
      if (Array.isArray(r.data)) setProviders(r.data);
    });
  }, []);

  async function saveChannels(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setOk('');
    const { data, error: err } = await apiPatch<Channels>('growth/channels', {
      whatsapp: { mode: waMode, license: waLicense || undefined, api_key: waKey || undefined },
      campaign: { mode: campMode, smtp_host: smtpHost || undefined, smtp_user: smtpUser || undefined, smtp_pass: smtpPass || undefined },
    });
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else {
      if (data) setCh(data);
      setWaLicense('');
      setWaKey('');
      setSmtpPass('');
      setOk('Channel settings saved.');
    }
  }

  async function saveProvider(p: Provider) {
    setError('');
    setOk('');
    const { data, error: err } = await apiPatch<Provider[]>(`growth/payments/providers/${p.id}`, {
      enabled: true,
      is_default: true,
      credentials: cred[p.id] || {},
    });
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else {
      if (Array.isArray(data)) setProviders(data);
      setOk(`${p.label} saved. Money settles to this account, not SMEBUZE.`);
      setCred((c) => ({ ...c, [p.id]: {} }));
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader title="Channels & payments" description="Use SMEBUZE shared WhatsApp and campaigns, or plug in your own. Payment keys are always yours." />
      {error && <div className="rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {ok && <div className="rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm">{ok}</div>}

      <form onSubmit={saveChannels} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="font-semibold text-slate-900">WhatsApp</h2>
        <p className="text-sm text-slate-500">{ch?.whatsapp.private_configured ? 'Private keys are on file.' : 'No private keys yet.'}</p>
        <label className="flex items-center gap-2 text-sm"><input type="radio" checked={waMode === 'shared'} onChange={() => setWaMode('shared')} /> Shared (SMEBUZE number)</label>
        <label className="flex items-center gap-2 text-sm"><input type="radio" checked={waMode === 'private'} onChange={() => setWaMode('private')} /> Private (my AmeeraIT / Cloud API keys)</label>
        {waMode === 'private' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <input placeholder="License" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={waLicense} onChange={(e) => setWaLicense(e.target.value)} />
            <input placeholder="API key" type="password" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={waKey} onChange={(e) => setWaKey(e.target.value)} />
          </div>
        )}

        <h2 className="font-semibold text-slate-900 pt-2">Campaigns / email</h2>
        <p className="text-sm text-slate-500">{ch?.campaign.private_configured ? 'Private SMTP is on file.' : 'Using shared SMEBUZE mail until you add SMTP.'}</p>
        <label className="flex items-center gap-2 text-sm"><input type="radio" checked={campMode === 'shared'} onChange={() => setCampMode('shared')} /> Shared (SMEBUZE SMTP)</label>
        <label className="flex items-center gap-2 text-sm"><input type="radio" checked={campMode === 'private'} onChange={() => setCampMode('private')} /> Private (my SMTP)</label>
        {campMode === 'private' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <input placeholder="SMTP host" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
            <input placeholder="SMTP user" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
            <input placeholder="SMTP password" type="password" className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} />
          </div>
        )}
        <button type="submit" className="rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium min-h-[44px]">Save channels</button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="font-semibold text-slate-900">Payment gateways</h2>
        <p className="text-sm text-slate-500">Razorpay is live. Other gateways store keys so we can switch them on without another rebuild. You can also use <Link href="/organization/payments" className="text-brand-600 hover:underline">Scan to pay</Link>.</p>
        {providers.map((p) => (
          <div key={p.id} className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{p.label} {p.live ? <span className="text-xs text-emerald-700">live</span> : <span className="text-xs text-slate-500">keys only</span>}</p>
              {p.enabled && <span className="text-xs text-slate-500">enabled{p.is_default ? ' · default' : ''}</span>}
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {p.fields.map((f) => (
                <input
                  key={f.key}
                  type={f.secret ? 'password' : 'text'}
                  placeholder={f.set ? `${f.label} (saved)` : f.label}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={cred[p.id]?.[f.key] || ''}
                  onChange={(e) => setCred((c) => ({ ...c, [p.id]: { ...(c[p.id] || {}), [f.key]: e.target.value } }))}
                />
              ))}
            </div>
            <button type="button" onClick={() => saveProvider(p)} className="mt-2 rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[40px]">Save {p.label}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
