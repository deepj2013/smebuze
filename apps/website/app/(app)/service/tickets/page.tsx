'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';

interface Ticket {
  id: string;
  number: string;
  subject: string;
  status: string;
  priority: string;
  customer?: { name: string } | null;
}

export default function ServiceTicketsPage() {
  const [list, setList] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await apiGet<Ticket[] | { data: Ticket[] }>('service/tickets');
      if (err) setError(err);
      else if (Array.isArray(data)) setList(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: Ticket[] }).data)) setList((data as { data: Ticket[] }).data);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Service tickets</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Number</th>
                <th className="text-left p-3 font-medium text-slate-700">Subject</th>
                <th className="text-left p-3 font-medium text-slate-700">Customer</th>
                <th className="text-left p-3 font-medium text-slate-700">Status</th>
                <th className="text-left p-3 font-medium text-slate-700">Priority</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">No tickets yet.</td></tr>
              ) : (
                list.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{t.number}</td>
                    <td className="p-3">{t.subject}</td>
                    <td className="p-3">{t.customer?.name ?? '—'}</td>
                    <td className="p-3">{t.status}</td>
                    <td className="p-3">{t.priority}</td>
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
