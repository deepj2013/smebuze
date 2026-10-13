'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { useToast } from '../components/ToastContext';
import BarcodeCapture from '../components/BarcodeCapture';
import { useHidBarcode } from '@/lib/use-hid-barcode';
import { playScanBeep } from '@/lib/pos-beep';
import { round2 } from '@/lib/money';
import {
  counterLang,
  ct,
  isNetworkError,
  loadHeld,
  loadOutbox,
  printCounterSlip,
  queueBill,
  rememberCounterCustomer,
  shopFromCompany,
  saveHeld,
  setCounterLang,
  syncOutbox,
  type CounterLang,
  type HeldBill,
} from '@/lib/counter-desk';
import { Banknote, CreditCard, Minus, Plus, Search, Smartphone, Trash2, Users } from 'lucide-react';
import LooseAsk from './LooseAsk';
import { isLooseItem } from '@/lib/loose-sale';

interface ShelfItem {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  category?: string | null;
  subcategory?: string | null;
  variant_size?: string | null;
  variant_shape?: string | null;
  unit?: string | null;
  hsn_sac?: string | null;
  mrp?: string | number | null;
  discount_percent?: string | number | null;
  tax_rate?: string | number | null;
  cost_price?: string | number | null;
  pack_qty?: string | number | null;
  source_stock?: number | null;
  current_stock?: number;
  metadata?: Record<string, unknown> | null;
}

interface CategoryRow {
  id: string;
  name: string;
  parent_id?: string | null;
}

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  tags?: string[];
  segment?: string | null;
}

interface CartLine {
  item_id: string;
  name: string;
  qty: number;
  mrp: number;
  maxDiscount: number;
  discountPercent: number;
  taxRate: number;
  hsn: string;
  unit: string;
  cost: number;
}

type PayMode = 'cash' | 'upi' | 'card' | 'credit';

function num(v: string | number | null | undefined): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function monthEnd(): string {
  const d = new Date();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const m = String(end.getMonth() + 1).padStart(2, '0');
  const day = String(end.getDate()).padStart(2, '0');
  return `${end.getFullYear()}-${m}-${day}`;
}

function isWalkIn(c: Customer): boolean {
  return c.tags?.includes('walk_in') || /walk-?in/i.test(c.name);
}

function isCredit(c: Customer): boolean {
  return c.segment === 'credit' || !!c.tags?.includes('credit');
}

/** Inclusive shelf price split the same way the invoice engine will. */
function lineMoney(line: CartLine, billShare: number) {
  const gross = round2(line.mrp * line.qty);
  const maxOff = round2(gross * (line.maxDiscount / 100));
  const asked = round2(gross * (Math.min(line.discountPercent, line.maxDiscount) / 100));
  const lineOff = Math.min(maxOff, asked);
  const room = round2(Math.max(0, maxOff - lineOff));
  const share = Math.min(room, Math.max(0, billShare));
  const inclusive = round2(Math.max(0, gross - lineOff - share));
  const gst = line.taxRate > 0 ? line.taxRate : 0;
  const unitInclusive = line.qty > 0 ? inclusive / line.qty : 0;
  const rate = gst > 0 ? round2(unitInclusive / (1 + gst / 100)) : round2(unitInclusive);
  const taxable = round2(line.qty * rate);
  const half = round2(gst / 2);
  const sgstRate = round2(gst - half);
  const cgst = round2((taxable * half) / 100);
  const sgst = round2((taxable * sgstRate) / 100);
  return {
    rate,
    half,
    sgstRate,
    taxable,
    cgst,
    sgst,
    igst: 0,
    inclusive: round2(taxable + cgst + sgst),
    discount: round2(lineOff + share),
    room,
    lineOff,
  };
}

export default function DepartmentCounter() {
  const { success, error: showError } = useToast();
  const [items, setItems] = useState<ShelfItem[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [department, setDepartment] = useState('all');
  const [menuQuery, setMenuQuery] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [savedGuest, setSavedGuest] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [orderType, setOrderType] = useState<'takeaway' | 'dinein' | 'delivery'>('takeaway');
  const [looseItem, setLooseItem] = useState<ShelfItem | null>(null);
  const [subcategory, setSubcategory] = useState('all');
  const [query, setQuery] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [payMode, setPayMode] = useState<PayMode>('cash');
  const [billDiscount, setBillDiscount] = useState('');
  const [cashTendered, setCashTendered] = useState('');
  const [busy, setBusy] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [scanHint, setScanHint] = useState<string | null>(null);
  const [lastBill, setLastBill] = useState<{ id: string; number: string; total: number; credit: boolean } | null>(null);
  const [shop, setShop] = useState<{ company: string; gstin?: string; phone?: string; address: string[] }>({ company: 'Shop', address: [] });
  const [tenantKey, setTenantKey] = useState('');
  const [lang, setLang] = useState<CounterLang>('en');
  const [seeCost, setSeeCost] = useState(false);
  const [held, setHeld] = useState<HeldBill[]>([]);
  const [waiting, setWaiting] = useState(0);
  const [returnsOpen, setReturnsOpen] = useState(false);
  const [todayBills, setTodayBills] = useState<{ id: string; number: string; total?: string | number }[]>([]);
  const itemsRef = useRef<ShelfItem[]>([]);
  itemsRef.current = items;

  const load = useCallback(async () => {
    const [itemRes, catRes] = await Promise.all([
      apiGet<ShelfItem[]>('inventory/items?with_stock=1&purpose=sale'),
      apiGet<CategoryRow[]>('inventory/categories'),
    ]);
    setItems(Array.isArray(itemRes.data) ? itemRes.data : []);
    setCategories(Array.isArray(catRes.data) ? catRes.data : []);
  }, []);

  useEffect(() => {
    void load();
    (async () => {
      const [custRes, coRes, meRes] = await Promise.all([
        apiGet<Customer[] | { data: Customer[] }>('crm/customers'),
        apiGet<{ id: string; name?: string; gstin?: string | null; address?: Record<string, unknown> | null }[] | { data: { id: string; name?: string; gstin?: string | null; address?: Record<string, unknown> | null }[] }>('organization/companies'),
        apiGet<{ user?: { permissions?: string[]; isSuperAdmin?: boolean }; tenant?: { id?: string; slug?: string } }>('auth/me'),
      ]);
      const custList = Array.isArray(custRes.data) ? custRes.data : custRes.data?.data ?? [];
      const coList = Array.isArray(coRes.data) ? coRes.data : coRes.data?.data ?? [];
      setCustomers(custList);
      if (coList[0]) {
        setCompanyId(coList[0].id);
        setShop(shopFromCompany(coList[0]));
      }
      const walkIn = custList.find(isWalkIn);
      if (walkIn) setCustomerId(walkIn.id);
      const perms = meRes.data?.user?.permissions ?? [];
      setSeeCost(!!meRes.data?.user?.isSuperAdmin || perms.includes('*') || perms.includes('reports.view') || perms.includes('org.company.update'));
      const key = meRes.data?.tenant?.slug || meRes.data?.tenant?.id || 'shop';
      setTenantKey(key);
      setHeld(loadHeld(key));
      setLang(counterLang());
      setWaiting(loadOutbox().length);
    })();
  }, [load]);

  useEffect(() => {
    const run = () => {
      void syncOutbox().then((result) => {
        setWaiting(result.left);
        if (result.sent > 0) {
          success(`${result.sent} saved bill${result.sent === 1 ? '' : 's'} synced. Stock is updated.`);
          void load();
        }
      });
    };
    window.addEventListener('online', run);
    run();
    return () => window.removeEventListener('online', run);
  }, [load, success]);

  const parents = useMemo(() => {
    const q = menuQuery.trim().toLowerCase();
    return categories
      .filter((c) => !c.parent_id)
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, menuQuery]);
  const visible = useMemo(() => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const code = shortCode.trim().toLowerCase();
    return items.filter((i) => {
      if (department !== 'all' && (i.category || '') !== department) return false;
      if (subcategory !== 'all' && (i.subcategory || '') !== subcategory) return false;
      const sku = (i.sku || '').toLowerCase();
      const barcode = (i.barcode || '').toLowerCase();
      if (code && !sku.startsWith(code) && !barcode.startsWith(code)) return false;
      if (!tokens.length) return true;
      const hay = [i.name, i.sku, i.barcode, i.variant_size, i.variant_shape, i.subcategory].join(' ').toLowerCase();
      return tokens.every((token) => hay.includes(token));
    });
  }, [items, department, subcategory, query, shortCode]);

  const addItem = useCallback((item: ShelfItem, qty = 1) => {
    if (qty === 1 && isLooseItem(item)) {
      setLooseItem(item);
      return;
    }
    const addQty = qty > 0 ? qty : 1;
    const mrp = num(item.mrp);
    const maxDiscount = Math.min(100, Math.max(0, num(item.discount_percent)));
    setCart((prev) => {
      const existing = prev.find((l) => l.item_id === item.id);
      if (existing) return prev.map((l) => (l.item_id === item.id ? { ...l, qty: Math.round((l.qty + addQty) * 10000) / 10000 } : l));
      return [
        ...prev,
        {
          item_id: item.id,
          name: item.name,
          qty: addQty,
          mrp,
          maxDiscount,
          discountPercent: maxDiscount,
          taxRate: num(item.tax_rate),
          hsn: item.hsn_sac || '9983',
          unit: item.unit || 'pcs',
          cost: num(item.cost_price),
        },
      ];
    });
    setCartOpen(true);
  }, []);

  const applyCode = useCallback(async (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    const exact = itemsRef.current.find(
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
    const { data } = await apiGet<ShelfItem[]>(`inventory/items?barcode=${encodeURIComponent(q)}&with_stock=1&purpose=sale`);
    const found = Array.isArray(data) ? data[0] : undefined;
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
    showError(`No item for barcode ${q}. Add it under Products.`);
  }, [addItem, showError, success]);

  useHidBarcode(applyCode, true);

  const rooms = cart.map((l) => {
    const gross = round2(l.mrp * l.qty);
    const maxOff = round2(gross * (l.maxDiscount / 100));
    const lineOff = Math.min(maxOff, round2(gross * (Math.min(l.discountPercent, l.maxDiscount) / 100)));
    return round2(Math.max(0, maxOff - lineOff));
  });
  const roomSum = round2(rooms.reduce((s, n) => s + n, 0));
  const billAsked = Math.max(0, num(billDiscount));
  const billApplied = Math.min(billAsked, roomSum);

  const priced = cart.map((l, i) => {
    const share = roomSum > 0 ? round2(billApplied * (rooms[i] / roomSum)) : 0;
    return { line: l, money: lineMoney(l, share) };
  });
  const totals = priced.reduce(
    (s, row) => ({
      taxable: round2(s.taxable + row.money.taxable),
      cgst: round2(s.cgst + row.money.cgst),
      sgst: round2(s.sgst + row.money.sgst),
      igst: round2(s.igst + row.money.igst),
      discount: round2(s.discount + row.money.discount),
      total: round2(s.total + row.money.inclusive),
      cost: round2(s.cost + row.line.cost * row.line.qty),
    }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, discount: 0, total: 0, cost: 0 },
  );

  const setQty = (itemId: string, qty: number) => {
    setCart((prev) => (qty <= 0 ? prev.filter((l) => l.item_id !== itemId) : prev.map((l) => (l.item_id === itemId ? { ...l, qty } : l))));
  };
  const setLineDiscount = (itemId: string, value: number) => {
    setCart((prev) => prev.map((l) => (
      l.item_id === itemId ? { ...l, discountPercent: Math.min(l.maxDiscount, Math.max(0, value)) } : l
    )));
  };

  const selected = customers.find((c) => c.id === customerId);
  const tendered = num(cashTendered);
  const change = payMode === 'cash' && tendered > 0 ? Math.max(0, round2(tendered - totals.total)) : 0;

  const charge = async () => {
    if (!cart.length) {
      showError('Add at least one item.');
      return;
    }
    if (!companyId) {
      showError('Add the shop under Organization → Company.');
      return;
    }
    if (!customerId) {
      showError('Choose Walk-in cash or a credit customer.');
      return;
    }
    if (payMode === 'credit' && selected && isWalkIn(selected)) {
      showError('Credit needs a named customer, not Walk-in cash.');
      return;
    }
    if (payMode === 'cash' && tendered > 0 && tendered + 0.001 < totals.total) {
      showError('Cash received is less than the bill.');
      return;
    }
    if (billAsked > roomSum + 0.001) {
      showError(`Bill discount cannot be more than ₹${roomSum.toFixed(2)}. That is the discount still left on these items.`);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const credit = payMode === 'credit';
    const invoiceBody = {
        company_id: companyId,
        customer_id: (await rememberCounterCustomer({
          name: guestName,
          phone: guestPhone,
          customers,
          fallbackId: customerId,
          companyId,
        }))?.id || customerId,
        invoice_date: today,
        due_date: credit ? monthEnd() : today,
        gst_applicable: priced.some((row) => row.line.taxRate > 0),
        lines: priced.map(({ line, money }) => ({
          item_id: line.item_id,
          hsn_sac: line.hsn,
          description: line.name,
          qty: line.qty,
          unit: line.unit,
          rate: money.rate,
          cgst_rate: money.half,
          sgst_rate: money.sgstRate,
        })),
    };
    const paymentBody = credit ? null : {
      amount: totals.total,
      payment_date: today,
      mode: payMode,
      reference: payMode === 'cash' ? 'Counter cash' : payMode === 'upi' ? 'Counter UPI' : 'Counter card',
    };
    const slipLines = priced.map(({ line, money }) => ({
      description: line.name,
      qty: line.qty,
      rate: line.qty > 0 ? round2(money.inclusive / line.qty) : money.rate,
      amount: money.inclusive,
    }));
    const paidBy = credit ? 'Credit' : payMode === 'upi' ? 'UPI' : payMode === 'card' ? 'Card' : 'Cash';
    const finishLocal = (number: string, note: string) => {
      setCart([]);
      setBillDiscount('');
      setCashTendered('');
      setCartOpen(false);
      success(note);
      void printCounterSlip({
        ...shop,
        number,
        date: today,
        billTo: selected?.name || 'Customer',
        lines: slipLines,
        taxable: totals.taxable,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        total: totals.total,
        paid: credit ? 0 : totals.total,
        due: credit ? totals.total : 0,
        paidBy,
        footer: note,
      }).catch(() => undefined);
    };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const queued = queueBill({ invoice: invoiceBody, payment: paymentBody });
      setWaiting(loadOutbox().length);
      finishLocal(queued.id, ct(lang, 'Saved on this device. Stock updates when the internet is back.', 'इस फोन पर सेव है। नेट आने पर स्टॉक अपडेट होगा।'));
      return;
    }
    setBusy(true);
    try {
      const { data: invoice, error: invErr } = await apiPost<{ id: string; number: string; total: string | number }>('sales/invoices', invoiceBody);
      if (invErr || !invoice?.id) {
        if (isNetworkError(invErr)) {
          const queued = queueBill({ invoice: invoiceBody, payment: paymentBody });
          setWaiting(loadOutbox().length);
          finishLocal(queued.id, ct(lang, 'Saved on this device. Stock updates when the internet is back.', 'इस फोन पर सेव है। नेट आने पर स्टॉक अपडेट होगा।'));
          return;
        }
        showError(invErr || 'Could not save the bill.');
        return;
      }
      const total = Number(invoice.total ?? totals.total);
      if (paymentBody) {
        const { error: payErr } = await apiPost(`sales/invoices/${invoice.id}/payment`, { ...paymentBody, amount: total });
        if (payErr) {
          showError(`Bill ${invoice.number} saved, payment did not: ${payErr}`);
          return;
        }
      }
      const savedNote = paymentBody
        ? ct(lang, `Bill ${invoice.number} · ₹${total.toFixed(2)}`, `बिल ${invoice.number} · ₹${total.toFixed(2)}`)
        : `${selected?.name || 'Customer'} — ${ct(lang, 'credit bill', 'उधार बिल')} ${invoice.number} · ₹${total.toFixed(2)}`;
      setLastBill({ id: invoice.id, number: invoice.number, total, credit });
      finishLocal(invoice.number, savedNote);
      void load();
    } catch (err) {
      if (err instanceof TypeError || isNetworkError(err instanceof Error ? err.message : '')) {
        const queued = queueBill({ invoice: invoiceBody, payment: paymentBody });
        setWaiting(loadOutbox().length);
        finishLocal(queued.id, ct(lang, 'Saved on this device. Stock updates when the internet is back.', 'इस फोन पर सेव है। नेट आने पर स्टॉक अपडेट होगा।'));
        return;
      }
      showError(err instanceof Error ? err.message : 'Could not save the bill.');
    } finally {
      setBusy(false);
    }
  };

  const holdBill = () => {
    if (!cart.length || !tenantKey) return;
    const next = [
      {
        id: `hold_${Date.now().toString(36)}`,
        at: new Date().toISOString(),
        label: `${selected?.name || 'Bill'} · ₹${totals.total.toFixed(2)}`,
        customerId,
        payMode,
        billDiscount,
        cart,
      },
      ...held,
    ];
    saveHeld(tenantKey, next);
    setHeld(loadHeld(tenantKey));
    setCart([]);
    setBillDiscount('');
    success(ct(lang, 'Bill parked. You can start the next customer.', 'बिल रोक दिया। अगला ग्राहक शुरू करें।'));
  };

  const recallBill = (bill: HeldBill) => {
    setCart(Array.isArray(bill.cart) ? bill.cart as CartLine[] : []);
    if (bill.customerId) setCustomerId(bill.customerId);
    if (bill.payMode === 'cash' || bill.payMode === 'upi' || bill.payMode === 'card' || bill.payMode === 'credit') setPayMode(bill.payMode);
    setBillDiscount(bill.billDiscount || '');
    const next = held.filter((row) => row.id !== bill.id);
    saveHeld(tenantKey, next);
    setHeld(next);
    setCartOpen(true);
  };

  const openReturns = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await apiGet<{ id: string; number: string; total?: string | number }[]>(`sales/invoices?from=${today}&limit=20`);
    if (error) {
      showError(error);
      return;
    }
    setTodayBills(Array.isArray(data) ? data : []);
    setReturnsOpen(true);
  };

  const returnBill = async (id: string) => {
    setBusy(true);
    const { data, error } = await apiPost<{ credit_note?: string; invoice?: string }>('sales/invoices/' + id + '/counter-return', {});
    setBusy(false);
    if (error) {
      showError(error);
      return;
    }
    success(ct(lang, `Return ${data?.credit_note || ''} saved for ${data?.invoice || 'bill'}. Stock is back.`, `वापसी ${data?.credit_note || ''} सेव हो गई। स्टॉक वापस आ गया।`));
    setReturnsOpen(false);
    void load();
  };

  const cartPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid grid-cols-3 gap-1">
        {(['takeaway', 'dinein', 'delivery'] as const).map((id) => (
          <button key={id} type="button" onClick={() => setOrderType(id)} className={`h-7 rounded text-[11px] font-semibold ${orderType === id ? 'bg-sky-500 text-white' : 'border border-slate-200'}`}>
            {id === 'dinein' ? 'Dine-in' : id === 'takeaway' ? 'Takeaway' : 'Delivery'}
          </button>
        ))}
      </div>
      <div className="mt-1 rounded border border-slate-200 bg-slate-50 p-1.5">
        <div className="grid grid-cols-2 gap-1">
          <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Name" className="h-7 rounded border border-slate-200 bg-white px-2 text-xs" />
          <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} inputMode="tel" placeholder="Mobile" className="h-7 rounded border border-slate-200 bg-white px-2 text-xs" />
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => void rememberCounterCustomer({ name: guestName, phone: guestPhone, customers, fallbackId: customerId, companyId }).then((saved) => {
              if (!saved) { showError('Enter a mobile number to remember this customer.'); return; }
              setSavedGuest(saved);
              setCustomerId(saved.id);
              setCustomers((prev) => (prev.some((c) => c.id === saved.id) ? prev : [{ id: saved.id, name: saved.name, phone: saved.phone }, ...prev]));
              success(`${saved.name} saved for wishes and offers.`);
            })}
            className="h-6 rounded bg-slate-800 px-2 text-[11px] font-semibold text-white"
          >
            Save
          </button>
          <span className="truncate text-[11px] text-slate-600">{savedGuest ? `${savedGuest.name} · ${savedGuest.phone}` : 'Saved here for wishes'}</span>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Bill</h2>
        <span className="text-xs text-slate-500">{cart.length} item{cart.length === 1 ? '' : 's'}</span>
      </div>
      <label className="mt-2 text-xs font-medium text-slate-600">Customer</label>
      <select
        value={customerId}
        onChange={(e) => {
          const id = e.target.value;
          setCustomerId(id);
          const c = customers.find((row) => row.id === id);
          if (c && isCredit(c)) setPayMode('credit');
          if (c && isWalkIn(c) && payMode === 'credit') setPayMode('cash');
        }}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
      >
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}{isCredit(c) ? ' · credit' : isWalkIn(c) ? ' · cash' : ''}
          </option>
        ))}
      </select>
      <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {priced.length === 0 && <li className="text-sm text-slate-500">Scan or tap a product.</li>}
        {priced.map(({ line, money }) => (
          <li key={line.item_id} className="rounded-lg border border-slate-100 p-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{line.name}</p>
                <p className="text-xs text-slate-500">MRP ₹{line.mrp.toFixed(2)} · max {line.maxDiscount}%</p>
              </div>
              <button type="button" onClick={() => setQty(line.item_id, 0)} className="text-slate-400 p-1" aria-label="Remove">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setQty(line.item_id, line.qty - 1)} className="rounded border p-1 min-h-[36px] min-w-[36px] inline-flex items-center justify-center"><Minus className="h-4 w-4" /></button>
                <span className="w-8 text-center font-semibold">{line.qty}</span>
                <button type="button" onClick={() => setQty(line.item_id, line.qty + 1)} className="rounded border p-1 min-h-[36px] min-w-[36px] inline-flex items-center justify-center"><Plus className="h-4 w-4" /></button>
              </div>
              <label className="text-xs text-slate-600">
                Disc %
                <input
                  type="number"
                  min={0}
                  max={line.maxDiscount}
                  step="0.01"
                  value={line.discountPercent}
                  onChange={(e) => setLineDiscount(line.item_id, Number(e.target.value))}
                  className="ml-1 w-16 rounded border border-slate-300 px-2 py-1"
                />
              </label>
              <span className="ml-auto font-semibold">₹{money.inclusive.toFixed(2)}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
        <label className="flex items-center justify-between gap-2 text-slate-600">
          <span>Bill discount</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={billDiscount}
            onChange={(e) => setBillDiscount(e.target.value)}
            placeholder="0"
            className="w-24 rounded border border-slate-300 px-2 py-1 text-right"
          />
        </label>
        <p className="text-xs text-slate-500">Up to ₹{roomSum.toFixed(2)} more. That is the unused discount from inventory. It cannot go past the maximum on each item.</p>
        <div className="flex justify-between"><span>Taxable</span><span>₹{totals.taxable.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>CGST</span><span>₹{totals.cgst.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>SGST</span><span>₹{totals.sgst.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>IGST</span><span>₹{totals.igst.toFixed(2)}</span></div>
        <div className="flex justify-between text-slate-600"><span>Discount</span><span>₹{totals.discount.toFixed(2)}</span></div>
        <div className="flex justify-between text-base font-bold text-slate-900"><span>{ct(lang, 'Total', 'कुल')}</span><span>₹{totals.total.toFixed(2)}</span></div>
        {seeCost && <p className="text-xs text-slate-500">Cost ₹{totals.cost.toFixed(2)} · margin ₹{round2(totals.total - totals.cost).toFixed(2)}</p>}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1">
        {([
          ['cash', 'Cash', Banknote],
          ['upi', 'UPI', Smartphone],
          ['card', 'Card', CreditCard],
          ['credit', 'Credit', Users],
        ] as const).map(([mode, label, Icon]) => (
          <button
            key={mode}
            type="button"
            onClick={() => setPayMode(mode)}
            className={`rounded-lg border px-1 py-2 text-[11px] font-semibold min-h-[44px] inline-flex flex-col items-center justify-center gap-0.5 ${payMode === mode ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-700'}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
      {payMode === 'cash' && (
        <label className="mt-2 block text-xs text-slate-600">
          Cash received
          <input value={cashTendered} onChange={(e) => setCashTendered(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Optional" />
          {tendered > 0 && <span className="mt-1 block">Change ₹{change.toFixed(2)}</span>}
        </label>
      )}
      {payMode === 'credit' && <p className="mt-2 text-xs text-slate-600">Goods go on the customer’s account. Collect the month’s payment from Receive payment.</p>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" disabled={busy || cart.length === 0} onClick={holdBill} className="rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-800 min-h-[48px]">
          {ct(lang, 'Hold bill', 'बिल रोकें')}
        </button>
        <button type="button" disabled={busy} onClick={() => void openReturns()} className="rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-800 min-h-[48px]">
          {ct(lang, 'Return', 'वापसी')}
        </button>
      </div>
      <button type="button" disabled={busy || cart.length === 0} onClick={() => void charge()} className="mt-2 w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white disabled:opacity-50 min-h-[48px]">
        {busy ? ct(lang, 'Saving…', 'सेव हो रहा है…') : payMode === 'credit' ? `${ct(lang, 'Save credit bill', 'उधार बिल')} ₹${totals.total.toFixed(2)}` : `${ct(lang, 'Take', 'लें')} ₹${totals.total.toFixed(2)}`}
      </button>
      {held.length > 0 && (
        <div className="mt-2 space-y-1">
          <p className="text-xs font-semibold text-slate-500">{ct(lang, 'Parked bills', 'रुके बिल')}</p>
          {held.map((bill) => (
            <button key={bill.id} type="button" onClick={() => recallBill(bill)} className="block w-full rounded-lg bg-amber-50 px-2 py-2 text-left text-xs font-medium text-amber-950">
              {bill.label}
            </button>
          ))}
        </div>
      )}
      {returnsOpen && (
        <div className="mt-2 rounded-lg border border-slate-200 p-2">
          <p className="text-xs font-semibold text-slate-600">{ct(lang, 'Today’s bills', 'आज के बिल')}</p>
          {todayBills.length === 0 && <p className="mt-1 text-xs text-slate-500">{ct(lang, 'No bills yet today.', 'आज कोई बिल नहीं।')}</p>}
          {todayBills.map((bill) => (
            <div key={bill.id} className="mt-1 flex items-center justify-between gap-2 text-xs">
              <span>{bill.number} · ₹{Number(bill.total ?? 0).toFixed(2)}</span>
              <button type="button" disabled={busy} onClick={() => void returnBill(bill.id)} className="font-semibold text-brand-700">{ct(lang, 'Return', 'वापसी')}</button>
            </div>
          ))}
        </div>
      )}
      {lastBill && (
        <p className="mt-2 text-xs text-slate-600">
          {lastBill.credit ? 'On account' : 'Paid'} {lastBill.number} · ₹{lastBill.total.toFixed(2)} ·{' '}
          <Link href={`/sales/invoices/${lastBill.id}/print`} className="font-semibold text-brand-700">Print</Link>
        </p>
      )}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-3 pb-28 md:grid md:h-[calc(100dvh-8.5rem)] md:grid-cols-[minmax(0,1fr)_300px] md:pb-20 lg:grid-cols-[200px_minmax(0,1fr)_340px] lg:pb-0">
      {waiting > 0 && (
        <p className="md:col-span-2 lg:col-span-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {waiting} {ct(lang, 'bill(s) are on this device. Stock updates after they sync. The counter needs the network for live stock.', 'बिल इस डिवाइस पर हैं। सिंक के बाद स्टॉक बदलेगा।')}
        </p>
      )}
      <div className="md:col-span-2 lg:col-span-3 flex justify-end">
        <button
          type="button"
          onClick={() => {
            const next = lang === 'hi' ? 'en' : 'hi';
            setCounterLang(next);
            setLang(next);
          }}
          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
        >
          {lang === 'hi' ? 'English' : 'हिंदी'}
        </button>
      </div>
      <aside className="hidden lg:flex lg:min-h-0 lg:flex-col lg:overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2">
        <p className="px-2 py-1 text-xs font-semibold uppercase text-slate-500">Menu</p>
        <input value={menuQuery} onChange={(e) => setMenuQuery(e.target.value)} placeholder="Search category" className="mb-1 h-8 rounded border border-slate-300 px-2 text-xs" />
        <button type="button" onClick={() => { setDepartment('all'); setSubcategory('all'); }} className={`rounded-lg px-3 py-2 text-left text-sm min-h-[40px] ${department === 'all' ? 'bg-brand-600 text-white' : 'hover:bg-slate-50'}`}>All</button>
        {parents.map((p) => (
          <button key={p.id} type="button" onClick={() => { setDepartment(p.name); setSubcategory('all'); }} className={`rounded-lg px-3 py-2 text-left text-sm min-h-[40px] ${department === p.name ? 'bg-brand-600 text-white' : 'hover:bg-slate-50'}`}>{p.name}</button>
        ))}
      </aside>

      <section className="min-w-0 lg:min-h-0 lg:overflow-y-auto">
        <div className="mb-3 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                void applyCode(query);
              }}
              autoFocus
              placeholder="Search by name"
              className="w-full rounded-md border border-slate-300 py-2.5 pl-10 pr-3 text-sm min-h-[44px]"
            />
          </div>
          <input
            value={shortCode}
            onChange={(e) => setShortCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              const code = shortCode.trim();
              if (!code) return;
              void applyCode(code);
              setShortCode('');
            }}
            placeholder="Short code"
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm min-h-[44px] sm:w-40"
          />
          <BarcodeCapture onDetected={applyCode} label="Scan" />
        </div>
        {scanHint && <p className="mb-2 text-xs font-medium text-emerald-700">Last scan: {scanHint}</p>}
        <input value={menuQuery} onChange={(e) => setMenuQuery(e.target.value)} placeholder="Search category" className="mb-2 h-8 w-full rounded border border-slate-300 px-2 text-xs lg:hidden" />
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1 lg:hidden">
          <button type="button" onClick={() => { setDepartment('all'); setSubcategory('all'); }} className={`shrink-0 rounded-full px-3 py-2 text-sm min-h-[40px] ${department === 'all' ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white'}`}>All</button>
          {parents.map((p) => (
            <button key={p.id} type="button" onClick={() => { setDepartment(p.name); setSubcategory('all'); }} className={`shrink-0 rounded-full px-3 py-2 text-sm min-h-[40px] ${department === p.name ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white'}`}>{p.name}</button>
          ))}
        </div>
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="font-semibold text-slate-900">No products in this shelf</p>
            <Link href="/inventory/items/new" className="mt-3 inline-flex rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">Add a product</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {visible.map((item) => {
              const mrp = num(item.mrp);
              const disc = num(item.discount_percent);
              const shelf = round2(mrp * (1 - disc / 100));
              const packs = item.pack_qty && item.source_stock != null && num(item.pack_qty) > 0
                ? Math.floor(num(item.source_stock) / num(item.pack_qty))
                : null;
              return (
                <button key={item.id} type="button" onClick={() => addItem(item)} className="relative min-h-[72px] rounded-md border border-sky-300 bg-white px-2 py-2 text-left hover:bg-sky-50">
                  <p className="pr-12 text-sm font-medium leading-snug text-slate-800 line-clamp-2">{item.name}</p>
                  <span className="absolute right-2 top-2 text-xs font-semibold text-slate-600">₹{shelf.toFixed(0)}</span>
                  {disc > 0 && <p className="text-[10px] text-slate-400 line-through">MRP ₹{mrp.toFixed(0)}</p>}
                  {packs != null && packs <= 0 && <p className="text-[10px] font-medium text-amber-700">Out of packs</p>}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <aside className="hidden min-h-0 rounded-2xl border border-slate-200 bg-white p-3 md:flex md:flex-col lg:min-h-0">
        {cartPanel}
      </aside>

      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-slate-200 bg-white p-3 shadow md:hidden">
        <button type="button" onClick={() => setCartOpen(true)} className="flex w-full items-center justify-between rounded-xl bg-brand-600 px-4 py-3 text-white min-h-[48px]">
          <span>{cart.length} items · Taxable ₹{totals.taxable.toFixed(2)}</span>
          <span className="font-bold">₹{totals.total.toFixed(2)}</span>
        </button>
      </div>
      {cartOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 md:hidden" onClick={() => setCartOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 top-16 overflow-y-auto rounded-t-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
            {cartPanel}
          </div>
        </div>
      )}
      {looseItem && (
        <LooseAsk
          name={looseItem.name}
          unit={looseItem.unit || 'kg'}
          rate={round2(num(looseItem.mrp) * (1 - num(looseItem.discount_percent) / 100))}
          onClose={() => setLooseItem(null)}
          onAdd={(qty) => {
            const item = looseItem;
            setLooseItem(null);
            addItem(item, qty);
          }}
        />
      )}
    </div>
  );
}
