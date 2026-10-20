'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { LITE, liteStatusLabel } from '@/lib/invoice-lite-copy';

interface Quotation {
  id: string;
  number: string;
  status: string;
  total: string | number;
  internal_note?: string | null;
  customer?: { name: string; id?: string } | null;
  lead?: { name: string } | null;
  items?: Array<{ description?: string; qty: string; rate: string; amount: string }>;
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export default function InvoiceLiteQuoteDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [q, setQ] = useState<Quotation | null>(null);
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data, error: err } = await apiGet<Quotation>(`sales/quotations/${id}`);
    if (err) setError(err);
    else if (data && !Array.isArray(data)) {
      setQ(data);
      setRemark(data.internal_note ?? '');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const party = q ? (q.customer?.name ?? q.lead?.name ?? '—') : '—';

  const patchStatus = async (status: string, sent?: boolean) => {
    setBusy(true);
    setError(null);
    const body: { status: string; sent_at?: string } = { status };
    if (sent) body.sent_at = new Date().toISOString();
    const { error: err } = await apiPatch(`sales/quotations/${id}`, body);
    setBusy(false);
    if (err) setError(err);
    else load();
  };

  const saveRemark = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await apiPatch(`sales/quotations/${id}`, { internal_note: remark.trim() || null });
    setBusy(false);
    if (err) setError(err);
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      load();
    }
  };

  const scheduleFollowUp = async (days: number, label: string) => {
    setBusy(true);
    setError(null);
    const note = remark.trim() || `${q?.number} — ${label}`;
    const { error: err } = await apiPost('crm/follow-ups', {
      quotation_id: id,
      customer_id: q?.customer?.id,
      due_at: addDays(days),
      note,
    });
    setBusy(false);
    if (err) setError(err);
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  if (loading) return <div className="p-4 text-lg">Loading…</div>;
  if (!q) return <div className="p-4 text-red-600">{error || 'Not found'}</div>;

  return (
    <div className="mx-auto max-w-lg pb-10">
      <Link href="/invoice-lite/quotes" className="text-sm text-slate-600 hover:text-slate-900">← {LITE.estimates.en}</Link>

      <div className="mt-4 rounded-2xl border-2 border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">{q.number}</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">{party}</h1>
        <p className="text-3xl font-bold text-brand-700 tabular-nums mt-2">₹{Number(q.total).toFixed(0)}</p>
        <p className="mt-2 text-sm font-medium text-slate-600">{liteStatusLabel(q.status)}</p>
        {q.items?.[0]?.description ? (
          <p className="mt-3 text-slate-700">{q.items[0].description}</p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2">
        <Link
          href={`/sales/quotations/${id}/print`}
          target="_blank"
          className="flex min-h-[52px] items-center justify-center rounded-xl border-2 border-slate-300 bg-white text-base font-semibold hover:bg-slate-50"
        >
          {LITE.print.en} · {LITE.print.hi}
        </Link>
        {q.status === 'draft' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => patchStatus('sent', true)}
            className="min-h-[52px] rounded-xl bg-brand-600 text-lg font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {LITE.markGiven.en}
          </button>
        )}
        {(q.status === 'sent' || q.status === 'viewed') && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => patchStatus('accepted')}
              className="min-h-[52px] rounded-xl bg-green-600 text-base font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {LITE.customerSaidYes.en}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => patchStatus('rejected')}
              className="min-h-[52px] rounded-xl bg-slate-600 text-base font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {LITE.customerSaidNo.en}
            </button>
          </div>
        )}
        {(q.status === 'accepted' || q.status === 'sent') && q.customer?.id && (
          <Link
            href={`/sales/invoices/new?customer_id=${encodeURIComponent(q.customer.id)}`}
            className="flex min-h-[52px] items-center justify-center rounded-xl bg-brand-600 text-lg font-semibold text-white hover:bg-brand-700"
          >
            {LITE.newBill.en}
          </Link>
        )}
      </div>

      <div className="mt-8">
        <label className="block text-base font-semibold text-slate-800">{LITE.remark.en}</label>
        <p className="text-xs text-slate-500 mb-2">{LITE.remark.hi}</p>
        <textarea
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          rows={4}
          className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-base"
        />
        <button
          type="button"
          disabled={busy}
          onClick={saveRemark}
          className="mt-2 w-full min-h-[48px] rounded-xl border-2 border-brand-600 text-brand-700 font-semibold hover:bg-brand-50 disabled:opacity-50"
        >
          {saved ? 'Saved ✓' : LITE.saveRemark.en}
        </button>
      </div>

      <div className="mt-6">
        <p className="text-base font-semibold text-slate-800">{LITE.followUps.en}</p>
        <p className="text-xs text-slate-500 mb-2">{LITE.followUps.hi}</p>
        <div className="grid gap-2">
          <button type="button" disabled={busy} onClick={() => scheduleFollowUp(1, LITE.remindTomorrow.en)} className="min-h-[48px] rounded-xl bg-amber-100 text-amber-950 font-medium hover:bg-amber-200 disabled:opacity-50">
            {LITE.remindTomorrow.en} · {LITE.remindTomorrow.hi}
          </button>
          <button type="button" disabled={busy} onClick={() => scheduleFollowUp(3, LITE.remind3Days.en)} className="min-h-[48px] rounded-xl bg-amber-100 text-amber-950 font-medium hover:bg-amber-200 disabled:opacity-50">
            {LITE.remind3Days.en} · {LITE.remind3Days.hi}
          </button>
          <button type="button" disabled={busy} onClick={() => scheduleFollowUp(7, LITE.remindWeek.en)} className="min-h-[48px] rounded-xl bg-amber-100 text-amber-950 font-medium hover:bg-amber-200 disabled:opacity-50">
            {LITE.remindWeek.en} · {LITE.remindWeek.hi}
          </button>
        </div>
        <Link href="/invoice-lite/follow-ups" className="mt-3 block text-center text-sm text-brand-600 underline">
          See all reminders
        </Link>
      </div>

      {error && <div className="mt-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
    </div>
  );
}
