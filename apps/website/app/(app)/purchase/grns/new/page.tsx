'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';

interface PurchaseOrder { id: string; number: string; vendor?: { name: string } }
interface Item { id: string; name: string }

interface LineRow { item_id: string; description: string; ordered_qty: number; received_qty: number }

export default function NewGrnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const poIdParam = searchParams?.get('po_id') ?? '';
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [poId, setPoId] = useState(poIdParam);
  const [grnDate, setGrnDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<LineRow[]>([{ item_id: '', description: '', ordered_qty: 0, received_qty: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [oRes, iRes] = await Promise.all([
        apiGet<PurchaseOrder[] | { data: PurchaseOrder[] }>('purchase/orders'),
        apiGet<Item[] | { data: Item[] }>('inventory/items'),
      ]);
      const oList = Array.isArray(oRes.data) ? oRes.data : (oRes.data as { data?: PurchaseOrder[] })?.data ?? [];
      const iList = Array.isArray(iRes.data) ? iRes.data : (iRes.data as { data?: Item[] })?.data ?? [];
      setOrders(oList);
      setItems(iList);
      if (poIdParam && !poId) setPoId(poIdParam);
    })();
  }, []);

  useEffect(() => {
    if (poIdParam) setPoId(poIdParam);
  }, [poIdParam]);

  const addLine = () => setLines((p) => [...p, { item_id: '', description: '', ordered_qty: 0, received_qty: 0 }]);
  const updateLine = (i: number, field: keyof LineRow, value: string | number) => {
    setLines((p) => p.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  };
  const removeLine = (i: number) => {
    if (lines.length <= 1) return;
    setLines((p) => p.filter((_, idx) => idx !== i));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poId) {
      setError('Select a purchase order.');
      return;
    }
    const selectedPo = orders.find((o) => o.id === poId);
    if (!selectedPo) {
      setError('Invalid purchase order.');
      return;
    }
    setError(null);
    setLoading(true);
    const body = {
      purchase_order_id: poId,
      grn_date: grnDate,
      lines: lines.map((l) => ({
        item_id: l.item_id || undefined,
        description: l.description || undefined,
        ordered_qty: Number(l.ordered_qty) || 0,
        received_qty: Number(l.received_qty) || 0,
      })),
    };
    const { error: err } = await apiPost('purchase/grns', body);
    setLoading(false);
    if (err) setError(err);
    else router.push('/purchase/grns');
  };

  return (
    <div>
      <Link href="/purchase/grns" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← GRNs</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Create GRN</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <form onSubmit={submit} className="space-y-6 max-w-3xl">
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Purchase order *</label>
            <select value={poId} onChange={(e) => setPoId(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select PO</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>{o.number} — {o.vendor?.name ?? '—'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">GRN date *</label>
            <input type="date" value={grnDate} onChange={(e) => setGrnDate(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-medium text-slate-800">Lines (received qty)</h2>
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
                <div className="flex-1 min-w-[100px]">
                  <label className="block text-xs text-slate-500 mb-0.5">Description</label>
                  <input value={line.description} onChange={(e) => updateLine(i, 'description', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
                </div>
                <div className="w-20">
                  <label className="block text-xs text-slate-500 mb-0.5">Ordered</label>
                  <input type="number" min={0} step={1} value={line.ordered_qty} onChange={(e) => updateLine(i, 'ordered_qty', e.target.valueAsNumber || 0)} className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
                </div>
                <div className="w-20">
                  <label className="block text-xs text-slate-500 mb-0.5">Received</label>
                  <input type="number" min={0} step={1} value={line.received_qty} onChange={(e) => updateLine(i, 'received_qty', e.target.valueAsNumber || 0)} className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
                </div>
                <button type="button" onClick={() => removeLine(i)} className="text-red-600 text-sm hover:underline">Remove</button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Create</button>
          <Link href="/purchase/grns" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
