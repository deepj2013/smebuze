'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { PageHeader } from '../../components/PageHeader';

type Recipe = { finished_item_id: string; name: string };
type Run = { id: string; qty_produced: string; unit_cost: string; total_cost: string; produced_at: string; finished_item?: { name: string } };

export default function ProductionPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [fg, setFg] = useState('');
  const [qty, setQty] = useState('1');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  async function load() {
    const [r, w, p] = await Promise.all([
      apiGet<Recipe[]>('inventory/recipes'),
      apiGet<Array<{ id: string; name: string }>>('inventory/warehouses'),
      apiGet<Run[]>('inventory/production'),
    ]);
    if (r.error) setError(Array.isArray(r.error) ? r.error.join(' ') : r.error);
    else setRecipes(Array.isArray(r.data) ? r.data : []);
    const wl = Array.isArray(w.data) ? w.data : [];
    setWarehouses(wl);
    if (wl[0] && !warehouseId) setWarehouseId(wl[0].id);
    if (p.data) setRuns(Array.isArray(p.data) ? p.data : []);
  }
  useEffect(() => { load(); }, []);

  async function run() {
    setError('');
    const { error: err } = await apiPost('inventory/production', {
      warehouse_id: warehouseId,
      finished_item_id: fg,
      qty_produced: Number(qty),
      produced_at: date,
    });
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else { setOk('Produced — raw deducted, FG received, cost updated'); load(); }
  }

  return (
    <div>
      <PageHeader title="Production" description="Make finished goods from a recipe. Raw stock goes out; FG stock and cost come in.">
        <Link href="/inventory/recipes" className="rounded-lg border px-3 py-2 text-sm">Recipes</Link>
      </PageHeader>
      {error && <div className="mb-3 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {ok && <div className="mb-3 rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm">{ok}</div>}
      <div className="rounded-xl border bg-white p-5 max-w-lg space-y-3 mb-8">
        <label className="text-sm block">Warehouse
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="mt-1 w-full rounded border px-3 py-2">
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </label>
        <label className="text-sm block">Finished item
          <select value={fg} onChange={(e) => setFg(e.target.value)} className="mt-1 w-full rounded border px-3 py-2">
            <option value="">Select recipe</option>
            {recipes.map((r) => <option key={r.finished_item_id} value={r.finished_item_id}>{r.name}</option>)}
          </select>
        </label>
        <label className="text-sm block">Qty produced
          <input type="number" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="text-sm block">Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <button type="button" onClick={run} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm">Produce</button>
      </div>
      <ul className="space-y-2 max-w-lg text-sm">
        {runs.map((r) => (
          <li key={r.id} className="rounded-xl border bg-white p-3">
            {String(r.produced_at).slice(0, 10)} · {r.finished_item?.name} × {r.qty_produced} · cost ₹{Number(r.unit_cost).toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );
}
