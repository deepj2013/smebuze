'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { PageHeader } from '../../components/PageHeader';
import { ResponsiveDataList, type Column } from '../../components/ResponsiveDataList';

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

  const columns: Column<PO>[] = [
    { key: 'number', label: 'Number', cardLabel: 'Number' },
    { key: 'vendor', label: 'Vendor', cardLabel: 'Vendor', render: (po) => po.vendor?.name ?? '—' },
    { key: 'order_date', label: 'Date', cardLabel: 'Date', render: (po) => (typeof po.order_date === 'string' ? po.order_date.slice(0, 10) : '—') },
    { key: 'sent_at', label: 'Sent to vendor on', render: (po) => sentOn(po) ?? '—' },
    { key: 'total', label: 'Total', className: 'text-right', render: (po) => `₹${Number(po.total).toFixed(2)}` },
    { key: 'actions', label: 'Actions', render: (po) => <Link href={`/purchase/orders/${po.id}`} className="text-brand-600 hover:underline text-sm font-medium">View</Link> },
  ];

  return (
    <div>
      <PageHeader title="Purchase orders">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px] bg-white"
        >
          <option value="">All</option>
          <option value="draft">Not sent</option>
          <option value="sent">Sent</option>
        </select>
        <Link href="/purchase/orders/new" className="rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-brand-700 min-h-[44px] inline-flex items-center justify-center">Create PO</Link>
      </PageHeader>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <ResponsiveDataList<PO>
          columns={columns}
          data={list}
          keyField="id"
          emptyMessage="No purchase orders yet."
          emptyAction={<Link href="/purchase/orders/new" className="inline-block rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-brand-700">Create PO</Link>}
          renderMobileCard={(po) => (
            <Link href={`/purchase/orders/${po.id}`} className="block">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50">
                <div className="flex justify-between gap-2">
                  <span className="font-semibold text-slate-900">{po.number}</span>
                  <span className="tabular-nums font-medium text-brand-600">₹{Number(po.total).toFixed(2)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{po.vendor?.name ?? '—'}</p>
                <p className="mt-1 text-xs text-slate-500">{typeof po.order_date === 'string' ? po.order_date.slice(0, 10) : '—'}{sentOn(po) ? ` · sent ${sentOn(po)}` : ''}</p>
                <span className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-brand-600 px-3 text-sm font-medium text-white">View</span>
              </div>
            </Link>
          )}
        />
      )}
    </div>
  );
}
