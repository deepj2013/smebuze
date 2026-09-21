'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { posSellingRate } from '@/lib/business-types';
import { KITCHEN_LABEL, minutesAgo, statusClass, type FloorSnapshot, type FloorTicket } from '@/lib/floor';
import { useToast } from '../../components/ToastContext';
import FloorSwitcher from '../../components/FloorSwitcher';
import { Minus, Plus, Search, Send } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  category?: string | null;
  sale_price?: string | number | null;
  mrp?: string | number | null;
  unit?: string | null;
}

type CartLine = { item_id: string; name: string; qty: number; rate: number };

export default function WaiterPage() {
  const { success, error: showError } = useToast();
  const [snap, setSnap] = useState<FloorSnapshot | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [table, setTable] = useState<string | null>(null);
  const [covers, setCovers] = useState(2);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [busy, setBusy] = useState(false);
  const [waiter, setWaiter] = useState('Waiter');

  const load = useCallback(async () => {
    const [floorRes, itemRes, meRes] = await Promise.all([
      apiGet<FloorSnapshot>('sales/floor'),
      apiGet<MenuItem[] | { data: MenuItem[] }>('inventory/items'),
      apiGet<{ user?: { name?: string } }>('auth/me'),
    ]);
    if (floorRes.data) setSnap(floorRes.data);
    const list = Array.isArray(itemRes.data) ? itemRes.data : itemRes.data?.data ?? [];
    setItems(list.filter((i) => i.id));
    if (meRes.data?.user?.name) setWaiter(meRes.data.user.name);
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [load]);

  const openTicket: FloorTicket | null = table && snap?.by_table?.[table] ? snap.by_table[table] : null;
  const cats = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => { if (i.category?.trim()) set.add(i.category.trim()); });
    return ['all', ...Array.from(set).sort()];
  }, [items]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (category !== 'all' && (i.category || '') !== category) return false;
      if (!q) return true;
      return i.name.toLowerCase().includes(q);
    });
  }, [items, category, query]);

  const add = (item: MenuItem) => {
    const rate = posSellingRate(item);
    setCart((prev) => {
      const hit = prev.find((l) => l.item_id === item.id);
      if (hit) return prev.map((l) => (l.item_id === item.id ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { item_id: item.id, name: item.name, qty: 1, rate }];
    });
  };

  const send = async () => {
    if (!table) { showError('Pick a table first.'); return; }
    if (!cart.length) { showError('Add dishes before sending to kitchen.'); return; }
    setBusy(true);
    try {
      const { error } = await apiPost('sales/floor/tickets', {
        table_no: table,
        covers,
        waiter_name: waiter,
        lines: cart.map((l) => ({ item_id: l.item_id, qty: l.qty })),
      });
      if (error) { showError(error); return; }
      success(`Sent to kitchen · ${table}`);
      setCart([]);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <FloorSwitcher role="Waiter" />
      <div
        className="rounded-2xl p-4 sm:p-5 mb-4 text-white"
        style={{ background: 'linear-gradient(135deg, var(--tenant-hero-from), var(--tenant-hero-to))' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Floor</p>
        <h1 className="text-2xl font-bold">Waiter</h1>
        <p className="text-sm text-white/90">Tap a table, pick dishes, send to kitchen. No billing here — cashier settles on POS.</p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-5">
        {(snap?.tables ?? []).map((name) => {
          const occ = snap?.by_table?.[name];
          const on = table === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => setTable(name)}
              className={`rounded-xl border min-h-[72px] p-2 text-left ${
                on
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : occ
                    ? 'border-amber-300 bg-amber-50 text-amber-950'
                    : 'border-slate-200 bg-white text-slate-800'
              }`}
            >
              <p className="font-bold">{name}</p>
              <p className={`text-[11px] ${on ? 'text-white/80' : 'text-slate-500'}`}>
                {occ ? `${KITCHEN_LABEL[occ.kitchen_status]} · ₹${occ.total.toFixed(0)}` : 'Free'}
              </p>
            </button>
          );
        })}
      </div>

      {!table ? (
        <p className="text-sm text-slate-600">Select a table to take an order.</p>
      ) : (
        <div className="grid lg:grid-cols-[1fr_320px] gap-4">
          <div>
            {openTicket && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(openTicket.kitchen_status)}`}>
                    {KITCHEN_LABEL[openTicket.kitchen_status]}
                  </span>
                  <span className="text-slate-500">{openTicket.number} · {minutesAgo(openTicket.created_at)}</span>
                </div>
                <ul className="mt-2 text-slate-800">
                  {openTicket.lines.map((l) => (
                    <li key={l.id}>{l.qty} × {l.name}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search menu"
                  className="w-full rounded-xl border border-slate-300 pl-10 pr-3 py-3 min-h-[48px]"
                />
              </div>
              <input
                type="number"
                min={1}
                value={covers}
                onChange={(e) => setCovers(Math.max(1, Number(e.target.value) || 1))}
                className="w-20 rounded-xl border border-slate-300 px-2 text-center"
                title="Covers"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
              {cats.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`shrink-0 rounded-full px-3 py-2 text-sm font-medium ${
                    category === c ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200'
                  }`}
                >
                  {c === 'all' ? 'All' : c}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {visible.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => add(item)}
                  className="text-left rounded-xl border border-slate-200 bg-white p-3 hover:border-brand-400 min-h-[88px]"
                >
                  <p className="font-semibold text-slate-900 line-clamp-2">{item.name}</p>
                  <p className="mt-1 font-bold text-brand-700">₹{posSellingRate(item).toFixed(0)}</p>
                </button>
              ))}
            </div>
          </div>
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 h-fit sticky top-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Ticket · {table}</p>
            <h2 className="font-bold text-lg text-slate-900">{openTicket ? 'Add to ticket' : 'New kitchen ticket'}</h2>
            {cart.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Tap dishes to build this round.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {cart.map((l) => (
                  <li key={l.item_id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 min-w-0 truncate">{l.name}</span>
                    <button type="button" className="rounded-md border p-1" onClick={() => setCart((p) => p.map((x) => x.item_id === l.item_id ? { ...x, qty: x.qty - 1 } : x).filter((x) => x.qty > 0))}><Minus className="h-3 w-3" /></button>
                    <span className="w-6 text-center font-semibold">{l.qty}</span>
                    <button type="button" className="rounded-md border p-1" onClick={() => setCart((p) => p.map((x) => x.item_id === l.item_id ? { ...x, qty: x.qty + 1 } : x))}><Plus className="h-3 w-3" /></button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              disabled={busy || !cart.length}
              onClick={() => void send()}
              className="mt-4 w-full rounded-xl bg-brand-600 text-white py-3 font-semibold min-h-[48px] inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> Send to kitchen
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
