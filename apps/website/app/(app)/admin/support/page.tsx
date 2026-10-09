'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPatch } from '@/lib/api';

type Ticket = {
  id: string;
  number: string;
  subject: string;
  description?: string | null;
  status: string;
  priority: string;
  category: string;
  admin_notes?: string | null;
  tenant?: { name: string; slug: string } | null;
  created_by_user?: { email: string; name?: string | null } | null;
  created_at: string;
};

export default function AdminSupportPage() {
  const [list, setList] = useState<Ticket[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    const r = await apiGet<Ticket[]>(`admin/support-tickets${q}`);
    if (r.error) setError(r.error);
    else if (Array.isArray(r.data)) setList(r.data);
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setTicketStatus(id: string, next: string) {
    const r = await apiPatch(`admin/support-tickets/${id}`, {
      status: next,
      admin_notes: notes[id] || undefined,
    });
    if (r.error) setError(r.error);
    else void load();
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Universal admin</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Support tickets</h1>
        <p className="mt-1 text-sm text-slate-600">Tickets raised by tenant admins to SMEBUZE (not restaurant kitchen tickets).</p>
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
        <option value="">All</option>
        <option value="open">Open</option>
        <option value="in_progress">In progress</option>
        <option value="resolved">Resolved</option>
        <option value="closed">Closed</option>
      </select>

      <div className="space-y-3">
        {list.length === 0 && <p className="text-sm text-slate-500">No tickets.</p>}
        {list.map((t) => (
          <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <p className="font-semibold text-slate-900">
                {t.number} · {t.subject}
              </p>
              <p className="capitalize text-slate-500">
                {t.status} · {t.priority}
              </p>
            </div>
            <p className="mt-1 text-slate-600">
              {t.tenant?.name || '—'} ({t.tenant?.slug || '—'}) · {t.created_by_user?.email || '—'}
            </p>
            {t.description && <p className="mt-2 text-slate-700 whitespace-pre-wrap">{t.description}</p>}
            <textarea
              className="mt-2 w-full rounded border border-slate-200 px-2 py-1 text-sm"
              rows={2}
              placeholder="Admin notes"
              value={notes[t.id] ?? t.admin_notes ?? ''}
              onChange={(e) => setNotes({ ...notes, [t.id]: e.target.value })}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="text-brand-700 hover:underline" onClick={() => setTicketStatus(t.id, 'in_progress')}>
                In progress
              </button>
              <button type="button" className="text-brand-700 hover:underline" onClick={() => setTicketStatus(t.id, 'resolved')}>
                Resolve
              </button>
              <button type="button" className="text-slate-600 hover:underline" onClick={() => setTicketStatus(t.id, 'closed')}>
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
