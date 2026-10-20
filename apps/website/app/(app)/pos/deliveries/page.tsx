'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

type FulfilmentRow = {
  id: string;
  number: string;
  invoice_date: string;
  total: number;
  paid: number;
  notes: string;
  kind: 'home_delivery' | 'pickup';
  customer_name: string | null;
  customer_phone: string | null;
};

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoYmd(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function CounterDeliveriesPage() {
  const [from, setFrom] = useState(daysAgoYmd(7));
  const [to, setTo] = useState(todayYmd());
  const [list, setList] = useState<FulfilmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (start = from, end = to) => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await apiGet<FulfilmentRow[]>(
      `sales/invoices/fulfilments?from=${start}&to=${end}`,
    );
    setLoading(false);
    if (err) setError(err);
    else setList(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    void load();
  }, []);

  const deliveries = list.filter((r) => r.kind === 'home_delivery');
  const pickups = list.filter((r) => r.kind === 'pickup');

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/pos" className="mb-1 inline-block text-sm text-slate-600 hover:text-slate-900">
            ← Billing counter
          </Link>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Home deliveries & pickup</h1>
          <p className="mt-1 text-sm text-slate-600">
            Bills marked <strong>Home delivery</strong> or <strong>Pickup</strong> on the counter. For challan-based wholesale delivery, use Delivery challans.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/sales/delivery-challans"
            className="inline-flex min-h-[40px] items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Delivery challans
          </Link>
          <Link
            href="/pos"
            className="inline-flex min-h-[40px] items-center rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            New bill
          </Link>
        </div>
      </div>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <label className="text-xs text-slate-600">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded border border-slate-300 px-2 py-2 text-sm" />
        </label>
        <label className="text-xs text-slate-600">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded border border-slate-300 px-2 py-2 text-sm" />
        </label>
        <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white min-h-[40px]">
          {loading ? 'Loading…' : 'View'}
        </button>
      </form>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          <span className="font-semibold">{deliveries.length}</span> home delivery
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <span className="font-semibold">{pickups.length}</span> pickup
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="responsive-table-wrap">
          <table className="w-full table-min-width text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="p-3 text-left font-medium text-slate-700">Bill</th>
                <th className="p-3 text-left font-medium text-slate-700">Customer</th>
                <th className="p-3 text-left font-medium text-slate-700">Type</th>
                <th className="p-3 text-left font-medium text-slate-700">Details</th>
                <th className="p-3 text-right font-medium text-slate-700">Amount</th>
              </tr>
            </thead>
            <tbody>
              {!loading && list.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    No home deliveries or pickups in this date range. On the billing counter choose <strong>Home delivery</strong> or <strong>Pickup</strong> before Take.
                  </td>
                </tr>
              )}
              {list.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3">
                    <Link href={`/sales/invoices/${row.id}`} className="font-semibold text-brand-700 hover:underline">
                      {row.number}
                    </Link>
                    <p className="text-xs text-slate-500">{row.invoice_date}</p>
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-slate-900">{row.customer_name || '—'}</p>
                    {row.customer_phone && <p className="text-xs text-slate-500">{row.customer_phone}</p>}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        row.kind === 'home_delivery' ? 'bg-sky-100 text-sky-900' : 'bg-amber-100 text-amber-950'
                      }`}
                    >
                      {row.kind === 'home_delivery' ? 'Home delivery' : 'Pickup'}
                    </span>
                  </td>
                  <td className="p-3 text-slate-700 max-w-xs">{row.notes}</td>
                  <td className="p-3 text-right tabular-nums font-semibold">₹{row.total.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
