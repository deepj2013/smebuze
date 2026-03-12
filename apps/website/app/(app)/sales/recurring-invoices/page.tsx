'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';

interface RecurringInvoice {
  id: string;
  number_prefix: string;
  frequency: string;
  next_run_at: string;
  last_run_at: string | null;
  is_active: boolean;
  customer?: { name: string } | null;
  company?: { name: string } | null;
}

export default function RecurringInvoicesPage() {
  const [list, setList] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await apiGet<RecurringInvoice[] | { data: RecurringInvoice[] }>('sales/recurring-invoices');
      if (err) setError(err);
      else if (Array.isArray(data)) setList(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: RecurringInvoice[] }).data)) setList((data as { data: RecurringInvoice[] }).data);
      setLoading(false);
    })();
  }, []);

  const runDue = async () => {
    setRunning(true);
    setError(null);
    const { data, error: err } = await apiPost<{ created?: number; errors?: string[] }>('sales/recurring-invoices/run', {});
    setRunning(false);
    if (err) setError(err);
    else if (data?.created !== undefined) {
      if ((data.errors ?? []).length) setError((data.errors ?? []).join('; '));
      if (data.created > 0) window.location.reload();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Recurring invoices</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={runDue}
            disabled={running}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {running ? 'Running…' : 'Run due now'}
          </button>
          <Link href="/sales/recurring-invoices/new" className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">Create recurring</Link>
        </div>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Customer</th>
                <th className="text-left p-3 font-medium text-slate-700">Frequency</th>
                <th className="text-left p-3 font-medium text-slate-700">Next run</th>
                <th className="text-left p-3 font-medium text-slate-700">Last run</th>
                <th className="text-left p-3 font-medium text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">No recurring invoices. Create one from a template invoice.</td></tr>
              ) : (
                list.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{r.customer?.name ?? '—'}</td>
                    <td className="p-3">{r.frequency}</td>
                    <td className="p-3">{r.next_run_at?.slice?.(0, 10) ?? '—'}</td>
                    <td className="p-3">{r.last_run_at?.slice?.(0, 10) ?? '—'}</td>
                    <td className="p-3">{r.is_active ? 'Active' : 'Paused'}</td>
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
