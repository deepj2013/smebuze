'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

type StockRow = { item_id: string; sku?: string; name: string; opening: number; inward: number; outward: number; reserved: number; available: number };
type LowStock = { item_id: string; name: string; sku: string | null; reorder_level: number; current_stock: number };
type Data = { sales: number; expenses: number; operating_profit: number; profit_margin: number; invoice_count: number; expense_breakdown: { category: string; amount: number }[]; expense_by_nature?: { nature: string; label: string; amount: number }[]; stock: StockRow[]; stock_totals: { opening: number; inward: number; outward: number; available: number }; sales_trend?: { date: string; sales: number; invoice_count: number }[] };

const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

function presets(today: string) {
  const d = new Date(today);
  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() - d.getDay());
  return [
    { label: 'Today', from: today, to: today },
    { label: 'This week', from: weekStart.toISOString().slice(0, 10), to: today },
    { label: 'This month', from: `${today.slice(0, 7)}-01`, to: today },
  ];
}

export default function IceCrestDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<Data>();
  const [lowStock, setLowStock] = useState<LowStock[]>([]);
  const [error, setError] = useState('');

  const load = () => {
    apiGet<Data>(`ice-crest/dashboard?from=${from}&to=${to}`).then(r => { if (r.data) setData(r.data); setError(r.error || ''); });
    apiGet<LowStock[]>('inventory/stock/low').then(r => setLowStock(Array.isArray(r.data) ? r.data : []));
  };

  useEffect(() => { void load(); }, [from, to]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-cyan-700">ICE CREST</p>
          <h1 className="text-2xl font-bold">Profit, expense & stock dashboard</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {presets(today).map(p => (
            <button key={p.label} type="button" onClick={() => { setFrom(p.from); setTo(p.to); }} className="rounded-full border px-4 py-2 text-sm font-medium text-slate-600 hover:bg-cyan-50 min-h-[44px]">{p.label}</button>
          ))}
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded-lg border px-3 py-2 min-h-[44px]" aria-label="From date" />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="rounded-lg border px-3 py-2 min-h-[44px]" aria-label="To date" />
        </div>
      </div>
      {error && <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>}
      <section className="rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-white p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-cyan-900">New to Ice Crest CRM?</p>
          <p className="text-sm text-cyan-800">Walk through stock, billing, expenses and setup in a 2-minute tutorial.</p>
        </div>
        <Link href="/ice-crest/tutorial" className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800">Start tutorial</Link>
      </section>
      {lowStock.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex justify-between"><h2 className="font-semibold text-amber-900">Low stock alert — {lowStock.length} SKU(s)</h2><Link href="/inventory/items" className="text-sm text-amber-800">View items →</Link></div>
          <p className="mt-1 text-sm text-amber-800">{lowStock.slice(0, 4).map(x => `${x.name} (${x.current_stock}/${x.reorder_level})`).join(' · ')}{lowStock.length > 4 ? ' …' : ''}</p>
        </section>
      )}
      {data && <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[['Total sales', money(data.sales)], ['Total expenses', money(data.expenses)], ['Operating profit', money(data.operating_profit)], ['Profit margin', `${data.profit_margin.toFixed(1)}%`]].map(([a, b]) => (
            <div key={a} className="rounded-xl border bg-white p-4"><p className="text-xs uppercase text-slate-500">{a}</p><p className="mt-2 text-2xl font-bold">{b}</p></div>
          ))}
        </section>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Object.entries(data.stock_totals).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-cyan-950 p-4 text-white"><p className="text-xs uppercase text-cyan-200">{k} stock</p><p className="mt-1 text-2xl font-bold">{v}</p></div>
          ))}
        </section>
        {data.sales_trend && data.sales_trend.length > 0 && (
          <section className="rounded-xl border bg-white p-4">
            <h2 className="font-semibold">Sales trend</h2>
            <p className="text-xs text-slate-500 mt-1">Daily invoice totals in selected period</p>
            <div className="mt-4 flex items-end gap-2 h-40 overflow-x-auto pb-2">
              {data.sales_trend.map(t => {
                const max = Math.max(...data.sales_trend!.map(x => x.sales), 1);
                const h = Math.max(8, (t.sales / max) * 120);
                return (
                  <div key={t.date} className="flex min-w-[48px] flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-500">{money(t.sales)}</span>
                    <div className="w-10 rounded-t bg-cyan-600" style={{ height: h }} title={`${t.date}: ${money(t.sales)}`} />
                    <span className="text-[10px] text-slate-600">{t.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border bg-white p-4 overflow-x-auto -mx-4 sm:mx-0 px-4">
            <div className="flex justify-between"><h2 className="font-semibold">SKU-wise stock</h2><Link href="/ice-crest/stock-movements" className="text-sm text-cyan-700">Record movement →</Link></div>
            <table className="mt-3 w-full text-sm">
              <thead><tr className="border-b text-left text-slate-500"><th className="py-2">SKU / size</th><th>Opening</th><th>Inward</th><th>Outward</th><th>Reserved</th><th>Available</th></tr></thead>
              <tbody>{data.stock.map(x => (
                <tr key={x.item_id} className="border-b"><td className="py-2"><b>{x.name}</b><br /><span className="text-xs text-slate-500">{x.sku}</span></td><td>{x.opening}</td><td>{x.inward}</td><td>{x.outward}</td><td className="text-amber-700">{x.reserved}</td><td className="font-bold">{x.available}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border bg-white p-4">
              <div className="flex justify-between"><h2 className="font-semibold">Expense breakdown</h2><Link href="/ice-crest/expenses" className="text-sm text-cyan-700">Manage →</Link></div>
              <div className="mt-3 space-y-3">
                {(data.expense_by_nature && data.expense_by_nature.length ? data.expense_by_nature : data.expense_breakdown.map((x) => ({ label: x.category, amount: x.amount, nature: x.category }))).map((x) => (
                  <div key={x.label}><div className="flex justify-between text-sm"><span>{x.label}</span><b>{money(x.amount)}</b></div><div className="mt-1 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-cyan-600" style={{ width: `${Math.min(100, (x.amount / Math.max(data.expenses, 1)) * 100)}%` }} /></div></div>
                ))}
                {!data.expense_breakdown.length && <p className="text-sm text-slate-500">No expenses in this period.</p>}
              </div>
            </div>
            <div className="rounded-xl border bg-white p-4 text-sm">
              <h2 className="font-semibold">Quick actions</h2>
              <div className="mt-2 flex flex-col gap-2">
                <Link href="/ice-crest/guide" className="text-cyan-700">Staff training guide →</Link>
                <Link href="/ice-crest/production-plan" className="text-cyan-700">Tomorrow&apos;s production plan →</Link>
                <Link href="/sales/invoices/new" className="text-cyan-700">New invoice / bill →</Link>
                <Link href="/sales/invoices/pending" className="text-cyan-700">Pending payments →</Link>
                <Link href="/reports/gstr-1" className="text-cyan-700">GSTR-1 (sales GST) →</Link>
                <Link href="/reports/gstr-2a" className="text-cyan-700">GSTR-2A purchase recon →</Link>
                <Link href="/reports" className="text-cyan-700">SKU & customer reports →</Link>
              </div>
            </div>
          </div>
        </section>
      </>}
    </div>
  );
}
