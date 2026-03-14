'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { PageHeader } from '../../components/PageHeader';
import { ResponsiveDataList, type Column } from '../../components/ResponsiveDataList';

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

  const columns: Column<Lead>[] = [
    { key: 'name', label: 'Name', cardLabel: 'Name' },
    { key: 'email', label: 'Email', cardLabel: 'Email', render: (r) => r.email ?? '—' },
    { key: 'phone', label: 'Phone', cardLabel: 'Phone', render: (r) => r.phone ?? '—' },
    { key: 'stage', label: 'Stage', cardLabel: 'Stage', render: (r) => r.stage ?? '—' },
    { key: 'score', label: 'Score', cardLabel: 'Score', render: (r) => r.score ?? '—' },
    { key: 'tags', label: 'Tags', render: (r) => (Array.isArray(r.tags) && r.tags.length ? r.tags.join(', ') : '—') },
    { key: 'actions', label: 'Actions', render: (l) => <Link href={`/crm/leads/${l.id}/edit`} className="text-brand-600 hover:underline text-sm">Edit</Link> },
  ];

  return (
    <div>
      <PageHeader title="Leads">
        <input
          type="text"
          placeholder="Filter by tag"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm w-36 sm:w-40 min-h-[44px]"
        />
        <Link href="/crm/leads/new" className="rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-brand-700 min-h-[44px] inline-flex items-center justify-center">
          Add lead
        </Link>
      </PageHeader>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <ResponsiveDataList<Lead>
          columns={columns}
          data={list}
          keyField="id"
          emptyMessage="No leads yet."
          emptyAction={<Link href="/crm/leads/new" className="inline-block rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-brand-700">Add your first lead</Link>}
          renderMobileCard={(l) => (
            <Link href={`/crm/leads/${l.id}/edit`} className="block">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50">
                <div className="font-semibold text-slate-900">{l.name}</div>
                {(l.email || l.phone) && <p className="text-sm text-slate-600 mt-1">{l.email ?? l.phone ?? ''}</p>}
                {(l.stage || l.tags?.length) && <p className="text-xs text-slate-500 mt-1">{l.stage ?? ''} {Array.isArray(l.tags) && l.tags.length ? `· ${l.tags.join(', ')}` : ''}</p>}
                <span className="text-brand-600 text-sm font-medium mt-2 inline-block">Edit →</span>
              </div>
            </Link>
          )}
        />
      )}
    </div>
  );
}
