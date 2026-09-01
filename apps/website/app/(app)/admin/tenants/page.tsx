'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { SIGNUP_BUSINESS_TYPES } from '@/lib/business-types';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan?: string;
  features?: string[];
  subscription_ends_at?: string | null;
  license_key?: string | null;
  is_active?: boolean;
  settings?: Record<string, unknown>;
}

const PLANS = ['basic', 'advanced', 'enterprise', 'ai_pro'];
const FEATURES = ['crm', 'sales', 'purchase', 'inventory', 'accounting', 'reports', 'bulk_upload', 'audit', 'ai', 'whatsapp'];

export default function AdminTenantsPage() {
  const [list, setList] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name?: string;
    plan?: string;
    features?: string;
    subscription_ends_at?: string;
    license_key?: string;
    is_active?: boolean;
    business_type?: string;
  }>({});
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<{ id: string; email: string; name?: string | null; is_active?: boolean; email_verified?: boolean }[]>([]);
  const [userEdits, setUserEdits] = useState<Record<string, string>>({});
  const [userBusy, setUserBusy] = useState<string | null>(null);

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
    setError(null);
    setNotice(null);
    setEditForm({
      name: t.name,
      plan: t.plan ?? 'basic',
      features: Array.isArray(t.features) ? t.features.join(', ') : '',
      subscription_ends_at: t.subscription_ends_at ? String(t.subscription_ends_at).slice(0, 10) : '',
      license_key: t.license_key ?? '',
      is_active: t.is_active !== false,
      business_type: String(t.settings?.business_type ?? ''),
    });
    setUsers([]);
    setUserEdits({});
    apiGet<{ id: string; email: string; name?: string | null; is_active?: boolean; email_verified?: boolean }[]>(`tenants/${t.id}/users`).then((r) => {
      if (r.error) setError(r.error);
      else if (Array.isArray(r.data)) {
        setUsers(r.data);
        const emails: Record<string, string> = {};
        r.data.forEach((u) => { emails[u.id] = u.email; });
        setUserEdits(emails);
      }
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    const features = editForm.features ? editForm.features.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const { error: err } = await apiPatch(`tenants/${editingId}`, {
      name: editForm.name || undefined,
      plan: editForm.plan || undefined,
      features,
      subscription_ends_at: editForm.subscription_ends_at || null,
      license_key: editForm.license_key || null,
      is_active: editForm.is_active,
      settings: { business_type: editForm.business_type || 'trading' },
    });
    if (err) setError(err);
    else {
      setEditingId(null);
      load();
    }
  };

  const filtered = list.filter((t) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return t.name.toLowerCase().includes(s) || t.slug.toLowerCase().includes(s) || (t.plan ?? '').toLowerCase().includes(s);
  });

  if (loading) return <p className="text-slate-600">Loading tenants…</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-1">Platform tenants</h1>
      <p className="text-sm text-slate-600 mb-4">
        You are signed in as the universal (platform) admin. List every workspace, pause a tenant, change plan, features, licence, subscription end date, and business type. Open Configure to change login emails and send a forgot-password mail.
      </p>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mb-3 text-sm text-emerald-700">{notice}</p>}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or slug"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-64"
        />
        <span className="text-xs text-slate-500">{filtered.length} of {list.length} workspaces</span>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[960px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-3 font-medium text-slate-700">Workspace</th>
              <th className="text-left p-3 font-medium text-slate-700">Slug</th>
              <th className="text-left p-3 font-medium text-slate-700">Plan</th>
              <th className="text-left p-3 font-medium text-slate-700">Type</th>
              <th className="text-left p-3 font-medium text-slate-700">Active</th>
              <th className="text-left p-3 font-medium text-slate-700">Expires</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 align-top">
                {editingId === t.id ? (
                  <>
                    <td className="p-3" colSpan={7}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="text-xs text-slate-600">Name
                          <input
                            type="text"
                            value={editForm.name ?? ''}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            className="mt-1 block w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs text-slate-600">Plan
                          <select
                            value={editForm.plan ?? 'basic'}
                            onChange={(e) => setEditForm((f) => ({ ...f, plan: e.target.value }))}
                            className="mt-1 block w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                          >
                            {PLANS.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs text-slate-600">Business type
                          <select
                            value={editForm.business_type ?? ''}
                            onChange={(e) => setEditForm((f) => ({ ...f, business_type: e.target.value }))}
                            className="mt-1 block w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                          >
                            <option value="">—</option>
                            {SIGNUP_BUSINESS_TYPES.map((b) => (
                              <option key={b.id} value={b.id}>{b.title}</option>
                            ))}
                            <option value="ice_crest">Ice Crest</option>
                            <option value="restaurant_wholesale">Restaurant wholesale</option>
                          </select>
                        </label>
                        <label className="text-xs text-slate-600">Subscription ends
                          <input
                            type="date"
                            value={editForm.subscription_ends_at ?? ''}
                            onChange={(e) => setEditForm((f) => ({ ...f, subscription_ends_at: e.target.value }))}
                            className="mt-1 block w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs text-slate-600 sm:col-span-2">Features (comma-separated)
                          <input
                            type="text"
                            value={editForm.features ?? ''}
                            onChange={(e) => setEditForm((f) => ({ ...f, features: e.target.value }))}
                            className="mt-1 block w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                            placeholder={FEATURES.join(', ')}
                          />
                        </label>
                        <label className="text-xs text-slate-600 sm:col-span-2">Licence key
                          <input
                            type="text"
                            value={editForm.license_key ?? ''}
                            onChange={(e) => setEditForm((f) => ({ ...f, license_key: e.target.value }))}
                            className="mt-1 block w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-sm text-slate-700 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editForm.is_active !== false}
                            onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))}
                          />
                          Workspace is active (uncheck to pause login)
                        </label>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button type="button" onClick={handleSave} className="rounded-lg bg-brand-600 text-white px-3 py-1.5 text-sm font-medium">Save workspace</button>
                        <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
                      </div>
                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <h3 className="text-sm font-semibold text-slate-800">Login users</h3>
                        <p className="text-xs text-slate-500 mb-3">Change the mailbox used for sign-in and forgot-password. Send reset posts a 6-digit code from support@smebuze.com.</p>
                        {users.length === 0 ? (
                          <p className="text-sm text-slate-500">No users on this workspace yet. Run the tenant seed or invite staff.</p>
                        ) : (
                          <ul className="space-y-2">
                            {users.map((u) => (
                              <li key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <input
                                  type="email"
                                  value={userEdits[u.id] ?? u.email}
                                  onChange={(e) => setUserEdits((prev) => ({ ...prev, [u.id]: e.target.value }))}
                                  className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm"
                                />
                                <span className="text-xs text-slate-500 shrink-0">{u.is_active === false ? 'Paused' : 'Active'}{u.email_verified === false ? ' · email not confirmed' : ''}</span>
                                <button
                                  type="button"
                                  disabled={userBusy === u.id}
                                  onClick={async () => {
                                    setUserBusy(u.id);
                                    const { error: err } = await apiPatch(`tenants/${t.id}/users/${u.id}`, { email: userEdits[u.id] ?? u.email });
                                    setUserBusy(null);
                                    if (err) setError(err);
                                    else handleEdit(t);
                                  }}
                                  className="text-sm text-brand-600 hover:underline disabled:opacity-50"
                                >
                                  Save email
                                </button>
                                <button
                                  type="button"
                                  disabled={userBusy === u.id}
                                  onClick={async () => {
                                    setUserBusy(u.id);
                                    const { error: err } = await apiPost(`tenants/${t.id}/users/${u.id}/send-reset`, {});
                                    setUserBusy(null);
                                    if (err) setError(err);
                                    else {
                                      setError(null);
                                      setNotice(`Reset mail sent to ${userEdits[u.id] ?? u.email}. Ask them to check inbox and spam.`);
                                    }
                                  }}
                                  className="text-sm text-slate-700 hover:underline disabled:opacity-50"
                                >
                                  Send reset mail
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-3 font-medium">{t.name}</td>
                    <td className="p-3 text-slate-500 font-mono text-xs">{t.slug}</td>
                    <td className="p-3">{t.plan ?? '—'}</td>
                    <td className="p-3 text-slate-600">{String(t.settings?.business_type ?? '—')}</td>
                    <td className="p-3">{t.is_active === false ? <span className="text-red-600">Paused</span> : <span className="text-emerald-700">Active</span>}</td>
                    <td className="p-3">{t.subscription_ends_at ? String(t.subscription_ends_at).slice(0, 10) : '—'}</td>
                    <td className="p-3">
                      <button type="button" onClick={() => handleEdit(t)} className="text-brand-600 hover:underline">Configure</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">No tenants match this search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
