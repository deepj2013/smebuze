'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { PageHeader } from '../../components/PageHeader';

type Hub = {
  total: number;
  sources: Array<{ id: string; label: string; count: number }>;
  recent: Array<{ id: string; source: string; name?: string | null; phone?: string | null; email?: string | null; message?: string | null; created_at: string }>;
};

export default function LeadHubPage() {
  const [hub, setHub] = useState<Hub | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('instagram');
  const [message, setMessage] = useState('');

  function load() {
    apiGet<Hub>('growth/leads/hub').then((r) => {
      if (r.error) setError(Array.isArray(r.error) ? r.error.join(' ') : r.error);
      else if (r.data) setHub(r.data);
    });
  }

  useEffect(() => { load(); }, []);

  async function manual(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const { error: err } = await apiPost('growth/leads/ingest', { source, name, phone, message });
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else {
      setName('');
      setPhone('');
      setMessage('');
      load();
    }
  }

  return (
    <div>
      <PageHeader title="Lead hub" description="Every inbound touch — website, shop, WhatsApp, Instagram, Instamart, email — in one place.">
        <Link href="/crm/leads" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm min-h-[44px] inline-flex items-center">Open leads</Link>
      </PageHeader>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        {(hub?.sources ?? []).map((s) => (
          <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{s.count}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-500 mb-4">Total ingest events: {hub?.total ?? 0}. Instagram / Instamart / email can POST to <code className="text-xs">/api/v1/public/leads/ingest</code> with your shop slug.</p>

      <form onSubmit={manual} className="mb-8 rounded-xl border border-slate-200 bg-white p-4 grid gap-3 sm:grid-cols-2">
        <p className="sm:col-span-2 text-sm font-medium">Log a lead from Instagram / Instamart / a call</p>
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={source} onChange={(e) => setSource(e.target.value)}>
          {(hub?.sources ?? []).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <input required placeholder="Name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Phone" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input placeholder="Note" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={message} onChange={(e) => setMessage(e.target.value)} />
        <button type="submit" className="rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium min-h-[44px]">Add to hub</button>
      </form>

      <h2 className="font-semibold mb-2">Recent</h2>
      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {(hub?.recent ?? []).map((e) => (
          <li key={e.id} className="p-4 text-sm">
            <span className="font-medium capitalize">{e.source}</span>
            {' · '}
            {e.name || '—'}
            {e.phone ? ` · ${e.phone}` : ''}
            <p className="text-xs text-slate-500 mt-1">{e.message || ''} {e.created_at?.slice(0, 16)?.replace('T', ' ')}</p>
          </li>
        ))}
        {!hub?.recent?.length && <li className="p-4 text-sm text-slate-500">No inbound leads yet.</li>}
      </ul>
    </div>
  );
}
