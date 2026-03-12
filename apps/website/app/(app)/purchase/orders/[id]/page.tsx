'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';

interface PO {
  id: string;
  number: string;
  order_date: string;
  status: string;
  total: string | number;
  tax_amount?: string | number;
  sent_at?: string | null;
  vendor?: { name: string };
  company?: { name: string };
}

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [po, setPo] = useState<PO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data, error: err } = await apiGet<PO>(`purchase/orders/${id}`);
    if (err) setError(err);
    else setPo(Array.isArray(data) ? null : (data as PO));
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const markAsSent = async () => {
    setUpdating(true);
    setError(null);
    const { error: err } = await apiPatch(`purchase/orders/${id}`, { status: 'sent', sent_at: new Date().toISOString() });
    setUpdating(false);
    if (err) setError(err);
    else load();
  };

  if (loading || !id) return <div className="p-4">Loading…</div>;
  if (error && !po) return <div className="p-4 text-red-600">{error}</div>;
  if (!po) return <div className="p-4">Purchase order not found.</div>;

  const sentOn = po.sent_at && typeof po.sent_at === 'string' ? po.sent_at.slice(0, 10) : null;

  return (
    <div>
      <Link href="/purchase/orders" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Purchase orders</Link>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">PO {po.number}</h1>
          <p className="text-slate-600 mt-1">Vendor: {po.vendor?.name ?? '—'} · Company: {po.company?.name ?? '—'}</p>
        </div>
        {po.status === 'draft' && (
          <button type="button" onClick={markAsSent} disabled={updating} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Mark as sent</button>
        )}
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <dt className="text-slate-500">Sent to vendor on</dt>
          <dd>{sentOn ?? '—'}</dd>
          <dt className="text-slate-500">Status</dt>
          <dd><span className="capitalize font-medium">{po.status}</span></dd>
          <dt className="text-slate-500">Order date</dt>
          <dd>{typeof po.order_date === 'string' ? po.order_date.slice(0, 10) : '—'}</dd>
          <dt className="text-slate-500">Total</dt>
          <dd>₹{Number(po.total).toFixed(2)}</dd>
        </dl>
      </div>
    </div>
  );
}
