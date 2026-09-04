'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { PageHeader } from '../../components/PageHeader';
import { ResponsiveDataList, type Column } from '../../components/ResponsiveDataList';

interface SalesOrder {
  id: string;
  number: string;
  order_date: string;
  status: string;
  total: string | number;
  customer?: { name: string } | null;
  company?: { name: string } | null;
}

export default function SalesOrdersPage() {
  const [list, setList] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await apiGet<SalesOrder[] | { data: SalesOrder[] }>('sales/orders');
      if (err) setError(err);
      else if (Array.isArray(data)) setList(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: SalesOrder[] }).data)) setList((data as { data: SalesOrder[] }).data);
      else setList([]);
      setLoading(false);
    })();
  }, []);

  const columns: Column<SalesOrder>[] = [
    { key: 'number', label: 'Number', cardLabel: 'Number' },
    { key: 'customer', label: 'Customer', cardLabel: 'Customer', render: (o) => o.customer?.name ?? '—' },
    { key: 'order_date', label: 'Date', cardLabel: 'Date', render: (o) => (typeof o.order_date === 'string' ? o.order_date.slice(0, 10) : '—') },
    { key: 'status', label: 'Status', cardLabel: 'Status', render: (o) => <span className="capitalize">{o.status}</span> },
    { key: 'total', label: 'Total', className: 'text-right', render: (o) => `₹${Number(o.total).toFixed(2)}` },
    { key: 'actions', label: 'Actions', render: (o) => <Link href={`/sales/orders/${o.id}`} className="text-brand-600 hover:underline text-sm font-medium">View</Link> },
  ];

  return (
    <div>
      <PageHeader title="Sales orders">
        <Link href="/sales/orders/new" className="rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-brand-700 min-h-[44px] inline-flex items-center justify-center">Create sales order</Link>
      </PageHeader>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <ResponsiveDataList<SalesOrder>
          columns={columns}
          data={list}
          keyField="id"
          emptyMessage="No sales orders yet."
          emptyAction={<Link href="/sales/orders/new" className="inline-block rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-brand-700">Create sales order</Link>}
          renderMobileCard={(o) => (
            <Link href={`/sales/orders/${o.id}`} className="block">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50">
                <div className="flex justify-between gap-2">
                  <span className="font-semibold text-slate-900">{o.number}</span>
                  <span className="tabular-nums font-medium text-brand-600">₹{Number(o.total).toFixed(2)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{o.customer?.name ?? '—'}</p>
                <p className="mt-1 text-xs text-slate-500 capitalize">{typeof o.order_date === 'string' ? o.order_date.slice(0, 10) : '—'} · {o.status}</p>
                <span className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-brand-600 px-3 text-sm font-medium text-white">View</span>
              </div>
            </Link>
          )}
        />
      )}
    </div>
  );
}
