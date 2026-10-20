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

type AdminOrder = {
  id: string;
  number: string;
  tenant_name: string;
  tenant_slug: string;
  buyer_status: string;
  total: string | number;
  customer?: { name?: string | null; phone?: string | null } | null;
  order_date: string;
  track_path?: string | null;
};

type AdminLead = {
  id: string;
  tenant_name: string;
  tenant_slug: string;
  source: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
  created_at: string;
};

export default function AdminStorefrontsPage() {
  const [tab, setTab] = useState<'sites' | 'orders' | 'leads'>('sites');
  const [list, setList] = useState<Site[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [leads, setLeads] = useState<AdminLead[]>([]);
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
    apiGet<AdminOrder[]>('admin/storefronts/orders').then((r) => {
      if (Array.isArray(r.data)) setOrders(r.data);
    });
    apiGet<AdminLead[]>('admin/storefronts/leads').then((r) => {
      if (Array.isArray(r.data)) setLeads(r.data);
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

  async function backfill() {
    setError('');
    const { data, error: err } = await apiPost<{ created: number; tenants: number }>('admin/storefronts/backfill', {});
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else {
      setOk(`Published website + shop for missing tenants (${data?.created ?? 0} created of ${data?.tenants ?? 0}).`);
      load();
    }
  }

  return (
    <div>
      <PageHeader title="Storefronts & demand" description="Every tenant gets a public website and selling page. You can fetch their buyer orders and leads here.">
        <button type="button" onClick={() => void backfill()} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm min-h-[44px]">
          Backfill missing sites
        </button>
      </PageHeader>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {ok && <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm">{ok}</div>}
      <div className="mb-4 flex flex-wrap gap-2">
        {(['sites', 'orders', 'leads'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${tab === id ? 'bg-brand-600 text-white' : 'border border-slate-300 bg-white'}`}
          >
            {id === 'sites' ? 'Websites' : id === 'orders' ? `Orders (${orders.length})` : `Leads (${leads.length})`}
          </button>
        ))}
      </div>

      {tab === 'sites' && (
        <>
          {list.length === 0 && <p className="text-slate-600">No storefronts yet. Run backfill or wait for a new signup.</p>}
          <div className="space-y-4">
            {list.map((s) => (
              <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-semibold">{s.tenant_name} <span className="text-slate-500 font-normal">({s.tenant_slug})</span></p>
                    <p className="text-xs text-slate-500">slug {s.slug} · {s.is_published ? 'published' : 'draft'} · domain {s.domain_status}</p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <a className="text-brand-600 hover:underline" href={s.site_url} target="_blank" rel="noreferrer">Website</a>
                    <a className="text-brand-600 hover:underline" href={s.shop_url} target="_blank" rel="noreferrer">Shop</a>
                  </div>
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
        </>
      )}

      {tab === 'orders' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="p-3">Tenant</th>
                <th className="p-3">Order</th>
                <th className="p-3">Buyer</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-100">
                  <td className="p-3">{o.tenant_name}<div className="text-xs text-slate-500">{o.tenant_slug}</div></td>
                  <td className="p-3">{o.number}{o.track_path ? <a className="ml-2 text-brand-600" href={o.track_path} target="_blank" rel="noreferrer">track</a> : null}</td>
                  <td className="p-3">{o.customer?.name ?? '—'} · {o.customer?.phone ?? ''}</td>
                  <td className="p-3 capitalize">{o.buyer_status?.replace(/_/g, ' ')}</td>
                  <td className="p-3 text-right tabular-nums">₹{Number(o.total).toFixed(2)}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-slate-500">No portal orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'leads' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="p-3">Tenant</th>
                <th className="p-3">Source</th>
                <th className="p-3">Person</th>
                <th className="p-3">Message</th>
                <th className="p-3">When</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((e) => (
                <tr key={e.id} className="border-b border-slate-100">
                  <td className="p-3">{e.tenant_name}<div className="text-xs text-slate-500">{e.tenant_slug}</div></td>
                  <td className="p-3 capitalize">{e.source}</td>
                  <td className="p-3">{e.name ?? '—'} · {e.phone ?? e.email ?? ''}</td>
                  <td className="p-3 text-slate-600">{e.message ?? ''}</td>
                  <td className="p-3 text-xs text-slate-500">{e.created_at?.slice(0, 16)?.replace('T', ' ')}</td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-slate-500">No inbound leads yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
