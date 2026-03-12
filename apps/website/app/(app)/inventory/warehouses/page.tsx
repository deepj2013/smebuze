'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Warehouses</h1>
        <Link href="/inventory/warehouses/new" className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">Add warehouse</Link>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Name</th>
                <th className="text-left p-3 font-medium text-slate-700">Code</th>
                <th className="text-left p-3 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={3} className="p-4 text-slate-500">No warehouses yet.</td></tr>
              ) : (
                list.map((w) => (
                  <tr key={w.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{w.name}</td>
                    <td className="p-3">{w.code ?? '—'}</td>
                    <td className="p-3"><Link href={`/inventory/warehouses/${w.id}/edit`} className="text-brand-600 hover:underline text-sm">Edit</Link></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
