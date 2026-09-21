'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

type ShopCard = {
  name: string;
  slug: string;
  type: string;
  shop_enabled: boolean;
  shop_path: string;
  site_path: string;
  item_count: number;
  hero: string;
};

const TYPE_LABEL: Record<string, string> = {
  trading: 'Trading / wholesale',
  restaurant_wholesale: 'HORECA wholesale',
  retail_shop: 'Kirana',
  garment_shop: 'Garments',
  sweet_shop: 'Sweet shop',
  bakery: 'Bakery',
  dine_restaurant: 'Restaurant (menu / enquiry)',
  cafe: 'Cafe / QSR',
  department_store: 'Department store',
  pharmacy: 'Pharmacy',
  hardware_shop: 'Hardware',
  electronics_shop: 'Electronics',
  jewellery_shop: 'Jewellery',
  auto_parts: 'Auto parts',
  florist: 'Florist',
  stationery_shop: 'Stationery',
  salon: 'Salon',
  clinic: 'Clinic',
  coaching: 'Coaching',
  hotel: 'Hotel',
  manufacturing: 'Manufacturing',
  services: 'Services',
  ice_crest: 'Ice wholesale',
};

export default function ShopsDirectoryPage() {
  const [list, setList] = useState<ShopCard[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/api/v1/public/directory`)
      .then(async (r) => {
        const j = await r.json().catch(() => []);
        if (!r.ok) throw new Error((j as { message?: string }).message || 'Could not load shops');
        setList(Array.isArray(j) ? j : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, []);

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-lg font-bold text-slate-900">SMEBUZE shops</p>
            <p className="text-xs text-slate-500">Public catalogs by business type — hosted by SMEBUZE</p>
          </div>
          <Link href="/login" className="text-sm text-brand-600 hover:underline">Staff login</Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        {error && <p className="text-red-700">{error}</p>}
        {!error && !list.length && <p className="text-slate-500">No published shops yet. Apply a client pack and publish the website.</p>}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => (
            <li key={s.slug} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-brand-700">{TYPE_LABEL[s.type] || s.type}</p>
              <h2 className="mt-1 text-lg font-semibold">{s.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{s.hero}</p>
              <p className="mt-2 text-xs text-slate-500">{s.item_count} listed · {s.shop_enabled ? 'Checkout on' : 'Enquiry only'}</p>
              <div className="mt-4 flex gap-2">
                <Link href={s.site_path} className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[40px] inline-flex items-center">Website</Link>
                {s.shop_enabled && (
                  <Link href={s.shop_path} className="rounded-lg bg-brand-600 text-white px-3 py-2 text-sm min-h-[40px] inline-flex items-center">Shop</Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
