'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';

interface PurchaseOrder { id: string; number: string; vendor?: { name: string }; total: string | number }

export default function NewDebitNotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const poIdParam = searchParams?.get('po_id') ?? '';
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [poId, setPoId] = useState(poIdParam);
  const [noteDate, setNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<PurchaseOrder[] | { data: PurchaseOrder[] }>('purchase/orders').then(({ data }) => {
      const list = Array.isArray(data) ? data : (data as { data?: PurchaseOrder[] })?.data ?? [];
      setOrders(list);
      if (poIdParam && !poId) setPoId(poIdParam);
    });
  }, []);

  useEffect(() => {
    if (poIdParam) setPoId(poIdParam);
  }, [poIdParam]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poId) {
      setError('Select a purchase order.');
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setError(null);
    setLoading(true);
    const body = {
      purchase_order_id: poId,
      note_date: noteDate,
      amount: amt,
      reason: reason || undefined,
    };
    const { error: err } = await apiPost('purchase/debit-notes', body);
    setLoading(false);
    if (err) setError(err);
    else router.push('/purchase/debit-notes');
  };

  const selectedPo = orders.find((o) => o.id === poId);

  return (
    <div>
      <Link href="/purchase/debit-notes" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Debit notes</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Create debit note</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <form onSubmit={submit} className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Purchase order *</label>
          <select value={poId} onChange={(e) => setPoId(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select PO</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>{o.number} — {o.vendor?.name ?? '—'} — ₹{Number(o.total).toFixed(2)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Note date *</label>
          <input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Amount * (reduces payable / link to vendor ledger)</label>
          <input type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="0.00" />
          {selectedPo && <p className="text-xs text-slate-500 mt-0.5">PO total: ₹{Number(selectedPo.total).toFixed(2)}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Return, discount, etc." />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Create</button>
          <Link href="/purchase/debit-notes" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
