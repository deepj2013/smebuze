'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { PageHeader } from '../../components/PageHeader';

type HubItem = {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  wholesale_price: number;
  mrp?: number | null;
  eta_days: number;
  delivery_charge: number;
  business_types: string[];
  active: boolean;
  pack_label?: string | null;
};

type HubOrder = {
  id: string;
  number: string;
  status: string;
  tenant_name?: string;
  total: number;
  delivery_date?: string | null;
  lines: Array<{ description: string; qty: number }>;
};

const BUSINESS_TYPES = [
  'department_store',
  'retail_shop',
  'pharmacy',
  'hardware_shop',
  'electronics_shop',
  'garment_shop',
  'sweet_shop',
  'bakery',
  'stationery_shop',
  'auto_parts',
  'florist',
  '*',
];

export default function AdminHubPage() {
  const [tab, setTab] = useState<'catalog' | 'orders'>('catalog');
  const [items, setItems] = useState<HubItem[]>([]);
  const [orders, setOrders] = useState<HubOrder[]>([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    brand: '',
    category: '',
    pack_label: '',
    wholesale_price: '',
    mrp: '',
    eta_days: '2',
    delivery_charge: '0',
    business_types: ['department_store'] as string[],
  });

  async function load() {
    setLoading(true);
    setError('');
    if (tab === 'catalog') {
      const r = await apiGet<HubItem[]>('admin/hub/catalog');
      if (r.error) setError(Array.isArray(r.error) ? r.error.join(' ') : r.error);
      else setItems(Array.isArray(r.data) ? r.data : []);
    } else {
      const r = await apiGet<HubOrder[]>('admin/hub/orders');
      if (r.error) setError(Array.isArray(r.error) ? r.error.join(' ') : r.error);
      else setOrders(Array.isArray(r.data) ? r.data : []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function createItem(e: FormEvent) {
    e.preventDefault();
    setError('');
    setOk('');
    const { error: err } = await apiPost('admin/hub/catalog', {
      name: form.name,
      brand: form.brand || undefined,
      category: form.category || undefined,
      pack_label: form.pack_label || undefined,
      wholesale_price: Number(form.wholesale_price),
      mrp: form.mrp ? Number(form.mrp) : undefined,
      eta_days: Number(form.eta_days) || 2,
      delivery_charge: Number(form.delivery_charge) || 0,
      business_types: form.business_types,
    });
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else {
      setOk('SKU added');
      setForm((f) => ({ ...f, name: '', brand: '', pack_label: '', wholesale_price: '', mrp: '' }));
      load();
    }
  }

  async function toggleActive(item: HubItem) {
    const { error: err } = await apiPatch(`admin/hub/catalog/${item.id}`, { active: !item.active });
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else load();
  }

  async function setStatus(order: HubOrder, status: string) {
    const { error: err } = await apiPatch(`admin/hub/orders/${order.id}`, { status });
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else {
      setOk(`${order.number} → ${status}`);
      load();
    }
  }

  function toggleType(t: string) {
    setForm((f) => {
      const has = f.business_types.includes(t);
      return {
        ...f,
        business_types: has ? f.business_types.filter((x) => x !== t) : [...f.business_types, t],
      };
    });
  }

  return (
    <div>
      <PageHeader
        title="Restock Hub (admin)"
        description="Upload wholesale SKUs by shop type. Fulfil tenant restock orders."
      />
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {ok && <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm">{ok}</div>}

      <div className="mb-4 flex gap-2">
        <button type="button" onClick={() => setTab('catalog')} className={`rounded-lg px-3 py-2 text-sm ${tab === 'catalog' ? 'bg-slate-900 text-white' : 'border'}`}>
          Catalog
        </button>
        <button type="button" onClick={() => setTab('orders')} className={`rounded-lg px-3 py-2 text-sm ${tab === 'orders' ? 'bg-slate-900 text-white' : 'border'}`}>
          Orders
        </button>
      </div>

      {tab === 'catalog' && (
        <>
          <form onSubmit={createItem} className="mb-6 rounded-xl border border-slate-200 bg-white p-4 grid gap-3 md:grid-cols-2">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name" className="rounded-lg border px-3 py-2 text-sm" />
            <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Brand" className="rounded-lg border px-3 py-2 text-sm" />
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category" className="rounded-lg border px-3 py-2 text-sm" />
            <input value={form.pack_label} onChange={(e) => setForm({ ...form, pack_label: e.target.value })} placeholder="Pack (e.g. 12×500g)" className="rounded-lg border px-3 py-2 text-sm" />
            <input required type="number" step="0.01" value={form.wholesale_price} onChange={(e) => setForm({ ...form, wholesale_price: e.target.value })} placeholder="Wholesale ₹" className="rounded-lg border px-3 py-2 text-sm" />
            <input type="number" step="0.01" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} placeholder="MRP ₹" className="rounded-lg border px-3 py-2 text-sm" />
            <input type="number" value={form.eta_days} onChange={(e) => setForm({ ...form, eta_days: e.target.value })} placeholder="ETA days" className="rounded-lg border px-3 py-2 text-sm" />
            <input type="number" step="0.01" value={form.delivery_charge} onChange={(e) => setForm({ ...form, delivery_charge: e.target.value })} placeholder="Delivery charge" className="rounded-lg border px-3 py-2 text-sm" />
            <div className="md:col-span-2">
              <p className="text-xs text-slate-500 mb-2">Shop types (* = all)</p>
              <div className="flex flex-wrap gap-2">
                {BUSINESS_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    className={`rounded-full px-3 py-1 text-xs border ${form.business_types.includes(t) ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="md:col-span-2 rounded-lg bg-brand-600 text-white px-4 py-2 text-sm min-h-[44px]">
              Add hub SKU
            </button>
          </form>
          {loading && <p className="text-slate-600">Loading…</p>}
          <ul className="divide-y rounded-xl border bg-white">
            {items.map((item) => (
              <li key={item.id} className="p-4 flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium">{item.name} {!item.active && <span className="text-red-600 text-xs">(inactive)</span>}</p>
                  <p className="text-sm text-slate-500">
                    ₹{item.wholesale_price} wholesale
                    {item.mrp != null && ` · MRP ₹${item.mrp}`}
                    {' · '}ETA {item.eta_days}d · {(item.business_types || []).join(', ')}
                  </p>
                </div>
                <button type="button" onClick={() => toggleActive(item)} className="rounded-lg border px-3 py-2 text-sm">
                  {item.active ? 'Deactivate' : 'Activate'}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === 'orders' && (
        <>
          {loading && <p className="text-slate-600">Loading…</p>}
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id} className="rounded-xl border bg-white p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium">{o.number} · {o.tenant_name}</p>
                    <p className="text-sm text-slate-500">{o.status} · ₹{Number(o.total).toFixed(2)}</p>
                    <ul className="text-sm text-slate-600 mt-1">
                      {o.lines?.map((l, i) => (
                        <li key={i}>{l.description} × {l.qty}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['confirmed', 'packed', 'dispatched', 'delivered', 'cancelled'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={o.status === s}
                        onClick={() => setStatus(o, s)}
                        className="rounded-lg border px-2 py-1 text-xs disabled:opacity-40"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
