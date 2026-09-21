'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { PageHeader } from '../components/PageHeader';

type CatalogItem = {
  id: string;
  sku?: string | null;
  name: string;
  category?: string | null;
  sale_price?: string | null;
  mrp?: string | null;
  image_urls?: string[];
  for_sale?: boolean;
  portal_listed?: boolean;
};

type Site = { slug: string; shop_url?: string; site_url?: string; is_published?: boolean };

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  async function load() {
    setLoading(true);
    const [cat, st] = await Promise.all([apiGet<CatalogItem[]>('growth/catalog'), apiGet<Site>('growth/site')]);
    if (cat.error) setError(Array.isArray(cat.error) ? cat.error.join(' ') : cat.error);
    else setItems(Array.isArray(cat.data) ? cat.data : []);
    if (st.data) setSite(st.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggle(item: CatalogItem) {
    setError('');
    const { error: err } = await apiPatch(`growth/catalog/${item.id}`, { portal_listed: !item.portal_listed });
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else setItems((list) => list.map((i) => (i.id === item.id ? { ...i, portal_listed: !item.portal_listed } : i)));
  }

  async function listAll(listed: boolean) {
    setError('');
    setOk('');
    const { data, error: err } = await apiPost<{ updated: number }>('growth/catalog/list-all', { listed });
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else {
      setOk(`${listed ? 'Listed' : 'Unlisted'} ${data?.updated ?? 0} items`);
      load();
    }
  }

  const listed = items.filter((i) => i.portal_listed).length;

  return (
    <div>
      <PageHeader title="Public catalog" description="Choose which items buyers see on your shop. Orders land in Portal orders.">
        <button type="button" onClick={() => listAll(true)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[44px]">List all for sale</button>
        <button type="button" onClick={() => listAll(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[44px]">Unlist all</button>
      </PageHeader>
      {site && (
        <p className="mb-4 text-sm text-slate-600">
          Shop: {site.shop_url ? <a className="text-brand-600 hover:underline" href={site.shop_url} target="_blank" rel="noreferrer">{site.shop_url}</a> : 'Publish your website first.'}
          {' · '}
          <Link href="/website" className="text-brand-600 hover:underline">Edit website</Link>
          {' · '}
          {listed} of {items.length} listed
        </p>
      )}
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {ok && <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm">{ok}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && items.length === 0 && <p className="text-slate-600">No items yet. Add items in Inventory first.</p>}
      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{item.name}</p>
              <p className="text-xs text-slate-500">{item.sku || '—'} · {item.category || 'No category'} · ₹{Number(item.sale_price ?? item.mrp ?? 0).toFixed(2)}</p>
              {!item.for_sale && <p className="text-xs text-amber-700">Not marked for sale — listing will not show until you turn For sale on.</p>}
            </div>
            <label className="flex items-center gap-2 text-sm min-h-[44px]">
              <input type="checkbox" checked={Boolean(item.portal_listed)} onChange={() => toggle(item)} />
              Show on shop
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
