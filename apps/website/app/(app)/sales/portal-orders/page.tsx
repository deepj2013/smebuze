'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';
import { PageHeader } from '../../components/PageHeader';
import { ResponsiveDataList, type Column } from '../../components/ResponsiveDataList';

const STATUSES = [
  { id: 'placed', label: 'Placed' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'packed', label: 'Packed' },
  { id: 'out_for_delivery', label: 'Out for delivery' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

type Order = {
  id: string;
  number: string;
  order_date: string;
  status: string;
  buyer_status: string;
  total: string | number;
  channel?: string;
  tracking_token?: string | null;
  buyer_note?: string | null;
  track_path?: string | null;
  customer?: { name: string; phone?: string | null; email?: string | null } | null;
  lines?: Array<{ description: string; qty: string }>;
};

export default function PortalOrdersPage() {
  const [list, setList] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  function load() {
    apiGet<Order[]>('growth/portal-orders').then((r) => {
      if (r.error) setError(Array.isArray(r.error) ? r.error.join(' ') : r.error);
      else setList(Array.isArray(r.data) ? r.data : []);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(order: Order, status: string) {
    setSaving(order.id);
    setError(null);
    const { data, error: err } = await apiPatch<Order>(`growth/portal-orders/${order.id}/status`, { status });
    setSaving(null);
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else if (data) setList((rows) => rows.map((o) => (o.id === order.id ? { ...o, ...data } : o)));
  }

  const columns: Column<Order>[] = [
    { key: 'number', label: 'Number' },
    { key: 'customer', label: 'Buyer', render: (o) => o.customer?.name ?? '—' },
    { key: 'phone', label: 'Phone', render: (o) => o.customer?.phone ?? '—' },
    { key: 'order_date', label: 'Date', render: (o) => (typeof o.order_date === 'string' ? o.order_date.slice(0, 10) : '—') },
    {
      key: 'status',
      label: 'Fulfilment',
      render: (o) => (
        <select
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm capitalize"
          value={o.buyer_status || 'placed'}
          disabled={saving === o.id}
          onChange={(e) => void setStatus(o, e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      ),
    },
    { key: 'total', label: 'Total', className: 'text-right', render: (o) => `₹${Number(o.total).toFixed(2)}` },
    {
      key: 'actions',
      label: 'Actions',
      render: (o) => (
        <span className="flex flex-wrap gap-2">
          <Link href={`/sales/orders/${o.id}`} className="text-brand-600 hover:underline text-sm font-medium">
            Open
          </Link>
          {o.track_path && (
            <a href={o.track_path} target="_blank" rel="noreferrer" className="text-sm text-slate-600 hover:underline">
              Buyer track
            </a>
          )}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Online orders" description="Orders from your public selling page. Update status so the buyer’s track link stays current. Buyer name and phone are saved as customers.">
        <Link href="/catalog" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm min-h-[44px] inline-flex items-center">
          Selling page
        </Link>
      </PageHeader>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <ResponsiveDataList<Order>
          columns={columns}
          data={list}
          keyField="id"
          emptyMessage="No online orders yet. Share your shop link after listing items on the selling page."
          emptyAction={
            <Link href="/catalog" className="inline-block rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium">
              List products
            </Link>
          }
          renderMobileCard={(o) => (
            <div className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex justify-between gap-2">
                <Link href={`/sales/orders/${o.id}`} className="font-semibold text-brand-700">
                  {o.number}
                </Link>
                <span className="tabular-nums text-brand-600">₹{Number(o.total).toFixed(2)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {o.customer?.name ?? '—'} · {o.customer?.phone ?? ''}
              </p>
              <p className="mt-1 text-xs text-slate-500">{o.buyer_note || (o.lines ?? []).map((l) => l.description).join(', ')}</p>
              <label className="mt-3 block text-xs text-slate-600">
                Status
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm capitalize"
                  value={o.buyer_status || 'placed'}
                  disabled={saving === o.id}
                  onChange={(e) => void setStatus(o, e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        />
      )}
    </div>
  );
}
