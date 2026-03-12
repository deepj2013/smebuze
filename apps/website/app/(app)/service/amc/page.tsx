'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';

interface AmcContract {
  id: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  renewal_date?: string | null;
  amount: string;
  status: string;
  customer?: { name: string } | null;
}

export default function AmcPage() {
  const [list, setList] = useState<AmcContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await apiGet<AmcContract[] | { data: AmcContract[] }>('service/amc');
      if (err) setError(err);
      else if (Array.isArray(data)) setList(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: AmcContract[] }).data)) setList((data as { data: AmcContract[] }).data);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">AMC contracts</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Contract</th>
                <th className="text-left p-3 font-medium text-slate-700">Customer</th>
                <th className="text-left p-3 font-medium text-slate-700">Start / End</th>
                <th className="text-left p-3 font-medium text-slate-700">Renewal</th>
                <th className="text-left p-3 font-medium text-slate-700">Amount</th>
                <th className="text-left p-3 font-medium text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-500">No AMC contracts yet.</td></tr>
              ) : (
                list.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{a.contract_number}</td>
                    <td className="p-3">{a.customer?.name ?? '—'}</td>
                    <td className="p-3">{a.start_date?.slice(0, 10)} – {a.end_date?.slice(0, 10)}</td>
                    <td className="p-3">{a.renewal_date?.slice(0, 10) ?? '—'}</td>
                    <td className="p-3">₹{parseFloat(a.amount || '0').toFixed(2)}</td>
                    <td className="p-3">{a.status}</td>
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
