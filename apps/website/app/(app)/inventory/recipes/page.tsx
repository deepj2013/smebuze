'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPut } from '@/lib/api';
import { PageHeader } from '../../components/PageHeader';
import ItemSearchPicker, { type SearchableItem } from '../../components/ItemSearchPicker';

type Recipe = {
  finished_item_id: string;
  name: string;
  unit_cost: number;
  lines: Array<{ component_item_id: string; qty_per_unit: string; component_item?: { name: string } }>;
};

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [items, setItems] = useState<SearchableItem[]>([]);
  const [fg, setFg] = useState('');
  const [lines, setLines] = useState<Array<{ component_item_id: string; qty_per_unit: number }>>([{ component_item_id: '', qty_per_unit: 1 }]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  async function load() {
    const [r, i] = await Promise.all([apiGet<Recipe[]>('inventory/recipes'), apiGet<SearchableItem[]>('inventory/items')]);
    if (r.error) setError(Array.isArray(r.error) ? r.error.join(' ') : r.error);
    else setRecipes(Array.isArray(r.data) ? r.data : []);
    if (i.data) setItems(Array.isArray(i.data) ? i.data : []);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!fg) { setError('Pick the finished item (e.g. Gulab Jamun).'); return; }
    setError('');
    const { error: err } = await apiPut(`inventory/recipes/${fg}`, { lines: lines.filter((l) => l.component_item_id) });
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else { setOk('Recipe saved'); load(); }
  }

  return (
    <div>
      <PageHeader title="Recipes / BOM" description="Raw materials per 1 finished unit. Production uses this to cost FG and deduct stock. Enabled by SMEBUZE admin.">
        <Link href="/inventory/production" className="rounded-lg border px-3 py-2 text-sm">Production runs</Link>
      </PageHeader>
      {error && <div className="mb-3 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {ok && <div className="mb-3 rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm">{ok}</div>}
      <section className="rounded-xl border bg-white p-5 space-y-3 max-w-2xl mb-8">
        <label className="text-sm block">Finished item
          <div className="mt-1"><ItemSearchPicker items={items} value={fg} onChange={setFg} placeholder="Gulab Jamun, bread…" /></div>
        </label>
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="md:col-span-2">
              <ItemSearchPicker items={items} value={l.component_item_id} onChange={(id) => setLines((p) => p.map((x, idx) => idx === i ? { ...x, component_item_id: id } : x))} placeholder="Raw item" />
            </div>
            <input type="number" step="0.0001" value={l.qty_per_unit} onChange={(e) => setLines((p) => p.map((x, idx) => idx === i ? { ...x, qty_per_unit: Number(e.target.value) } : x))} className="rounded border px-3 py-2 text-sm" placeholder="Qty per 1 FG" />
          </div>
        ))}
        <button type="button" className="text-sm text-brand-600" onClick={() => setLines((p) => [...p, { component_item_id: '', qty_per_unit: 1 }])}>+ Component</button>
        <button type="button" onClick={save} className="block rounded-lg bg-brand-600 text-white px-4 py-2 text-sm">Save recipe</button>
      </section>
      <ul className="space-y-2 max-w-2xl">
        {recipes.map((r) => (
          <li key={r.finished_item_id} className="rounded-xl border bg-white p-4 text-sm">
            <p className="font-medium">{r.name} · cost ₹{Number(r.unit_cost).toFixed(2)} / unit</p>
            <ul className="text-slate-600 mt-1">
              {r.lines.map((l) => (
                <li key={l.component_item_id}>{l.component_item?.name ?? l.component_item_id} × {l.qty_per_unit}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
