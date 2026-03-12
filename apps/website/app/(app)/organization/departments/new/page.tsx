'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';

const MODULE_OPTIONS = [
  { key: 'crm', label: 'CRM' },
  { key: 'sales', label: 'Sales' },
  { key: 'purchase', label: 'Purchase' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'accounting', label: 'Accounting' },
  { key: 'reports', label: 'Reports' },
  { key: 'bulk_upload', label: 'Bulk upload' },
  { key: 'organization', label: 'Organization' },
];

interface Company {
  id: string;
  name: string;
}

export default function NewDepartmentPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [allowedModules, setAllowedModules] = useState<string[]>(MODULE_OPTIONS.map((m) => m.key));
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Company[]>('organization/companies').then((r) => {
      if (Array.isArray(r.data)) setCompanies(r.data);
    });
  }, []);

  const toggleModule = (key: string) => {
    setAllowedModules((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await apiPost('organization/departments', {
      name,
      company_id: companyId || undefined,
      allowed_modules: allowedModules,
    });
    setLoading(false);
    if (err) setError(err);
    else router.push('/organization/departments');
  };

  return (
    <div>
      <Link href="/organization/departments" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Departments</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Add department</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <form onSubmit={submit} className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Company (optional)</label>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">— None —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Allowed modules (menu access)</label>
          <p className="text-xs text-slate-500 mb-2">Users in this department will only see these sections in the menu.</p>
          <div className="flex flex-wrap gap-2">
            {MODULE_OPTIONS.map((m) => (
              <label key={m.key} className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-sm">
                <input type="checkbox" checked={allowedModules.includes(m.key)} onChange={() => toggleModule(m.key)} />
                {m.label}
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Save</button>
          <Link href="/organization/departments" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
