'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { useToast } from '../components/ToastContext';
import { businessTypeMeta, isPosBusinessType, posSellingRate } from '@/lib/business-types';
import { Minus, Plus, Search, Trash2, Banknote, Smartphone, CreditCard } from 'lucide-react';
import PosSwitcher from '../components/PosSwitcher';
import BarcodeCapture from '../components/BarcodeCapture';
import { useHidBarcode } from '@/lib/use-hid-barcode';
import { playScanBeep } from '@/lib/pos-beep';

interface PosItem {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  category?: string | null;
  unit?: string | null;
  hsn_sac?: string | null;
  mrp?: string | number | null;
  sale_price?: string | number | null;
  discount_percent?: string | number | null;
  tax_rate?: string | number | null;
  image_urls?: string[];
  current_stock?: number;
}

interface Customer {
  id: string;
  name: string;
  tags?: string[];
  segment?: string | null;
}

interface Company {
  id: string;
  name: string;
}

interface CartLine {
  item_id: string;
  name: string;
  qty: number;
  rate: number;
  tax_rate: number;
  hsn_sac: string;
  unit: string;
}

type PayMode = 'cash' | 'upi' | 'card';

export default function PosPage() {
  const { success, error: showError } = useToast();
  const [businessType, setBusinessType] = useState<string>('retail_shop');
  const [items, setItems] = useState<PosItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [payMode, setPayMode] = useState<PayMode>('cash');
  const [cashTendered, setCashTendered] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastBill, setLastBill] = useState<{ id: string; number: string; total: number } | null>(null);
  const [short, setShort] = useState<{ item_id: string; name: string; current_stock: number }[]>([]);
  const [todayBills, setTodayBills] = useState<{ id: string; number: string; total?: string | number }[]>([]);
  const [scanHint, setScanHint] = useState<string | null>(null);
  const itemsRef = useRef<PosItem[]>([]);

  const meta = businessTypeMeta(businessType);
  itemsRef.current = items;

  const loadCatalog = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [itemRes, shortRes, billRes] = await Promise.all([
      apiGet<PosItem[] | { data: PosItem[] }>('inventory/items?with_stock=1'),
      apiGet<{ item_id: string; name: string; current_stock: number }[]>('inventory/stock/low'),
      apiGet<{ id: string; number: string; total?: string | number }[]>(`sales/invoices?from=${today}&limit=8`),
    ]);
    const itemList = Array.isArray(itemRes.data) ? itemRes.data : itemRes.data?.data ?? [];
    setItems(itemList.filter((i) => i.id));
    if (Array.isArray(shortRes.data)) setShort(shortRes.data);
    if (Array.isArray(billRes.data)) setTodayBills(billRes.data);
  };

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('smebuzz_token') : null;
    if (token) {
      fetch(`${API_URL}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          const t = d?.tenant?.settings?.business_type;
          if (typeof t === 'string') setBusinessType(t);
        })
        .catch(() => undefined);
    }
    (async () => {
      await loadCatalog();
      const [custRes, coRes] = await Promise.all([
        apiGet<Customer[] | { data: Customer[] }>('crm/customers'),
        apiGet<Company[] | { data: Company[] }>('organization/companies'),
      ]);
      const custList = Array.isArray(custRes.data) ? custRes.data : custRes.data?.data ?? [];
      const coList = Array.isArray(coRes.data) ? coRes.data : coRes.data?.data ?? [];
      setCustomers(custList);
      setCompanies(coList);
      if (coList[0]) setCompanyId(coList[0].id);
      const walkIn = custList.find((c) => c.tags?.includes('walk_in') || /walk-?in/i.test(c.name));
      if (walkIn) setCustomerId(walkIn.id);
      else if (custList[0]) setCustomerId(custList[0].id);
    })();
    const timer = setInterval(() => { loadCatalog(); }, 20000);
    return () => clearInterval(timer);
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.category?.trim()) set.add(i.category.trim());
    });
    return ['all', ...Array.from(set).sort()];
  }, [items]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (category !== 'all' && (i.category || '') !== category) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        (i.sku || '').toLowerCase().includes(q) ||
        (i.barcode || '').toLowerCase().includes(q)
      );
    });
  }, [items, category, query]);

  const addItem = useCallback((item: PosItem) => {
    const rate = posSellingRate(item);
    const tax = Number(item.tax_rate ?? 0);
    setCart((prev) => {
      const existing = prev.find((l) => l.item_id === item.id);
      if (existing) return prev.map((l) => (l.item_id === item.id ? { ...l, qty: l.qty + 1 } : l));
      return [
        ...prev,
        {
          item_id: item.id,
          name: item.name,
          qty: 1,
          rate,
          tax_rate: tax,
          hsn_sac: item.hsn_sac || '9983',
          unit: item.unit || 'pcs',
        },
      ];
    });
  }, []);

  const applyCode = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q) return;
      const list = itemsRef.current;
      const exact = list.find(
        (i) => (i.barcode || '').toLowerCase() === q.toLowerCase() || (i.sku || '').toLowerCase() === q.toLowerCase(),
      );
      if (exact) {
        addItem(exact);
        setQuery('');
        setScanHint(exact.name);
        playScanBeep(true);
        success(`${exact.name} added`);
        return;
      }
      const { data } = await apiGet<PosItem[] | { data: PosItem[] }>(
        `inventory/items?barcode=${encodeURIComponent(q)}&with_stock=1`,
      );
      const found = Array.isArray(data) ? data[0] : data?.data?.[0];
      if (found?.id) {
        addItem(found);
        setItems((prev) => (prev.some((i) => i.id === found.id) ? prev : [found, ...prev]));
        setQuery('');
        setScanHint(found.name);
        playScanBeep(true);
        success(`${found.name} added`);
        return;
      }
      playScanBeep(false);
      showError(`No item for barcode ${q}. Add it under Manage shop.`);
    },
    [addItem, success, showError],
  );

  useHidBarcode(applyCode, true);

  const setQty = (itemId: string, qty: number) => {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((l) => l.item_id !== itemId);
      return prev.map((l) => (l.item_id === itemId ? { ...l, qty } : l));
    });
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    for (const l of cart) {
      const taxable = l.qty * l.rate;
      subtotal += taxable;
      tax += taxable * (l.tax_rate / 100);
    }
    return { subtotal, tax, total: subtotal + tax };
  }, [cart]);

  const tendered = Number(cashTendered || 0);
  const change = payMode === 'cash' && tendered > 0 ? Math.max(0, tendered - totals.total) : 0;

  const charge = async () => {
    if (!cart.length) {
      showError('Add at least one item to the bill.');
      return;
    }
    if (!companyId) {
      showError('Company is missing. Add one under Organization.');
      return;
    }
    if (!customerId) {
      showError('Choose Walk-in / Counter or a customer.');
      return;
    }
    if (payMode === 'cash' && tendered > 0 && tendered < totals.total) {
      showError('Cash received is less than the bill total.');
      return;
    }
    setBusy(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data: invoice, error: invErr } = await apiPost<{ id: string; number: string; total: string | number }>('sales/invoices', {
        company_id: companyId,
        customer_id: customerId,
        invoice_date: today,
        due_date: today,
        gst_applicable: cart.some((l) => l.tax_rate > 0),
        lines: cart.map((l) => {
          const half = l.tax_rate / 2;
          return {
            item_id: l.item_id,
            hsn_sac: l.hsn_sac,
            description: l.name,
            qty: l.qty,
            unit: l.unit,
            rate: l.rate,
            cgst_rate: half,
            sgst_rate: half,
          };
        }),
      });
      if (invErr || !invoice?.id) {
        showError(invErr || 'Could not create the bill.');
        return;
      }
      const total = Number(invoice.total ?? totals.total);
      const { error: payErr } = await apiPost(`sales/invoices/${invoice.id}/payment`, {
        amount: total,
        payment_date: today,
        mode: payMode,
        reference: payMode === 'cash' ? 'POS cash' : payMode === 'upi' ? 'POS UPI' : 'POS card',
      });
      if (payErr) {
        showError(`Bill saved but payment failed: ${payErr}`);
      } else {
        success(`Bill ${invoice.number} settled.`);
      }
      setLastBill({ id: invoice.id, number: invoice.number, total });
      setCart([]);
      setCashTendered('');
      loadCatalog();
    } finally {
      setBusy(false);
    }
  };

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    void applyCode(q);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-8rem)]">
      <div className="flex-1 min-w-0">
        <PosSwitcher />
        <div
          className="rounded-2xl p-4 sm:p-5 mb-4 text-white"
          style={{ background: 'linear-gradient(135deg, var(--tenant-hero-from, #075985), var(--tenant-hero-to, #0284c7))' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Counter</p>
              <h1 className="text-xl sm:text-2xl font-bold">{meta.counterLabel}</h1>
              <p className="text-sm text-white/90">
                Scan with a USB/Bluetooth reader, use the phone camera, or tap {meta.itemLabel}s. Cash, UPI or card.
              </p>
              {scanHint && <p className="mt-1 text-xs font-medium text-emerald-100">Last scan: {scanHint}</p>}
            </div>
            <Link
              href="/pos/manage"
              className="rounded-xl bg-white/95 px-4 py-2.5 text-sm font-semibold hover:bg-white min-h-[44px] inline-flex items-center justify-center"
              style={{ color: 'var(--tenant-accent)' }}
            >
              Manage shop
            </Link>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKey}
              autoComplete="off"
              autoFocus
              placeholder={`Search or scan barcode / SKU`}
              className="w-full rounded-xl border border-slate-300 pl-10 pr-3 py-3 text-base min-h-[48px]"
            />
          </div>
          <BarcodeCapture onDetected={applyCode} label="Scan" />
        </div>
        <p className="text-xs text-slate-500 -mt-2 mb-3">
          Hardware reader: click the search box and scan. Phone: tap Scan and point the camera at the barcode.
        </p>

        {items.some((i) => i.barcode) && (
          <details className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <summary className="cursor-pointer font-semibold text-slate-800">Try these barcodes (type + Enter, or camera)</summary>
            <ul className="mt-2 space-y-1 font-mono">
              {items.filter((i) => i.barcode).slice(0, 8).map((i) => (
                <li key={i.id}>
                  <button type="button" className="text-left hover:text-brand-700" onClick={() => void applyCode(i.barcode || '')}>
                    {i.barcode} — {i.name}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full px-3 py-2 text-sm font-medium min-h-[40px] ${
                category === c ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>

        {visibleItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="font-semibold text-slate-900">No {meta.itemsLabel.toLowerCase()} yet</p>
            <p className="mt-1 text-sm text-slate-600">Add what you sell. They appear here as a menu for the counter.</p>
            <Link href="/pos/manage" className="mt-4 inline-flex rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-semibold">
              Add {meta.itemLabel}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => addItem(item)}
                className="text-left rounded-xl border border-slate-200 bg-white p-3 hover:border-brand-400 hover:shadow-sm min-h-[96px]"
              >
                <p className="font-semibold text-slate-900 line-clamp-2">{item.name}</p>
                {item.category && <p className="text-xs text-slate-500 mt-0.5">{item.category}</p>}
                {item.barcode && <p className="mt-0.5 font-mono text-[10px] text-slate-400">{item.barcode}</p>}
                <p className="mt-2 font-bold text-brand-700">₹{posSellingRate(item).toFixed(2)}</p>
                {Number(item.discount_percent ?? 0) > 0 && Number(item.mrp ?? item.sale_price ?? 0) > posSellingRate(item) && (
                  <p className="text-xs text-slate-400 line-through">MRP ₹{Number(item.mrp ?? item.sale_price ?? 0).toFixed(2)}</p>
                )}
                {isPosBusinessType(businessType) && businessType !== 'dine_restaurant' && item.current_stock != null && (
                  <p className={`text-xs ${Number(item.current_stock) <= 0 ? 'text-amber-700 font-medium' : 'text-slate-500'}`}>
                    Stock {Number(item.current_stock)}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <aside className="lg:w-96 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 flex flex-col">
        <h2 className="font-semibold text-slate-900">This bill</h2>
        <label className="mt-3 text-xs font-medium text-slate-600">Customer</label>
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
        >
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <ul className="mt-3 flex-1 space-y-2 overflow-y-auto min-h-[120px] max-h-64">
          {cart.length === 0 && <li className="text-sm text-slate-500">Tap items to add them.</li>}
          {cart.map((l) => (
            <li key={l.item_id} className="flex items-center gap-2 text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{l.name}</p>
                <p className="text-xs text-slate-500">₹{l.rate.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setQty(l.item_id, l.qty - 1)} className="rounded border p-1 min-touch">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center font-semibold">{l.qty}</span>
                <button type="button" onClick={() => setQty(l.item_id, l.qty + 1)} className="rounded border p-1 min-touch">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button type="button" onClick={() => setQty(l.item_id, 0)} className="text-slate-400 hover:text-red-600 p-1">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-3 border-t border-slate-100 pt-3 text-sm space-y-1">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>₹{totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Tax</span>
            <span>₹{totals.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-900 text-base">
            <span>Total</span>
            <span>₹{totals.total.toFixed(2)}</span>
          </div>
        </div>

        <p className="mt-3 text-xs font-medium text-slate-600">Payment (more options later)</p>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {([
            { id: 'cash' as const, label: 'Cash', icon: Banknote },
            { id: 'upi' as const, label: 'UPI', icon: Smartphone },
            { id: 'card' as const, label: 'Card', icon: CreditCard },
          ]).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPayMode(m.id)}
              className={`rounded-lg border py-2 text-xs font-semibold flex flex-col items-center gap-1 min-h-[52px] ${
                payMode === m.id ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600'
              }`}
            >
              <m.icon className="h-4 w-4" />
              {m.label}
            </button>
          ))}
        </div>

        {payMode === 'cash' && (
          <label className="mt-3 block text-xs font-medium text-slate-600">
            Cash received
            <input
              type="number"
              min={0}
              step="0.01"
              value={cashTendered}
              onChange={(e) => setCashTendered(e.target.value)}
              placeholder={totals.total ? String(totals.total.toFixed(2)) : '0'}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
            />
            {tendered > 0 && (
              <span className="mt-1 block text-sm text-slate-800">
                Change: <strong>₹{change.toFixed(2)}</strong>
              </span>
            )}
          </label>
        )}

        <button
          type="button"
          onClick={charge}
          disabled={busy || cart.length === 0}
          className="mt-4 w-full rounded-xl bg-brand-600 text-white py-3.5 font-semibold hover:bg-brand-700 disabled:opacity-50 min-h-[52px]"
        >
          {busy ? 'Saving…' : `Charge ₹${totals.total.toFixed(2)}`}
        </button>

        {lastBill && (
          <Link
            href={`/sales/invoices/${lastBill.id}/print`}
            target="_blank"
            className="mt-2 block text-center text-sm font-medium text-brand-700 hover:underline"
          >
            Print bill {lastBill.number}
          </Link>
        )}

        {short.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Short items</p>
            <ul className="mt-2 space-y-1 max-h-28 overflow-y-auto">
              {short.slice(0, 8).map((s) => (
                <li key={s.item_id} className="flex justify-between text-xs text-amber-950">
                  <span className="truncate pr-2">{s.name}</span>
                  <span className="tabular-nums shrink-0">{s.current_stock}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {todayBills.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Today</p>
            <ul className="mt-1 space-y-1">
              {todayBills.slice(0, 5).map((b) => (
                <li key={b.id} className="flex justify-between text-xs text-slate-600">
                  <span>{b.number}</span>
                  <span className="tabular-nums">₹{Number(b.total ?? 0).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
