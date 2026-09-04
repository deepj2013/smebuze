'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { PageHeader } from '../../components/PageHeader';
import { ResponsiveDataList, type Column } from '../../components/ResponsiveDataList';

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

  const columns: Column<Quotation>[] = [
    { key: 'number', label: 'Number', cardLabel: 'Number' },
    { key: 'party', label: 'Customer / Lead', cardLabel: 'For', render: customerOrLead },
    { key: 'status', label: 'Status', cardLabel: 'Status', render: (q) => <span className="capitalize">{q.status}</span> },
    { key: 'sent_at', label: 'Sent on', render: (q) => sentOn(q) ?? '—' },
    { key: 'total', label: 'Total', className: 'text-right', render: (q) => `₹${Number(q.total).toFixed(2)}` },
    { key: 'actions', label: 'Actions', render: (q) => <Link href={`/sales/quotations/${q.id}`} className="text-brand-600 hover:underline text-sm font-medium">View</Link> },
  ];

  return (
    <div>
      <PageHeader title="Quotations">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px] bg-white"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="viewed">Viewed</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
        <Link href="/sales/quotations/new" className="rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-brand-700 min-h-[44px] inline-flex items-center justify-center">Create quotation</Link>
      </PageHeader>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <ResponsiveDataList<Quotation>
          columns={columns}
          data={list}
          keyField="id"
          emptyMessage="No quotations yet."
          emptyAction={<Link href="/sales/quotations/new" className="inline-block rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-brand-700">Create quotation</Link>}
          renderMobileCard={(q) => (
            <Link href={`/sales/quotations/${q.id}`} className="block">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50">
                <div className="flex justify-between gap-2">
                  <span className="font-semibold text-slate-900">{q.number}</span>
                  <span className="tabular-nums font-medium text-brand-600">₹{Number(q.total).toFixed(2)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{customerOrLead(q)}</p>
                <p className="mt-1 text-xs text-slate-500 capitalize">{q.status}{sentOn(q) ? ` · sent ${sentOn(q)}` : ''}</p>
                <span className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-brand-600 px-3 text-sm font-medium text-white">View</span>
              </div>
            </Link>
          )}
        />
      )}
    </div>
  );
}
