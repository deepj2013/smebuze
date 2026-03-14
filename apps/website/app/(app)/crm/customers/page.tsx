'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { PageHeader } from '../../components/PageHeader';
import { ResponsiveDataList, type Column } from '../../components/ResponsiveDataList';

interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  segment?: string | null;
  gstin?: string | null;
  tags?: string[];
}

export default function CustomersPage() {
  const [list, setList] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState('');

  useEffect(() => {
    (async () => {
      const path = tagFilter ? `crm/customers?tag=${encodeURIComponent(tagFilter)}` : 'crm/customers';
      const { data, error: err } = await apiGet<Customer[] | { data: Customer[] }>(path);
      if (err) setError(err);
      else if (Array.isArray(data)) setList(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: Customer[] }).data)) setList((data as { data: Customer[] }).data);
      setLoading(false);
    })();
  }, [tagFilter]);

  const columns: Column<Customer>[] = [
    { key: 'name', label: 'Name', cardLabel: 'Name' },
    { key: 'email', label: 'Email', cardLabel: 'Email', render: (r) => r.email ?? '—' },
    { key: 'phone', label: 'Phone', cardLabel: 'Phone', render: (r) => r.phone ?? '—' },
    { key: 'segment', label: 'Segment', cardLabel: 'Segment', render: (r) => r.segment ?? '—' },
    { key: 'tags', label: 'Tags', render: (r) => (Array.isArray(r.tags) && r.tags.length ? r.tags.join(', ') : '—') },
    { key: 'actions', label: 'Actions', render: (c) => <Link href={`/crm/customers/${c.id}`} className="text-brand-600 hover:underline text-sm">View</Link> },
  ];

  return (
    <div>
      <PageHeader title="Customers">
        <input
          type="text"
          placeholder="Filter by tag"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm w-36 sm:w-40 min-h-[44px]"
        />
        <Link href="/crm/customers/new" className="rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-brand-700 min-h-[44px] inline-flex items-center justify-center">
          Add customer
        </Link>
      </PageHeader>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {!loading && (
        <ResponsiveDataList<Customer>
          columns={columns}
          data={list}
          keyField="id"
          emptyMessage="No customers yet."
          emptyAction={<Link href="/crm/customers/new" className="inline-block rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-brand-700">Add your first customer</Link>}
          renderMobileCard={(c) => (
            <Link href={`/crm/customers/${c.id}`} className="block">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50">
                <div className="font-semibold text-slate-900">{c.name}</div>
                {(c.email || c.phone) && <p className="text-sm text-slate-600 mt-1">{c.email ?? c.phone ?? ''}</p>}
                {(c.segment || (Array.isArray(c.tags) && c.tags?.length)) && <p className="text-xs text-slate-500 mt-1">{c.segment ?? ''} {Array.isArray(c.tags) && c.tags.length ? `· ${c.tags.join(', ')}` : ''}</p>}
                <span className="text-brand-600 text-sm font-medium mt-2 inline-block">View →</span>
              </div>
            </Link>
          )}
        />
      )}
    </div>
  );
}
