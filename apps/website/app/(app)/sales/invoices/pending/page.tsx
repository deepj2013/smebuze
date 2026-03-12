'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';

interface PendingRow {
  id: string;
  number: string;
  buyer?: string;
  customer?: { name?: string } | null;
  vendor?: { name?: string } | null;
  total: string | number;
  paid_amount?: string | number;
  due_date?: string;
}

export default function PendingReceivablesPage() {
  const [list, setList] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payModal, setPayModal] = useState<PendingRow | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState('cash');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const res = await apiGet<{ invoices?: PendingRow[] }>('sales/invoices/pending');
    if (res.error) setError(res.error);
    else if (res.data && Array.isArray((res.data as { invoices?: PendingRow[] }).invoices)) setList((res.data as { invoices: PendingRow[] }).invoices);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openPay = (row: PendingRow) => {
    setPayModal(row);
    const due = Number(row.total) - Number(row.paid_amount ?? 0);
    setAmount(due.toFixed(2));
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setMode('cash');
    setReference('');
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModal) return;
    setSubmitting(true);
    setError(null);
    const { error: err } = await apiPost(`sales/invoices/${payModal.id}/payment`, {
      amount: parseFloat(amount),
      payment_date: paymentDate,
      mode,
      reference: reference || undefined,
    });
    setSubmitting(false);
    if (err) setError(err);
    else {
      setPayModal(null);
      load();
    }
  };

  const getBuyer = (row: PendingRow) => row.buyer ?? row.customer?.name ?? row.vendor?.name ?? '—';
  const getDue = (row: PendingRow) => Number(row.total) - Number(row.paid_amount ?? 0);

  return (
    <div>
      <Link href="/sales/invoices" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Invoices</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Pending receivables</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Invoice</th>
                <th className="text-left p-3 font-medium text-slate-700">Buyer</th>
                <th className="text-right p-3 font-medium text-slate-700">Total</th>
                <th className="text-right p-3 font-medium text-slate-700">Paid</th>
                <th className="text-right p-3 font-medium text-slate-700">Due</th>
                <th className="text-left p-3 font-medium text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-slate-500">No pending receivables.</td></tr>
              ) : (
                list.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{row.number}</td>
                    <td className="p-3">{getBuyer(row)}</td>
                    <td className="p-3 text-right">₹{Number(row.total).toFixed(2)}</td>
                    <td className="p-3 text-right">₹{Number(row.paid_amount ?? 0).toFixed(2)}</td>
                    <td className="p-3 text-right text-amber-700">₹{getDue(row).toFixed(2)}</td>
                    <td className="p-3">
                      <button type="button" onClick={() => openPay(row)} className="text-brand-600 hover:underline text-sm">Record payment</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {payModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setPayModal(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Record payment — {payModal.number}</h2>
            <form onSubmit={submitPayment} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mode</label>
                <select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reference</label>
                <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={submitting} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50">Save</button>
                <button type="button" onClick={() => setPayModal(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
