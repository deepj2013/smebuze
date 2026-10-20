'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { LITE, liteStatusLabel } from '@/lib/invoice-lite-copy';

interface Quotation {
  id: string;
  number: string;
  status: string;
  total: string | number;
  internal_note?: string | null;
  customer?: { name: string } | null;
  lead?: { name: string } | null;
}

export default function InvoiceLiteQuotesPage() {
  const [list, setList] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await apiGet<Quotation[] | { data: Quotation[] }>('sales/quotations');
      if (err) setError(err);
      else if (Array.isArray(data)) setList(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: Quotation[] }).data)) {
        setList((data as { data: Quotation[] }).data);
      } else setList([]);
      setLoading(false);
    })();
  }, []);

  const party = (q: Quotation) => q.customer?.name ?? q.lead?.name ?? '—';

  return (
    <div className="mx-auto max-w-lg pb-8">
      <Link href="/invoice-lite" className="text-sm text-slate-600 hover:text-slate-900">← {LITE.home.en}</Link>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{LITE.estimates.en}</h1>
          <p className="text-sm text-slate-500">{LITE.estimates.hi}</p>
        </div>
        <Link
          href="/invoice-lite/quotes/new"
          className="shrink-0 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 min-h-[48px] inline-flex items-center"
        >
          + {LITE.newEstimate.en}
        </Link>
      </div>

      {error && <div className="mt-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="mt-6 text-slate-600">Loading…</p>}

      {!loading && list.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <p className="text-slate-700">No estimates yet.</p>
          <Link href="/invoice-lite/quotes/new" className="mt-4 inline-block rounded-xl bg-brand-600 px-6 py-3 font-medium text-white">
            {LITE.newEstimate.en}
          </Link>
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {list.map((q) => (
          <li key={q.id}>
            <Link
              href={`/invoice-lite/quotes/${q.id}`}
              className="block rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
            >
              <div className="flex justify-between gap-2">
                <span className="font-semibold text-slate-900">{party(q)}</span>
                <span className="tabular-nums font-bold text-brand-700">₹{Number(q.total).toFixed(0)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{q.number}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">{liteStatusLabel(q.status)}</p>
              {q.internal_note ? <p className="mt-2 text-sm text-slate-600 line-clamp-2">📝 {q.internal_note}</p> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
