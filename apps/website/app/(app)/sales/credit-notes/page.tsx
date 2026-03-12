'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

interface CreditNote {
  id: string;
  number: string;
  note_date: string;
  amount: string | number;
  status: string;
  invoice?: { id: string; number: string } | null;
}

export default function CreditNotesPage() {
  const [list, setList] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await apiGet<CreditNote[] | { data: CreditNote[] }>('sales/credit-notes');
      if (err) setError(err);
      else if (Array.isArray(data)) setList(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: CreditNote[] }).data)) setList((data as { data: CreditNote[] }).data);
      else setList([]);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Credit notes</h1>
        <Link href="/sales/credit-notes/new" className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">Create credit note</Link>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Number</th>
                <th className="text-left p-3 font-medium text-slate-700">Invoice</th>
                <th className="text-left p-3 font-medium text-slate-700">Date</th>
                <th className="text-right p-3 font-medium text-slate-700">Amount</th>
                <th className="text-left p-3 font-medium text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-slate-500">No credit notes yet.</td></tr>
              ) : (
                list.map((cn) => (
                  <tr key={cn.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{cn.number}</td>
                    <td className="p-3">
                      {cn.invoice ? <Link href={`/sales/invoices/${cn.invoice.id}`} className="text-brand-600 hover:underline">{cn.invoice.number}</Link> : '—'}
                    </td>
                    <td className="p-3">{typeof cn.note_date === 'string' ? cn.note_date.slice(0, 10) : '—'}</td>
                    <td className="p-3 text-right">₹{Number(cn.amount).toFixed(2)}</td>
                    <td className="p-3 capitalize">{cn.status}</td>
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
