'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import {
  readMallPin,
  readMallPhone,
  rememberMallOrder,
  saveMallPin,
  saveMallPhone,
} from '@/lib/mall-local';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

type RazorpayCheckout = { open: () => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

type MallItem = {
  listing_id: string;
  item_id: string;
  name: string;
  category?: string | null;
  price: number;
  mrp?: number | null;
  image_url?: string | null;
  seller_slug: string;
  seller_name: string;
  seller_tenant_id: string;
  delivery_mode: string;
};

type MallMeta = {
  buyer_pincode?: string | null;
  pincode_required?: boolean;
  sellers_in_area?: number;
  hint?: string;
};

type Page = { page: number; page_size: number; total: number; items: MallItem[]; mall?: MallMeta };

type BookedOrder = {
  marketplace_order_id: string;
  number: string;
  tracking_token: string;
  track_path: string;
  total: number;
  seller_name: string;
  payment_note?: string;
};

type RazorpayPayload = {
  key_id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  name?: string;
  description?: string;
  prefill?: Record<string, string>;
};

export default function MallHomePage() {
  const [data, setData] = useState<Page | null>(null);
  const [pincode, setPincode] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [locating, setLocating] = useState(false);
  const [showManualPin, setShowManualPin] = useState(false);
  const [categories, setCategories] = useState<Array<{ category: string; count: number }>>([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sellerLock, setSellerLock] = useState<{ id: string; name: string } | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [buyer, setBuyer] = useState({ name: '', phone: '', address: '' });
  const [deliveryMode, setDeliveryMode] = useState('own');
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ tracking_token: string; track_path: string; total: number; number: string; paid?: boolean } | null>(null);
  const [booked, setBooked] = useState<BookedOrder | null>(null);
  const [sending, setSending] = useState(false);
  const [paying, setPaying] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    const savedPin = readMallPin();
    if (savedPin) {
      setPincode(savedPin);
      setLocationLabel(`Pin ${savedPin}`);
    }
    const savedPhone = readMallPhone();
    if (savedPhone) setBuyer((b) => ({ ...b, phone: savedPhone }));
  }, []);

  async function load() {
    setError('');
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (category) params.set('category', category);
    const pin = pincode.replace(/\D/g, '').slice(0, 6);
    if (pin.length === 6) params.set('pincode', pin);
    const catQs = pin.length === 6 ? `?pincode=${encodeURIComponent(pin)}` : '';
    try {
      const [itemsRes, catRes] = await Promise.all([
        fetch(`${API}/api/v1/public/mall/items?${params}`).then(async (r) => {
          const j = await r.json();
          if (!r.ok) throw new Error(j.message || 'Failed to load');
          return j as Page;
        }),
        fetch(`${API}/api/v1/public/mall/categories${catQs}`).then((r) => r.json()),
      ]);
      let page = itemsRes;
      if (sellerLock) {
        page = {
          ...page,
          items: page.items.filter((i) => i.seller_tenant_id === sellerLock.id),
        };
      }
      setData(page);
      setCategories(Array.isArray(catRes) ? catRes : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load mall');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sellerLock?.id, pincode]);

  function applyPincode() {
    const pin = pincode.replace(/\D/g, '').slice(0, 6);
    if (pin.length !== 6) {
      setError('Enter a valid 6-digit pincode');
      return;
    }
    saveMallPin(pin);
    setPincode(pin);
    setLocationLabel(`Pin ${pin}`);
    setError('');
  }

  async function useMyLocation() {
    setError('');
    if (!navigator.geolocation) {
      setError('Location is not supported on this device. Enter pincode manually.');
      setShowManualPin(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`${API}/api/v1/public/mall/resolve-location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          });
          const j = await res.json();
          if (!res.ok) throw new Error(j.message || 'Could not detect area');
          if (j.pincode) {
            saveMallPin(j.pincode);
            setPincode(j.pincode);
            setLocationLabel(j.label || `Pin ${j.pincode}`);
            setShowManualPin(false);
          } else {
            setError('Pincode not found for this spot — enter it manually below.');
            setShowManualPin(true);
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Location lookup failed');
          setShowManualPin(true);
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setError('Allow location access to show nearby shops, or enter pincode manually.');
        setShowManualPin(true);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 120000 },
    );
  }

  const cart = useMemo(() => {
    if (!data) return [];
    return data.items
      .map((i) => ({ item: i, qty: qty[i.item_id] || 0 }))
      .filter((r) => r.qty > 0);
  }, [data, qty]);

  const total = cart.reduce((n, r) => n + r.qty * r.item.price, 0);

  function addToCart(item: MallItem, n: number) {
    if (sellerLock && sellerLock.id !== item.seller_tenant_id) {
      setError(`Cart is locked to ${sellerLock.name}. Clear cart to buy from another shop.`);
      return;
    }
    if (!sellerLock && n > 0) setSellerLock({ id: item.seller_tenant_id, name: item.seller_name });
    setQty((qmap) => {
      const next = { ...qmap, [item.item_id]: n };
      if (n <= 0) {
        delete next[item.item_id];
        const remaining = Object.entries(next).filter(([, v]) => v > 0);
        if (!remaining.length) setSellerLock(null);
      }
      return next;
    });
    setError('');
  }

  function clearCart() {
    setQty({});
    setSellerLock(null);
    setBooked(null);
  }

  async function openRazorpay(rz: RazorpayPayload, onPaid: () => void, onDismiss: () => void) {
    if (!rz.order_id || !rz.key_id || !scriptReady || !window.Razorpay) {
      onDismiss();
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const checkout = new window.Razorpay!({
        key: rz.key_id,
        amount: rz.amount,
        currency: rz.currency || 'INR',
        name: rz.name || 'SMEBUZE Mall',
        description: rz.description,
        order_id: rz.order_id,
        prefill: rz.prefill || { name: buyer.name, contact: buyer.phone },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const conf = await fetch(`${API}/api/v1/public/mall/payments/confirm`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });
            const confJson = await conf.json();
            if (!conf.ok) throw new Error(confJson.message || 'Payment confirm failed');
            onPaid();
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        modal: { ondismiss: () => { onDismiss(); resolve(); } },
      });
      checkout.open();
    });
  }

  async function bookOrder(e: FormEvent) {
    e.preventDefault();
    if (!sellerLock || !cart.length) return;
    const pin = pincode.replace(/\D/g, '').slice(0, 6);
    if (pin.length !== 6) {
      setError('Set delivery area with “Use my location” or enter pincode.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/v1/public/mall/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_tenant_id: sellerLock.id,
          buyer: { ...buyer, pincode: pin },
          delivery_mode: deliveryMode,
          lines: cart.map((c) => ({ item_id: c.item.item_id, qty: c.qty })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Could not book order');

      saveMallPhone(buyer.phone);
      rememberMallOrder({
        tracking_token: json.tracking_token,
        track_path: json.track_path,
        order_number: json.number,
        seller_name: sellerLock.name,
        total: Number(json.total),
        payment_status: json.payment_status || 'pending',
        status: json.status || 'placed',
        created_at: new Date().toISOString(),
      });

      setQty({});
      setBooked({
        marketplace_order_id: json.marketplace_order_id,
        number: json.number,
        tracking_token: json.tracking_token,
        track_path: json.track_path,
        total: Number(json.total),
        seller_name: sellerLock.name,
        payment_note: json.payment_note,
      });
      setSellerLock(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setSending(false);
    }
  }

  async function payForBooked() {
    if (!booked) return;
    setPaying(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/v1/public/mall/payments/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketplace_order_id: booked.marketplace_order_id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Payment could not start');
      if (json.already_paid) {
        setDone({ ...booked, paid: true, number: booked.number });
        setBooked(null);
        return;
      }
      const rz: RazorpayPayload = {
        key_id: json.key_id,
        order_id: json.order_id,
        amount: json.amount,
        currency: json.currency,
        name: json.name,
        description: json.description,
        prefill: json.prefill,
      };
      await openRazorpay(
        rz,
        () => {
          setDone({ ...booked, paid: true, number: booked.number });
          setBooked(null);
        },
        () => {
          setError('Payment window closed — you can pay anytime from My orders or track page.');
        },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  }

  const pinReady = pincode.replace(/\D/g, '').length === 6;

  if (done) {
    return (
      <div className="rounded-xl border bg-white p-6 max-w-lg">
        <h1 className="text-xl font-semibold">{done.paid ? 'Paid — order confirmed' : 'Order booked'}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {done.number} · ₹{Number(done.total).toFixed(2)}.
          {done.paid
            ? ' Payment received; the shop will deliver. Track status anytime.'
            : ' Pay from My orders if you skipped payment.'}
        </p>
        <Link href={done.track_path} className="mt-4 inline-block text-brand-600 hover:underline text-sm">
          Track delivery
        </Link>
        <Link href="/mall/my-orders" className="ml-4 text-sm text-brand-600 hover:underline">
          My orders
        </Link>
        <button type="button" onClick={() => setDone(null)} className="ml-4 text-sm text-slate-600 underline">
          Continue shopping
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setScriptReady(true)} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Local shops near you</h1>
        <p className="text-sm text-slate-600 mb-3">
          Share your location once — we detect pincode and only show shops that deliver to you.
        </p>
        <div className="flex flex-wrap gap-2 mb-2 items-center">
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium min-h-[44px] disabled:opacity-60"
          >
            {locating ? 'Detecting…' : 'Use my location'}
          </button>
          {locationLabel && pinReady && (
            <span className="text-sm text-slate-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              {locationLabel}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowManualPin((v) => !v)}
            className="text-sm text-slate-600 underline"
          >
            {showManualPin ? 'Hide pincode' : 'Enter pincode instead'}
          </button>
        </div>
        {showManualPin && (
          <div className="flex flex-wrap gap-2 mb-3 items-end">
            <label className="text-sm flex-1 min-w-[160px]">
              <span className="font-medium text-slate-700">Delivery pincode</span>
              <input
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && applyPincode()}
                placeholder="6 digits"
                inputMode="numeric"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>
            <button type="button" onClick={applyPincode} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium min-h-[44px]">
              Apply
            </button>
          </div>
        )}
        {!pinReady && (
          <p className="mb-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Tap <strong>Use my location</strong> to see nearby shops (or enter pincode manually).
          </p>
        )}
        {data?.mall?.hint && (
          <p className="mb-3 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">{data.mall.hint}</p>
        )}
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Search products…"
            className="flex-1 min-w-[180px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="button" onClick={load} className="rounded-lg border px-3 py-2 text-sm">Search</button>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.category} value={c.category}>{c.category} ({c.count})</option>
            ))}
          </select>
        </div>
        {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
        {sellerLock && (
          <p className="mb-3 text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
            Buying from <strong>{sellerLock.name}</strong> only.{' '}
            <button type="button" className="underline" onClick={clearCart}>Clear cart</button>
          </p>
        )}
        <ul className="grid gap-3 sm:grid-cols-2">
          {(data?.items ?? []).map((item) => (
            <li key={item.listing_id} className="rounded-xl border bg-white p-4 flex flex-col gap-2">
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-slate-500">{item.seller_name} · {item.category || 'General'}</p>
                <p className="mt-1 text-sm">
                  ₹{item.price.toFixed(2)}
                  {item.mrp != null && item.mrp > item.price && (
                    <span className="ml-2 text-slate-400 line-through text-xs">₹{item.mrp.toFixed(2)}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={qty[item.item_id] || ''}
                  onChange={(e) => addToCart(item, Number(e.target.value) || 0)}
                  placeholder="Qty"
                  className="w-20 rounded-lg border px-2 py-1.5 text-sm"
                />
                <Link href={`/shop/${item.seller_slug}`} className="text-xs text-brand-600 hover:underline">
                  Shop page
                </Link>
              </div>
            </li>
          ))}
        </ul>
        {!data?.items?.length && pinReady && (
          <p className="text-slate-500 text-sm mt-6">No shops listing for this pincode yet.</p>
        )}
      </div>

      <aside className="rounded-xl border bg-white p-4 h-fit sticky top-4">
        {booked ? (
          <>
            <h2 className="font-medium mb-2">Order booked</h2>
            <p className="text-sm text-slate-600">
              {booked.number} · {booked.seller_name}
            </p>
            <p className="text-lg font-semibold mt-2">₹{booked.total.toFixed(2)}</p>
            {booked.payment_note && (
              <p className="text-xs text-slate-500 mt-2">{booked.payment_note}</p>
            )}
            <button
              type="button"
              onClick={payForBooked}
              disabled={paying}
              className="mt-4 w-full rounded-lg bg-slate-900 text-white py-2.5 text-sm disabled:opacity-50"
            >
              {paying ? 'Opening payment…' : 'Pay now'}
            </button>
            <Link href={booked.track_path} className="mt-3 block text-center text-sm text-brand-600 underline">
              Track delivery
            </Link>
            <button type="button" onClick={() => setBooked(null)} className="mt-2 w-full text-sm text-slate-600 underline">
              Continue shopping
            </button>
          </>
        ) : (
          <>
            <h2 className="font-medium mb-3">Cart & book</h2>
            {cart.length === 0 ? (
              <p className="text-sm text-slate-500">Add items from one shop.</p>
            ) : (
              <form onSubmit={bookOrder} className="space-y-3">
                <ul className="text-sm space-y-1">
                  {cart.map((c) => (
                    <li key={c.item.item_id} className="flex justify-between gap-2">
                      <span>{c.item.name} × {c.qty}</span>
                      <span>₹{(c.qty * c.item.price).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                <p className="font-medium text-sm">Subtotal ₹{total.toFixed(2)}</p>
                <input required value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} placeholder="Your name" className="w-full rounded-lg border px-3 py-2 text-sm" />
                <input required value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} placeholder="10-digit mobile" className="w-full rounded-lg border px-3 py-2 text-sm" />
                <textarea
                  required
                  value={buyer.address}
                  onChange={(e) => setBuyer({ ...buyer, address: e.target.value })}
                  placeholder="Flat, street, landmark for delivery"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  rows={2}
                />
                <select value={deliveryMode} onChange={(e) => setDeliveryMode(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="own">Shop delivery / pickup</option>
                  <option value="platform">SMEBUZE delivery</option>
                </select>
                <button type="submit" disabled={sending || !pinReady} className="w-full rounded-lg bg-slate-900 text-white py-2.5 text-sm disabled:opacity-50">
                  {sending ? 'Booking…' : 'Book order'}
                </button>
                <p className="text-xs text-slate-500">After booking you can pay online; delivery starts once paid or confirmed by shop.</p>
              </form>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
