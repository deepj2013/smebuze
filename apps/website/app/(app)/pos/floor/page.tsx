'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { KITCHEN_LABEL, minutesAgo, statusClass, type FloorSnapshot, type FloorTicket } from '@/lib/floor';
import { useToast } from '../../components/ToastContext';
import FloorSwitcher from '../../components/FloorSwitcher';
import { Plus, Trash2 } from 'lucide-react';

type MenuItem = {
  id: string;
  name: string;
  category?: string | null;
  sale_price?: string | number | null;
  mrp?: string | number | null;
  unit?: string | null;
};

export default function RestaurantAdminPage() {
  const { success, error: showError } = useToast();
  const [snap, setSnap] = useState<FloorSnapshot | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<'live' | 'tables' | 'menu'>('live');
  const [tablesDraft, setTablesDraft] = useState<string[]>([]);
  const [newTable, setNewTable] = useState('');
  const [savingTables, setSavingTables] = useState(false);
  const [dish, setDish] = useState({ name: '', category: 'Mains', price: '', unit: 'plate' });
  const [savingDish, setSavingDish] = useState(false);

  const load = useCallback(async () => {
    const [floorRes, itemRes] = await Promise.all([
      apiGet<FloorSnapshot>('sales/floor'),
      apiGet<MenuItem[] | { data: MenuItem[] }>('inventory/items'),
    ]);
    if (floorRes.data) {
      setSnap(floorRes.data);
      setTablesDraft(floorRes.data.tables ?? []);
    }
    const list = Array.isArray(itemRes.data) ? itemRes.data : itemRes.data?.data ?? [];
    setItems(list.filter((i) => i.id));
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [load]);

  const open = snap?.open ?? [];
  const todayTickets = snap?.tickets ?? [];
  const billed = todayTickets.filter((t) => t.kitchen_status === 'billed');
  const sales = billed.reduce((s, t) => s + t.total, 0);
  const occupied = open.length;
  const free = (snap?.tables.length ?? 0) - occupied;

  const lag = useMemo(() => {
    const cooking = open.filter((t) => t.kitchen_status === 'sent' || t.kitchen_status === 'preparing');
    if (!cooking.length) return 0;
    return Math.round(
      cooking.reduce((s, t) => s + (Date.now() - new Date(t.created_at).getTime()) / 60000, 0) / cooking.length,
    );
  }, [open]);

  const bill = async (t: FloorTicket, mode: 'cash' | 'upi') => {
    setBusy(t.id);
    try {
      const { error } = await apiPost(`sales/floor/tickets/${t.id}/bill`, { mode });
      if (error) { showError(error); return; }
      success(`${t.table_no} billed`);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const addTable = () => {
    const name = newTable.trim().toUpperCase() || `T${tablesDraft.length + 1}`;
    if (tablesDraft.some((t) => t.toLowerCase() === name.toLowerCase())) {
      showError('That table already exists.');
      return;
    }
    setTablesDraft((prev) => [...prev, name]);
    setNewTable('');
  };

  const saveTables = async () => {
    setSavingTables(true);
    try {
      const { data, error } = await apiPatch<FloorSnapshot>('sales/floor/tables', { tables: tablesDraft });
      if (error) { showError(error); return; }
      if (data) setSnap(data);
      success('Tables saved. Waiter and kitchen will use this list.');
    } finally {
      setSavingTables(false);
    }
  };

  const addDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dish.name.trim()) { showError('Dish name is required.'); return; }
    const price = Number(dish.price);
    if (!Number.isFinite(price) || price < 0) { showError('Enter a price.'); return; }
    setSavingDish(true);
    try {
      const { error } = await apiPost('inventory/items', {
        name: dish.name.trim(),
        category: dish.category.trim() || 'Mains',
        unit: dish.unit || 'plate',
        sale_price: price,
        mrp: price,
        hsn_sac: '996331',
        tax_rate: 5,
      });
      if (error) { showError(error); return; }
      success(`${dish.name.trim()} added to the menu.`);
      setDish((d) => ({ ...d, name: '', price: '' }));
      await load();
    } finally {
      setSavingDish(false);
    }
  };

  const tabs = [
    { id: 'live' as const, label: 'Live floor' },
    { id: 'tables' as const, label: 'Tables' },
    { id: 'menu' as const, label: 'Food menu' },
  ];

  return (
    <div>
      <FloorSwitcher role="Restaurant admin" />
      <div
        className="rounded-2xl p-4 sm:p-5 mb-4 text-white"
        style={{ background: 'linear-gradient(135deg, var(--tenant-hero-from), var(--tenant-hero-to))' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Floor</p>
        <h1 className="text-2xl font-bold">Restaurant admin</h1>
        <p className="text-sm text-white/90">Create tables and dishes here. Waiter picks food; kitchen sees tickets; POS settles the bill.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold min-h-[40px] ${
              tab === t.id ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap gap-2">
          <Link href="/pos/waiter" className="rounded-lg bg-brand-600 text-white px-3 py-2 text-sm font-semibold">Waiter</Link>
          <Link href="/pos/kitchen" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">Kitchen</Link>
          <Link href="/pos" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">POS</Link>
        </div>
      </div>

      {tab === 'live' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Occupied tables', value: String(occupied) },
              { label: 'Free tables', value: String(free) },
              { label: 'Avg kitchen wait', value: lag ? `${lag} min` : '—' },
              { label: 'Billed (session)', value: `₹${sales.toFixed(0)}` },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">{s.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{s.value}</p>
              </div>
            ))}
          </div>

          <h2 className="font-semibold text-slate-900 mb-2">Tables now</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-6">
            {(snap?.tables ?? []).map((name) => {
              const t = snap?.by_table?.[name];
              return (
                <div key={name} className={`rounded-xl border p-3 ${t ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                  <p className="font-bold">{name}</p>
                  <p className="text-xs text-slate-600">{t ? `${KITCHEN_LABEL[t.kitchen_status]} · ₹${t.total.toFixed(0)}` : 'Free'}</p>
                </div>
              );
            })}
          </div>

          <h2 className="font-semibold text-slate-900 mb-2">All tickets</h2>
          <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 font-medium">Ticket</th>
                  <th className="text-left p-3 font-medium">Table</th>
                  <th className="text-left p-3 font-medium">Kitchen</th>
                  <th className="text-left p-3 font-medium">Waiter</th>
                  <th className="text-left p-3 font-medium">Age</th>
                  <th className="text-right p-3 font-medium">Total</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {todayTickets.length === 0 ? (
                  <tr><td colSpan={7} className="p-6 text-center text-slate-500">No tickets yet. Add dishes under Food menu, then take an order on Waiter.</td></tr>
                ) : todayTickets.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3 font-medium">{t.number}</td>
                    <td className="p-3">{t.table_no}</td>
                    <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(t.kitchen_status)}`}>{KITCHEN_LABEL[t.kitchen_status]}</span></td>
                    <td className="p-3">{t.waiter_name || '—'}</td>
                    <td className="p-3 text-slate-500">{minutesAgo(t.created_at)}</td>
                    <td className="p-3 text-right font-semibold">₹{t.total.toFixed(0)}</td>
                    <td className="p-3 text-right">
                      {t.kitchen_status !== 'billed' && t.kitchen_status !== 'cancelled' ? (
                        <button type="button" disabled={busy === t.id} onClick={() => void bill(t, 'upi')} className="text-brand-700 font-semibold disabled:opacity-50">
                          Bill UPI
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'tables' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 max-w-2xl">
          <h2 className="font-bold text-slate-900">Your dining tables</h2>
          <p className="text-sm text-slate-600 mt-1">Add T1, T2, outdoor seats — whatever the waiter should tap. Kitchen and POS use the same list.</p>
          <div className="mt-4 flex gap-2">
            <input
              value={newTable}
              onChange={(e) => setNewTable(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTable(); } }}
              placeholder="e.g. T13 or Patio-1"
              className="flex-1 rounded-xl border border-slate-300 px-3 py-3 min-h-[48px]"
            />
            <button type="button" onClick={addTable} className="rounded-xl bg-slate-900 text-white px-4 font-semibold inline-flex items-center gap-1">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          <ul className="mt-4 space-y-2">
            {tablesDraft.map((name, idx) => (
              <li key={`${name}-${idx}`} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                <input
                  value={name}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTablesDraft((prev) => prev.map((t, i) => (i === idx ? v : t)));
                  }}
                  className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 font-semibold"
                />
                <button
                  type="button"
                  className="text-slate-400 hover:text-rose-600 p-2"
                  onClick={() => setTablesDraft((prev) => prev.filter((_, i) => i !== idx))}
                  aria-label={`Remove ${name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTablesDraft(Array.from({ length: 12 }, (_, i) => `T${i + 1}`))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium"
            >
              Reset to T1–T12
            </button>
            <button
              type="button"
              disabled={savingTables || !tablesDraft.length}
              onClick={() => void saveTables()}
              className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {savingTables ? 'Saving…' : 'Save tables'}
            </button>
          </div>
        </div>
      )}

      {tab === 'menu' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <form onSubmit={addDish} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="font-bold text-slate-900">Add a dish</h2>
            <p className="text-sm text-slate-600 mt-1">Shows on the waiter screen immediately. No barcode needed for restaurant food.</p>
            <label className="mt-4 block text-xs font-semibold text-slate-600">
              Name
              <input
                value={dish.name}
                onChange={(e) => setDish((d) => ({ ...d, name: e.target.value }))}
                placeholder="Butter Chicken"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 min-h-[48px]"
                required
              />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-slate-600">
                Category
                <input
                  value={dish.category}
                  onChange={(e) => setDish((d) => ({ ...d, category: e.target.value }))}
                  placeholder="Mains"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Price (₹)
                <input
                  value={dish.price}
                  onChange={(e) => setDish((d) => ({ ...d, price: e.target.value }))}
                  inputMode="decimal"
                  placeholder="280"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3"
                  required
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={savingDish}
              className="mt-4 w-full rounded-xl bg-brand-600 text-white py-3 font-semibold min-h-[48px] disabled:opacity-50"
            >
              {savingDish ? 'Saving…' : 'Add to menu'}
            </button>
          </form>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="font-bold text-slate-900">On the menu ({items.length})</h2>
            <p className="text-sm text-slate-600 mt-1">Waiter taps these when taking an order.</p>
            <ul className="mt-3 max-h-[420px] overflow-y-auto divide-y divide-slate-100">
              {items.length === 0 ? (
                <li className="py-8 text-center text-slate-500 text-sm">No dishes yet. Add Butter Chicken, Naan, etc. above.</li>
              ) : items.map((i) => (
                <li key={i.id} className="py-2.5 flex justify-between gap-2 text-sm">
                  <span>
                    <span className="font-semibold text-slate-900">{i.name}</span>
                    {i.category ? <span className="text-slate-500"> · {i.category}</span> : null}
                  </span>
                  <span className="font-semibold tabular-nums">₹{Number(i.sale_price ?? i.mrp ?? 0).toFixed(0)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
