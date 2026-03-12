'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

interface Lead {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  stage?: string | null;
  score?: number | null;
  tags?: string[];
}

export default function LeadsPage() {
  const [list, setList] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState('');

  useEffect(() => {
    (async () => {
      const path = tagFilter ? `crm/leads?tag=${encodeURIComponent(tagFilter)}` : 'crm/leads';
      const { data, error: err } = await apiGet<Lead[] | { data: Lead[] }>(path);
      if (err) setError(err);
      else if (Array.isArray(data)) setList(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: Lead[] }).data)) setList((data as { data: Lead[] }).data);
      setLoading(false);
    })();
  }, [tagFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
        <div className="flex gap-2 items-center">
          <input type="text" placeholder="Filter by tag" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-40" />
          <Link href="/crm/leads/new" className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">Add lead</Link>
        </div>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Name</th>
                <th className="text-left p-3 font-medium text-slate-700">Email</th>
                <th className="text-left p-3 font-medium text-slate-700">Phone</th>
                <th className="text-left p-3 font-medium text-slate-700">Stage</th>
                <th className="text-left p-3 font-medium text-slate-700">Score</th>
                <th className="text-left p-3 font-medium text-slate-700">Tags</th>
                <th className="text-left p-3 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <p className="text-slate-600 mb-2">No leads yet.</p>
                    <Link href="/crm/leads/new" className="inline-block rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">Add your first lead</Link>
                  </td>
                </tr>
              ) : (
                list.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{l.name}</td>
                    <td className="p-3">{l.email ?? '—'}</td>
                    <td className="p-3">{l.phone ?? '—'}</td>
                    <td className="p-3">{l.stage ?? '—'}</td>
                    <td className="p-3">{l.score ?? '—'}</td>
                    <td className="p-3">{Array.isArray(l.tags) && l.tags.length ? l.tags.join(', ') : '—'}</td>
                    <td className="p-3"><Link href={`/crm/leads/${l.id}/edit`} className="text-brand-600 hover:underline text-sm">Edit</Link></td>
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
