'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

interface StockTransfer {
  id: string;
  transfer_date: string;
  status: string;
  reference?: string | null;
  from_warehouse?: { name: string } | null;
  to_warehouse?: { name: string } | null;
}

export default function StockTransfersPage() {
  const [list, setList] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await apiGet<StockTransfer[] | { data: StockTransfer[] }>('inventory/stock-transfers');
      if (err) setError(err);
      else if (Array.isArray(data)) setList(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: StockTransfer[] }).data)) setList((data as { data: StockTransfer[] }).data);
      else setList([]);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Stock transfers</h1>
        <Link href="/inventory/stock-transfers/new" className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">Create stock transfer</Link>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">From</th>
                <th className="text-left p-3 font-medium text-slate-700">To</th>
                <th className="text-left p-3 font-medium text-slate-700">Date</th>
                <th className="text-left p-3 font-medium text-slate-700">Status</th>
                <th className="text-left p-3 font-medium text-slate-700">Reference</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-slate-500">No stock transfers yet.</td></tr>
              ) : (
                list.map((st) => (
                  <tr key={st.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{st.from_warehouse?.name ?? '—'}</td>
                    <td className="p-3">{st.to_warehouse?.name ?? '—'}</td>
                    <td className="p-3">{typeof st.transfer_date === 'string' ? st.transfer_date.slice(0, 10) : '—'}</td>
                    <td className="p-3 capitalize">{st.status}</td>
                    <td className="p-3">{st.reference ?? '—'}</td>
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
