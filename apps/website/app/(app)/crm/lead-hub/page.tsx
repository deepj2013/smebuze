'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { PageHeader } from '../../components/PageHeader';

type Hub = {
  total: number;
  live?: boolean;
  sources: Array<{ id: string; label: string; count: number }>;
  recent: Array<{
    id: string;
    source: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    message?: string | null;
    created_at: string;
  }>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function LeadHubPage() {
  const [hub, setHub] = useState<Hub | null>(null);
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('instagram');
  const [message, setMessage] = useState('');
  const [sourcesOn, setSourcesOn] = useState<string[]>([]);
  const [settingsMsg, setSettingsMsg] = useState('');

  function load() {
    apiGet<Hub>('growth/leads/hub').then((r) => {
      if (r.error) setError(Array.isArray(r.error) ? r.error.join(' ') : r.error);
      else if (r.data) setHub(r.data);
    });
    apiGet<{ sources: string[]; available: Array<{ id: string; label: string }> }>('growth/leads/settings').then((r) => {
      if (r.data?.sources) setSourcesOn(r.data.sources);
    });
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('smebuzz_token') : null;
    if (!token) return;
    let socket: Socket | null = null;
    try {
      socket = io(`${API_URL}/leads`, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        auth: { token },
      });
      socket.on('connect', () => setLive(true));
      socket.on('disconnect', () => setLive(false));
      socket.on('lead.ingest', (payload: { event_id: string; source: string; name: string; phone?: string; message?: string; created_at: string }) => {
        setHub((prev) => {
          if (!prev) return prev;
          const recent = [
            {
              id: payload.event_id,
              source: payload.source,
              name: payload.name,
              phone: payload.phone,
              message: payload.message,
              created_at: payload.created_at,
            },
            ...prev.recent.filter((e) => e.id !== payload.event_id),
          ].slice(0, 50);
          const sources = prev.sources.map((s) =>
            s.id === payload.source ? { ...s, count: s.count + 1 } : s,
          );
          return { ...prev, total: prev.total + 1, recent, sources };
        });
      });
    } catch {
      setLive(false);
    }
    return () => {
      socket?.disconnect();
    };
  }, []);

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

  async function saveSources(e: React.FormEvent) {
    e.preventDefault();
    setSettingsMsg('');
    const r = await apiPatch('growth/leads/settings', { enabled: true, sources: sourcesOn });
    if (r.error) setError(Array.isArray(r.error) ? r.error.join(' ') : r.error);
    else {
      setSettingsMsg('Lead sources saved');
      load();
    }
  }

  function toggleSource(id: string) {
    setSourcesOn((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div>
      <PageHeader
        title="Lead hub"
        description="Inbound leads from website, shop, WhatsApp, Instagram and more — live over WebSocket when connected."
      >
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${live ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
          {live ? 'Live' : 'Polling / offline'}
        </span>
        <Link href="/crm/leads" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm min-h-[44px] inline-flex items-center">
          Open leads
        </Link>
      </PageHeader>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {settingsMsg && <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm">{settingsMsg}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        {(hub?.sources ?? []).map((s) => (
          <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{s.count}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Total: {hub?.total ?? 0}. Public ingest: <code className="text-xs">POST /api/v1/public/leads/ingest</code> with shop slug + source.
      </p>

      <form onSubmit={saveSources} className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium mb-2">Enabled lead sources (tenant)</p>
        <div className="flex flex-wrap gap-2">
          {['website', 'shop', 'whatsapp', 'instagram', 'instamart', 'email', 'facebook', 'google', 'referral', 'other'].map((id) => (
            <label key={id} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-sm capitalize">
              <input type="checkbox" checked={sourcesOn.includes(id)} onChange={() => toggleSource(id)} />
              {id}
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">Universal admin can disable the whole Lead hub feature per tenant under Admin → Tenants / Storefronts.</p>
        <button type="submit" className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm">
          Save sources
        </button>
      </form>

      <form onSubmit={manual} className="mb-8 rounded-xl border border-slate-200 bg-white p-4 grid gap-3 sm:grid-cols-2">
        <p className="sm:col-span-2 text-sm font-medium">Register a lead</p>
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={source} onChange={(e) => setSource(e.target.value)}>
          {(hub?.sources ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <input required placeholder="Name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Phone" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input placeholder="Note" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={message} onChange={(e) => setMessage(e.target.value)} />
        <button type="submit" className="rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium min-h-[44px]">
          Add to hub
        </button>
      </form>

      <h2 className="font-semibold mb-2">Recent</h2>
      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {(hub?.recent ?? []).map((e) => (
          <li key={e.id} className="p-4 text-sm">
            <span className="font-medium capitalize">{e.source}</span>
            {' · '}
            {e.name || '—'}
            {e.phone ? ` · ${e.phone}` : ''}
            <p className="text-xs text-slate-500 mt-1">
              {e.message || ''} {e.created_at?.slice(0, 16)?.replace('T', ' ')}
            </p>
          </li>
        ))}
        {!hub?.recent?.length && <li className="p-4 text-sm text-slate-500">No leads yet.</li>}
      </ul>
    </div>
  );
}
