'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';

interface PayableRow {
  id: string;
  number: string;
  vendor_id?: string;
  vendor: string;
  total: number;
  paid: number;
  due: number;
}

export default function PayablesPage() {
  const [data, setData] = useState<{ orders: PayableRow[]; totalPayable: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payModal, setPayModal] = useState<PayableRow | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState('cash');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const res = await apiGet<{ orders: PayableRow[]; totalPayable: number }>('purchase/payables');
    if (res.error) setError(res.error);
    else if (res.data) setData(res.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openPay = (order: PayableRow) => {
    setPayModal(order);
    setAmount(order.due.toString());
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setMode('cash');
    setReference('');
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModal) return;
    const vendorId = payModal.vendor_id;
    if (!vendorId) {
      setError('Vendor not found for this PO');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: err } = await apiPost(`purchase/vendors/${vendorId}/payments`, {
      amount: parseFloat(amount),
      payment_date: paymentDate,
      mode,
      reference: reference || undefined,
      purchase_order_id: payModal.id,
    });
    setSubmitting(false);
    if (err) setError(err);
    else {
      setPayModal(null);
      load();
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Payables</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && data && (
        <>
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 inline-block">
            <span className="text-sm text-slate-500">Total payable: </span>
            <span className="text-xl font-semibold text-rose-700">₹{data.totalPayable.toFixed(2)}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 font-medium text-slate-700">PO</th>
                  <th className="text-left p-3 font-medium text-slate-700">Vendor</th>
                  <th className="text-right p-3 font-medium text-slate-700">Total</th>
                  <th className="text-right p-3 font-medium text-slate-700">Paid</th>
                  <th className="text-right p-3 font-medium text-slate-700">Due</th>
                  <th className="text-left p-3 font-medium text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.length === 0 ? (
                  <tr><td colSpan={6} className="p-4 text-slate-500">No pending payables.</td></tr>
                ) : (
                  data.orders.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0">
                      <td className="p-3">{row.number}</td>
                      <td className="p-3">{row.vendor}</td>
                      <td className="p-3 text-right">₹{row.total.toFixed(2)}</td>
                      <td className="p-3 text-right">₹{row.paid.toFixed(2)}</td>
                      <td className="p-3 text-right text-rose-700">₹{row.due.toFixed(2)}</td>
                      <td className="p-3">
                        <button type="button" onClick={() => openPay(row)} className="text-brand-600 hover:underline text-sm">Record payment</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
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
