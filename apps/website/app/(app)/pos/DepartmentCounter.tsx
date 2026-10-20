'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { useToast } from '../components/ToastContext';
import BarcodeCapture from '../components/BarcodeCapture';
import { useHidBarcode } from '@/lib/use-hid-barcode';
import { playScanBeep } from '@/lib/pos-beep';
import { matchesPosNameSearch } from '@/lib/pos-search';
import { displayItemName, displayItemPackLine, itemSearchExtras } from '@/lib/item-i18n';
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
  COUNTER_LANG_OPTIONS,
  type CounterLang,
  type HeldBill,
} from '@/lib/counter-desk';
import { Banknote, CreditCard, Minus, Plus, Search, Smartphone, Trash2, Users } from 'lucide-react';
import LooseAsk from './LooseAsk';
import CashNotePad from '../components/CashNotePad';
import { formatNotesSummary, notesTotal, type NoteCounts } from '@/lib/cash-notes';
import { isLooseItem } from '@/lib/loose-sale';
import { showsCounterOrderModes } from '@/lib/business-types';
import CounterCustomerBar from './CounterCustomerBar';
import { lookupCounterCustomer, type CounterParty } from '@/lib/counter-customer';

interface ShelfItem {
  id: string;
  name: string;
  brand?: string | null;
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

interface Customer extends CounterParty {}

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
  /** Product shops: in-shop, home delivery, or pickup — not restaurant dine-in. */
  const [shopFulfilment, setShopFulfilment] = useState<'counter' | 'home_delivery' | 'pickup'>('counter');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [looseItem, setLooseItem] = useState<ShelfItem | null>(null);
  const [subcategory, setSubcategory] = useState('all');
  const [query, setQuery] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [payMode, setPayMode] = useState<PayMode>('cash');
  const [billDiscount, setBillDiscount] = useState('');
  const [cashTendered, setCashTendered] = useState('');
  const [noteCounts, setNoteCounts] = useState<NoteCounts>({});
  const [busy, setBusy] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [scanHint, setScanHint] = useState<string | null>(null);
  const [lastBill, setLastBill] = useState<{ id: string; number: string; total: number; credit: boolean } | null>(null);
  const [shop, setShop] = useState<{ company: string; gstin?: string; phone?: string; address: string[] }>({ company: 'Shop', address: [] });
  const [tenantKey, setTenantKey] = useState('');
  const [lang, setLang] = useState<CounterLang>('en');
  const [seeCost, setSeeCost] = useState(false);
  const [showOrderModes, setShowOrderModes] = useState(false);
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
        apiGet<{
          user?: { permissions?: string[]; isSuperAdmin?: boolean };
          tenant?: { id?: string; slug?: string; settings?: { business_type?: string; counter_order_modes?: boolean } };
        }>('auth/me'),
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
      const settings = meRes.data?.tenant?.settings;
      // Explicit tenant setting wins; otherwise food counters only (restaurant / cafe / sweet / bakery).
      const modes =
        typeof settings?.counter_order_modes === 'boolean'
          ? settings.counter_order_modes
          : showsCounterOrderModes(settings?.business_type);
      setShowOrderModes(modes);
      if (!modes) setOrderType('takeaway');
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
    const code = shortCode.trim().toLowerCase();
    return items.filter((i) => {
      if (department !== 'all' && (i.category || '') !== department) return false;
      if (subcategory !== 'all' && (i.subcategory || '') !== subcategory) return false;
      const sku = (i.sku || '').toLowerCase();
      const barcode = (i.barcode || '').toLowerCase();
      if (code && !sku.startsWith(code) && !barcode.startsWith(code)) return false;
      return matchesPosNameSearch(query, {
        name: i.name,
        extra: [i.sku, i.barcode, i.subcategory, ...itemSearchExtras(i)],
      });
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
          name: displayItemName(item, lang),
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
    // Keep product grid open on phone — user opens Buy list when ready to pay.
  }, [lang]);

  const customersRef = useRef<Customer[]>([]);
  customersRef.current = customers;

  const applyCode = useCallback(async (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    const party = await lookupCounterCustomer(q, customersRef.current);
    if (party?.id) {
      setCustomerId(party.id);
      setGuestName(party.name);
      if (party.phone) setGuestPhone(party.phone);
      setSavedGuest({ id: party.id, name: party.name, phone: party.phone || '' });
      setCustomers((prev) => (prev.some((c) => c.id === party.id) ? prev.map((c) => (c.id === party.id ? { ...c, ...party } : c)) : [party, ...prev]));
      if (isCredit(party)) setPayMode('credit');
      playScanBeep(true);
      success(`${party.name} on this bill`);
      return;
    }
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
  const notesSum = notesTotal(noteCounts);
  const tendered = notesSum > 0 ? notesSum : num(cashTendered);
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
    if (!showOrderModes && shopFulfilment === 'home_delivery' && deliveryAddress.trim().length < 5) {
      showError('Enter the delivery address (at least a few words / landmark).');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const credit = payMode === 'credit';
    const fulfilmentNote = !showOrderModes
      ? shopFulfilment === 'home_delivery'
        ? `Home delivery · ${deliveryAddress.trim()}`
        : shopFulfilment === 'pickup'
          ? `Pickup · ${guestName.trim() || guestPhone.trim() || 'customer'}`
          : 'In shop'
      : orderType === 'delivery'
        ? 'Delivery'
        : orderType === 'dinein'
          ? 'Dine-in'
          : 'Takeaway';
    const invoiceBody = {
        company_id: companyId,
        customer_id: (await rememberCounterCustomer({
          name: guestName,
          phone: guestPhone,
          address: !showOrderModes && shopFulfilment === 'home_delivery' ? deliveryAddress : undefined,
          customers,
          fallbackId: customerId,
          companyId,
        }))?.id || customerId,
        invoice_date: today,
        due_date: credit ? monthEnd() : today,
        gst_applicable: priced.some((row) => row.line.taxRate > 0),
        notes: fulfilmentNote,
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
    const cashNoteRef = payMode === 'cash' && notesSum > 0 ? formatNotesSummary(noteCounts) : '';
    const payBase =
      payMode === 'cash'
        ? cashNoteRef
          ? `Counter cash · ${cashNoteRef}`
          : 'Counter cash'
        : payMode === 'upi'
          ? 'Counter UPI'
          : 'Counter card';
    const paymentBody = credit ? null : {
      amount: totals.total,
      payment_date: today,
      mode: payMode,
      reference: fulfilmentNote && fulfilmentNote !== 'In shop' ? `${payBase} · ${fulfilmentNote}` : payBase,
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
      setNoteCounts({});
      setDeliveryAddress('');
      setShopFulfilment('counter');
      setCartOpen(false);
      success(note);
      void printCounterSlip({
        ...shop,
        number,
        date: today,
        billTo: selected?.name || guestName || 'Customer',
        lines: slipLines,
        taxable: totals.taxable,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        total: totals.total,
        paid: credit ? 0 : totals.total,
        due: credit ? totals.total : 0,
        paidBy,
        footer: fulfilmentNote !== 'In shop' ? `${fulfilmentNote} · ${note}` : note,
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

  const gstTotal = round2(totals.cgst + totals.sgst + totals.igst);

  const walkInCustomer = customers.find((c) => isWalkIn(c));
  const creditCustomers = customers.filter((c) => isCredit(c));
  const accountIsCredit = payMode === 'credit' || (!!selected && isCredit(selected) && !isWalkIn(selected));

  const pickWalkInCash = () => {
    if (walkInCustomer) setCustomerId(walkInCustomer.id);
    setPayMode('cash');
  };

  const pickMonthlyCredit = () => {
    setPayMode('credit');
    if (selected && isCredit(selected)) return;
    const first = creditCustomers[0];
    if (first) setCustomerId(first.id);
  };

  const cartPanel = (
    <div className="flex h-full min-h-0 flex-col">
      {/* Setup first — then scrollable buy list — Take stays pinned */}
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        {showOrderModes ? (
          <div className="grid grid-cols-3 gap-0.5">
            {(['takeaway', 'dinein', 'delivery'] as const).map((id) => (
              <button key={id} type="button" onClick={() => setOrderType(id)} className={`h-6 rounded text-[10px] font-semibold ${orderType === id ? 'bg-sky-500 text-white' : 'border border-slate-200'}`}>
                {id === 'dinein' ? 'Dine-in' : id === 'takeaway' ? 'Takeaway' : 'Delivery'}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-3 gap-0.5">
              {(
                [
                  ['counter', 'In shop'],
                  ['home_delivery', 'Home delivery'],
                  ['pickup', 'Pickup'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setShopFulfilment(id)}
                  className={`h-7 rounded text-[10px] font-semibold ${shopFulfilment === id ? 'bg-sky-500 text-white' : 'border border-slate-200 text-slate-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {shopFulfilment === 'home_delivery' && (
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                rows={2}
                placeholder="Delivery address / landmark / flat no."
                className="w-full resize-none rounded border border-slate-300 px-2 py-1.5 text-[11px]"
              />
            )}
          </div>
        )}

        <CounterCustomerBar
          compact
          name={guestName}
          phone={guestPhone}
          customers={customers}
          selectedId={customerId}
          onName={setGuestName}
          onPhone={setGuestPhone}
          onSelect={(c) => {
            setCustomerId(c.id);
            setSavedGuest({ id: c.id, name: c.name, phone: c.phone || '' });
            setCustomers((prev) => (prev.some((row) => row.id === c.id) ? prev.map((row) => (row.id === c.id ? { ...row, ...c } : row)) : [c, ...prev]));
            if (isCredit(c)) setPayMode('credit');
          }}
          onSave={() => void rememberCounterCustomer({ name: guestName, phone: guestPhone, customers, fallbackId: customerId, companyId }).then((saved) => {
            if (!saved) { showError('Enter a mobile number to remember this customer.'); return; }
            setSavedGuest(saved);
            setCustomerId(saved.id);
            setCustomers((prev) => (prev.some((c) => c.id === saved.id) ? prev : [{ id: saved.id, name: saved.name, phone: saved.phone }, ...prev]));
            success(`${saved.name} saved for wishes and offers.`);
          })}
        />

        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={pickWalkInCash}
            className={`h-8 rounded-lg border text-[11px] font-semibold ${!accountIsCredit && payMode !== 'credit' ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-700'}`}
          >
            Walk-in cash
          </button>
          <button
            type="button"
            onClick={pickMonthlyCredit}
            className={`h-8 rounded-lg border text-[11px] font-semibold ${accountIsCredit || payMode === 'credit' ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-700'}`}
          >
            Monthly credit
          </button>
        </div>

        {(payMode === 'credit' || accountIsCredit) && (
          <select
            value={customerId}
            onChange={(e) => {
              const id = e.target.value;
              setCustomerId(id);
              const c = customers.find((row) => row.id === id);
              if (c && isCredit(c)) setPayMode('credit');
              if (c && isWalkIn(c) && payMode === 'credit') setPayMode('cash');
            }}
            className="h-7 w-full rounded border border-slate-300 px-1.5 text-[11px]"
          >
            {(creditCustomers.length ? creditCustomers : customers).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.phone ? ` · ${c.phone}` : ''}{isCredit(c) ? ' · credit' : ''}
              </option>
            ))}
          </select>
        )}

        {!(payMode === 'credit' || accountIsCredit) && (
          <div className="grid grid-cols-3 gap-0.5">
            {([
              ['cash', 'Cash', Banknote],
              ['upi', 'UPI', Smartphone],
              ['card', 'Card', CreditCard],
            ] as const).map(([mode, label, Icon]) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setPayMode(mode);
                  if (walkInCustomer) setCustomerId(walkInCustomer.id);
                }}
                className={`inline-flex h-7 items-center justify-center gap-1 rounded border text-[10px] font-semibold ${payMode === mode ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-700'}`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <h2 className="text-xs font-semibold text-slate-900">Buy list</h2>
          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-800">
            {cart.length} · ₹{totals.total.toFixed(0)}
          </span>
        </div>

        <ul className="space-y-0.5 rounded-md border border-slate-200 bg-slate-50/80 p-1">
          {priced.length === 0 && <li className="px-1 py-3 text-center text-xs text-slate-500">Scan or tap — items appear here.</li>}
          {priced.map(({ line, money }) => (
            <li key={line.item_id} className="flex items-center gap-1 rounded border border-slate-200 bg-white px-1 py-0.5 text-xs">
              <p className="min-w-0 flex-1 truncate font-medium text-slate-900" title={line.name}>{line.name}</p>
              <div className="flex shrink-0 items-center gap-0.5">
                <button type="button" onClick={() => setQty(line.item_id, line.qty - 1)} className="inline-flex h-6 w-6 items-center justify-center rounded border"><Minus className="h-3 w-3" /></button>
                <span className="w-5 text-center text-xs font-semibold tabular-nums">{line.qty}</span>
                <button type="button" onClick={() => setQty(line.item_id, line.qty + 1)} className="inline-flex h-6 w-6 items-center justify-center rounded border"><Plus className="h-3 w-3" /></button>
              </div>
              <input
                type="number"
                min={0}
                max={line.maxDiscount}
                step="0.01"
                value={line.discountPercent}
                onChange={(e) => setLineDiscount(line.item_id, Number(e.target.value))}
                title="Disc %"
                aria-label="Discount percent"
                className="h-6 w-10 shrink-0 rounded border border-slate-300 px-0.5 text-right text-[10px]"
              />
              <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums">₹{money.inclusive.toFixed(0)}</span>
              <button type="button" onClick={() => setQty(line.item_id, 0)} className="shrink-0 p-0.5 text-slate-400" aria-label="Remove">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>

        <div className="rounded-md bg-slate-50 px-2 py-1 text-[11px] leading-snug text-slate-700">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Bill disc <span className="text-[10px]">(max ₹{roomSum.toFixed(0)})</span></span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={billDiscount}
              onChange={(e) => setBillDiscount(e.target.value)}
              placeholder="0"
              className="h-6 w-16 rounded border border-slate-300 px-1 text-right text-xs"
            />
          </div>
          <div className="mt-0.5 flex justify-between tabular-nums">
            <span>Taxable</span><span>₹{totals.taxable.toFixed(2)}</span>
          </div>
          <div className="flex justify-between tabular-nums" title={`CGST ₹${totals.cgst.toFixed(2)} · SGST ₹${totals.sgst.toFixed(2)}${totals.igst > 0 ? ` · IGST ₹${totals.igst.toFixed(2)}` : ''}`}>
            <span>GST</span><span>₹{gstTotal.toFixed(2)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between tabular-nums text-slate-500">
              <span>Discount</span><span>₹{totals.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="mt-0.5 flex justify-between text-sm font-bold text-slate-900 tabular-nums">
            <span>{ct(lang, 'Total', 'कुल')}</span><span>₹{totals.total.toFixed(2)}</span>
          </div>
          {seeCost && (
            <p className="text-[10px] text-slate-500">Cost ₹{totals.cost.toFixed(0)} · margin ₹{round2(totals.total - totals.cost).toFixed(0)}</p>
          )}
        </div>

        {payMode === 'cash' && (
          <div className="space-y-1">
            <CashNotePad
              counts={noteCounts}
              onChange={(next) => {
                setNoteCounts(next);
                const sum = notesTotal(next);
                setCashTendered(sum > 0 ? String(sum) : '');
              }}
              targetAmount={totals.total}
              compact
              label="Cash notes"
            />
            {notesSum === 0 && (
              <div className="flex items-center gap-1">
                <input
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  inputMode="decimal"
                  className="h-7 min-w-0 flex-1 rounded border border-slate-300 px-2 text-xs"
                  placeholder="Or type cash received"
                />
                {tendered > 0 && <span className="shrink-0 text-[11px] font-semibold text-slate-700">Chg ₹{change.toFixed(0)}</span>}
              </div>
            )}
          </div>
        )}

        {held.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {held.map((bill) => (
              <button key={bill.id} type="button" onClick={() => recallBill(bill)} className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-950">
                {bill.label}
              </button>
            ))}
          </div>
        )}
        {returnsOpen && (
          <div className="rounded border border-slate-200 p-1.5">
            <p className="text-[10px] font-semibold text-slate-600">{ct(lang, 'Today’s bills', 'आज के बिल')}</p>
            {todayBills.length === 0 && <p className="text-[10px] text-slate-500">{ct(lang, 'No bills yet today.', 'आज कोई बिल नहीं।')}</p>}
            {todayBills.map((bill) => (
              <div key={bill.id} className="mt-0.5 flex items-center justify-between gap-2 text-[10px]">
                <span>{bill.number} · ₹{Number(bill.total ?? 0).toFixed(0)}</span>
                <button type="button" disabled={busy} onClick={() => void returnBill(bill.id)} className="font-semibold text-brand-700">{ct(lang, 'Return', 'वापसी')}</button>
              </div>
            ))}
          </div>
        )}
        {lastBill && (
          <p className="truncate pb-1 text-[10px] text-slate-600">
            {lastBill.credit ? 'On account' : 'Paid'} {lastBill.number} · ₹{lastBill.total.toFixed(0)} ·{' '}
            <Link href={`/sales/invoices/${lastBill.id}/print`} className="font-semibold text-brand-700">Print</Link>
          </p>
        )}
      </div>

      {/* Sticky pay row — always on screen (phone + desktop) */}
      <div
        className="shrink-0 border-t border-slate-100 bg-white pt-1.5"
        style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-1">
          <button type="button" disabled={busy || cart.length === 0} onClick={holdBill} className="h-10 rounded-lg border border-slate-300 text-[11px] font-semibold text-slate-800 disabled:opacity-50">
            {ct(lang, 'Hold', 'रोकें')}
          </button>
          <button type="button" disabled={busy} onClick={() => void openReturns()} className="h-10 rounded-lg border border-slate-300 text-[11px] font-semibold text-slate-800 disabled:opacity-50">
            {ct(lang, 'Return', 'वापसी')}
          </button>
          <button type="button" disabled={busy || cart.length === 0} onClick={() => void charge()} className="h-10 rounded-lg bg-brand-600 text-[11px] font-bold text-white disabled:opacity-50">
            {busy ? '…' : payMode === 'credit' ? `${ct(lang, 'Credit', 'उधार')} ₹${totals.total.toFixed(0)}` : `${ct(lang, 'Take', 'लें')} ₹${totals.total.toFixed(0)}`}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-3 pb-24 md:grid md:h-[calc(100dvh-5.5rem)] md:grid-cols-[minmax(0,1fr)_320px] md:overflow-hidden md:pb-0 lg:grid-cols-[200px_minmax(0,1fr)_360px]">
      {waiting > 0 && (
        <p className="md:col-span-2 lg:col-span-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {waiting} {ct(lang, 'bill(s) are on this device. Stock updates after they sync. The counter needs the network for live stock.', 'बिल इस डिवाइस पर हैं। सिंक के बाद स्टॉक बदलेगा।')}
        </p>
      )}
      <div className="md:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2 text-xs">
          <Link href="/sales/portal-orders" className="rounded-full border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700">
            Online orders
          </Link>
          <Link href="/catalog" className="rounded-full border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700">
            Selling page
          </Link>
        </div>
        <label className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
          <span className="text-slate-500">Lang</span>
          <select
            value={lang}
            onChange={(e) => {
              const next = e.target.value as CounterLang;
              setCounterLang(next);
              setLang(next);
            }}
            className="bg-transparent text-xs font-semibold text-slate-800 outline-none"
            aria-label="Counter language"
          >
            {COUNTER_LANG_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </label>
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
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
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
              placeholder="Name or initials e.g. ttcm"
              className="w-full rounded-md border border-slate-300 py-2.5 pl-10 pr-3 text-sm min-h-[44px]"
            />
          </div>
          <div className="flex gap-2 sm:w-auto">
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
              placeholder="SKU / barcode"
              title="Type or paste SKU or barcode, then Enter to add to cart"
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2.5 text-sm min-h-[44px] sm:w-36 sm:flex-none"
            />
            <BarcodeCapture onDetected={applyCode} label="Scan" className="shrink-0" />
          </div>
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
              const qty = cart.find((l) => l.item_id === item.id)?.qty ?? 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addItem(item)}
                  className={`relative min-h-[72px] rounded-md border bg-white px-2 py-2 text-left hover:bg-sky-50 ${
                    qty > 0 ? 'border-brand-500 ring-1 ring-brand-500' : 'border-sky-300'
                  }`}
                >
                  <p className="pr-12 text-sm font-medium leading-snug text-slate-800 line-clamp-2">{displayItemName(item, lang)}</p>
                  {displayItemPackLine(item) && (
                    <p className="pr-10 text-[10px] text-slate-500 line-clamp-1">{displayItemPackLine(item)}</p>
                  )}
                  <span className="absolute right-2 top-2 text-xs font-semibold text-slate-600">₹{shelf.toFixed(0)}</span>
                  {disc > 0 && <p className="text-[10px] text-slate-400 line-through">MRP ₹{mrp.toFixed(0)}</p>}
                  {packs != null && packs <= 0 && <p className="text-[10px] font-medium text-amber-700">Out of packs</p>}
                  {qty > 0 && <span className="absolute bottom-1 right-2 rounded bg-brand-600 px-1.5 text-[10px] font-bold text-white">{qty}</span>}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <aside className="hidden min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 md:flex md:flex-col">
        {cartPanel}
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white p-3 shadow md:hidden" style={{ paddingBottom: 'max(0.75rem, var(--safe-area-bottom))' }}>
        <button type="button" onClick={() => setCartOpen(true)} className="flex w-full items-center justify-between rounded-xl bg-brand-600 px-4 py-3 text-white min-h-[48px]">
          <span className="text-left">
            <span className="block text-xs font-medium text-brand-100">Buy list</span>
            <span>{cart.length} item{cart.length === 1 ? '' : 's'}</span>
          </span>
          <span className="font-bold">₹{totals.total.toFixed(2)}</span>
        </button>
      </div>
      {cartOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 md:hidden" onClick={() => setCartOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 flex h-[min(92dvh,100%)] max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl bg-white px-3 pt-3"
            style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1.5 flex shrink-0 items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Buy list</p>
              <button type="button" onClick={() => setCartOpen(false)} className="px-2 text-sm font-medium text-brand-700 min-h-[40px]">Close</button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{cartPanel}</div>
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
