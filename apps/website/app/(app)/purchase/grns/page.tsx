'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

interface Grn {
  id: string;
  number: string;
  grn_date: string;
  status: string;
  purchase_order?: { number: string } | null;
  company?: { name: string } | null;
}

export default function GrnsPage() {
  const [list, setList] = useState<Grn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await apiGet<Grn[] | { data: Grn[] }>('purchase/grns');
      if (err) setError(err);
      else if (Array.isArray(data)) setList(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: Grn[] }).data)) setList((data as { data: Grn[] }).data);
      else setList([]);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">GRNs (Goods receipt notes)</h1>
        <Link href="/purchase/grns/new" className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">Create GRN</Link>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Number</th>
                <th className="text-left p-3 font-medium text-slate-700">PO</th>
                <th className="text-left p-3 font-medium text-slate-700">Date</th>
                <th className="text-left p-3 font-medium text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-slate-500">No GRNs yet.</td></tr>
              ) : (
                list.map((g) => (
                  <tr key={g.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{g.number}</td>
                    <td className="p-3">{g.purchase_order?.number ?? '—'}</td>
                    <td className="p-3">{typeof g.grn_date === 'string' ? g.grn_date.slice(0, 10) : '—'}</td>
                    <td className="p-3 capitalize">{g.status}</td>
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
