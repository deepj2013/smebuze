'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

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

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Filter by tag"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-40"
          />
          <Link href="/crm/customers/new" className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">Add customer</Link>
        </div>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Name</th>
                <th className="text-left p-3 font-medium text-slate-700">Email</th>
                <th className="text-left p-3 font-medium text-slate-700">Phone</th>
                <th className="text-left p-3 font-medium text-slate-700">Segment</th>
                <th className="text-left p-3 font-medium text-slate-700">Tags</th>
                <th className="text-left p-3 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <p className="text-slate-600 mb-2">No customers yet.</p>
                    <Link href="/crm/customers/new" className="inline-block rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">Add your first customer</Link>
                  </td>
                </tr>
              ) : (
                list.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{c.name}</td>
                    <td className="p-3">{c.email ?? '—'}</td>
                    <td className="p-3">{c.phone ?? '—'}</td>
                    <td className="p-3">{c.segment ?? '—'}</td>
                    <td className="p-3">{Array.isArray(c.tags) && c.tags.length ? c.tags.join(', ') : '—'}</td>
                    <td className="p-3">
                    <Link href={`/crm/customers/${c.id}`} className="text-brand-600 hover:underline text-sm mr-2">View</Link>
                    <Link href={`/crm/customers/${c.id}/edit`} className="text-slate-600 hover:underline text-sm">Edit</Link>
                  </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {loading && <p className="text-slate-600">Loading…</p>}
    </div>
  );
}
