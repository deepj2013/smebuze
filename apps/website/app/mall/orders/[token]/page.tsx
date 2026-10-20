'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

export default function MallTrackPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/api/v1/public/mall/orders/${encodeURIComponent(params.token)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.message || 'Not found');
        setData(j);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [params.token]);

  return (
    <div className="max-w-md mx-auto rounded-xl border bg-white p-6">
      <Link href="/mall" className="text-sm text-brand-600 hover:underline">← Mall</Link>
      <h1 className="mt-3 text-xl font-semibold">Track order</h1>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      {data && (
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd>{String(data.status)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Payment</dt><dd>{String(data.payment_status)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Amount</dt><dd>₹{Number(data.gross_amount).toFixed(2)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Delivery</dt><dd>{String(data.delivery_mode)}</dd></div>
          {data.delivery_job && typeof data.delivery_job === 'object' && (
            <div className="pt-2 border-t text-slate-600">
              Rider: {String((data.delivery_job as { rider_name?: string }).rider_name || '—')} ·{' '}
              {String((data.delivery_job as { status?: string }).status)}
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
