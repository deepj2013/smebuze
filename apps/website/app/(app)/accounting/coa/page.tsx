'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';

interface Account {
  id: string;
  code: string;
  name: string;
  type?: string;
}

interface Company {
  id: string;
  name: string;
}

export default function ChartOfAccountsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [list, setList] = useState<Account[]>([]);
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
    if (!companyId) {
      setList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    apiGet<Account[] | { data: Account[] }>(`accounting/coa?company_id=${companyId}`).then((res) => {
      if (res.error) setError(res.error);
      else if (Array.isArray(res.data)) setList(res.data);
      else if (res.data && typeof res.data === 'object' && Array.isArray((res.data as { data?: Account[] }).data)) setList((res.data as { data: Account[] }).data);
      setLoading(false);
    });
  }, [companyId]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Chart of accounts</h1>
      <div className="mb-4">
        <label className="text-sm font-medium text-slate-700 mr-2">Company</label>
        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">Select company</option>
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
                <th className="text-left p-3 font-medium text-slate-700">Code</th>
                <th className="text-left p-3 font-medium text-slate-700">Name</th>
                <th className="text-left p-3 font-medium text-slate-700">Type</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={3} className="p-4 text-slate-500">No accounts. Add chart of accounts via seed or API.</td></tr>
              ) : (
                list.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{row.code}</td>
                    <td className="p-3">{row.name}</td>
                    <td className="p-3">{row.type ?? '—'}</td>
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
