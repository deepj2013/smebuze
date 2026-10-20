'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';

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

type Page = { page: number; page_size: number; total: number; items: MallItem[] };

export default function MallHomePage() {
  const [data, setData] = useState<Page | null>(null);
  const [categories, setCategories] = useState<Array<{ category: string; count: number }>>([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sellerLock, setSellerLock] = useState<{ id: string; name: string } | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [buyer, setBuyer] = useState({ name: '', phone: '', address: '' });
  const [deliveryMode, setDeliveryMode] = useState('own');
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ tracking_token: string; track_path: string; total: number; number: string; paid?: boolean } | null>(null);
  const [sending, setSending] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  async function load() {
    setError('');
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (category) params.set('category', category);
    if (sellerLock) params.set('seller', ''); // filter by tenant via client after load if no slug filter
    try {
      const [itemsRes, catRes] = await Promise.all([
        fetch(`${API}/api/v1/public/mall/items?${params}`).then(async (r) => {
          const j = await r.json();
          if (!r.ok) throw new Error(j.message || 'Failed to load');
          return j as Page;
        }),
        fetch(`${API}/api/v1/public/mall/categories`).then((r) => r.json()),
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
  }, [category, sellerLock?.id]);

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
  }

  async function checkout(e: FormEvent) {
    e.preventDefault();
    if (!sellerLock || !cart.length) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/v1/public/mall/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_tenant_id: sellerLock.id,
          buyer,
          delivery_mode: deliveryMode,
          lines: cart.map((c) => ({ item_id: c.item.item_id, qty: c.qty })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Checkout failed');

      const rz = json.razorpay as
        | { key_id?: string; order_id?: string; amount?: number; currency?: string; name?: string; description?: string; prefill?: Record<string, string> }
        | null
        | undefined;

      if (rz?.order_id && rz.key_id && scriptReady && window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const checkout = new window.Razorpay!({
            key: rz.key_id,
            amount: rz.amount,
            currency: rz.currency || 'INR',
            name: rz.name || 'SMEBUZE Mall',
            description: rz.description || json.number,
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
                setDone({ ...json, paid: true });
                clearCart();
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            modal: {
              ondismiss: () => {
                setDone({ ...json, paid: false });
                clearCart();
                resolve();
              },
            },
          });
          checkout.open();
        });
      } else {
        setDone({ ...json, paid: false });
        clearCart();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border bg-white p-6 max-w-lg">
        <h1 className="text-xl font-semibold">{done.paid ? 'Paid — order confirmed' : 'Order placed'}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {done.number} · ₹{Number(done.total).toFixed(2)}.
          {done.paid
            ? ' Payment received by SMEBUZE; the shop will fulfil and we settle to them weekly.'
            : ' Complete payment if the checkout was closed, or track the order — admin can mark paid.'}
        </p>
        <Link href={done.track_path} className="mt-4 inline-block text-brand-600 hover:underline text-sm">
          Track order
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
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Local shops, one cart at a time</h1>
        <p className="text-sm text-slate-600 mb-4">
          Browse many sellers. Checkout locks to one shop so delivery and payment stay simple.
        </p>
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
        {!data?.items?.length && <p className="text-slate-500 text-sm mt-6">No mall listings yet. Shops can opt in from Online commerce.</p>}
      </div>

      <aside className="rounded-xl border bg-white p-4 h-fit sticky top-4">
        <h2 className="font-medium mb-3">Checkout</h2>
        {cart.length === 0 ? (
          <p className="text-sm text-slate-500">Add items from one shop.</p>
        ) : (
          <form onSubmit={checkout} className="space-y-3">
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
            <textarea value={buyer.address} onChange={(e) => setBuyer({ ...buyer, address: e.target.value })} placeholder="Delivery address" className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} />
            <select value={deliveryMode} onChange={(e) => setDeliveryMode(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
              <option value="own">Shop delivery / pickup</option>
              <option value="platform">SMEBUZE delivery</option>
            </select>
            <button type="submit" disabled={sending} className="w-full rounded-lg bg-slate-900 text-white py-2.5 text-sm disabled:opacity-50">
              {sending ? 'Placing…' : 'Place order'}
            </button>
          </form>
        )}
      </aside>
    </div>
  );
}
