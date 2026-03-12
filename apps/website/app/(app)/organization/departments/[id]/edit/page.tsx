'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';

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

export default function EditDepartmentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [name, setName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [allowedModules, setAllowedModules] = useState<string[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [deptRes, compRes] = await Promise.all([
        apiGet<Record<string, unknown>>(`organization/departments/${id}`),
        apiGet<Company[]>('organization/companies'),
      ]);
      if (deptRes.error) setLoadErr(deptRes.error);
      else if (deptRes.data) {
        const d = deptRes.data;
        setName((d.name as string) ?? '');
        setCompanyId((d.company_id as string) ?? '');
        setAllowedModules(Array.isArray(d.allowed_modules) ? d.allowed_modules : MODULE_OPTIONS.map((m) => m.key));
      }
      if (Array.isArray(compRes.data)) setCompanies(compRes.data);
    })();
  }, [id]);

  const toggleModule = (key: string) => {
    setAllowedModules((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await apiPatch(`organization/departments/${id}`, {
      name,
      company_id: companyId || null,
      allowed_modules: allowedModules,
    });
    setLoading(false);
    if (err) setError(err);
    else router.push('/organization/departments');
  };

  if (loadErr) return <div className="p-4 text-red-600">{loadErr}</div>;
  return (
    <div>
      <Link href="/organization/departments" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Departments</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Edit department</h1>
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
