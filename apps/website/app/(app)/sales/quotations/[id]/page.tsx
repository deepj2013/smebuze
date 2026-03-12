'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';

interface Quotation {
  id: string;
  number: string;
  issue_date: string;
  valid_until?: string | null;
  status: string;
  total: string | number;
  tax_amount: string | number;
  sent_at?: string | null;
  customer?: { name: string } | null;
  lead?: { name: string } | null;
  company?: { name: string } | null;
  items?: Array<{ description?: string; qty: string; unit?: string; rate: string; amount: string }>;
}

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [q, setQ] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data, error: err } = await apiGet<Quotation>(`sales/quotations/${id}`);
    if (err) setError(err);
    else setQ(Array.isArray(data) ? null : (data as Quotation));
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    setError(null);
    const body: { status: string; sent_at?: string } = { status };
    if (status === 'sent') body.sent_at = new Date().toISOString();
    const { error: err } = await apiPatch(`sales/quotations/${id}`, body);
    setUpdating(false);
    if (err) setError(err);
    else load();
  };

  if (loading || !id) return <div className="p-4">Loading…</div>;
  if (error && !q) return <div className="p-4 text-red-600">{error}</div>;
  if (!q) return <div className="p-4">Quotation not found.</div>;

  const sentTo = q.customer?.name ?? q.lead?.name ?? '—';
  const sentOn = q.sent_at && typeof q.sent_at === 'string' ? q.sent_at.slice(0, 10) : null;

  return (
    <div>
      <Link href="/sales/quotations" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Quotations</Link>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quotation {q.number}</h1>
          <p className="text-slate-600 mt-1">Company: {q.company?.name ?? '—'}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {q.status === 'draft' && (
            <button type="button" onClick={() => updateStatus('sent')} disabled={updating} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Mark as sent</button>
          )}
          {(q.status === 'sent' || q.status === 'viewed') && (
            <>
              <button type="button" onClick={() => updateStatus('accepted')} disabled={updating} className="rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50">Mark accepted</button>
              <button type="button" onClick={() => updateStatus('rejected')} disabled={updating} className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50">Mark rejected</button>
            </>
          )}
        </div>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}

      <div className="rounded-xl border border-slate-200 bg-white p-6 mb-6">
        <h2 className="font-medium text-slate-800 mb-3">Details</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <dt className="text-slate-500">Sent to</dt>
          <dd>{sentTo}</dd>
          <dt className="text-slate-500">Sent on</dt>
          <dd>{sentOn ?? '—'}</dd>
          <dt className="text-slate-500">Status</dt>
          <dd><span className="capitalize font-medium">{q.status}</span></dd>
          <dt className="text-slate-500">Issue date</dt>
          <dd>{typeof q.issue_date === 'string' ? q.issue_date.slice(0, 10) : '—'}</dd>
          <dt className="text-slate-500">Valid until</dt>
          <dd>{q.valid_until && typeof q.valid_until === 'string' ? q.valid_until.slice(0, 10) : '—'}</dd>
          <dt className="text-slate-500">Total</dt>
          <dd>₹{Number(q.total).toFixed(2)}</dd>
        </dl>
      </div>

      {q.items && q.items.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <h2 className="font-medium text-slate-800 p-4 border-b border-slate-100">Lines</h2>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Description</th>
                <th className="text-right p-3 font-medium text-slate-700">Qty</th>
                <th className="text-left p-3 font-medium text-slate-700">Unit</th>
                <th className="text-right p-3 font-medium text-slate-700">Rate</th>
                <th className="text-right p-3 font-medium text-slate-700">Amount</th>
              </tr>
            </thead>
            <tbody>
              {q.items.map((line, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="p-3">{line.description ?? '—'}</td>
                  <td className="p-3 text-right">{line.qty}</td>
                  <td className="p-3">{line.unit ?? 'pcs'}</td>
                  <td className="p-3 text-right">₹{Number(line.rate).toFixed(2)}</td>
                  <td className="p-3 text-right">₹{Number(line.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
