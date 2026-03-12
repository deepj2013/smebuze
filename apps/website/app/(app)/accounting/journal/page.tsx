'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

interface JournalEntry {
  id: string;
  number: string;
  entry_date: string;
  reference?: string | null;
  total_debit?: string | number;
  total_credit?: string | number;
}

interface Company {
  id: string;
  name: string;
}

export default function JournalPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [list, setList] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Company[] | { data: Company[] }>('organization/companies').then((r) => {
      const d = r.data;
      const arr = Array.isArray(d) ? d : (d as { data?: Company[] })?.data ?? [];
      setCompanies(arr);
      if (arr.length) setCompanyId(arr[0].id);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    apiGet<JournalEntry[] | { data: JournalEntry[] }>(`accounting/journal${companyId ? `?company_id=${companyId}` : ''}`).then((res) => {
      if (res.error) setError(res.error);
      else if (Array.isArray(res.data)) setList(res.data);
      else if (res.data && typeof res.data === 'object' && Array.isArray((res.data as { data?: JournalEntry[] }).data)) setList((res.data as { data: JournalEntry[] }).data);
      setLoading(false);
    });
  }, [companyId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Journal entries</h1>
        <Link href="/accounting/journal/new" className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">New entry</Link>
      </div>
      <div className="mb-4">
        <label className="text-sm font-medium text-slate-700 mr-2">Company</label>
        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">All</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Number</th>
                <th className="text-left p-3 font-medium text-slate-700">Date</th>
                <th className="text-left p-3 font-medium text-slate-700">Reference</th>
                <th className="text-right p-3 font-medium text-slate-700">Debit</th>
                <th className="text-right p-3 font-medium text-slate-700">Credit</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-slate-500">No journal entries yet.</td></tr>
              ) : (
                list.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{row.number}</td>
                    <td className="p-3">{typeof row.entry_date === 'string' ? row.entry_date.slice(0, 10) : '—'}</td>
                    <td className="p-3">{row.reference ?? '—'}</td>
                    <td className="p-3 text-right">₹{Number(row.total_debit ?? 0).toFixed(2)}</td>
                    <td className="p-3 text-right">₹{Number(row.total_credit ?? 0).toFixed(2)}</td>
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
