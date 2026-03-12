'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

interface Invoice {
  id: string;
  number: string;
  invoice_date: string;
  total: string | number;
  paid_amount?: string | number;
  status?: string;
  customer?: { name: string } | null;
  vendor?: { name: string } | null;
}

export default function InvoicesPage() {
  const [list, setList] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentLinkLoading, setPaymentLinkLoading] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await apiGet<Invoice[] | { data: Invoice[] }>('sales/invoices');
      if (err) setError(err);
      else if (Array.isArray(data)) setList(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: Invoice[] }).data)) setList((data as { data: Invoice[] }).data);
      setLoading(false);
    })();
  }, []);

  const printUrl = (id: string) => `/sales/invoices/${id}/print`;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <div className="flex gap-2">
          <Link href="/sales/invoices/pending" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Pending receivables</Link>
          <Link href="/sales/invoices/new" className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">Create invoice</Link>
        </div>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Number</th>
                <th className="text-left p-3 font-medium text-slate-700">Bill to</th>
                <th className="text-left p-3 font-medium text-slate-700">Date</th>
                <th className="text-right p-3 font-medium text-slate-700">Total</th>
                <th className="text-right p-3 font-medium text-slate-700">Paid</th>
                <th className="text-left p-3 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <p className="text-slate-600 mb-2">No invoices yet.</p>
                    <Link href="/sales/invoices/new" className="inline-block rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">Add your first invoice</Link>
                  </td>
                </tr>
              ) : (
                list.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{inv.number}</td>
                    <td className="p-3">{inv.customer?.name ?? inv.vendor?.name ?? '—'}</td>
                    <td className="p-3">{typeof inv.invoice_date === 'string' ? inv.invoice_date.slice(0, 10) : '—'}</td>
                    <td className="p-3 text-right">₹{Number(inv.total).toFixed(2)}</td>
                    <td className="p-3 text-right">₹{Number(inv.paid_amount ?? 0).toFixed(2)}</td>
                    <td className="p-3">
                      <Link href={`/sales/invoices/${inv.id}/edit`} className="text-brand-600 hover:underline text-sm mr-2">Edit</Link>
                      <a href={printUrl(inv.id)} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline text-sm mr-2">Print</a>
                      <a href={printUrl(inv.id)} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:underline text-sm mr-2" title="Open in new tab, then use browser Print → Save as PDF">Download PDF</a>
                      {Number(inv.paid_amount ?? 0) < Number(inv.total) && (
                        <button
                          type="button"
                          disabled={paymentLinkLoading === inv.id}
                          className="text-brand-600 hover:underline text-sm disabled:opacity-50"
                          onClick={async () => {
                            setPaymentLinkLoading(inv.id);
                            const { data: link } = await apiGet<{ enabled: boolean; url?: string }>(`sales/invoices/${inv.id}/payment-link`);
                            setPaymentLinkLoading(null);
                            if (link?.enabled && link?.url) window.open(link.url, '_blank');
                          }}
                        >
                          {paymentLinkLoading === inv.id ? '…' : 'Pay online'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
