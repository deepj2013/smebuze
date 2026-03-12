'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

interface Company {
  id: string;
  name: string;
  legal_name?: string | null;
  gstin?: string | null;
}

export default function CompaniesPage() {
  const [list, setList] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await apiGet<Company[]>('organization/companies');
      if (err) setError(err);
      else if (Array.isArray(data)) setList(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: Company[] }).data)) setList((data as { data: Company[] }).data);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
        <Link href="/organization/companies/new" className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">
          Add company
        </Link>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Name</th>
                <th className="text-left p-3 font-medium text-slate-700">Legal name</th>
                <th className="text-left p-3 font-medium text-slate-700">GSTIN</th>
                <th className="text-left p-3 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-slate-500">No companies yet.</td></tr>
              ) : (
                list.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{c.name}</td>
                    <td className="p-3">{c.legal_name ?? '—'}</td>
                    <td className="p-3">{c.gstin ?? '—'}</td>
                    <td className="p-3">
                      <Link href={`/organization/companies/${c.id}/branches`} className="text-brand-600 hover:underline text-sm mr-2">Branches</Link>
                      <Link href={`/organization/companies/${c.id}/edit`} className="text-brand-600 hover:underline text-sm">Edit</Link>
                    </td>
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
