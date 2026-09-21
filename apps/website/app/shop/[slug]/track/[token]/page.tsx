'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

const STEPS = ['placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered'];

export default function TrackOrderPage({ params }: { params: { slug: string; token: string } }) {
  const [data, setData] = useState<{ number: string; status: string; total: string; lines?: Array<{ description: string; qty: string }> } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/api/v1/public/shops/${encodeURIComponent(params.slug)}/orders/${encodeURIComponent(params.token)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((j as { message?: string }).message || 'Order not found');
        setData(j);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Not found'));
  }, [params.slug, params.token]);

  return (
    <div className="min-h-dvh bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-md rounded-2xl border bg-white p-6">
        <Link href={`/shop/${params.slug}`} className="text-sm text-brand-600">← Back to shop</Link>
        {error && <p className="mt-4 text-red-700">{error}</p>}
        {data && (
          <>
            <h1 className="mt-4 text-xl font-bold">Order {data.number}</h1>
            <p className="text-slate-600">₹{Number(data.total).toFixed(2)}</p>
            <ol className="mt-6 space-y-2">
              {STEPS.map((s) => {
                const idx = STEPS.indexOf(data.status);
                const here = STEPS.indexOf(s);
                const done = data.status === 'cancelled' ? false : here <= idx;
                return (
                  <li key={s} className={`capitalize text-sm ${done ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                    {done ? '●' : '○'} {s.replace(/_/g, ' ')}
                  </li>
                );
              })}
              {data.status === 'cancelled' && <li className="text-red-700 text-sm font-medium">Cancelled</li>}
            </ol>
            <ul className="mt-4 text-sm text-slate-600">
              {(data.lines ?? []).map((l, i) => (
                <li key={i}>{l.description} × {l.qty}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
