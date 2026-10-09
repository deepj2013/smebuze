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
  reason?: string | null;
  invoice?: { id: string; number: string; customer?: { name: string } | null; vendor?: { name: string } | null } | null;
}

export default function SalesDebitNotesPage() {
  const [list, setList] = useState<DebitNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await apiGet<DebitNote[] | { data: DebitNote[] }>('sales/debit-notes');
      if (err) setError(err);
      else if (Array.isArray(data)) setList(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: DebitNote[] }).data)) setList((data as { data: DebitNote[] }).data);
      else setList([]);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-slate-900">Debit notes</h1>
        <Link href="/sales/debit-notes/new" className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">Create debit note</Link>
      </div>
      <p className="mb-4 text-sm text-slate-600">Raise a debit note when an invoice value goes up after it was issued. It increases the amount the party still owes and is reported with GSTR-1.</p>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Number</th>
                <th className="text-left p-3 font-medium text-slate-700">Invoice</th>
                <th className="text-left p-3 font-medium text-slate-700">Party</th>
                <th className="text-left p-3 font-medium text-slate-700">Date</th>
                <th className="text-left p-3 font-medium text-slate-700">Reason</th>
                <th className="text-right p-3 font-medium text-slate-700">Amount</th>
                <th className="text-left p-3 font-medium text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={7} className="p-4 text-slate-500">No debit notes yet.</td></tr>
              ) : list.map((dn) => (
                <tr key={dn.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3">{dn.number}</td>
                  <td className="p-3">{dn.invoice ? <Link href={`/sales/invoices/${dn.invoice.id}/edit`} className="text-brand-600 hover:underline">{dn.invoice.number}</Link> : '—'}</td>
                  <td className="p-3">{dn.invoice?.customer?.name ?? dn.invoice?.vendor?.name ?? '—'}</td>
                  <td className="p-3">{typeof dn.note_date === 'string' ? dn.note_date.slice(0, 10) : '—'}</td>
                  <td className="p-3">{dn.reason || '—'}</td>
                  <td className="p-3 text-right">₹{Number(dn.amount).toFixed(2)}</td>
                  <td className="p-3 capitalize">{dn.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
