'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { PageHeader } from '../../components/PageHeader';
import { ResponsiveDataList, type Column } from '../../components/ResponsiveDataList';

type Order = {
  id: string;
  number: string;
  order_date: string;
  status: string;
  total: string | number;
  channel?: string;
  tracking_token?: string | null;
  buyer_note?: string | null;
  customer?: { name: string; phone?: string | null } | null;
};

export default function PortalOrdersPage() {
  const [list, setList] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Order[]>('growth/portal-orders').then((r) => {
      if (r.error) setError(Array.isArray(r.error) ? r.error.join(' ') : r.error);
      else setList(Array.isArray(r.data) ? r.data : []);
      setLoading(false);
    });
  }, []);

  const columns: Column<Order>[] = [
    { key: 'number', label: 'Number' },
    { key: 'customer', label: 'Buyer', render: (o) => o.customer?.name ?? '—' },
    { key: 'phone', label: 'Phone', render: (o) => o.customer?.phone ?? '—' },
    { key: 'order_date', label: 'Date', render: (o) => (typeof o.order_date === 'string' ? o.order_date.slice(0, 10) : '—') },
    { key: 'status', label: 'Status', render: (o) => <span className="capitalize">{o.status}</span> },
    { key: 'total', label: 'Total', className: 'text-right', render: (o) => `₹${Number(o.total).toFixed(2)}` },
    { key: 'actions', label: 'Actions', render: (o) => <Link href={`/sales/orders/${o.id}`} className="text-brand-600 hover:underline text-sm font-medium">Open</Link> },
  ];

  return (
    <div>
      <PageHeader title="Portal orders" description="Orders placed on your public shop. Confirm, pack, and deliver from the sales order.">
        <Link href="/catalog" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm min-h-[44px] inline-flex items-center">Catalog</Link>
      </PageHeader>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <ResponsiveDataList<Order>
          columns={columns}
          data={list}
          keyField="id"
          emptyMessage="No portal orders yet. Share your shop link after listing items."
          emptyAction={<Link href="/catalog" className="inline-block rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium">Set up catalog</Link>}
          renderMobileCard={(o) => (
            <Link href={`/sales/orders/${o.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex justify-between gap-2">
                <span className="font-semibold">{o.number}</span>
                <span className="tabular-nums text-brand-600">₹{Number(o.total).toFixed(2)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{o.customer?.name ?? '—'} · {o.customer?.phone ?? ''}</p>
              <p className="mt-1 text-xs text-slate-500 capitalize">{o.status}{o.buyer_note ? ` · ${o.buyer_note}` : ''}</p>
            </Link>
          )}
        />
      )}
    </div>
  );
}
