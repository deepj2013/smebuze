'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPatch } from '@/lib/api';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan?: string;
  features?: string[];
  subscription_ends_at?: string | null;
  license_key?: string | null;
}

export default function AdminTenantsPage() {
  const [list, setList] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ plan?: string; features?: string; subscription_ends_at?: string }>({});

  const load = async () => {
    const { data, error: err } = await apiGet<Tenant[] | { data: Tenant[] }>('tenants');
    if (err) setError(err);
    else if (Array.isArray(data)) setList(data);
    else if (data && typeof data === 'object' && Array.isArray((data as { data?: Tenant[] }).data)) setList((data as { data: Tenant[] }).data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleEdit = (t: Tenant) => {
    setEditingId(t.id);
    setEditForm({
      plan: t.plan ?? '',
      features: Array.isArray(t.features) ? t.features.join(', ') : '',
      subscription_ends_at: t.subscription_ends_at ? String(t.subscription_ends_at).slice(0, 10) : '',
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    const features = editForm.features ? editForm.features.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    const { error: err } = await apiPatch(`tenants/${editingId}`, {
      plan: editForm.plan || undefined,
      features,
      subscription_ends_at: editForm.subscription_ends_at || null,
    });
    if (err) setError(err);
    else {
      setEditingId(null);
      load();
    }
  };

  if (loading) return <p className="text-slate-600">Loading tenants…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-4">Tenants (Super Admin)</h1>
      <p className="text-sm text-slate-600 mb-4">Set plan, features, and subscription expiry per tenant.</p>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-3 font-medium text-slate-700">Name</th>
              <th className="text-left p-3 font-medium text-slate-700">Slug</th>
              <th className="text-left p-3 font-medium text-slate-700">Plan</th>
              <th className="text-left p-3 font-medium text-slate-700">Features</th>
              <th className="text-left p-3 font-medium text-slate-700">Expires</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id} className="border-b border-slate-100">
                {editingId === t.id ? (
                  <>
                    <td className="p-3 font-medium">{t.name}</td>
                    <td className="p-3 text-slate-500">{t.slug}</td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={editForm.plan ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, plan: e.target.value }))}
                        className="border border-slate-300 rounded px-2 py-1 w-28"
                        placeholder="Plan"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={editForm.features ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, features: e.target.value }))}
                        className="border border-slate-300 rounded px-2 py-1 w-48"
                        placeholder="crm, sales, ..."
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="date"
                        value={editForm.subscription_ends_at ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, subscription_ends_at: e.target.value }))}
                        className="border border-slate-300 rounded px-2 py-1"
                      />
                    </td>
                    <td className="p-3">
                      <button type="button" onClick={handleSave} className="text-brand-600 hover:underline mr-2">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-slate-500 hover:underline">Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-3 font-medium">{t.name}</td>
                    <td className="p-3 text-slate-500">{t.slug}</td>
                    <td className="p-3">{t.plan ?? '—'}</td>
                    <td className="p-3">{Array.isArray(t.features) ? t.features.join(', ') : '—'}</td>
                    <td className="p-3">{t.subscription_ends_at ? String(t.subscription_ends_at).slice(0, 10) : '—'}</td>
                    <td className="p-3">
                      <button type="button" onClick={() => handleEdit(t)} className="text-brand-600 hover:underline">Edit</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
