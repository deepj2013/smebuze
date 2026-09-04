'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPut, apiDelete } from '@/lib/api';
import NumberField from '@/app/(app)/components/NumberField';

type SaleItem = { id: string; name: string; sku?: string | null; sale_price?: string | null; mrp?: string | null };
type RateRow = { item_id: string; rate: string; item_name?: string | null; item_sku?: string | null };

export default function CustomerItemRates({ customerId }: { customerId: string }) {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [rows, setRows] = useState<RateRow[]>([]);
  const [itemId, setItemId] = useState('');
  const [rate, setRate] = useState(0);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    apiGet<RateRow[]>(`crm/customers/${customerId}/item-rates`).then(({ data }) => setRows(data || []));
  };

  useEffect(() => {
    apiGet<SaleItem[] | { data: SaleItem[] }>('inventory/items?purpose=sale').then(({ data }) => {
      const list = Array.isArray(data) ? data : (data as { data?: SaleItem[] })?.data ?? [];
      setItems(list);
      if (list[0] && !itemId) setItemId(list[0].id);
    });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!itemId) { setMsg('Select an item'); return; }
    if (!Number.isFinite(rate) || rate < 0) { setMsg('Rate must be 0 or greater'); return; }
    setSaving(true);
    setMsg('');
    const res = await apiPut(`crm/customers/${customerId}/item-rates`, { item_id: itemId, rate });
    setSaving(false);
    if (res.error) setMsg(res.error);
    else {
      setMsg('Customer rate saved. Invoices and orders will use it when this customer is selected.');
      load();
    }
  }

  async function remove(id: string) {
    const res = await apiDelete(`crm/customers/${customerId}/item-rates/${id}`);
    if (res.error) setMsg(res.error);
    else load();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
      <div>
        <h2 className="font-semibold text-slate-800">Customer item rates (optional)</h2>
        <p className="text-sm text-slate-500 mt-1">
          Leave empty to use each product’s sale price / MRP. Add a rate only when this customer has a fixed price for an item.
        </p>
      </div>
      {msg && <p className="rounded bg-cyan-50 p-3 text-sm text-cyan-800">{msg}</p>}
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm text-slate-700">
          Item
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 min-h-[44px]">
            <option value="">Select</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>{it.name}{it.sku ? ` (${it.sku})` : ''}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Rate
          <NumberField className="mt-1" min={0} step="0.01" value={rate} onNumber={setRate} aria-label="Customer item rate" />
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={saving} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50 min-h-[44px]">
            {saving ? 'Saving…' : 'Save rate'}
          </button>
        </div>
      </form>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No customer-specific rates yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="py-2">Item</th>
              <th className="text-right">Rate</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.item_id} className="border-b">
                <td className="py-2">{r.item_name || r.item_id}{r.item_sku ? ` (${r.item_sku})` : ''}</td>
                <td className="text-right tabular-nums">₹{Number(r.rate).toFixed(2)}</td>
                <td className="text-right">
                  <button type="button" onClick={() => void remove(r.item_id)} className="text-xs text-red-600 hover:underline">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
