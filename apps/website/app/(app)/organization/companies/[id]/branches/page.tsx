'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';

interface Branch {
  id: string;
  name: string;
  company_id: string;
  address?: Record<string, unknown>;
}

export default function BranchesPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await apiGet<Branch[]>(`organization/companies/${companyId}/branches`);
      if (err) setError(err);
      else if (Array.isArray(data)) setBranches(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: Branch[] }).data)) setBranches((data as { data: Branch[] }).data);
      setLoading(false);
    })();
  }, [companyId]);

  const addBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await apiPost('organization/branches', { company_id: companyId, name, address: {} });
    setSubmitting(false);
    if (err) setError(err);
    else {
      setName('');
      setShowForm(false);
      const { data } = await apiGet<Branch[]>(`organization/companies/${companyId}/branches`);
      if (Array.isArray(data)) setBranches(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: Branch[] }).data)) setBranches((data as { data: Branch[] }).data);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Link href="/organization/companies" className="text-slate-600 hover:text-slate-900 text-sm">← Companies</Link>
      </div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Branches</h1>
        <button type="button" onClick={() => setShowForm(!showForm)} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">Add branch</button>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {showForm && (
        <form onSubmit={addBranch} className="mb-6 max-w-md rounded-xl border border-slate-200 bg-white p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Branch name</label>
          <div className="flex gap-2">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm" />
            <button type="submit" disabled={submitting} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm disabled:opacity-50">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">Cancel</button>
          </div>
        </form>
      )}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Name</th>
                <th className="text-left p-3 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {branches.length === 0 ? (
                <tr><td colSpan={2} className="p-4 text-slate-500">No branches yet.</td></tr>
              ) : (
                branches.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{b.name}</td>
                    <td className="p-3"><Link href={`/organization/branches/${b.id}/edit`} className="text-brand-600 hover:underline text-sm">Edit</Link></td>
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
