'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { PageHeader } from '../../components/PageHeader';
import { ResponsiveDataList, type Column } from '../../components/ResponsiveDataList';

interface Vendor {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  gstin?: string | null;
}

export default function VendorsPage() {
  const [list, setList] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await apiGet<Vendor[] | { data: Vendor[] }>('purchase/vendors');
      if (err) setError(err);
      else if (Array.isArray(data)) setList(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: Vendor[] }).data)) setList((data as { data: Vendor[] }).data);
      setLoading(false);
    })();
  }, []);

  const columns: Column<Vendor>[] = [
    { key: 'name', label: 'Name', cardLabel: 'Name' },
    { key: 'email', label: 'Email', cardLabel: 'Email', render: (v) => v.email ?? '—' },
    { key: 'phone', label: 'Phone', cardLabel: 'Phone', render: (v) => v.phone ?? '—' },
    { key: 'gstin', label: 'GSTIN', render: (v) => v.gstin ?? '—' },
    { key: 'actions', label: 'Actions', render: (v) => <Link href={`/purchase/vendors/${v.id}/edit`} className="text-brand-600 hover:underline text-sm font-medium">Edit</Link> },
  ];

  return (
    <div>
      <PageHeader title="Vendors">
        <Link href="/purchase/vendors/new" className="rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-brand-700 min-h-[44px] inline-flex items-center justify-center">Add vendor</Link>
      </PageHeader>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <ResponsiveDataList<Vendor>
          columns={columns}
          data={list}
          keyField="id"
          emptyMessage="No vendors yet."
          emptyAction={<Link href="/purchase/vendors/new" className="inline-block rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-brand-700">Add vendor</Link>}
          renderMobileCard={(v) => (
            <Link href={`/purchase/vendors/${v.id}/edit`} className="block">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50">
                <div className="font-semibold text-slate-900">{v.name}</div>
                {(v.email || v.phone) && <p className="mt-1 text-sm text-slate-600">{v.email ?? v.phone}</p>}
                {v.gstin && <p className="mt-1 text-xs text-slate-500">{v.gstin}</p>}
                <span className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-brand-600 px-3 text-sm font-medium text-white">Edit</span>
              </div>
            </Link>
          )}
        />
      )}
    </div>
  );
}
