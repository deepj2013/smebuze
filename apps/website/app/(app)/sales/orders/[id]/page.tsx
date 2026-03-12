'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

interface SalesOrder {
  id: string;
  number: string;
  order_date: string;
  status: string;
  total: string | number;
  customer?: { name: string } | null;
  company?: { name: string } | null;
  quotation?: { number: string } | null;
}

export default function SalesOrderDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiGet<SalesOrder>(`sales/orders/${id}`).then(({ data, error: err }) => {
      if (err) setError(err);
      else setOrder(Array.isArray(data) ? null : (data as SalesOrder));
      setLoading(false);
    });
  }, [id]);

  if (loading || !id) return <div className="p-4">Loading…</div>;
  if (error && !order) return <div className="p-4 text-red-600">{error}</div>;
  if (!order) return <div className="p-4">Order not found.</div>;

  return (
    <div>
      <Link href="/sales/orders" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Sales orders</Link>
      <h1 className="text-2xl font-bold text-slate-900">Sales order {order.number}</h1>
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <dt className="text-slate-500">Customer</dt>
          <dd>{order.customer?.name ?? '—'}</dd>
          <dt className="text-slate-500">Date</dt>
          <dd>{typeof order.order_date === 'string' ? order.order_date.slice(0, 10) : '—'}</dd>
          <dt className="text-slate-500">Status</dt>
          <dd className="capitalize">{order.status}</dd>
          <dt className="text-slate-500">Total</dt>
          <dd>₹{Number(order.total).toFixed(2)}</dd>
          {order.quotation && (
            <>
              <dt className="text-slate-500">Quotation</dt>
              <dd>{order.quotation.number}</dd>
            </>
          )}
        </dl>
      </div>
    </div>
  );
}
