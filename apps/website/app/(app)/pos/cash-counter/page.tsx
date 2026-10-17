'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import CashNotePad from '../../components/CashNotePad';
import { notesTotal, type NoteCounts } from '@/lib/cash-notes';

type Period = {
  sales: number;
  cost: number;
  profit: number;
  bills: number;
  cash: number;
  upi: number;
  card: number;
  credit: number;
  other: number;
};

type CashCounterReport = {
  date: string;
  week_from?: string;
  month_from?: string;
  day: Period;
  week: Period;
  month: Period;
};

function money(n: number) {
  return `₹${Number(n || 0).toFixed(0)}`;
}

function money2(n: number) {
  return `₹${Number(n || 0).toFixed(2)}`;
}

function drawerKey(date: string) {
  return `smebuzz_cash_drawer_${date}`;
}

type DrawerState = {
  opening: NoteCounts;
  closing: NoteCounts;
};

function loadDrawer(date: string): DrawerState {
  try {
    const raw = localStorage.getItem(drawerKey(date));
    if (!raw) return { opening: {}, closing: {} };
    const parsed = JSON.parse(raw) as DrawerState;
    return {
      opening: parsed.opening || {},
      closing: parsed.closing || {},
    };
  } catch {
    return { opening: {}, closing: {} };
  }
}

function saveDrawer(date: string, state: DrawerState) {
  localStorage.setItem(drawerKey(date), JSON.stringify(state));
}

function PeriodCard({ title, range, p }: { title: string; range?: string; p: Period }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {range && <span className="text-[10px] text-slate-500">{range}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{money2(p.sales)}</p>
      <p className="text-xs text-slate-500">{p.bills} bill{p.bills === 1 ? '' : 's'}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-emerald-50 px-2 py-1.5">
          <p className="text-emerald-800/80">Cash</p>
          <p className="font-semibold tabular-nums text-emerald-950">{money(p.cash)}</p>
        </div>
        <div className="rounded-lg bg-sky-50 px-2 py-1.5">
          <p className="text-sky-800/80">UPI</p>
          <p className="font-semibold tabular-nums text-sky-950">{money(p.upi)}</p>
        </div>
        <div className="rounded-lg bg-violet-50 px-2 py-1.5">
          <p className="text-violet-800/80">Card</p>
          <p className="font-semibold tabular-nums text-violet-950">{money(p.card)}</p>
        </div>
        <div className="rounded-lg bg-amber-50 px-2 py-1.5">
          <p className="text-amber-800/80">Credit</p>
          <p className="font-semibold tabular-nums text-amber-950">{money(p.credit)}</p>
        </div>
      </div>
      <div className="mt-3 flex justify-between border-t border-slate-100 pt-2 text-sm">
        <span className="text-slate-600">Profit</span>
        <span className={`font-bold tabular-nums ${p.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
          {money2(p.profit)}
        </span>
      </div>
      <p className="mt-0.5 text-[10px] text-slate-500">Cost {money2(p.cost)} · sales − item cost</p>
    </div>
  );
}

export default function CashCounterPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [data, setData] = useState<CashCounterReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<NoteCounts>({});
  const [closing, setClosing] = useState<NoteCounts>({});

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGet<CashCounterReport>(`reports/cash-counter?date=${date}`).then((res) => {
      if (res.error) setError(res.error);
      else setData(res.data ?? null);
      setLoading(false);
    });
  }, [date]);

  useEffect(() => {
    const d = loadDrawer(date);
    setOpening(d.opening);
    setClosing(d.closing);
  }, [date]);

  const openingTotal = notesTotal(opening);
  const closingTotal = notesTotal(closing);
  const cashSales = data?.day.cash ?? 0;
  const expectedInDrawer = openingTotal + cashSales;
  const drawerDiff = closingTotal > 0 ? closingTotal - expectedInDrawer : null;

  const persist = (nextOpening: NoteCounts, nextClosing: NoteCounts) => {
    setOpening(nextOpening);
    setClosing(nextClosing);
    saveDrawer(date, { opening: nextOpening, closing: nextClosing });
  };

  const dayRange = useMemo(() => (data ? data.date : date), [data, date]);

  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/pos" className="mb-1 inline-block text-sm text-slate-600 hover:text-slate-900">
            ← Billing counter
          </Link>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Cash counter</h1>
          <p className="mt-1 text-sm text-slate-600">
            Morning / day close — cash, UPI, card and credit for the day, plus week and month profit.
          </p>
        </div>
        <label className="text-xs font-medium text-slate-600">
          Report date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[40px]"
          />
        </label>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}

      {!loading && data && (
        <section className="grid gap-3 sm:grid-cols-3">
          <PeriodCard title="Today" range={dayRange} p={data.day} />
          <PeriodCard title="This week" range={data.week_from ? `${data.week_from} → ${data.date}` : undefined} p={data.week} />
          <PeriodCard title="This month" range={data.month_from ? `${data.month_from} → ${data.date}` : undefined} p={data.month} />
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Morning float (opening)</h2>
          <p className="mb-2 text-xs text-slate-500">Count notes in the till when you open the shop. Saved on this device.</p>
          <CashNotePad
            counts={opening}
            onChange={(next) => persist(next, closing)}
            label="Opening notes"
          />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Evening count (closing)</h2>
          <p className="mb-2 text-xs text-slate-500">
            Expected cash in drawer ≈ opening {money(openingTotal)} + cash sales {money(cashSales)} ={' '}
            <strong>{money(expectedInDrawer)}</strong>
          </p>
          <CashNotePad
            counts={closing}
            onChange={(next) => persist(opening, next)}
            targetAmount={expectedInDrawer}
            label="Closing notes"
          />
          {drawerDiff != null && (
            <p
              className={`mt-2 text-sm font-semibold ${
                Math.abs(drawerDiff) < 1 ? 'text-emerald-700' : drawerDiff > 0 ? 'text-sky-700' : 'text-rose-700'
              }`}
            >
              {Math.abs(drawerDiff) < 1
                ? 'Drawer matches expected cash.'
                : drawerDiff > 0
                  ? `Drawer is ₹${drawerDiff.toFixed(0)} over.`
                  : `Drawer is ₹${Math.abs(drawerDiff).toFixed(0)} short.`}
            </p>
          )}
        </div>
      </section>

      <p className="text-xs text-slate-500">
        Credit is unpaid bill amount for invoices on that day. Profit uses item cost price from Products. UPI / card come from payments recorded at the counter.
      </p>
    </div>
  );
}
