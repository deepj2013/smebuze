'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import { minutesAgo, type FloorSnapshot, type FloorTicket, type KitchenStatus } from '@/lib/floor';
import { useToast } from '../../components/ToastContext';
import FloorSwitcher from '../../components/FloorSwitcher';

const COLS: { key: KitchenStatus; title: string; next?: KitchenStatus; action?: string }[] = [
  { key: 'sent', title: 'New', next: 'preparing', action: 'Start cooking' },
  { key: 'preparing', title: 'Cooking', next: 'ready', action: 'Mark ready' },
  { key: 'ready', title: 'Ready to serve', next: 'served', action: 'Served' },
];

export default function KitchenPage() {
  const { success, error: showError } = useToast();
  const [snap, setSnap] = useState<FloorSnapshot | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await apiGet<FloorSnapshot>('sales/floor/kitchen');
    if (data) setSnap(data);
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
  }, [load]);

  const byCol = useMemo(() => {
    const map: Record<string, FloorTicket[]> = { sent: [], preparing: [], ready: [] };
    for (const t of snap?.tickets ?? []) {
      if (map[t.kitchen_status]) map[t.kitchen_status].push(t);
    }
    return map;
  }, [snap]);

  const advance = async (ticket: FloorTicket, next: KitchenStatus) => {
    setBusy(ticket.id);
    try {
      const { error } = await apiPatch(`sales/floor/tickets/${ticket.id}/kitchen`, { kitchen_status: next });
      if (error) { showError(error); return; }
      success(`${ticket.table_no} → ${next}`);
      await load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] -mx-2 sm:mx-0">
      <FloorSwitcher role="Kitchen" />
      <div className="rounded-2xl bg-slate-900 text-white p-4 sm:p-5 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Kitchen display</p>
        <h1 className="text-2xl font-bold">Tickets</h1>
        <p className="text-sm text-slate-300">Only kitchen tickets — no food menu or billing. Tap when a round is done.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {COLS.map((col) => (
          <section key={col.key} className="rounded-2xl bg-slate-900 p-3 min-h-[420px]">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-white font-bold">{col.title}</h2>
              <span className="text-amber-300 text-sm font-semibold">{byCol[col.key]?.length ?? 0}</span>
            </div>
            <div className="space-y-3">
              {(byCol[col.key] ?? []).map((t) => (
                <article key={t.id} className="rounded-xl bg-white p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-2xl font-black text-slate-900">{t.table_no}</p>
                    <p className="text-xs font-semibold text-rose-600">{minutesAgo(t.created_at)}</p>
                  </div>
                  <p className="text-xs text-slate-500">{t.number} · {t.waiter_name || 'Waiter'} · {t.covers} covers</p>
                  <ul className="mt-2 space-y-1">
                    {t.lines.map((l) => (
                      <li key={l.id} className="flex justify-between gap-2 text-base font-semibold text-slate-900">
                        <span>{l.name}</span>
                        <span className="tabular-nums">×{l.qty}</span>
                      </li>
                    ))}
                  </ul>
                  {t.note ? <p className="mt-2 text-sm text-amber-800">Note: {t.note}</p> : null}
                  {col.next && col.action ? (
                    <button
                      type="button"
                      disabled={busy === t.id}
                      onClick={() => void advance(t, col.next!)}
                      className="mt-3 w-full rounded-xl bg-slate-900 text-white py-3 font-bold min-h-[48px] disabled:opacity-50"
                    >
                      {col.action}
                    </button>
                  ) : null}
                </article>
              ))}
              {(byCol[col.key] ?? []).length === 0 && (
                <p className="text-slate-400 text-sm px-1 py-8 text-center">No tickets</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
