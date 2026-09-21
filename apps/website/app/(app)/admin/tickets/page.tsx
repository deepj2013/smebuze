'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet } from '@/lib/api';
import { KITCHEN_LABEL, minutesAgo, statusClass, type FloorTicket, type KitchenStatus } from '@/lib/floor';

type AdminPayload = {
  tickets: FloorTicket[];
  counts: Record<string, number>;
};

export default function AdminTicketsPage() {
  const [data, setData] = useState<AdminPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [tenant, setTenant] = useState('');

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    if (status) q.set('status', status);
    if (tenant.trim()) q.set('tenant', tenant.trim());
    const { data: res, error: err } = await apiGet<AdminPayload>(`admin/tickets${q.toString() ? `?${q}` : ''}`);
    if (err) setError(err);
    else if (res) {
      setData(res);
      setError(null);
    }
  }, [status, tenant]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [load]);

  const tenants = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of data?.tickets ?? []) {
      if (t.tenant_slug) map.set(t.tenant_slug, t.tenant_name || t.tenant_slug);
    }
    return [...map.entries()];
  }, [data]);

  const counts = data?.counts ?? {};

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Universal admin</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">All restaurant tickets</h1>
      <p className="mt-1 text-sm text-slate-600">
        Every dine-in kitchen ticket across tenants. Use this when pitching or supporting a restaurant.
      </p>

      {error && <div className="mt-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          ['Open', counts.open ?? 0],
          ['New', counts.sent ?? 0],
          ['Cooking', counts.preparing ?? 0],
          ['Ready', counts.ready ?? 0],
          ['Billed', counts.billed ?? 0],
        ].map(([label, n]) => (
          <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase font-semibold text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-900">{n}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {(['sent', 'preparing', 'ready', 'served', 'billed', 'cancelled'] as KitchenStatus[]).map((s) => (
            <option key={s} value={s}>{KITCHEN_LABEL[s]}</option>
          ))}
        </select>
        <input
          value={tenant}
          onChange={(e) => setTenant(e.target.value)}
          placeholder="Tenant slug (e.g. pos-restaurant)"
          list="ticket-tenants"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-w-[220px]"
        />
        <datalist id="ticket-tenants">
          {tenants.map(([slug, name]) => (
            <option key={slug} value={slug}>{name}</option>
          ))}
        </datalist>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-3 font-medium">Tenant</th>
              <th className="text-left p-3 font-medium">Ticket</th>
              <th className="text-left p-3 font-medium">Table</th>
              <th className="text-left p-3 font-medium">Kitchen</th>
              <th className="text-left p-3 font-medium">Waiter</th>
              <th className="text-left p-3 font-medium">Items</th>
              <th className="text-left p-3 font-medium">Age</th>
              <th className="text-right p-3 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {!data?.tickets.length ? (
              <tr><td colSpan={8} className="p-6 text-center text-slate-500">No dine-in tickets yet.</td></tr>
            ) : data.tickets.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 last:border-0 align-top">
                <td className="p-3">
                  <p className="font-medium">{t.tenant_name || t.tenant_slug || '—'}</p>
                  <p className="text-xs text-slate-500">{t.tenant_slug}</p>
                </td>
                <td className="p-3 font-medium">{t.number}</td>
                <td className="p-3">{t.table_no}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(t.kitchen_status)}`}>{KITCHEN_LABEL[t.kitchen_status]}</span></td>
                <td className="p-3">{t.waiter_name || '—'}</td>
                <td className="p-3 text-slate-700">{t.lines.map((l) => `${l.qty}× ${l.name}`).join(', ')}</td>
                <td className="p-3 text-slate-500">{minutesAgo(t.created_at)}</td>
                <td className="p-3 text-right font-semibold">₹{Number(t.total).toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
