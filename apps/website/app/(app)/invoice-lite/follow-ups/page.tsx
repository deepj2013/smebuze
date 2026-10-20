'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';
import { LITE } from '@/lib/invoice-lite-copy';

interface FollowUp {
  id: string;
  due_at: string;
  note: string | null;
  status: string;
  customer?: { name: string } | null;
  lead?: { name: string } | null;
  quotation?: { id: string; number: string } | null;
}

function dueLabel(d: string): string {
  const due = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  if (due.getTime() === today.getTime()) return 'Today · आज';
  if (due < today) return 'Overdue · late';
  return due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function InvoiceLiteFollowUpsPage() {
  const [list, setList] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    const { data, error: err } = await apiGet<FollowUp[] | { data: FollowUp[] }>('crm/follow-ups');
    if (err) setError(err);
    else if (Array.isArray(data)) setList(data);
    else if (data && typeof data === 'object' && Array.isArray((data as { data?: FollowUp[] }).data)) {
      setList((data as { data: FollowUp[] }).data);
    } else setList([]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pending = list.filter((f) => f.status === 'pending').sort((a, b) => a.due_at.localeCompare(b.due_at));
  const name = (f: FollowUp) => f.customer?.name ?? f.lead?.name ?? '—';

  const markDone = async (id: string) => {
    setUpdatingId(id);
    const { error: err } = await apiPatch(`crm/follow-ups/${id}`, { status: 'done' });
    setUpdatingId(null);
    if (err) setError(err);
    else load();
  };

  return (
    <div className="mx-auto max-w-lg pb-8">
      <Link href="/invoice-lite" className="text-sm text-slate-600 hover:text-slate-900">← {LITE.home.en}</Link>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">{LITE.followUps.en}</h1>
      <p className="text-sm text-slate-500">{LITE.followUps.hi}</p>

      {error && <div className="mt-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="mt-6 text-slate-600">Loading…</p>}

      {!loading && pending.length === 0 && (
        <p className="mt-8 text-center text-slate-600 rounded-2xl border border-dashed p-8">Nothing to call today. Open an estimate and tap a reminder button.</p>
      )}

      <ul className="mt-4 space-y-3">
        {pending.map((f) => (
          <li key={f.id} className="rounded-2xl border-2 border-slate-200 bg-white p-4">
            <div className="flex justify-between gap-2">
              <span className="text-lg font-semibold text-slate-900">{name(f)}</span>
              <span className="text-sm font-medium text-amber-800 shrink-0">{dueLabel(f.due_at)}</span>
            </div>
            {f.quotation ? (
              <Link href={`/invoice-lite/quotes/${f.quotation.id}`} className="mt-1 inline-block text-sm text-brand-600 underline">
                {f.quotation.number}
              </Link>
            ) : null}
            <p className="mt-2 text-slate-700">{f.note || '—'}</p>
            <button
              type="button"
              disabled={updatingId === f.id}
              onClick={() => markDone(f.id)}
              className="mt-4 w-full min-h-[48px] rounded-xl bg-green-600 text-lg font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {LITE.done.en} · {LITE.done.hi}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
