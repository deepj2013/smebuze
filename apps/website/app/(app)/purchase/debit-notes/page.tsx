'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

interface DebitNote {
  id: string;
  number: string;
  note_date: string;
  amount: string | number;
  status: string;
  purchase_order?: { number: string } | null;
}

export default function DebitNotesPage() {
  const [list, setList] = useState<DebitNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await apiGet<DebitNote[] | { data: DebitNote[] }>('purchase/debit-notes');
      if (err) setError(err);
      else if (Array.isArray(data)) setList(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: DebitNote[] }).data)) setList((data as { data: DebitNote[] }).data);
      else setList([]);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Debit notes</h1>
        <Link href="/purchase/debit-notes/new" className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">Create debit note</Link>
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
                <th className="text-right p-3 font-medium text-slate-700">Amount</th>
                <th className="text-left p-3 font-medium text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-slate-500">No debit notes yet.</td></tr>
              ) : (
                list.map((dn) => (
                  <tr key={dn.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{dn.number}</td>
                    <td className="p-3">{dn.purchase_order?.number ?? '—'}</td>
                    <td className="p-3">{typeof dn.note_date === 'string' ? dn.note_date.slice(0, 10) : '—'}</td>
                    <td className="p-3 text-right">₹{Number(dn.amount).toFixed(2)}</td>
                    <td className="p-3 capitalize">{dn.status}</td>
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
