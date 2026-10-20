'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { PageHeader } from '../components/PageHeader';

type HubCard = {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  pack_label?: string | null;
  wholesale_price: number;
  mrp?: number | null;
  eta_days: number;
  delivery_charge: number;
  suggested_margin_pct?: number | null;
  linked_item_id?: string | null;
};

type HubOrder = {
  id: string;
  number: string;
  status: string;
  total: number;
  delivery_date?: string | null;
  stock_received?: boolean;
  lines: Array<{ description: string; qty: number; wholesale_price: number }>;
};

export default function RestockHubPage() {
  const [tab, setTab] = useState<'catalog' | 'orders'>('catalog');
  const [items, setItems] = useState<HubCard[]>([]);
  const [orders, setOrders] = useState<HubOrder[]>([]);
  const [q, setQ] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadCatalog() {
    setLoading(true);
    setError('');
    const res = await apiGet<HubCard[]>(`hub/catalog${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
    if (res.error) setError(Array.isArray(res.error) ? res.error.join(' ') : res.error);
    else setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  }

  async function loadOrders() {
    setLoading(true);
    setError('');
    const res = await apiGet<HubOrder[]>('hub/orders');
    if (res.error) setError(Array.isArray(res.error) ? res.error.join(' ') : res.error);
    else setOrders(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  }

  useEffect(() => {
    apiGet<{ id: string; name: string }[]>('inventory/warehouses').then((r) => {
      const list = Array.isArray(r.data) ? r.data : [];
      setWarehouses(list);
      if (list[0]) setWarehouseId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (tab === 'catalog') loadCatalog();
    else loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function setQty(id: string, qty: number) {
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  const lines = Object.entries(cart).map(([hub_item_id, qty]) => ({ hub_item_id, qty }));
  const cartTotal = lines.reduce((sum, l) => {
    const item = items.find((i) => i.id === l.hub_item_id);
    return sum + (item ? item.wholesale_price * l.qty : 0);
  }, 0);

  async function placeOrder() {
    if (!lines.length) return;
    setBusy(true);
    setError('');
    setOk('');
    const { error: err } = await apiPost('hub/orders', {
      warehouse_id: warehouseId || undefined,
      lines,
    });
    setBusy(false);
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else {
      setOk('Restock order placed. Track it under Orders.');
      setCart({});
      setTab('orders');
    }
  }

  async function fromShortage() {
    setBusy(true);
    setError('');
    setOk('');
    const { data, error: err } = await apiPost<{
      placed?: boolean;
      message?: string;
      unmatched?: Array<{ name: string }>;
      order?: HubOrder;
    }>('hub/orders/from-shortage', {
      warehouse_id: warehouseId || undefined,
      only_linked: true,
      place: true,
    });
    setBusy(false);
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else if (!data?.placed) {
      setError(
        data?.message ||
          'Link shortage items to hub SKUs first (open a catalog item and link), then try again.',
      );
    } else {
      setOk(`Shortage order ${data.order?.number ?? ''} placed.`);
      setTab('orders');
    }
  }

  async function receive(order: HubOrder) {
    if (!warehouseId) {
      setError('Select a warehouse first');
      return;
    }
    setBusy(true);
    setError('');
    const { error: err } = await apiPost(`hub/orders/${order.id}/receive`, { warehouse_id: warehouseId });
    setBusy(false);
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else {
      setOk(`Stock received for ${order.number}`);
      loadOrders();
    }
  }

  return (
    <div>
      <PageHeader
        title="Restock Hub"
        description="Buy wholesale packs for your shop type. Compare margin vs MRP, ETA, and delivery charge. Order from shortage in one click."
      >
        <button
          type="button"
          onClick={fromShortage}
          disabled={busy}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm text-white min-h-[44px] disabled:opacity-50"
        >
          Order from shortage
        </button>
      </PageHeader>

      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {ok && <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm">{ok}</div>}

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={() => setTab('catalog')}
          className={`rounded-lg px-3 py-2 text-sm min-h-[40px] ${tab === 'catalog' ? 'bg-slate-900 text-white' : 'border border-slate-300'}`}
        >
          Catalog
        </button>
        <button
          type="button"
          onClick={() => setTab('orders')}
          className={`rounded-lg px-3 py-2 text-sm min-h-[40px] ${tab === 'orders' ? 'bg-slate-900 text-white' : 'border border-slate-300'}`}
        >
          My orders
        </button>
        {warehouses.length > 0 && (
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[40px]"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        )}
        <Link href="/organization/commerce" className="text-sm text-brand-600 hover:underline ml-auto">
          Online commerce settings
        </Link>
      </div>

      {tab === 'catalog' && (
        <>
          <div className="mb-4 flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search brand, name, barcode…"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[44px]"
            />
            <button type="button" onClick={loadCatalog} className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[44px]">
              Search
            </button>
          </div>
          {loading && <p className="text-slate-600">Loading…</p>}
          {!loading && items.length === 0 && (
            <p className="text-slate-600">No hub products for your shop type yet. Ask SMEBUZE admin to upload catalog.</p>
          )}
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white mb-24">
            {items.map((item) => (
              <li key={item.id} className="p-4 flex flex-wrap gap-3 items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{item.name}</p>
                  <p className="text-sm text-slate-500">
                    {[item.brand, item.pack_label, item.category].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-sm mt-1">
                    Wholesale ₹{item.wholesale_price.toFixed(2)}
                    {item.mrp != null && <> · MRP ₹{item.mrp.toFixed(2)}</>}
                    {item.suggested_margin_pct != null && (
                      <span className="text-emerald-700"> · ~{item.suggested_margin_pct}% margin</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    ETA {item.eta_days} day(s) · Delivery ₹{item.delivery_charge.toFixed(2)}
                    {item.linked_item_id ? ' · Linked to your item' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={cart[item.id] ?? ''}
                    onChange={(e) => setQty(item.id, Number(e.target.value) || 0)}
                    placeholder="Qty"
                    className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-sm min-h-[40px]"
                  />
                </div>
              </li>
            ))}
          </ul>
          {lines.length > 0 && (
            <div className="fixed bottom-0 inset-x-0 z-20 border-t border-slate-200 bg-white p-4 shadow-lg md:static md:border-0 md:shadow-none md:p-0 md:mt-4">
              <div className="mx-auto max-w-5xl flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium">{lines.length} lines · ≈ ₹{cartTotal.toFixed(2)} + delivery</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={placeOrder}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white min-h-[44px] disabled:opacity-50"
                >
                  Place restock order
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'orders' && (
        <>
          {loading && <p className="text-slate-600">Loading…</p>}
          {!loading && orders.length === 0 && <p className="text-slate-600">No restock orders yet.</p>}
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium">{o.number}</p>
                    <p className="text-sm text-slate-500">
                      {o.status}
                      {o.delivery_date ? ` · deliver by ${o.delivery_date}` : ''}
                      {' · '}₹{Number(o.total).toFixed(2)}
                    </p>
                  </div>
                  {!o.stock_received && ['dispatched', 'delivered', 'confirmed', 'packed'].includes(o.status) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => receive(o)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[40px]"
                    >
                      Receive into stock
                    </button>
                  )}
                  {o.stock_received && <span className="text-sm text-emerald-700">Stock received</span>}
                </div>
                <ul className="mt-2 text-sm text-slate-600">
                  {o.lines?.map((l, i) => (
                    <li key={i}>{l.description} × {l.qty} @ ₹{Number(l.wholesale_price).toFixed(2)}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
