'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { PageHeader } from '../../components/PageHeader';

type Site = {
  id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  slug: string;
  custom_domain: string | null;
  domain_status: string;
  domain_notes: string | null;
  is_published: boolean;
  shop_url: string;
  site_url: string;
  dns_hint: string;
};

type Pack = { id: string; title: string; blurb: string; shop_checkout: boolean };

export default function AdminStorefrontsPage() {
  const [list, setList] = useState<Site[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [domain, setDomain] = useState<Record<string, string>>({});
  const [packFor, setPackFor] = useState<Record<string, string>>({});

  function load() {
    apiGet<Site[]>('admin/storefronts').then((r) => {
      if (r.error) setError(Array.isArray(r.error) ? r.error.join(' ') : r.error);
      else setList(Array.isArray(r.data) ? r.data : []);
    });
    apiGet<Pack[]>('growth/packs').then((r) => {
      if (Array.isArray(r.data)) setPacks(r.data);
    });
  }

  useEffect(() => { load(); }, []);

  async function saveDomain(s: Site, status?: string) {
    setError('');
    setOk('');
    const { error: err } = await apiPatch(`admin/storefronts/${s.id}`, {
      custom_domain: domain[s.id] ?? s.custom_domain,
      domain_status: status || (s.custom_domain || domain[s.id] ? 'pending_dns' : 'none'),
    });
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else {
      setOk('Domain mapping saved. Client should CNAME to smebuze.com, then mark Active.');
      load();
    }
  }

  async function applyPack(s: Site) {
    const type = packFor[s.id];
    if (!type) return;
    setError('');
    const { error: err } = await apiPost(`admin/storefronts/${s.tenant_id}/packs/${type}`, { force: false });
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else {
      setOk(`Applied ${type} pack to ${s.tenant_name}`);
      load();
    }
  }

  return (
    <div>
      <PageHeader title="Storefronts & domains" description="Platform admin: bind a custom domain, mark DNS active, or apply a one-click client pack." />
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {ok && <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm">{ok}</div>}
      {list.length === 0 && <p className="text-slate-600">No storefronts yet. A tenant creates one from Website or by applying a pack.</p>}
      <div className="space-y-4">
        {list.map((s) => (
          <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-semibold">{s.tenant_name} <span className="text-slate-500 font-normal">({s.tenant_slug})</span></p>
                <p className="text-xs text-slate-500">slug {s.slug} · {s.is_published ? 'published' : 'draft'} · domain {s.domain_status}</p>
              </div>
              <a className="text-sm text-brand-600 hover:underline" href={s.shop_url} target="_blank" rel="noreferrer">Open shop</a>
            </div>
            <p className="text-xs text-slate-500">{s.dns_hint}</p>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                placeholder="shop.brand.com"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-56"
                value={domain[s.id] ?? s.custom_domain ?? ''}
                onChange={(e) => setDomain((d) => ({ ...d, [s.id]: e.target.value }))}
              />
              <button type="button" onClick={() => saveDomain(s, 'pending_dns')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Save domain</button>
              <button type="button" onClick={() => saveDomain(s, 'active')} className="rounded-lg bg-brand-600 text-white px-3 py-2 text-sm">Mark active</button>
              <button type="button" onClick={() => saveDomain(s, 'disabled')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Disable</button>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={packFor[s.id] || ''} onChange={(e) => setPackFor((p) => ({ ...p, [s.id]: e.target.value }))}>
                <option value="">One-click pack…</option>
                {packs.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <button type="button" onClick={() => applyPack(s)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Apply pack</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
