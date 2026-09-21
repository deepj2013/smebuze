'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

type ShopItem = {
  id: string;
  name: string;
  description?: string | null;
  unit?: string;
  category?: string | null;
  image_urls?: string[];
  sale_price?: string | null;
  mrp?: string | null;
};

type Shop = {
  slug: string;
  name: string;
  shop_enabled: boolean;
  pages?: { hero_title?: string; hero_subtitle?: string; about?: string; phone?: string };
  items: ShopItem[];
};

export default function PublicShopPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const [shop, setShop] = useState<Shop | null>(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState<Record<string, number>>({});
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [done, setDone] = useState<{ number: string; tracking_token: string; track_path: string; total: string } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/v1/public/shops/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((j as { message?: string }).message || 'Shop not found');
        setShop(j as Shop);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load shop'));
  }, [slug]);

  const cart = useMemo(() => {
    if (!shop) return [];
    return shop.items
      .map((i) => ({ item: i, qty: qty[i.id] || 0 }))
      .filter((r) => r.qty > 0);
  }, [shop, qty]);
  const total = cart.reduce((n, r) => n + r.qty * Number(r.item.sale_price ?? r.item.mrp ?? 0), 0);

  async function checkout(e: FormEvent) {
    e.preventDefault();
    if (!cart.length) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/v1/public/shops/${encodeURIComponent(slug)}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          note,
          lines: cart.map((c) => ({ item_id: c.item.id, qty: c.qty })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { message?: string }).message || 'Could not place order');
      setDone(json as { number: string; tracking_token: string; track_path: string; total: string });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order failed');
    } finally {
      setSending(false);
    }
  }

  if (error && !shop) {
    return <div className="mx-auto max-w-lg p-8 text-center text-slate-600">{error}</div>;
  }
  if (!shop) return <div className="mx-auto max-w-lg p-8 text-center text-slate-500">Loading catalog…</div>;

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-lg font-bold">{shop.name}</p>
            <p className="text-xs text-slate-500">{shop.pages?.hero_subtitle || 'Order online'}</p>
          </div>
          <div className="flex gap-3">
            <Link href={`/site/${shop.slug}`} className="text-sm text-brand-600 hover:underline">Website</Link>
            <Link href="/shops" className="text-sm text-brand-600 hover:underline">All shops</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <h1 className="text-3xl font-bold">{shop.pages?.hero_title || shop.name}</h1>
          {shop.pages?.about && <p className="mt-2 text-slate-600">{shop.pages.about}</p>}
          {!shop.shop_enabled && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm">This catalog is browse-only. Send an enquiry from the website.</p>}
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {shop.items.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-slate-500">{item.category || item.unit} · ₹{Number(item.sale_price ?? item.mrp ?? 0).toFixed(2)}</p>
                {shop.shop_enabled && (
                  <div className="mt-3 flex items-center gap-2">
                    <button type="button" className="h-10 w-10 rounded-lg border" onClick={() => setQty((q) => ({ ...q, [item.id]: Math.max(0, (q[item.id] || 0) - 1) }))}>−</button>
                    <span className="tabular-nums w-6 text-center">{qty[item.id] || 0}</span>
                    <button type="button" className="h-10 w-10 rounded-lg border" onClick={() => setQty((q) => ({ ...q, [item.id]: (q[item.id] || 0) + 1 }))}>+</button>
                  </div>
                )}
              </li>
            ))}
            {!shop.items.length && <li className="text-sm text-slate-500">No items listed yet.</li>}
          </ul>
        </section>
        {shop.shop_enabled && (
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 h-fit">
            {done ? (
              <div>
                <p className="font-semibold text-emerald-800">Order placed</p>
                <p className="mt-2 text-sm">#{done.number} · ₹{Number(done.total).toFixed(2)}</p>
                <Link href={done.track_path} className="mt-4 inline-flex rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm">Track order</Link>
              </div>
            ) : (
              <form onSubmit={checkout} className="space-y-3">
                <p className="font-semibold">Checkout</p>
                <p className="text-sm text-slate-500">{cart.length ? `₹${total.toFixed(2)}` : 'Add items to order'}</p>
                {error && <p className="text-sm text-red-700">{error}</p>}
                <input required placeholder="Your name" className="w-full rounded-lg border px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
                <input required placeholder="10-digit phone" className="w-full rounded-lg border px-3 py-2 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <textarea placeholder="Delivery note" className="w-full rounded-lg border px-3 py-2 text-sm" value={note} onChange={(e) => setNote(e.target.value)} />
                <button disabled={!cart.length || sending} className="w-full rounded-lg bg-brand-600 text-white py-2.5 text-sm font-medium disabled:opacity-50">{sending ? 'Placing…' : 'Place order'}</button>
              </form>
            )}
          </aside>
        )}
      </main>
    </div>
  );
}
