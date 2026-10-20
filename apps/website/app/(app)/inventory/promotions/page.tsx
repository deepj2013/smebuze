'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { PageHeader } from '../../components/PageHeader';
import ItemSearchPicker, { type SearchableItem } from '../../components/ItemSearchPicker';

type Promo = {
  id: string;
  name: string;
  is_active: boolean;
  buy_qty: string;
  free_qty: string;
  buy_item?: { name: string };
  free_item?: { name: string };
};

export default function PromotionsPage() {
  const [items, setItems] = useState<SearchableItem[]>([]);
  const [list, setList] = useState<Promo[]>([]);
  const [name, setName] = useState('Buy 1 get 1');
  const [buyItem, setBuyItem] = useState('');
  const [buyQty, setBuyQty] = useState('1');
  const [freeItem, setFreeItem] = useState('');
  const [freeQty, setFreeQty] = useState('1');
  const [error, setError] = useState('');

  async function load() {
    const [i, p] = await Promise.all([apiGet<SearchableItem[]>('inventory/items'), apiGet<Promo[]>('inventory/promotions')]);
    if (i.data) setItems(Array.isArray(i.data) ? i.data : []);
    if (p.error) setError(Array.isArray(p.error) ? p.error.join(' ') : p.error);
    else setList(Array.isArray(p.data) ? p.data : []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    const { error: err } = await apiPost('inventory/promotions', {
      name,
      buy_item_id: buyItem,
      buy_qty: Number(buyQty),
      free_item_id: freeItem || buyItem,
      free_qty: Number(freeQty),
    });
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else load();
  }

  return (
    <div>
      <PageHeader title="Offers (BOGO)" description="Buy N get M free on the billing counter. Loyalty points (₹100 = 1 pt) accrue when a customer is on the bill." />
      {error && <div className="mb-3 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <div className="rounded-xl border bg-white p-5 max-w-lg space-y-3 mb-8">
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" placeholder="Offer name" />
        <ItemSearchPicker items={items} value={buyItem} onChange={setBuyItem} placeholder="Buy item" />
        <input type="number" value={buyQty} onChange={(e) => setBuyQty(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" placeholder="Buy qty" />
        <ItemSearchPicker items={items} value={freeItem} onChange={setFreeItem} placeholder="Free item (same if blank)" />
        <input type="number" value={freeQty} onChange={(e) => setFreeQty(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" placeholder="Free qty" />
        <button type="button" onClick={create} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm">Save offer</button>
      </div>
      <ul className="space-y-2 max-w-lg text-sm">
        {list.map((p) => (
          <li key={p.id} className="rounded-xl border bg-white p-3 flex justify-between gap-2">
            <span>{p.name} · buy {p.buy_qty} {p.buy_item?.name} get {p.free_qty} {p.free_item?.name || 'same'}</span>
            <button type="button" className="text-xs underline" onClick={() => apiPatch(`inventory/promotions/${p.id}`, { is_active: !p.is_active }).then(load)}>
              {p.is_active ? 'Turn off' : 'Turn on'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
