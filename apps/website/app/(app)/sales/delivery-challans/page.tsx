'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

interface DeliveryChallan {
  id: string;
  number: string;
  challan_date: string;
  status: string;
  customer?: { name: string } | null;
  order?: { number: string } | null;
}

export default function DeliveryChallansPage() {
  const [list, setList] = useState<DeliveryChallan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await apiGet<DeliveryChallan[] | { data: DeliveryChallan[] }>('sales/delivery-challans');
      if (err) setError(err);
      else if (Array.isArray(data)) setList(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: DeliveryChallan[] }).data)) setList((data as { data: DeliveryChallan[] }).data);
      else setList([]);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Delivery challans</h1>
        <Link href="/sales/delivery-challans/new" className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">Create delivery challan</Link>
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
                <th className="text-left p-3 font-medium text-slate-700">Order</th>
                <th className="text-left p-3 font-medium text-slate-700">Date</th>
                <th className="text-left p-3 font-medium text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-slate-500">No delivery challans yet.</td></tr>
              ) : (
                list.map((dc) => (
                  <tr key={dc.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{dc.number}</td>
                    <td className="p-3">{dc.customer?.name ?? '—'}</td>
                    <td className="p-3">{dc.order?.number ?? '—'}</td>
                    <td className="p-3">{typeof dc.challan_date === 'string' ? dc.challan_date.slice(0, 10) : '—'}</td>
                    <td className="p-3 capitalize">{dc.status}</td>
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
