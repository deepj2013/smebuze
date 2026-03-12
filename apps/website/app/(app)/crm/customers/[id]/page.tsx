'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

interface Customer360 {
  customer: { id: string; name: string; email?: string; phone?: string; gstin?: string; address?: Record<string, unknown>; credit_limit?: string; segment?: string };
  last_invoices: { id: string; number: string; date: string; total: number; paid: number; status: string }[];
  follow_ups: { id: string; due_at: string; note: string | null; status: string }[];
}

export default function Customer360Page() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<Customer360 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Customer360>(`crm/customers/${id}/360`).then((res) => {
      if (res.error) setError(res.error);
      else if (res.data) setData(res.data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <p className="text-slate-600">Loading…</p>;
  if (error || !data) return <p className="text-red-600">{error || 'Customer not found'}</p>;

  const { customer, last_invoices, follow_ups } = data;
  const addr = customer.address && typeof customer.address === 'object' ? Object.entries(customer.address).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ') : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Customer 360 — {customer.name}</h1>
        <Link href={`/crm/customers/${id}/edit`} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">Edit</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-800 mb-3">Details</h2>
          <dl className="text-sm space-y-1">
            <dt className="text-slate-500">Email</dt><dd>{customer.email ?? '—'}</dd>
            <dt className="text-slate-500">Phone</dt><dd>{customer.phone ?? '—'}</dd>
            <dt className="text-slate-500">GSTIN</dt><dd>{customer.gstin ?? '—'}</dd>
            <dt className="text-slate-500">Segment</dt><dd>{customer.segment ?? '—'}</dd>
            <dt className="text-slate-500">Credit limit</dt><dd>{customer.credit_limit ?? '—'}</dd>
            {addr && (<><dt className="text-slate-500">Address</dt><dd>{addr}</dd></>)}
          </dl>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <h2 className="font-semibold text-slate-800 p-4 border-b border-slate-200">Last invoices</h2>
        {last_invoices.length === 0 ? (
          <p className="p-4 text-slate-500 text-sm">No invoices yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Number</th>
                <th className="text-left p-3 font-medium text-slate-700">Date</th>
                <th className="text-right p-3 font-medium text-slate-700">Total</th>
                <th className="text-right p-3 font-medium text-slate-700">Paid</th>
                <th className="text-left p-3 font-medium text-slate-700">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {last_invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-100">
                  <td className="p-3">{inv.number}</td>
                  <td className="p-3">{inv.date}</td>
                  <td className="p-3 text-right">₹{inv.total.toFixed(2)}</td>
                  <td className="p-3 text-right">₹{inv.paid.toFixed(2)}</td>
                  <td className="p-3">{inv.status}</td>
                  <td className="p-3"><Link href={`/sales/invoices?id=${inv.id}`} className="text-brand-600 hover:underline">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <h2 className="font-semibold text-slate-800 p-4 border-b border-slate-200">Follow-ups</h2>
        {follow_ups.length === 0 ? (
          <p className="p-4 text-slate-500 text-sm">No follow-ups.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {follow_ups.map((f) => (
              <li key={f.id} className="p-4 flex justify-between items-start">
                <div>
                  <span className="text-slate-600 text-sm">{new Date(f.due_at).toLocaleString()}</span>
                  {f.note && <p className="text-slate-800 mt-1">{f.note}</p>}
                </div>
                <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">{f.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
