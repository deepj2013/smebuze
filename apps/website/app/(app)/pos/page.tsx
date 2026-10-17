'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import LooseAsk from './LooseAsk';
import { formatLooseQty, isLooseItem } from '@/lib/loose-sale';
import { useToast } from '../components/ToastContext';
import { businessTypeMeta, isFloorBusinessType, isStockTrackedPos, posSellingRate } from '@/lib/business-types';
import { Minus, Plus, Search, Banknote, Smartphone, CreditCard, ShoppingBag, UtensilsCrossed, Bike } from 'lucide-react';
import BarcodeCapture from '../components/BarcodeCapture';
import { useHidBarcode } from '@/lib/use-hid-barcode';
import { playScanBeep } from '@/lib/pos-beep';
import { matchesPosNameSearch } from '@/lib/pos-search';
import { displayItemName, displayItemPackLine, itemSearchExtras } from '@/lib/item-i18n';
import { COUNTER_LANG_OPTIONS, counterLang, setCounterLang, type CounterLang } from '@/lib/counter-desk';
import { limitDecimalPlaces, round2 } from '@/lib/money';
import {
  isNetworkError,
  loadHeld,
  loadOutbox,
  printCounterSlip,
  queueBill,
  rememberCounterCustomer,
  saveHeld,
  shopFromCompany,
  syncOutbox,
  type HeldBill,
} from '@/lib/counter-desk';
import { minutesAgo, type CounterBoard, type DeliveryOrder, type FloorLine } from '@/lib/floor';
import DepartmentCounter from './DepartmentCounter';

interface PosItem {
  id: string;
  name: string;
  brand?: string | null;
  sku?: string | null;
  barcode?: string | null;
  category?: string | null;
  variant_size?: string | null;
  variant_shape?: string | null;
  unit?: string | null;
  hsn_sac?: string | null;
  mrp?: string | number | null;
  sale_price?: string | number | null;
  discount_percent?: string | number | null;
  tax_rate?: string | number | null;
  current_stock?: number;
  metadata?: Record<string, unknown> | null;
}

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  tags?: string[];
  segment?: string | null;
}

interface Company {
  id: string;
  name: string;
  gstin?: string | null;
  address?: Record<string, unknown> | null;
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

type PayMode = 'cash' | 'upi' | 'card' | 'credit';
type OrderType = 'takeaway' | 'dinein' | 'delivery';

const ORDER_TYPES: { id: OrderType; label: string; hint: string }[] = [
  { id: 'takeaway', label: 'Takeaway', hint: 'Pay and go' },
  { id: 'dinein', label: 'Dine-in', hint: 'Tables' },
  { id: 'delivery', label: 'Delivery', hint: 'Address' },
];

const MODE_ICON = { takeaway: ShoppingBag, dinein: UtensilsCrossed, delivery: Bike };

function monthEnd(): string {
  const d = new Date();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
}

export default function PosPage() {
  const { success, error: showError } = useToast();
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [lang, setLang] = useState<CounterLang>('en');
  const [items, setItems] = useState<PosItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [category, setCategory] = useState('all');
  const [menuQuery, setMenuQuery] = useState('');
  const [query, setQuery] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestAddress, setGuestAddress] = useState('');
  const [savedGuest, setSavedGuest] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [orderType, setOrderType] = useState<OrderType>('takeaway');
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [activeDeliveryId, setActiveDeliveryId] = useState<string | null>(null);
  const [board, setBoard] = useState<CounterBoard | null>(null);
  const [editingTables, setEditingTables] = useState(false);
  const [tableDraft, setTableDraft] = useState<string[]>([]);
  const [newTable, setNewTable] = useState('');
  const [savingTables, setSavingTables] = useState(false);
  const [clock, setClock] = useState(0);
  const [looseItem, setLooseItem] = useState<PosItem | null>(null);
  const [shortCode, setShortCode] = useState('');
  const [payMode, setPayMode] = useState<PayMode>('cash');
  const [cashTendered, setCashTendered] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastBill, setLastBill] = useState<{ id: string; number: string; total: number } | null>(null);
  const [short, setShort] = useState<{ item_id: string; name: string; current_stock: number }[]>([]);
  const [todayBills, setTodayBills] = useState<{ id: string; number: string; total?: string | number }[]>([]);
  const [scanHint, setScanHint] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [tenantKey, setTenantKey] = useState('');
  const [held, setHeld] = useState<HeldBill[]>([]);
  const [waiting, setWaiting] = useState(0);
  const itemsRef = useRef<PosItem[]>([]);

  const meta = businessTypeMeta(businessType ?? 'retail_shop');
  const floorMode = isFloorBusinessType(businessType);
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
    setLang(counterLang());
  }, []);

  useEffect(() => {
    let timer = 0;
    let cancelled = false;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('smebuzz_token') : null;
    (async () => {
      let type = 'retail_shop';
      if (token) {
        try {
          const response = await fetch(`${API_URL}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
          const d = await response.json();
          const t = d?.tenant?.settings?.business_type;
          if (typeof t === 'string') type = t;
          const key = d?.tenant?.slug || d?.tenant?.id || '';
          if (key) {
            setTenantKey(key);
            setHeld(loadHeld(key));
          }
        } catch {
          type = 'retail_shop';
        }
      }
      if (cancelled) return;
      setBusinessType(type);
      if (type === 'department_store') return;
      const pullBoard = async () => {
        const { data } = await apiGet<CounterBoard>('sales/floor/counter');
        if (!cancelled && data && Array.isArray(data.tables)) setBoard(data);
      };
      await loadCatalog();
      await pullBoard();
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
      timer = window.setInterval(() => { loadCatalog(); void pullBoard(); }, 20000);
    })();
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setClock((n) => n + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.category?.trim()) set.add(i.category.trim());
    });
    return ['all', ...Array.from(set).sort()];
  }, [items]);

  const shownCategories = useMemo(() => {
    const q = menuQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c === 'all' || c.toLowerCase().includes(q));
  }, [categories, menuQuery]);

  const visibleItems = useMemo(() => {
    const code = shortCode.trim().toLowerCase();
    return items.filter((i) => {
      if (category !== 'all' && (i.category || '') !== category) return false;
      const sku = (i.sku || '').toLowerCase();
      const barcode = (i.barcode || '').toLowerCase();
      if (code && !sku.startsWith(code) && !barcode.startsWith(code)) return false;
      return matchesPosNameSearch(query, {
        name: i.name,
        extra: [i.sku, i.barcode, ...itemSearchExtras(i)],
      });
    });
  }, [items, category, query, shortCode]);

  const addItem = useCallback((item: PosItem, qty = 1) => {
    if (qty === 1 && isLooseItem(item)) {
      setLooseItem(item);
      return;
    }
    const rate = posSellingRate(item);
    const tax = Number(item.tax_rate ?? 0);
    const addQty = qty > 0 ? qty : 1;
    setCart((prev) => {
      const existing = prev.find((l) => l.item_id === item.id && l.rate === rate);
      if (existing) return prev.map((l) => (l.item_id === item.id && l.rate === rate ? { ...l, qty: Math.round((l.qty + addQty) * 10000) / 10000 } : l));
      return [
        ...prev,
        {
          item_id: item.id,
          name: displayItemName(item, lang),
          qty: addQty,
          rate,
          tax_rate: tax,
          hsn_sac: item.hsn_sac || '9983',
          unit: item.unit || 'pcs',
        },
      ];
    });
    // Keep product grid open on phone — user opens Buy list when ready to pay.
  }, [lang]);

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
      const next = Math.round(qty * 10000) / 10000;
      return prev.map((l) => (l.item_id === itemId ? { ...l, qty: next } : l));
    });
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    for (const l of cart) {
      const taxable = round2(l.qty * l.rate);
      subtotal = round2(subtotal + taxable);
      tax = round2(tax + round2(taxable * (Number(l.tax_rate) / 100)));
    }
    return { subtotal, tax, total: round2(subtotal + tax) };
  }, [cart]);

  const tendered = Number(cashTendered || 0);
  const change = payMode === 'cash' && tendered > 0 ? Math.max(0, tendered - totals.total) : 0;

  const shopCounter = !!businessType && businessType !== 'ice_crest' && businessType !== 'department_store';

  const charge = async (printSlip = true) => {
    if (!cart.length) {
      showError('Add at least one item to the bill.');
      return;
    }
    if (!companyId) {
      showError('Company is missing. Add one under Organization.');
      return;
    }
    if (!customerId && !guestPhone.trim()) {
      showError('Choose Walk-in / Counter or a customer.');
      return;
    }
    if (orderType === 'dinein' && !activeTable) {
      showError('Choose a table for dine-in.');
      return;
    }
    if (orderType === 'delivery' && guestAddress.trim().length < 3) {
      showError('Add the delivery address.');
      return;
    }
    const remembered = await rememberCounterCustomer({
      name: guestName,
      phone: guestPhone,
      address: orderType === 'delivery' ? guestAddress : undefined,
      customers,
      fallbackId: customerId,
      companyId,
    });
    const billCustomerId = remembered?.id || customerId;
    if (remembered) {
      setSavedGuest(remembered);
      setCustomerId(remembered.id);
      setCustomers((prev) => (prev.some((c) => c.id === remembered.id) ? prev.map((c) => (c.id === remembered.id ? { ...c, name: remembered.name, phone: remembered.phone } : c)) : [{ id: remembered.id, name: remembered.name, phone: remembered.phone, tags: ['counter'] }, ...prev]));
    }
    const billName = remembered?.name || customers.find((c) => c.id === billCustomerId)?.name || '';
    if (payMode === 'credit' && /walk-?in/i.test(billName) && !remembered) {
      showError('Credit needs a named customer, not Walk-in.');
      return;
    }
    if (payMode === 'cash' && tendered > 0 && tendered < totals.total) {
      showError('Cash received is less than the bill total.');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const credit = shopCounter && payMode === 'credit';
    const invoiceBody = {
      company_id: companyId,
      customer_id: billCustomerId,
      invoice_date: today,
      due_date: credit ? monthEnd() : today,
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
    };
    const paymentBody = credit ? null : {
      amount: totals.total,
      payment_date: today,
      mode: payMode === 'credit' ? 'cash' : payMode,
      reference: `POS ${orderType} ${payMode}`,
    };
    const clearBill = () => {
      setCart([]);
      setCashTendered('');
      setCartOpen(false);
      setGuestName('');
      setGuestPhone('');
      setGuestAddress('');
      setSavedGuest(null);
      setActiveTable(null);
      setActiveDeliveryId(null);
    };
    const place = orderType === 'dinein' && activeTable
      ? `Dine-in · Table ${activeTable}`
      : orderType === 'delivery'
        ? `Delivery · ${guestAddress.trim()}`
        : 'Takeaway';
    const paidBy = credit ? 'Credit' : payMode === 'upi' ? 'UPI' : payMode === 'card' ? 'Card' : 'Cash';
    const printSlipNow = (number: string, total: number, footer?: string) => {
      if (!printSlip) return;
      void printCounterSlip({
        ...shopFromCompany(companies.find((c) => c.id === companyId)),
        number,
        date: today,
        billTo: orderType === 'dinein' && activeTable
          ? `Table ${activeTable}`
          : remembered?.name || customers.find((c) => c.id === billCustomerId)?.name || 'Walk-in',
        lines: cart.map((l) => ({ description: l.name, qty: l.qty, rate: l.rate, amount: round2(l.qty * l.rate) })),
        taxable: totals.subtotal,
        cgst: round2(totals.tax / 2),
        sgst: round2(totals.tax / 2),
        total,
        paid: credit ? 0 : total,
        due: credit ? total : 0,
        paidBy,
        footer: footer || [place, remembered?.phone].filter(Boolean).join(' · '),
      }).catch(() => undefined);
    };
    if (shopCounter && typeof navigator !== 'undefined' && navigator.onLine === false) {
      const queued = queueBill({ invoice: invoiceBody, payment: paymentBody });
      setWaiting(loadOutbox().length);
      clearBill();
      success('Saved on this device. Stock updates when the internet is back.');
      printSlipNow(queued.id, totals.total, 'Waiting to sync. Stock is not updated yet.');
      return;
    }
    setBusy(true);
    try {
      const serviceLines = cart.map((l) => ({ item_id: l.item_id, qty: l.qty, rate: l.rate }));
      let deliveryId = activeDeliveryId;
      if (orderType === 'dinein' && activeTable) {
        const parked = await apiPost<CounterBoard>('sales/floor/counter/table', {
          company_id: companyId,
          table_no: activeTable,
          customer_id: billCustomerId,
          guest_name: guestName,
          guest_phone: guestPhone,
          bill_total: totals.total,
          lines: serviceLines,
        });
        if (parked.error) {
          showError(parked.error);
          return;
        }
        if (parked.data) setBoard(parked.data);
      }
      if (orderType === 'delivery') {
        const parked = await apiPost<CounterBoard>('sales/floor/counter/delivery', {
          id: activeDeliveryId || undefined,
          company_id: companyId,
          customer_id: billCustomerId,
          name: guestName,
          phone: guestPhone,
          address: guestAddress.trim(),
          bill_total: totals.total,
          lines: serviceLines,
        });
        if (parked.error || !parked.data?.saved_id) {
          showError(parked.error || 'Could not save this delivery.');
          return;
        }
        deliveryId = parked.data.saved_id;
        setBoard(parked.data);
      }
      const { data: invoice, error: invErr } = await apiPost<{ id: string; number: string; total: string | number }>('sales/invoices', invoiceBody);
      if (invErr || !invoice?.id) {
        if (shopCounter && isNetworkError(invErr)) {
          const queued = queueBill({ invoice: invoiceBody, payment: paymentBody });
          setWaiting(loadOutbox().length);
          clearBill();
          success('Saved on this device. Stock updates when the internet is back.');
          printSlipNow(queued.id, totals.total, 'Waiting to sync. Stock is not updated yet.');
          return;
        }
        showError(invErr || 'Could not create the bill.');
        return;
      }
      const total = Number(invoice.total ?? totals.total);
      if (paymentBody) {
        const { error: payErr } = await apiPost(`sales/invoices/${invoice.id}/payment`, { ...paymentBody, amount: total });
        if (payErr) showError(`Bill saved but payment failed: ${payErr}`);
        else success(`Bill ${invoice.number} settled.`);
      } else {
        success(`Credit bill ${invoice.number} · ₹${total.toFixed(2)}`);
      }
      setLastBill({ id: invoice.id, number: invoice.number, total });
      if (orderType === 'dinein' && activeTable) {
        const closed = await apiPost<CounterBoard>('sales/floor/counter/close', { kind: 'table', table_no: activeTable, invoice_id: invoice.id });
        if (closed.data) setBoard(closed.data);
      } else if (orderType === 'delivery' && deliveryId) {
        const closed = await apiPost<CounterBoard>('sales/floor/counter/close', { kind: 'delivery', id: deliveryId, invoice_id: invoice.id });
        if (closed.data) setBoard(closed.data);
      }
      clearBill();
      if (shopCounter) printSlipNow(invoice.number, total);
      loadCatalog();
    } catch (err) {
      if (shopCounter && (err instanceof TypeError || isNetworkError(err instanceof Error ? err.message : ''))) {
        const queued = queueBill({ invoice: invoiceBody, payment: paymentBody });
        setWaiting(loadOutbox().length);
        clearBill();
        success('Saved on this device. Stock updates when the internet is back.');
        printSlipNow(queued.id, totals.total, 'Waiting to sync. Stock is not updated yet.');
        return;
      }
      showError(err instanceof Error ? err.message : 'Could not create the bill.');
    } finally {
      setBusy(false);
    }
  };

  const holdBill = () => {
    if (!shopCounter || !cart.length || !tenantKey) return;
    const next: HeldBill[] = [{
      id: `hold_${Date.now().toString(36)}`,
      at: new Date().toISOString(),
      label: `${customers.find((c) => c.id === customerId)?.name || 'Bill'} · ₹${totals.total.toFixed(2)}`,
      customerId,
      payMode,
      billDiscount: '',
      cart,
    }, ...held];
    saveHeld(tenantKey, next);
    setHeld(loadHeld(tenantKey));
    setCart([]);
    success('Bill parked. Start the next customer.');
  };

  const recallBill = (bill: HeldBill) => {
    setCart(Array.isArray(bill.cart) ? bill.cart as CartLine[] : []);
    if (bill.customerId) setCustomerId(bill.customerId);
    if (bill.payMode === 'cash' || bill.payMode === 'upi' || bill.payMode === 'card' || bill.payMode === 'credit') setPayMode(bill.payMode);
    const next = held.filter((row) => row.id !== bill.id);
    saveHeld(tenantKey, next);
    setHeld(next);
    setCartOpen(true);
  };

  useEffect(() => {
    if (!shopCounter) return;
    const run = () => {
      void syncOutbox().then((result) => {
        setWaiting(result.left);
        if (result.sent > 0) success(`${result.sent} saved bill${result.sent === 1 ? '' : 's'} synced. Stock is updated.`);
      });
    };
    window.addEventListener('online', run);
    run();
    return () => window.removeEventListener('online', run);
  }, [shopCounter, success]);

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    void applyCode(q);
  };

  const onShortKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const code = shortCode.trim().toLowerCase();
    if (!code) return;
    const hits = items.filter((i) => (i.sku || '').toLowerCase().startsWith(code) || (i.barcode || '').toLowerCase().startsWith(code));
    if (hits.length === 1) {
      addItem(hits[0]);
      setShortCode('');
      setScanHint(hits[0].name);
      playScanBeep(true);
      return;
    }
    void applyCode(shortCode.trim());
    setShortCode('');
  };

  const billOf = (rows: CartLine[]) => {
    let subtotal = 0;
    let tax = 0;
    for (const l of rows) {
      const taxable = round2(l.qty * l.rate);
      subtotal = round2(subtotal + taxable);
      tax = round2(tax + round2(taxable * (Number(l.tax_rate) / 100)));
    }
    return round2(subtotal + tax);
  };

  const cartFromLines = (lines: FloorLine[]): CartLine[] =>
    lines.filter((l) => l.item_id).map((l) => {
      const item = items.find((i) => i.id === l.item_id);
      return {
        item_id: l.item_id as string,
        name: l.name,
        qty: l.qty,
        rate: l.rate,
        tax_rate: Number(item?.tax_rate || 0),
        hsn_sac: item?.hsn_sac || '',
        unit: l.unit || item?.unit || 'pcs',
      };
    });

  const parkTable = async (table: string, rows: CartLine[], release = false) => {
    const { data, error } = await apiPost<CounterBoard>('sales/floor/counter/table', {
      company_id: companyId,
      table_no: table,
      customer_id: customerId || undefined,
      guest_name: guestName,
      guest_phone: guestPhone,
      bill_total: billOf(rows),
      release,
      lines: rows.map((l) => ({ item_id: l.item_id, qty: l.qty, rate: l.rate })),
    });
    if (data) setBoard(data);
    return error;
  };

  const selectTable = async (name: string) => {
    if (name === activeTable) return;
    if (activeTable) {
      const sitting = board?.by_table?.[activeTable];
      const emptySit = !cart.length && !!sitting && sitting.lines.length === 0;
      const error = cart.length ? await parkTable(activeTable, cart) : emptySit ? await parkTable(activeTable, [], true) : null;
      if (error) {
        showError(error);
        return;
      }
    }
    const tab = board?.by_table?.[name];
    setActiveTable(name);
    if (tab && tab.lines.length) {
      setCart(cartFromLines(tab.lines));
      setGuestName(tab.guest_name || '');
      setGuestPhone(tab.guest_phone || '');
    } else {
      setCart([]);
      if (!tab) {
        const error = await parkTable(name, []);
        if (error) showError(error);
      }
    }
    setCartOpen(true);
  };

  const saveRunning = async () => {
    if (!cart.length) {
      showError('Add at least one item.');
      return;
    }
    setBusy(true);
    try {
      if (orderType === 'dinein') {
        if (!activeTable) {
          showError('Choose a table first.');
          return;
        }
        const error = await parkTable(activeTable, cart);
        if (error) {
          showError(error);
          return;
        }
        success(`${activeTable} saved. Seated time keeps running.`);
        return;
      }
      if (guestAddress.trim().length < 3) {
        showError('Add the delivery address.');
        return;
      }
      const remembered = await rememberCounterCustomer({
        name: guestName,
        phone: guestPhone,
        address: guestAddress,
        customers,
        fallbackId: customerId,
        companyId,
      });
      if (remembered) setCustomerId(remembered.id);
      const { data, error } = await apiPost<CounterBoard>('sales/floor/counter/delivery', {
        id: activeDeliveryId || undefined,
        company_id: companyId,
        customer_id: remembered?.id || customerId || undefined,
        name: guestName,
        phone: guestPhone,
        address: guestAddress.trim(),
        bill_total: totals.total,
        lines: cart.map((l) => ({ item_id: l.item_id, qty: l.qty, rate: l.rate })),
      });
      if (error || !data) {
        showError(error || 'Could not save this delivery.');
        return;
      }
      setBoard(data);
      if (data.saved_id) setActiveDeliveryId(data.saved_id);
      success('Delivery is on the list.');
    } finally {
      setBusy(false);
    }
  };

  const selectDelivery = (row: DeliveryOrder) => {
    setActiveDeliveryId(row.id);
    setGuestName(row.name || '');
    setGuestPhone(row.phone || '');
    setGuestAddress(row.address || '');
    setCart(cartFromLines(row.lines));
    setCartOpen(true);
  };

  const startDelivery = () => {
    setActiveDeliveryId(null);
    setGuestName('');
    setGuestPhone('');
    setGuestAddress('');
    setSavedGuest(null);
    setCart([]);
  };

  const saveTableList = async () => {
    if (!tableDraft.length) {
      showError('Add at least one table.');
      return;
    }
    setSavingTables(true);
    const { error } = await apiPatch('sales/floor/tables', { tables: tableDraft });
    setSavingTables(false);
    if (error) {
      showError(error);
      return;
    }
    const { data } = await apiGet<CounterBoard>('sales/floor/counter');
    if (data) setBoard(data);
    setEditingTables(false);
    success('Tables saved.');
  };

  if (!businessType) return <p className="text-slate-600">Loading counter…</p>;
  if (businessType === 'department_store') return <DepartmentCounter />;

  const saveGuest = async () => {
    if (!guestPhone.trim()) {
      showError('Enter a mobile number to remember this customer.');
      return;
    }
    const remembered = await rememberCounterCustomer({
      name: guestName,
      phone: guestPhone,
      address: orderType === 'delivery' ? guestAddress : undefined,
      customers,
      fallbackId: customerId,
      companyId,
    });
    if (!remembered) return;
    setSavedGuest(remembered);
    setCustomerId(remembered.id);
    setCustomers((prev) => (prev.some((c) => c.id === remembered.id) ? prev.map((c) => (c.id === remembered.id ? { ...c, name: remembered.name, phone: remembered.phone } : c)) : [{ id: remembered.id, name: remembered.name, phone: remembered.phone, tags: ['counter'] }, ...prev]));
    success(`${remembered.name} saved for wishes and offers.`);
  };

  const qtyOf = (itemId: string) => cart.find((line) => line.item_id === itemId)?.qty ?? 0;
  const payButtons = ([
    { id: 'cash' as const, label: 'Cash', icon: Banknote },
    { id: 'upi' as const, label: 'UPI', icon: Smartphone },
    { id: 'card' as const, label: 'Card', icon: CreditCard },
  ]);

  const activeTab = activeTable ? board?.by_table?.[activeTable] ?? null : null;
  void clock;

  const billPanel = (
    <div className="flex h-full min-h-0 flex-col">
      {orderType === 'dinein' && (
        <div className="mb-2 shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-2">
          <p className="text-sm font-semibold text-slate-900">{activeTable ? `Table ${activeTable}` : 'Choose a table'}</p>
          <p className="text-xs text-slate-500">{activeTab ? `Seated ${minutesAgo(activeTab.created_at)}` : 'Seated time starts when you open the table'}</p>
        </div>
      )}
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Buy list</h2>
        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800">
          {cart.length} item{cart.length === 1 ? '' : 's'} · ₹{totals.total.toFixed(0)}
        </span>
      </div>
      <div className="mt-2 grid shrink-0 grid-cols-[1fr_3rem_4rem_4.5rem] gap-1 px-1 text-[11px] font-semibold uppercase text-slate-500">
        <span>Item</span><span className="text-right">Qty</span><span className="text-right">Rate</span><span className="text-right">Amt</span>
      </div>
      <ul className="mt-1 min-h-[160px] flex-1 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/80 p-1.5">
        {cart.length === 0 && <li className="px-1 py-6 text-center text-sm text-slate-500">Tap or scan — items appear here.</li>}
        {cart.map((l) => {
          const loose = isLooseItem({ unit: l.unit, metadata: items.find((i) => i.id === l.item_id)?.metadata });
          return (
          <li key={`${l.item_id}-${l.rate}`} className="grid grid-cols-[1fr_4.5rem_3.5rem_4rem] items-center gap-1 rounded-md px-1 py-1 text-sm hover:bg-slate-50">
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">{l.name}</p>
              <button type="button" onClick={() => setQty(l.item_id, 0)} className="text-[11px] text-slate-400 hover:text-red-600">Remove</button>
            </div>
            {loose ? (
              <input
                type="text"
                inputMode="decimal"
                value={String(l.qty)}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/[^\d.]/g, ''));
                  if (Number.isFinite(n)) setQty(l.item_id, n);
                }}
                className="h-7 w-full rounded border border-slate-200 px-1 text-right text-xs font-semibold"
                title={formatLooseQty(l.qty, l.unit)}
              />
            ) : (
              <div className="flex items-center justify-end gap-0.5">
                <button type="button" onClick={() => setQty(l.item_id, l.qty - 1)} className="rounded border p-0.5"><Minus className="h-3 w-3" /></button>
                <span className="w-6 text-center text-xs font-semibold">{l.qty}</span>
                <button type="button" onClick={() => setQty(l.item_id, l.qty + 1)} className="rounded border p-0.5"><Plus className="h-3 w-3" /></button>
              </div>
            )}
            <span className="text-right text-xs tabular-nums">{l.rate.toFixed(2)}</span>
            <span className="text-right text-xs font-semibold tabular-nums">{round2(l.qty * l.rate).toFixed(2)}</span>
          </li>
          );
        })}
      </ul>
      <div className="mt-2 shrink-0 space-y-2 overflow-y-auto border-t border-slate-100 pt-2">
      <div className="rounded border border-slate-200 bg-slate-50 p-1.5">
        <div className="grid grid-cols-2 gap-1">
          <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Name" className="h-7 rounded border border-slate-200 bg-white px-2 text-xs" />
          <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} inputMode="tel" placeholder="Mobile" className="h-7 rounded border border-slate-200 bg-white px-2 text-xs" />
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <button type="button" onClick={() => void saveGuest()} className="h-6 rounded bg-slate-800 px-2 text-[11px] font-semibold text-white">Save</button>
          <span className="truncate text-[11px] text-slate-600">{savedGuest ? `${savedGuest.name} · ${savedGuest.phone}` : 'Saved here for wishes'}</span>
        </div>
        {orderType === 'delivery' && (
          <textarea
            value={guestAddress}
            onChange={(e) => setGuestAddress(e.target.value)}
            placeholder="Delivery address"
            rows={2}
            className="mt-1 w-full resize-none rounded border border-slate-200 bg-white px-2 py-1 text-xs"
          />
        )}
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between text-slate-600"><span>Taxable</span><span className="tabular-nums">₹{totals.subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between text-slate-600"><span>GST</span><span className="tabular-nums">₹{totals.tax.toFixed(2)}</span></div>
        <div className="flex justify-between text-base font-bold text-slate-900"><span>Bill amount</span><span className="tabular-nums">₹{totals.total.toFixed(2)}</span></div>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {payButtons.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setPayMode(m.id)}
            className={`flex h-8 items-center justify-center gap-1 rounded border text-[11px] font-semibold ${
              payMode === m.id ? 'border-sky-400 bg-sky-100 text-sky-900' : 'border-slate-200 text-slate-700'
            }`}
          >
            <m.icon className="h-3 w-3" />
            {m.label}
          </button>
        ))}
      </div>
      {shopCounter && (
        <button type="button" onClick={() => setPayMode('credit')} className={`w-full rounded-lg border py-2 text-xs font-semibold min-h-[40px] ${payMode === 'credit' ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200'}`}>
          Credit (month end)
        </button>
      )}
      {payMode === 'cash' && (
        <label className="block text-xs font-medium text-slate-600">
          Cash received
          <input
            type="text"
            inputMode="decimal"
            value={cashTendered}
            onChange={(e) => setCashTendered(limitDecimalPlaces(e.target.value))}
            placeholder={totals.total ? totals.total.toFixed(2) : '0'}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[40px]"
          />
          {tendered > 0 && <span className="mt-1 block text-sm text-slate-800">Change ₹{change.toFixed(2)}</span>}
        </label>
      )}
      {shopCounter && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={holdBill} disabled={cart.length === 0} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold disabled:opacity-50">Hold</button>
          {held.map((bill) => (
            <button key={bill.id} type="button" onClick={() => recallBill(bill)} className="rounded-lg bg-amber-50 px-2 py-2 text-left text-xs font-medium text-amber-950">{bill.label}</button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-3 gap-1">
        <button type="button" onClick={() => (orderType === 'takeaway' ? void charge(false) : void saveRunning())} disabled={busy || cart.length === 0} className="h-9 rounded bg-pink-500 text-xs font-semibold text-white disabled:opacity-50">
          {busy ? '…' : orderType === 'dinein' ? 'Save table' : orderType === 'delivery' ? 'Save delivery' : 'Save'}
        </button>
        <button type="button" onClick={() => void charge(true)} disabled={busy || cart.length === 0} className="h-9 rounded bg-pink-500 text-xs font-semibold text-white disabled:opacity-50">
          {busy ? '…' : 'Save & Print'}
        </button>
        <button type="button" onClick={() => {
          if (orderType === 'dinein' && activeTable && cart.length === 0) void parkTable(activeTable, [], true);
          setCart([]);
          setCashTendered('');
          setCartOpen(false);
          setActiveTable(null);
          setActiveDeliveryId(null);
          setGuestAddress('');
        }} className="h-9 rounded bg-pink-500 text-xs font-semibold text-white">
          Close
        </button>
      </div>
      {lastBill && (
        <Link href={`/sales/invoices/${lastBill.id}/print`} target="_blank" className="block text-center text-sm font-medium text-brand-700 hover:underline">
          Open bill {lastBill.number}
        </Link>
      )}
      {short.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2">
          <p className="text-[11px] font-semibold uppercase text-amber-900">Short items</p>
          <ul className="mt-1 max-h-20 space-y-0.5 overflow-y-auto">
            {short.slice(0, 6).map((s) => (
              <li key={s.item_id} className="flex justify-between text-[11px] text-amber-950">
                <span className="truncate pr-2">{s.name}</span>
                <span className="tabular-nums">{s.current_stock}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {todayBills.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase text-slate-500">Today</p>
          <ul className="mt-1 space-y-0.5">
            {todayBills.slice(0, 4).map((b) => (
              <li key={b.id} className="flex justify-between text-[11px] text-slate-600">
                <span>{b.number}</span>
                <span className="tabular-nums">₹{Number(b.total ?? 0).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-3 pb-24 md:h-[calc(100dvh-5.5rem)] md:overflow-hidden md:pb-0">
      <div className="flex justify-end">
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
      {shopCounter && waiting > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {waiting} bill(s) are on this device. Stock updates after they sync.
        </p>
      )}
      <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {ORDER_TYPES.map((row) => {
          const Icon = MODE_ICON[row.id];
          const on = orderType === row.id;
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => {
                if (row.id === orderType) return;
                if (orderType === 'dinein') {
                  setCart([]);
                  setActiveTable(null);
                  setCashTendered('');
                }
                if (orderType === 'delivery' && row.id !== 'delivery') {
                  setCart([]);
                  setActiveDeliveryId(null);
                  setGuestAddress('');
                  setGuestName('');
                  setGuestPhone('');
                }
                setOrderType(row.id);
              }}
              className={`flex h-12 items-center justify-center gap-2 border-r border-slate-200 text-sm font-semibold last:border-r-0 ${on ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{row.label}</span>
            </button>
          );
        })}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-[168px_minmax(0,1fr)_340px] md:overflow-hidden">
        <aside className="hidden min-h-0 flex-col gap-1 overflow-y-auto md:flex">
          <p className="px-1 text-[11px] font-semibold uppercase text-slate-500">Menu</p>
          <input
            value={menuQuery}
            onChange={(e) => setMenuQuery(e.target.value)}
            placeholder="Search category"
            className="h-8 rounded border border-slate-300 px-2 text-xs"
          />
          {shownCategories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-md px-3 py-3 text-left text-sm font-semibold min-h-[44px] ${
                category === c ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </aside>

        <section className="min-h-0 min-w-0 overflow-y-auto">
          {orderType === 'dinein' && (
            <div className="mb-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">Tables</p>
                <button
                  type="button"
                  onClick={() => {
                    setTableDraft(board?.tables?.length ? [...board.tables] : []);
                    setEditingTables((open) => !open);
                  }}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold"
                >
                  {editingTables ? 'Hide' : 'Create tables'}
                </button>
              </div>
              {editingTables && (
                <div className="mb-2 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex gap-2">
                    <input value={newTable} onChange={(e) => setNewTable(e.target.value)} placeholder="Table name, for example T1" className="h-10 min-w-0 flex-1 rounded border border-slate-300 px-2 text-sm" />
                    <button
                      type="button"
                      onClick={() => {
                        const name = newTable.trim();
                        if (!name) return;
                        if (tableDraft.some((t) => t.toLowerCase() === name.toLowerCase())) {
                          showError('That table is already in the list.');
                          return;
                        }
                        setTableDraft((prev) => [...prev, name]);
                        setNewTable('');
                      }}
                      className="rounded-md bg-slate-900 px-3 text-sm font-semibold text-white"
                    >
                      Add
                    </button>
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {tableDraft.map((name) => (
                      <li key={name} className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-sm">
                        {name}
                        <button type="button" onClick={() => setTableDraft((prev) => prev.filter((t) => t !== name))} className="px-1 text-slate-400" aria-label={`Remove ${name}`}>×</button>
                      </li>
                    ))}
                  </ul>
                  <button type="button" disabled={savingTables} onClick={() => void saveTableList()} className="mt-3 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {savingTables ? 'Saving…' : 'Save tables'}
                  </button>
                </div>
              )}
              {(board?.tables.length ?? 0) === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">No tables yet. Create tables, then tap one to start the bill. Seated time starts when the table is opened.</p>
              ) : activeTable ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {board!.tables.map((name) => {
                    const tab = board!.by_table?.[name];
                    const on = activeTable === name;
                    return (
                      <button key={name} type="button" onClick={() => void selectTable(name)} className={`shrink-0 rounded-lg border px-3 py-2 text-left ${on ? 'border-slate-900 bg-slate-900 text-white' : tab ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                        <span className="block text-sm font-bold">{name}</span>
                        <span className="block text-xs tabular-nums">{tab ? `₹${Number(tab.total).toFixed(0)} · ${minutesAgo(tab.created_at)}` : 'Free'}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {board!.tables.map((name) => {
                    const tab = board!.by_table?.[name];
                    return (
                      <button key={name} type="button" onClick={() => void selectTable(name)} className={`min-h-[84px] rounded-lg border px-2 py-2 text-left ${tab ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                        <span className="block text-base font-bold text-slate-900">{name}</span>
                        <span className="mt-1 block text-sm font-semibold tabular-nums text-slate-800">{tab ? `₹${Number(tab.total).toFixed(0)}` : 'Free'}</span>
                        <span className="block text-xs text-slate-500">{tab ? `Seated ${minutesAgo(tab.created_at)}` : 'Empty'}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {orderType === 'delivery' && (
            <div className="mb-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                <p className="text-sm font-semibold text-slate-900">Deliveries</p>
                <button type="button" onClick={startDelivery} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold">New delivery</button>
              </div>
              {(board?.deliveries.length ?? 0) === 0 ? (
                <p className="px-3 py-3 text-sm text-slate-500">No open deliveries. Add the address on the bill, then Save delivery.</p>
              ) : (
                <ul className="max-h-52 overflow-y-auto">
                  {board!.deliveries.map((row) => (
                    <li key={row.id}>
                      <button type="button" onClick={() => selectDelivery(row)} className={`flex w-full items-start justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 ${activeDeliveryId === row.id ? 'bg-sky-50' : ''}`}>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-900">{row.name || 'Customer'} · {row.phone || 'No mobile'}</span>
                          <span className="block truncate text-xs text-slate-500">{row.address}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-semibold tabular-nums">₹{Number(row.total).toFixed(0)}</span>
                          <span className="block text-xs text-slate-500">{minutesAgo(row.created_at)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {(orderType !== 'dinein' || activeTable) && <>
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKey}
                autoComplete="off"
                autoFocus={!floorMode}
                placeholder="Name or initials e.g. ttcm"
                className="w-full rounded-md border border-slate-300 py-2.5 pl-10 pr-3 text-sm min-h-[44px]"
              />
            </div>
            <div className="flex gap-2 sm:w-auto">
              <input
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value)}
                onKeyDown={onShortKey}
                autoComplete="off"
                placeholder="SKU / barcode"
                title="Type or paste SKU or barcode, then Enter to add to cart"
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2.5 text-sm min-h-[44px] sm:w-36 sm:flex-none"
              />
              {!floorMode && <BarcodeCapture onDetected={applyCode} label="Scan" className="shrink-0" />}
            </div>
          </div>
          {scanHint && <p className="mb-2 text-xs font-medium text-emerald-700">Added: {scanHint}</p>}

          <div className="mb-2 md:hidden">
            <input
              value={menuQuery}
              onChange={(e) => setMenuQuery(e.target.value)}
              placeholder="Search category"
              className="mb-1 h-8 w-full rounded border border-slate-300 px-2 text-xs"
            />
          <div className="flex gap-1 overflow-x-auto pb-1">
            {shownCategories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-md px-3 py-2 text-sm font-semibold min-h-[40px] ${
                  category === c ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white'
                }`}
              >
                {c === 'all' ? 'All' : c}
              </button>
            ))}
          </div>
          </div>

          {visibleItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="font-semibold text-slate-900">No {meta.itemsLabel.toLowerCase()} in this menu</p>
              <Link href={floorMode ? '/pos/floor' : '/pos/manage'} className="mt-3 inline-flex rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">
                {floorMode ? 'Add dishes' : `Add ${meta.itemLabel}`}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {visibleItems.map((item) => {
                const qty = qtyOf(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addItem(item)}
                    className={`relative min-h-[72px] rounded-md border bg-white px-2 py-2 text-left hover:bg-sky-50 ${
                      qty > 0 ? 'border-brand-500 ring-1 ring-brand-500' : 'border-sky-300'
                    }`}
                  >
                    <span className="block pr-12 text-sm font-medium leading-snug text-slate-800 line-clamp-2">{displayItemName(item, lang)}</span>
                    {displayItemPackLine(item) && (
                      <span className="mt-0.5 block pr-10 text-[10px] text-slate-500 line-clamp-1">{displayItemPackLine(item)}</span>
                    )}
                    {isLooseItem(item) && <span className="mt-1 block text-[10px] font-medium text-sky-700">Weight or ₹</span>}
                    <span className="absolute right-2 top-2 text-xs font-semibold text-slate-600">₹{posSellingRate(item).toFixed(0)}</span>
                    {qty > 0 && <span className="absolute bottom-1 right-2 rounded bg-brand-600 px-1.5 text-[10px] font-bold text-white">{qty}</span>}
                    {isStockTrackedPos(businessType) && item.current_stock != null && Number(item.current_stock) <= 0 && (
                      <span className="mt-1 block text-[10px] font-medium text-amber-700">Out of stock</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          </>}
        </section>

        <aside className="hidden min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-3 md:flex">
          {billPanel}
        </aside>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white shadow md:hidden"
        style={{ paddingBottom: 'max(0px, var(--safe-area-bottom, 0px))' }}
      >
        {!cartOpen ? (
          <button type="button" onClick={() => setCartOpen(true)} className="flex min-h-[56px] w-full items-center justify-between px-4 py-3 text-left">
            <span className="text-left">
              <span className="block text-xs font-medium text-slate-500">Buy list</span>
              <span className="text-sm font-semibold text-slate-900">{cart.length === 0 ? 'Empty' : `${cart.reduce((s, l) => s + l.qty, 0)} items`}</span>
            </span>
            <span className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white tabular-nums">₹{totals.total.toFixed(2)}</span>
          </button>
        ) : (
          <div className="flex max-h-[88dvh] flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-2">
              <span className="text-sm font-semibold">Buy list</span>
              <button type="button" onClick={() => setCartOpen(false)} className="px-2 text-sm font-medium text-brand-700 min-h-[40px]">Close</button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden px-3 py-2">{billPanel}</div>
          </div>
        )}
      </div>
      {looseItem && (
        <LooseAsk
          name={looseItem.name}
          unit={looseItem.unit || 'kg'}
          rate={posSellingRate(looseItem)}
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
