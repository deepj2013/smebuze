'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';

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

const TYPES = ['asset', 'liability', 'equity', 'income', 'expense'];

export default function ChartOfAccountsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [list, setList] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState('');
  const [form, setForm] = useState({ code: '', name: '', type: 'expense' });
  const [tb, setTb] = useState<{
    as_of: string;
    total_debit: number;
    total_credit: number;
    rows: Array<{ code: string; name: string; type: string; debit: number; credit: number }>;
  } | null>(null);

  useEffect(() => {
    apiGet<Company[] | { data: Company[] }>('organization/companies').then((r) => {
      const d = r.data;
      const arr = Array.isArray(d) ? d : (d as { data?: Company[] })?.data ?? [];
      setCompanies(arr);
      if (arr.length) setCompanyId(arr[0].id);
    });
  }, []);

  function load() {
    if (!companyId) {
      setList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    apiGet<Account[]>(`accounting/coa?company_id=${companyId}`).then((res) => {
      if (res.error) setError(res.error);
      else if (Array.isArray(res.data)) setList(res.data);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, [companyId]);

  async function seedSystem() {
    if (!companyId) return;
    const r = await apiPost('accounting/coa/seed-system', { company_id: companyId });
    if (r.error) setError(r.error);
    else {
      setOk('System accounts ready');
      load();
    }
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    const r = await apiPost('accounting/coa', { company_id: companyId, ...form });
    if (r.error) setError(r.error);
    else {
      setForm({ code: '', name: '', type: 'expense' });
      setOk('Account created');
      load();
    }
  }

  async function loadTrial() {
    if (!companyId) return;
    const r = await apiGet<typeof tb>(`accounting/trial-balance?company_id=${companyId}`);
    if (r.error) setError(r.error);
    else if (r.data) setTb(r.data);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Chart of accounts</h1>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium text-slate-700">Company</label>
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Select company</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => void seedSystem()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          Seed cash / bank / GST accounts
        </button>
        <button type="button" onClick={() => void loadTrial()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          Trial balance
        </button>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {ok && <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm">{ok}</div>}

      <form onSubmit={createAccount} className="mb-4 grid gap-2 sm:grid-cols-4 rounded-xl border border-slate-200 bg-white p-4">
        <input
          required
          placeholder="Code"
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
        <input
          required
          placeholder="Name"
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <select
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-brand-600 text-white text-sm font-medium px-3 py-2">
          Add account
        </button>
      </form>

      {tb && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <p className="font-semibold">
            Trial balance as of {tb.as_of} · Dr {tb.total_debit} / Cr {tb.total_credit}
          </p>
          <ul className="mt-2 max-h-48 overflow-auto space-y-1">
            {tb.rows
              .filter((r) => r.debit || r.credit)
              .map((r) => (
                <li key={r.code}>
                  {r.code} {r.name}: Dr {r.debit} / Cr {r.credit}
                </li>
              ))}
          </ul>
        </div>
      )}

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
                <tr>
                  <td colSpan={3} className="p-4 text-slate-500">
                    No accounts. Click “Seed cash / bank / GST accounts” or add one.
                  </td>
                </tr>
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
