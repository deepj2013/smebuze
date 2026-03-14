'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

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

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Vendors</h1>
        <Link href="/purchase/vendors/new" className="rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-brand-700 min-h-[44px] inline-flex items-center justify-center w-fit">Add vendor</Link>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="responsive-table-wrap">
          <table className="w-full text-sm table-min-width">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Name</th>
                <th className="text-left p-3 font-medium text-slate-700">Email</th>
                <th className="text-left p-3 font-medium text-slate-700">Phone</th>
                <th className="text-left p-3 font-medium text-slate-700">GSTIN</th>
                <th className="text-left p-3 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-slate-500">No vendors yet.</td></tr>
              ) : (
                list.map((v) => (
                  <tr key={v.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{v.name}</td>
                    <td className="p-3">{v.email ?? '—'}</td>
                    <td className="p-3">{v.phone ?? '—'}</td>
                    <td className="p-3">{v.gstin ?? '—'}</td>
                    <td className="p-3"><Link href={`/purchase/vendors/${v.id}/edit`} className="text-brand-600 hover:underline text-sm">Edit</Link></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
