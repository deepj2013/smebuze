'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import PosSwitcher from '../../../components/PosSwitcher';

type ExpiringRow = {
  id: string;
  item_id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  batch_code: string | null;
  expiry_date: string;
  days_left: number;
  quantity: number;
  warehouse: string | null;
  status: 'expired' | 'this_week' | 'this_month' | 'upcoming';
};

const WINDOWS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 60, label: '60 days' },
  { days: 90, label: '90 days' },
] as const;

function statusStyle(status: ExpiringRow['status']) {
  if (status === 'expired') return 'bg-red-100 text-red-900 border-red-200';
  if (status === 'this_week') return 'bg-amber-100 text-amber-950 border-amber-200';
  if (status === 'this_month') return 'bg-orange-50 text-orange-900 border-orange-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

function statusLabel(row: ExpiringRow) {
  if (row.status === 'expired') return `Expired ${Math.abs(row.days_left)}d ago`;
  if (row.days_left === 0) return 'Expires today';
  if (row.days_left === 1) return 'Expires tomorrow';
  return `${row.days_left} days left`;
}

export default function ExpiringStockPage() {
  const [list, setList] = useState<ExpiringRow[]>([]);
  const [withinDays, setWithinDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGet<ExpiringRow[]>(`inventory/stock/expiring?within_days=${withinDays}`).then((res) => {
      if (res.error) setError(res.error);
      else setList(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    });
  }, [withinDays]);

  const expired = list.filter((r) => r.status === 'expired').length;
  const soon = list.filter((r) => r.status === 'this_week').length;

  return (
    <div>
      <PosSwitcher />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/inventory/stock" className="mb-1 inline-block text-sm text-slate-600 hover:text-slate-900">
            ← Stock
          </Link>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Soon to expire</h1>
          <p className="mt-1 text-sm text-slate-600">
            Packs that expire in the next window — sell or use them first. Add expiry when you receive stock.
          </p>
        </div>
        <Link
          href="/inventory/stock/receive"
          className="inline-flex min-h-[44px] w-fit items-center justify-center rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Receive stock
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-700">Show next</span>
        {WINDOWS.map((w) => (
          <button
            key={w.days}
            type="button"
            onClick={() => setWithinDays(w.days)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium min-h-[36px] ${
              withinDays === w.days
                ? 'border-brand-600 bg-brand-50 text-brand-800'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>

      {(expired > 0 || soon > 0) && (
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          {expired > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <span className="font-semibold">{expired}</span> already expired — remove or mark for return.
            </div>
          )}
          {soon > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <span className="font-semibold">{soon}</span> expire within 7 days — push on the counter.
            </div>
          )}
        </div>
      )}

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}

      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="responsive-table-wrap">
            <table className="w-full table-min-width text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="p-3 text-left font-medium text-slate-700">Item</th>
                  <th className="p-3 text-left font-medium text-slate-700">Batch</th>
                  <th className="p-3 text-left font-medium text-slate-700">Warehouse</th>
                  <th className="p-3 text-right font-medium text-slate-700">Qty</th>
                  <th className="p-3 text-left font-medium text-slate-700">Expiry</th>
                  <th className="p-3 text-left font-medium text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      Nothing expiring in this window. When you receive stock, fill in the expiry date so items appear here.
                    </td>
                  </tr>
                ) : (
                  list.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0">
                      <td className="p-3">
                        <p className="font-medium text-slate-900">{row.name}</p>
                        <p className="text-xs text-slate-500">
                          {[row.brand, row.sku].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </td>
                      <td className="p-3 text-slate-700">{row.batch_code || '—'}</td>
                      <td className="p-3 text-slate-700">{row.warehouse || '—'}</td>
                      <td className="p-3 text-right tabular-nums font-semibold">{row.quantity}</td>
                      <td className="p-3 tabular-nums text-slate-800">{row.expiry_date}</td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${statusStyle(row.status)}`}>
                          {statusLabel(row)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
