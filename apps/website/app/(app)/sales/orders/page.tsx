'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

interface SalesOrder {
  id: string;
  number: string;
  order_date: string;
  status: string;
  total: string | number;
  customer?: { name: string } | null;
  company?: { name: string } | null;
}

export default function SalesOrdersPage() {
  const [list, setList] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await apiGet<SalesOrder[] | { data: SalesOrder[] }>('sales/orders');
      if (err) setError(err);
      else if (Array.isArray(data)) setList(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: SalesOrder[] }).data)) setList((data as { data: SalesOrder[] }).data);
      else setList([]);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Sales orders</h1>
        <Link href="/sales/orders/new" className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">Create sales order</Link>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Number</th>
                <th className="text-left p-3 font-medium text-slate-700">Customer</th>
                <th className="text-left p-3 font-medium text-slate-700">Date</th>
                <th className="text-left p-3 font-medium text-slate-700">Status</th>
                <th className="text-right p-3 font-medium text-slate-700">Total</th>
                <th className="text-left p-3 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-slate-500">No sales orders yet.</td></tr>
              ) : (
                list.map((o) => (
                  <tr key={o.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{o.number}</td>
                    <td className="p-3">{o.customer?.name ?? '—'}</td>
                    <td className="p-3">{typeof o.order_date === 'string' ? o.order_date.slice(0, 10) : '—'}</td>
                    <td className="p-3 capitalize">{o.status}</td>
                    <td className="p-3 text-right">₹{Number(o.total).toFixed(2)}</td>
                    <td className="p-3">
                      <Link href={`/sales/orders/${o.id}`} className="text-brand-600 hover:underline text-sm">View</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
