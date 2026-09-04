'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { limitDecimalPlaces } from '@/lib/money';

type Row = { item_id: string; sku?: string; name: string; confirmed_orders: number; available_stock: number; safety_stock: number; produce_tomorrow: number };
type Plan = { plan_date: string; order_count: number; safety_stock: number; rows: Row[]; totals: { confirmed: number; to_produce: number } };

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function ProductionPlanPage() {
  const [date, setDate] = useState(tomorrow());
  const [safety, setSafety] = useState('20');
  const [plan, setPlan] = useState<Plan>();
  const [error, setError] = useState('');

  const load = () => apiGet<Plan>(`ice-crest/production-plan?date=${date}&safety_stock=${Number(safety || 0)}`).then(r => {
    if (r.data) setPlan(r.data);
    setError(r.error || '');
  });

  useEffect(() => { void load(); }, [date, safety]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-cyan-700">ICE CREST</p>
          <h1 className="text-2xl font-bold">Production planning</h1>
          <p className="text-sm text-slate-500">How much ice to produce for confirmed orders, after current available stock and safety buffer.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded border px-3 py-2 text-sm" aria-label="Plan date" />
          <label className="text-sm">Safety stock / SKU<input type="text" inputMode="decimal" value={safety} onChange={e => setSafety(limitDecimalPlaces(e.target.value))} className="ml-2 w-20 rounded border px-2 py-2" /></label>
        </div>
      </div>
      {error && <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>}
      {plan && (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-4"><p className="text-xs uppercase text-slate-500">Confirmed orders</p><p className="mt-1 text-2xl font-bold">{plan.order_count}</p></div>
            <div className="rounded-xl border bg-white p-4"><p className="text-xs uppercase text-slate-500">Pieces ordered</p><p className="mt-1 text-2xl font-bold">{plan.totals.confirmed}</p></div>
            <div className="rounded-xl bg-cyan-950 p-4 text-white"><p className="text-xs uppercase text-cyan-200">To produce</p><p className="mt-1 text-2xl font-bold">{plan.totals.to_produce} pcs</p></div>
          </section>
          <section className="rounded-xl border bg-white p-4 overflow-x-auto">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">SKU breakdown for {plan.plan_date}</h2>
              <Link href="/ice-crest/stock-movements" className="text-sm text-cyan-700">Record inward after production →</Link>
            </div>
            <table className="mt-3 w-full text-sm">
              <thead><tr className="border-b text-left text-slate-500"><th className="py-2">SKU / size</th><th>Ordered</th><th>Available</th><th>Safety</th><th className="text-right">Produce</th></tr></thead>
              <tbody>
                {plan.rows.length ? plan.rows.map(r => (
                  <tr key={r.item_id} className="border-b">
                    <td className="py-2"><b>{r.name}</b><br /><span className="text-xs text-slate-500">{r.sku}</span></td>
                    <td>{r.confirmed_orders}</td>
                    <td>{r.available_stock}</td>
                    <td>{r.safety_stock}</td>
                    <td className={`text-right font-bold ${r.produce_tomorrow > 0 ? 'text-cyan-700' : 'text-slate-400'}`}>{r.produce_tomorrow}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="py-6 text-center text-slate-500">No confirmed orders for this date. <Link href="/sales/orders/new" className="text-cyan-700">Create order →</Link></td></tr>
                )}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
