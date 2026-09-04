'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { PageHeader } from '../../components/PageHeader';
import { ResponsiveDataList, type Column } from '../../components/ResponsiveDataList';

interface Warehouse {
  id: string;
  name: string;
  code?: string | null;
  company_id?: string;
  branch_id?: string | null;
}

export default function WarehousesPage() {
  const [list, setList] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await apiGet<Warehouse[] | { data: Warehouse[] }>('inventory/warehouses');
      if (err) setError(err);
      else if (Array.isArray(data)) setList(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: Warehouse[] }).data)) setList((data as { data: Warehouse[] }).data);
      setLoading(false);
    })();
  }, []);

  const columns: Column<Warehouse>[] = [
    { key: 'name', label: 'Name', cardLabel: 'Name' },
    { key: 'code', label: 'Code', cardLabel: 'Code', render: (w) => w.code ?? '—' },
    { key: 'actions', label: 'Actions', render: (w) => <Link href={`/inventory/warehouses/${w.id}/edit`} className="text-brand-600 hover:underline text-sm font-medium">Edit</Link> },
  ];

  return (
    <div>
      <PageHeader title="Warehouses">
        <Link href="/inventory/warehouses/new" className="rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-brand-700 min-h-[44px] inline-flex items-center justify-center">Add warehouse</Link>
      </PageHeader>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <ResponsiveDataList<Warehouse>
          columns={columns}
          data={list}
          keyField="id"
          emptyMessage="No warehouses yet."
          emptyAction={<Link href="/inventory/warehouses/new" className="inline-block rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-brand-700">Add warehouse</Link>}
          renderMobileCard={(w) => (
            <Link href={`/inventory/warehouses/${w.id}/edit`} className="block">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50">
                <div className="font-semibold text-slate-900">{w.name}</div>
                <p className="mt-1 text-sm text-slate-500">{w.code ?? 'No code'}</p>
                <span className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-brand-600 px-3 text-sm font-medium text-white">Edit</span>
              </div>
            </Link>
          )}
        />
      )}
    </div>
  );
}
