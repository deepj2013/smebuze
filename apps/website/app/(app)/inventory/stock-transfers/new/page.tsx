'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';

interface Warehouse { id: string; name: string }
interface Item { id: string; name: string }

interface LineRow { item_id: string; quantity: number }

export default function NewStockTransferPage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<LineRow[]>([{ item_id: '', quantity: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [wRes, iRes] = await Promise.all([
        apiGet<Warehouse[] | { data: Warehouse[] }>('inventory/warehouses'),
        apiGet<Item[] | { data: Item[] }>('inventory/items'),
      ]);
      const wList = Array.isArray(wRes.data) ? wRes.data : (wRes.data as { data?: Warehouse[] })?.data ?? [];
      const iList = Array.isArray(iRes.data) ? iRes.data : (iRes.data as { data?: Item[] })?.data ?? [];
      setWarehouses(wList);
      setItems(iList);
      if (wList.length >= 2) {
        setFromWarehouseId(wList[0].id);
        setToWarehouseId(wList[1].id);
      }
    })();
  }, []);

  const addLine = () => setLines((p) => [...p, { item_id: '', quantity: 0 }]);
  const updateLine = (i: number, field: keyof LineRow, value: string | number) => {
    setLines((p) => p.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  };
  const removeLine = (i: number) => {
    if (lines.length <= 1) return;
    setLines((p) => p.filter((_, idx) => idx !== i));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromWarehouseId || !toWarehouseId) {
      setError('Select from and to warehouse.');
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      setError('From and to warehouse must be different.');
      return;
    }
    const validLines = lines.filter((l) => l.item_id && Number(l.quantity) > 0);
    if (validLines.length === 0) {
      setError('Add at least one line with item and quantity.');
      return;
    }
    setError(null);
    setLoading(true);
    const body = {
      from_warehouse_id: fromWarehouseId,
      to_warehouse_id: toWarehouseId,
      transfer_date: transferDate,
      reference: reference || undefined,
      lines: validLines.map((l) => ({ item_id: l.item_id, quantity: Number(l.quantity) })),
    };
    const { error: err } = await apiPost('inventory/stock-transfers', body);
    setLoading(false);
    if (err) setError(err);
    else router.push('/inventory/stock-transfers');
  };

  return (
    <div>
      <Link href="/inventory/stock-transfers" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Stock transfers</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Create stock transfer</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <form onSubmit={submit} className="space-y-6 max-w-3xl">
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From warehouse *</label>
            <select value={fromWarehouseId} onChange={(e) => setFromWarehouseId(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To warehouse *</label>
            <select value={toWarehouseId} onChange={(e) => setToWarehouseId(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Transfer date *</label>
            <input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reference</label>
            <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Optional" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-medium text-slate-800">Lines (item, qty)</h2>
            <button type="button" onClick={addLine} className="text-sm text-brand-600 hover:underline">+ Add line</button>
          </div>
          <div className="space-y-3">
            {lines.map((line, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-end border-b border-slate-100 pb-2">
                <div className="w-48">
                  <label className="block text-xs text-slate-500 mb-0.5">Item</label>
                  <select value={line.item_id} onChange={(e) => updateLine(i, 'item_id', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
                    <option value="">—</option>
                    {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-xs text-slate-500 mb-0.5">Qty</label>
                  <input type="number" min={0} step={1} value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.valueAsNumber || 0)} className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
                </div>
                <button type="button" onClick={() => removeLine(i)} className="text-red-600 text-sm hover:underline">Remove</button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Create</button>
          <Link href="/inventory/stock-transfers" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
