'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';

interface Invoice { id: string; number: string; invoice_date: string; total: string; paid_amount: string; customer_id?: string; customer?: { name: string }; status?: string }
interface PendingRes { invoices: Invoice[]; total_pending: number }

export default function PaymentPage() {
  const [pending, setPending] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Invoice[] | PendingRes | { data: Invoice[] }>('sales/invoices/pending').then((r) => {
      const data = (r as { data?: unknown }).data;
      if (Array.isArray(data)) setPending(data);
      else if (data && typeof data === 'object' && 'invoices' in data) setPending((data as PendingRes).invoices ?? []);
      else setPending([]);
      setLoading(false);
    });
  }, []);

  const byCustomer = pending.reduce((acc, inv) => {
    const cid = inv.customer_id ?? 'unknown';
    const name = (inv.customer as { name?: string })?.name ?? 'Unknown';
    if (!acc[cid]) acc[cid] = { name, invoices: [] };
    acc[cid].invoices.push(inv);
    return acc;
  }, {} as Record<string, { name: string; invoices: Invoice[] }>);

  if (loading) return <p className="text-slate-600">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Payment (pending receivables)</h1>
      <p className="text-sm text-slate-600 mb-6">Customer-wise pending invoices. View and update payment from invoice detail.</p>

      {Object.keys(byCustomer).length === 0 && <p className="text-slate-500">No pending receivables.</p>}

      <div className="space-y-6">
        {Object.entries(byCustomer).map(([customerId, { name, invoices }]) => {
          const totalPending = invoices.reduce((sum, i) => sum + (parseFloat(i.total) - parseFloat(i.paid_amount || '0')), 0);
          return (
            <div key={customerId} className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-2">{name}</h2>
              <p className="text-sm text-slate-600 mb-4">Pending total: ₹{totalPending.toFixed(2)}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 text-left">
                      <th className="py-2 pr-2">Invoice</th>
                      <th className="py-2 pr-2">Date</th>
                      <th className="py-2 pr-2 text-right">Total</th>
                      <th className="py-2 pr-2 text-right">Paid</th>
                      <th className="py-2 pr-2 text-right">Pending</th>
                      <th className="py-2 pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => {
                      const paid = parseFloat(inv.paid_amount || '0');
                      const total = parseFloat(inv.total || '0');
                      const pendingAmt = total - paid;
                      return (
                        <tr key={inv.id} className="border-b border-slate-100">
                          <td className="py-2 pr-2">{inv.number}</td>
                          <td className="py-2 pr-2">{typeof inv.invoice_date === 'string' ? inv.invoice_date.slice(0, 10) : inv.invoice_date}</td>
                          <td className="py-2 pr-2 text-right">₹{total.toFixed(2)}</td>
                          <td className="py-2 pr-2 text-right">₹{paid.toFixed(2)}</td>
                          <td className="py-2 pr-2 text-right">₹{pendingAmt.toFixed(2)}</td>
                          <td className="py-2 pr-2">
                            <Link href={`/sales/invoices/pending`} className="text-brand-600 hover:underline text-sm">View / Record payment</Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-sm text-slate-600 mt-6">
        <Link href="/sales/invoices/pending" className="text-brand-600 hover:underline">All pending receivables</Link>
      </p>
    </div>
  );
}
