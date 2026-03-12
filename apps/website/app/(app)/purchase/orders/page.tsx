'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

interface PO {
  id: string;
  number: string;
  order_date: string;
  status: string;
  total: string | number;
  sent_at?: string | null;
  vendor?: { name: string };
}

export default function PurchaseOrdersPage() {
  const [list, setList] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const load = async (status?: string) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    const { data, error: err } = await apiGet<PO[] | { data: PO[] }>(`purchase/orders${q}`);
    if (err) setError(err);
    else if (Array.isArray(data)) setList(data);
    else if (data && typeof data === 'object' && Array.isArray((data as { data?: PO[] }).data)) setList((data as { data: PO[] }).data);
    else setList([]);
    setLoading(false);
  };

  useEffect(() => {
    load(statusFilter || undefined);
  }, [statusFilter]);

  const sentOn = (po: PO) => (po.sent_at && typeof po.sent_at === 'string' ? po.sent_at.slice(0, 10) : null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Purchase orders</h1>
        <Link href="/purchase/orders/new" className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">Create PO</Link>
      </div>
      <div className="mb-4 flex gap-2 items-center">
        <label className="text-sm text-slate-600">Filter:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">All</option>
          <option value="draft">Not sent</option>
          <option value="sent">Sent</option>
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
                <th className="text-left p-3 font-medium text-slate-700">Vendor</th>
                <th className="text-left p-3 font-medium text-slate-700">Date</th>
                <th className="text-left p-3 font-medium text-slate-700">Sent to vendor on</th>
                <th className="text-right p-3 font-medium text-slate-700">Total</th>
                <th className="text-left p-3 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-slate-500">No purchase orders yet.</td></tr>
              ) : (
                list.map((po) => (
                  <tr key={po.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{po.number}</td>
                    <td className="p-3">{po.vendor?.name ?? '—'}</td>
                    <td className="p-3">{typeof po.order_date === 'string' ? po.order_date.slice(0, 10) : '—'}</td>
                    <td className="p-3">{sentOn(po) ?? '—'}</td>
                    <td className="p-3 text-right">₹{Number(po.total).toFixed(2)}</td>
                    <td className="p-3">
                      <Link href={`/purchase/orders/${po.id}`} className="text-brand-600 hover:underline text-sm">View</Link>
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
