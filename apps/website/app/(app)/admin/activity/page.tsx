'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '@/lib/api';

type Row = {
  id: string;
  created_at: string;
  action: string;
  resource: string;
  resource_id: string | null;
  details: Record<string, unknown> | string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  user_name: string | null;
  user_email: string | null;
};

type Tenant = { id: string; name: string };

function detailText(details: Row['details']): string {
  if (!details) return '';
  if (typeof details === 'string') return details;
  try {
    return JSON.stringify(details);
  } catch {
    return '';
  }
}

export default function AdminActivityPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (id = tenantId) => {
    setLoading(true);
    setError(null);
    const qs = id ? `?tenant_id=${encodeURIComponent(id)}&limit=300` : '?limit=300';
    const res = await apiGet<Row[]>(`audit-logs/platform${qs}`);
    setLoading(false);
    if (res.error) setError(res.error);
    else setRows(Array.isArray(res.data) ? res.data : []);
  };

  useEffect(() => {
    void load('');
    void apiGet<Tenant[] | { data: Tenant[] }>('tenants').then((r) => {
      const list = Array.isArray(r.data) ? r.data : r.data?.data;
      if (Array.isArray(list)) setTenants(list.map((t) => ({ id: t.id, name: t.name })));
    });
    // once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => {
      const blob = [row.action, row.resource, row.tenant_name, row.user_name, row.user_email, detailText(row.details)].join(' ').toLowerCase();
      return blob.includes(needle);
    });
  }, [q, rows]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-1">Activity log</h1>
      <p className="text-sm text-slate-600 mb-4">
        Who did what, in every workspace. Use this when a receipt, invoice, or other entry looks wrong and you need the person and the time.
      </p>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="mb-4 flex flex-wrap gap-3 items-end">
        <label className="text-sm">Workspace
          <select
            value={tenantId}
            onChange={(e) => {
              setTenantId(e.target.value);
              void load(e.target.value);
            }}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[40px]"
          >
            <option value="">All workspaces</option>
            {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="text-sm flex-1 min-w-[200px]">Search
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="User, payment, invoice, delete"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[40px]"
          />
        </label>
      </div>
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                {['When', 'Workspace', 'User', 'Action', 'What happened'].map((h) => (
                  <th key={h} className="p-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 align-top">
                  <td className="p-2 whitespace-nowrap">{row.created_at ? new Date(row.created_at).toLocaleString('en-IN') : '—'}</td>
                  <td className="p-2">{row.tenant_name || '—'}</td>
                  <td className="p-2">{row.user_name || row.user_email || '—'}</td>
                  <td className="p-2 whitespace-nowrap">{row.action}</td>
                  <td className="p-2 text-slate-600 break-all">{row.resource}{row.resource_id ? ` · ${row.resource_id}` : ''} {detailText(row.details)}</td>
                </tr>
              ))}
              {!shown.length && (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">No activity for this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
