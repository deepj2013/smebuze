'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

interface Quotation {
  id: string;
  number: string;
  issue_date: string;
  status: string;
  total: string | number;
  sent_at?: string | null;
  customer?: { name: string } | null;
  lead?: { name: string } | null;
}

export default function QuotationsPage() {
  const [list, setList] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const load = async (status?: string) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    const { data, error: err } = await apiGet<Quotation[] | { data: Quotation[] }>(`sales/quotations${q}`);
    if (err) setError(err);
    else if (Array.isArray(data)) setList(data);
    else if (data && typeof data === 'object' && Array.isArray((data as { data?: Quotation[] }).data)) setList((data as { data: Quotation[] }).data);
    else setList([]);
    setLoading(false);
  };

  useEffect(() => {
    load(statusFilter || undefined);
  }, [statusFilter]);

  const sentOn = (q: Quotation) => (q.sent_at && typeof q.sent_at === 'string' ? q.sent_at.slice(0, 10) : null);
  const customerOrLead = (q: Quotation) => q.customer?.name ?? q.lead?.name ?? '—';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Quotations</h1>
        <Link href="/sales/quotations/new" className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">Create quotation</Link>
      </div>
      <div className="mb-4 flex gap-2 items-center">
        <label className="text-sm text-slate-600">Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">All</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="viewed">Viewed</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Number</th>
                <th className="text-left p-3 font-medium text-slate-700">Customer / Lead</th>
                <th className="text-left p-3 font-medium text-slate-700">Status</th>
                <th className="text-left p-3 font-medium text-slate-700">Sent on</th>
                <th className="text-right p-3 font-medium text-slate-700">Total</th>
                <th className="text-left p-3 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-slate-500">No quotations yet.</td></tr>
              ) : (
                list.map((q) => (
                  <tr key={q.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{q.number}</td>
                    <td className="p-3">{customerOrLead(q)}</td>
                    <td className="p-3"><span className="capitalize">{q.status}</span></td>
                    <td className="p-3">{sentOn(q) ?? '—'}</td>
                    <td className="p-3 text-right">₹{Number(q.total).toFixed(2)}</td>
                    <td className="p-3">
                      <Link href={`/sales/quotations/${q.id}`} className="text-brand-600 hover:underline text-sm">View</Link>
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
