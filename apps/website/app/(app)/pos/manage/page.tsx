'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { useToast } from '../../components/ToastContext';
import PosSwitcher from '../../components/PosSwitcher';
import { posSellingRate } from '@/lib/business-types';
import BarcodeCapture from '../../components/BarcodeCapture';
import { limitDecimalPlaces, parseMoney } from '@/lib/money';

interface Category {
  id: string;
  name: string;
}

interface ShopItem {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  category?: string | null;
  unit?: string | null;
  cost_price?: string | number | null;
  mrp?: string | number | null;
  sale_price?: string | number | null;
  discount_percent?: string | number | null;
  current_stock?: number;
  reorder_level?: string | number | null;
}

interface ShortItem {
  item_id: string;
  name: string;
  sku?: string | null;
  category?: string | null;
  current_stock: number;
  reorder_level: number;
}

interface TodayBill {
  id: string;
  number: string;
  total?: string | number;
  paid_amount?: string | number;
  invoice_date?: string;
  customer?: { name?: string };
}

const emptyItem = {
  name: '',
  barcode: '',
  category: '',
  unit: 'pcs',
  cost_price: '',
  mrp: '',
  sale_price: '',
  discount_percent: '',
  opening_qty: '',
  reorder_level: '',
};

export default function PosManagePage() {
  const { success, error: showError } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [short, setShort] = useState<ShortItem[]>([]);
  const [bills, setBills] = useState<TodayBill[]>([]);
  const [selected, setSelected] = useState('all');
  const [newCat, setNewCat] = useState('');
  const [form, setForm] = useState(emptyItem);
  const [savingCat, setSavingCat] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  const load = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [catRes, itemRes, shortRes, billRes] = await Promise.all([
      apiGet<Category[]>('inventory/categories'),
      apiGet<ShopItem[]>('inventory/items?with_stock=1'),
      apiGet<ShortItem[]>('inventory/stock/low'),
      apiGet<TodayBill[]>(`sales/invoices?from=${today}&limit=12`),
    ]);
    if (Array.isArray(catRes.data)) setCategories(catRes.data);
    if (Array.isArray(itemRes.data)) setItems(itemRes.data);
    if (Array.isArray(shortRes.data)) setShort(shortRes.data);
    if (Array.isArray(billRes.data)) setBills(billRes.data);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  const visible = useMemo(() => {
    if (selected === 'all') return items;
    if (selected === 'uncat') return items.filter((i) => !i.category?.trim());
    return items.filter((i) => (i.category || '') === selected);
  }, [items, selected]);

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCat.trim();
    if (!name) return;
    setSavingCat(true);
    const { data, error } = await apiPost<Category>('inventory/categories', { name });
    setSavingCat(false);
    if (error) {
      showError(error);
      return;
    }
    setNewCat('');
    success('Category added.');
    if (data?.name) {
      setSelected(data.name);
      setForm((f) => ({ ...f, category: data.name }));
    }
    load();
  };

  const renameCategory = async (id: string, name: string) => {
    const next = window.prompt('Rename category', name);
    if (!next?.trim() || next.trim() === name) return;
    const { error } = await apiPatch(`inventory/categories/${id}`, { name: next.trim() });
    if (error) showError(error);
    else {
      success('Category renamed.');
      setSelected(next.trim());
      load();
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showError('Item name is required.');
      return;
    }
    setSavingItem(true);
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      barcode: form.barcode.trim() || undefined,
      category: form.category || (selected !== 'all' && selected !== 'uncat' ? selected : undefined),
      unit: form.unit || 'pcs',
    };
    if (form.cost_price !== '') body.cost_price = parseMoney(form.cost_price);
    if (form.mrp !== '') body.mrp = parseMoney(form.mrp);
    if (form.sale_price !== '') body.sale_price = parseMoney(form.sale_price);
    else if (form.mrp !== '') body.sale_price = parseMoney(form.mrp);
    if (form.discount_percent !== '') body.discount_percent = parseMoney(form.discount_percent);
    if (form.opening_qty !== '') body.opening_qty = parseMoney(form.opening_qty);
    if (form.reorder_level !== '') body.reorder_level = parseMoney(form.reorder_level);
    const { error } = await apiPost('inventory/items', body);
    setSavingItem(false);
    if (error) {
      showError(error);
      return;
    }
    success('Item saved. It will show on the counter.');
    setForm({ ...emptyItem, category: form.category || (selected !== 'all' && selected !== 'uncat' ? selected : '') });
    load();
  };

  return (
    <div>
      <PosSwitcher />
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Shop</p>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Manage categories and items</h1>
          <p className="text-sm text-slate-600">Create a category, add items with cost, MRP and sale price, then switch back to the counter to bill.</p>
        </div>
        <Link href="/pos" className="rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-semibold min-h-[44px] inline-flex items-center justify-center">
          Open counter
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-slate-900 mb-3">Categories</h2>
            <form onSubmit={addCategory} className="flex gap-2 mb-3">
              <input
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder="e.g. Hot drinks, Sarees, Namkeen"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
              />
              <button type="submit" disabled={savingCat} className="rounded-lg bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                {savingCat ? 'Saving…' : 'Add'}
              </button>
            </form>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelected('all')}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${selected === 'all' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelected(c.name);
                    setForm((f) => ({ ...f, category: c.name }));
                  }}
                  onDoubleClick={() => renameCategory(c.id, c.name)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${selected === c.name ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                  title="Double-click to rename"
                >
                  {c.name}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">Double-click a category to rename it. Items keep the new name.</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-slate-900 mb-1">Add item{selected !== 'all' && selected !== 'uncat' ? ` in ${selected}` : ''}</h2>
            <p className="text-xs text-slate-500 mb-3">Sale price is what the counter charges. Discount is optional. Cost stays in the shop, not on the bill.</p>
            <form onSubmit={addItem} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <label className="text-xs font-medium text-slate-600 sm:col-span-2 lg:col-span-1">
                Name
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[44px]" />
              </label>
              <label className="text-xs font-medium text-slate-600 sm:col-span-2">
                Barcode
                <span className="mt-1 flex gap-2">
                  <input
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    placeholder="Scan or type"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[44px]"
                  />
                  <BarcodeCapture onDetected={(code) => setForm((f) => ({ ...f, barcode: code }))} label="Scan" />
                </span>
              </label>
              <label className="text-xs font-medium text-slate-600">
                Category
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[44px]">
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                Unit
                <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[44px]" />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Cost price
                <input type="text" inputMode="decimal" min={0} value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: limitDecimalPlaces(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[44px]" />
              </label>
              <label className="text-xs font-medium text-slate-600">
                MRP
                <input type="text" inputMode="decimal" min={0} value={form.mrp} onChange={(e) => setForm({ ...form, mrp: limitDecimalPlaces(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[44px]" />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Sale price
                <input type="text" inputMode="decimal" min={0} value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: limitDecimalPlaces(e.target.value) })} placeholder="Same as MRP if empty" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[44px]" />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Discount % (optional)
                <input type="text" inputMode="decimal" min={0} max={100} value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: limitDecimalPlaces(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[44px]" />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Opening stock
                <input type="text" inputMode="decimal" min={0} value={form.opening_qty} onChange={(e) => setForm({ ...form, opening_qty: limitDecimalPlaces(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[44px]" />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Alert when stock ≤
                <input type="text" inputMode="decimal" min={0} value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: limitDecimalPlaces(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[44px]" />
              </label>
              <div className="sm:col-span-2 lg:col-span-3">
                <button type="submit" disabled={savingItem} className="rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50 min-h-[44px]">
                  {savingItem ? 'Saving…' : 'Save item'}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">{visible.length} item{visible.length === 1 ? '' : 's'}</h2>
              <Link href="/inventory/stock/receive" className="text-sm font-medium text-brand-700 hover:underline">Receive stock</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left p-3 font-medium">Item</th>
                    <th className="text-left p-3 font-medium">Barcode</th>
                    <th className="text-left p-3 font-medium">Category</th>
                    <th className="text-right p-3 font-medium">Cost</th>
                    <th className="text-right p-3 font-medium">MRP</th>
                    <th className="text-right p-3 font-medium">Sale</th>
                    <th className="text-right p-3 font-medium">Disc.</th>
                    <th className="text-right p-3 font-medium">Counter</th>
                    <th className="text-right p-3 font-medium">Stock</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? (
                    <tr><td colSpan={10} className="p-6 text-center text-slate-500">No items in this category yet.</td></tr>
                  ) : (
                    visible.map((i) => {
                      const rate = posSellingRate(i);
                      const stock = Number(i.current_stock ?? 0);
                      const reorder = Number(i.reorder_level ?? 0);
                      const isShort = (reorder > 0 && stock <= reorder) || stock <= 0;
                      return (
                        <tr key={i.id} className={`border-t border-slate-100 ${isShort ? 'bg-amber-50/60' : ''}`}>
                          <td className="p-3 font-medium text-slate-900">{i.name}</td>
                          <td className="p-3 font-mono text-xs text-slate-600">{i.barcode || '—'}</td>
                          <td className="p-3 text-slate-600">{i.category || '—'}</td>
                          <td className="p-3 text-right tabular-nums">{i.cost_price != null && i.cost_price !== '' ? Number(i.cost_price).toFixed(2) : '—'}</td>
                          <td className="p-3 text-right tabular-nums">{i.mrp != null && i.mrp !== '' ? Number(i.mrp).toFixed(2) : '—'}</td>
                          <td className="p-3 text-right tabular-nums">{i.sale_price != null && i.sale_price !== '' ? Number(i.sale_price).toFixed(2) : '—'}</td>
                          <td className="p-3 text-right tabular-nums">{i.discount_percent ? `${Number(i.discount_percent)}%` : '—'}</td>
                          <td className="p-3 text-right font-semibold tabular-nums text-brand-800">₹{rate.toFixed(2)}</td>
                          <td className={`p-3 text-right font-medium tabular-nums ${isShort ? 'text-amber-800' : ''}`}>{stock}</td>
                          <td className="p-3"><Link href={`/inventory/items/${i.id}/edit`} className="text-brand-600 hover:underline">Edit</Link></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="font-semibold text-amber-950">Short items (live)</h2>
            <p className="text-xs text-amber-800 mt-0.5 mb-3">Out of stock or at/below the alert level. Refreshes every 20 seconds.</p>
            {short.length === 0 ? (
              <p className="text-sm text-amber-900">None short right now.</p>
            ) : (
              <ul className="space-y-2">
                {short.map((s) => (
                  <li key={s.item_id} className="flex justify-between gap-2 text-sm">
                    <span className="font-medium text-amber-950">{s.name}</span>
                    <span className="tabular-nums text-amber-900">Stock {s.current_stock}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/inventory/stock/receive" className="mt-3 inline-block text-sm font-semibold text-amber-950 underline">Add stock</Link>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-slate-900">Today’s bills</h2>
            <p className="text-xs text-slate-500 mt-0.5 mb-3">Cash, UPI and card work now. More payment options will be added later.</p>
            {bills.length === 0 ? (
              <p className="text-sm text-slate-500">No bills yet today.</p>
            ) : (
              <ul className="space-y-2">
                {bills.map((b) => (
                  <li key={b.id} className="flex justify-between gap-2 text-sm">
                    <Link href={`/sales/invoices/${b.id}/print`} className="font-medium text-brand-700 hover:underline">{b.number}</Link>
                    <span className="tabular-nums">₹{Number(b.total ?? 0).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
