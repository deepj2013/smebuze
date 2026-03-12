'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';

interface FollowUp {
  id: string;
  due_at: string;
  note: string | null;
  status: string;
  lead?: { name: string } | null;
  customer?: { name: string } | null;
}

function formatDue(d: string): string {
  const date = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);
  if (due.getTime() === today.getTime()) return 'Today';
  if (due < today) return 'Overdue';
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  if (due <= weekEnd) return 'This week';
  return 'Later';
}

function bucketKey(d: string): 'today' | 'overdue' | 'this_week' | 'later' {
  const date = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);
  if (due.getTime() === today.getTime()) return 'today';
  if (due < today) return 'overdue';
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  if (due <= weekEnd) return 'this_week';
  return 'later';
}

export default function FollowUpBoardPage() {
  const [list, setList] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    const { data, error: err } = await apiGet<FollowUp[] | { data: FollowUp[] }>('crm/follow-ups');
    if (err) setError(err);
    else if (Array.isArray(data)) setList(data);
    else if (data && typeof data === 'object' && Array.isArray((data as { data?: FollowUp[] }).data)) setList((data as { data: FollowUp[] }).data);
    else setList([]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pending = list.filter((f) => f.status === 'pending');
  const today = pending.filter((f) => bucketKey(f.due_at) === 'today');
  const overdue = pending.filter((f) => bucketKey(f.due_at) === 'overdue');
  const thisWeek = pending.filter((f) => bucketKey(f.due_at) === 'this_week');

  const contactName = (f: FollowUp) => f.lead?.name ?? f.customer?.name ?? '—';
  const dueLabel = (f: FollowUp) => typeof f.due_at === 'string' ? f.due_at.slice(0, 10) : '—';

  const markDone = async (id: string) => {
    setUpdatingId(id);
    setError(null);
    const { error: err } = await apiPatch(`crm/follow-ups/${id}`, { status: 'done' });
    setUpdatingId(null);
    if (err) setError(err);
    else load();
  };

  const reschedule = async (id: string, newDate: string) => {
    setUpdatingId(id);
    setError(null);
    const { error: err } = await apiPatch(`crm/follow-ups/${id}`, { due_at: newDate });
    setUpdatingId(null);
    if (err) setError(err);
    else load();
  };

  const Column = ({ title, items }: { title: string; items: FollowUp[] }) => (
    <div className="flex-shrink-0 w-80 rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
      <div className="p-3 border-b border-slate-200 bg-white">
        <h2 className="font-medium text-slate-800">{title}</h2>
        <span className="text-xs text-slate-500">{items.length} item{items.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="p-2 space-y-2 min-h-[100px]">
        {items.map((f) => (
          <div key={f.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="font-medium text-slate-900">{contactName(f)}</div>
            <div className="text-sm text-slate-600 mt-0.5">{f.note || '—'}</div>
            <div className="text-xs text-slate-500 mt-0.5">Due: {dueLabel(f)}</div>
            <div className="mt-2 flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => markDone(f.id)}
                disabled={!!updatingId}
                className="text-xs rounded bg-green-600 text-white px-2 py-1 hover:bg-green-700 disabled:opacity-50"
              >
                Done
              </button>
              <RescheduleButton id={f.id} due_at={f.due_at} onReschedule={reschedule} disabled={!!updatingId} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Follow-up board</h1>
        <Link href="/crm/leads" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Leads</Link>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          <Column title="Overdue" items={overdue} />
          <Column title="Today" items={today} />
          <Column title="This week" items={thisWeek} />
        </div>
      )}
    </div>
  );
}

function RescheduleButton({
  id,
  due_at,
  onReschedule,
  disabled,
}: {
  id: string;
  due_at: string;
  onReschedule: (id: string, newDate: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => (due_at && typeof due_at === 'string' ? due_at.slice(0, 10) : new Date().toISOString().slice(0, 10)));

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={disabled} className="text-xs rounded border border-slate-300 px-2 py-1 hover:bg-slate-50 disabled:opacity-50">
        Reschedule
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-10" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-lg p-4 shadow-xl max-w-sm w-full mx-2" onClick={(e) => e.stopPropagation()}>
            <label className="block text-sm font-medium text-slate-700 mb-1">New due date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm mb-3" />
            <div className="flex gap-2">
              <button type="button" onClick={() => onReschedule(id, date)} className="rounded bg-brand-600 text-white px-3 py-1.5 text-sm hover:bg-brand-700">Save</button>
              <button type="button" onClick={() => setOpen(false)} className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
