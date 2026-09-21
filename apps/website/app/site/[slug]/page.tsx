'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

type Site = {
  slug: string;
  name: string;
  shop_enabled: boolean;
  shop_path: string;
  pages?: {
    hero_title?: string;
    hero_subtitle?: string;
    about?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  items?: Array<{ id: string; name: string; sale_price?: string | null; mrp?: string | null; unit?: string }>;
};

export default function PublicSitePage({ params }: { params: { slug: string } }) {
  const [site, setSite] = useState<Site | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [ok, setOk] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/v1/public/sites/${encodeURIComponent(params.slug)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((j as { message?: string }).message || 'Site not found');
        setSite(j as Site);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Not found'));
  }, [params.slug]);

  async function enquire(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError('');
    setOk('');
    try {
      const res = await fetch(`${API}/api/v1/public/leads/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: params.slug, source: 'website', ...form }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { message?: string }).message || 'Could not send');
      setOk('Thank you. We will get back to you.');
      setForm({ name: '', phone: '', message: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSending(false);
    }
  }

  if (!site && error) return <div className="p-8 text-center text-slate-600">{error}</div>;
  if (!site) return <div className="p-8 text-center text-slate-500">Loading…</div>;
  const p = site.pages || {};

  return (
    <div className="min-h-dvh bg-white text-slate-900">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <p className="font-bold">{site.name}</p>
          {site.shop_enabled && <Link href={site.shop_path} className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white">Shop</Link>}
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-12 grid gap-10 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold leading-tight">{p.hero_title || site.name}</h1>
          {p.hero_subtitle && <p className="mt-3 text-lg text-slate-600">{p.hero_subtitle}</p>}
          {p.about && <p className="mt-6 text-slate-700">{p.about}</p>}
          <ul className="mt-6 text-sm text-slate-600 space-y-1">
            {p.phone && <li>Phone: {p.phone}</li>}
            {p.email && <li>Email: {p.email}</li>}
            {p.address && <li>{p.address}</li>}
          </ul>
          {!!site.items?.length && (
            <ul className="mt-8 space-y-2">
              <p className="text-sm font-semibold text-slate-800">{site.shop_enabled ? 'Catalog' : 'Menu / items'}</p>
              {site.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 text-sm border-b border-slate-100 py-2">
                  <span>{item.name}</span>
                  <span className="tabular-nums text-slate-600">₹{Number(item.sale_price ?? item.mrp ?? 0).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 text-xs"><Link href="/shops" className="text-brand-600 hover:underline">All shops</Link></p>
        </div>
        <form onSubmit={enquire} className="rounded-2xl border border-slate-200 p-6 space-y-3 shadow-sm">
          <p className="font-semibold">Send an enquiry</p>
          {error && <p className="text-sm text-red-700">{error}</p>}
          {ok && <p className="text-sm text-emerald-700">{ok}</p>}
          <input required placeholder="Your name" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <input placeholder="Phone" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <textarea placeholder="What do you need?" className="w-full rounded-lg border px-3 py-2 text-sm min-h-[80px]" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
          <button disabled={sending} className="w-full rounded-lg bg-brand-600 text-white py-2.5 text-sm font-medium">{sending ? 'Sending…' : 'Send'}</button>
        </form>
      </main>
    </div>
  );
}
