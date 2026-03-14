'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { PageHeader } from '../../components/PageHeader';
import { ResponsiveDataList, type Column } from '../../components/ResponsiveDataList';

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

  const columns: Column<Invoice>[] = [
    { key: 'number', label: 'Number', cardLabel: 'Invoice' },
    { key: 'billTo', label: 'Bill to', cardLabel: 'Bill to', render: (r) => r.customer?.name ?? r.vendor?.name ?? '—' },
    { key: 'invoice_date', label: 'Date', cardLabel: 'Date', render: (r) => (typeof r.invoice_date === 'string' ? r.invoice_date.slice(0, 10) : '—') },
    { key: 'total', label: 'Total', cardLabel: 'Total', className: 'text-right', render: (r) => `₹${Number(r.total).toFixed(2)}` },
    { key: 'paid_amount', label: 'Paid', cardLabel: 'Paid', className: 'text-right', render: (r) => `₹${Number(r.paid_amount ?? 0).toFixed(2)}` },
    {
      key: 'actions',
      label: 'Actions',
      render: (inv) => (
        <span className="flex flex-wrap gap-2">
          <Link href={`/sales/invoices/${inv.id}/edit`} className="text-brand-600 hover:underline text-sm">Edit</Link>
          <a href={`/sales/invoices/${inv.id}/print`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline text-sm">Print</a>
          {Number(inv.paid_amount ?? 0) < Number(inv.total) && (
            <button
              type="button"
              disabled={paymentLinkLoading === inv.id}
              className="text-brand-600 hover:underline text-sm disabled:opacity-50"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                setPaymentLinkLoading(inv.id);
                const { data: link } = await apiGet<{ enabled: boolean; url?: string }>(`sales/invoices/${inv.id}/payment-link`);
                setPaymentLinkLoading(null);
                if (link?.enabled && link?.url) window.open(link.url, '_blank');
              }}
            >
              {paymentLinkLoading === inv.id ? '…' : 'Pay online'}
            </button>
          )}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Invoices"
        description={undefined}
      >
        <Link href="/sales/invoices/pending" className="rounded-lg border border-slate-300 px-3 sm:px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 min-h-[44px] inline-flex items-center justify-center">
          Pending
        </Link>
        <Link href="/sales/invoices/new" className="rounded-lg bg-brand-600 text-white px-3 sm:px-4 py-2.5 text-sm font-medium hover:bg-brand-700 min-h-[44px] inline-flex items-center justify-center">
          Create invoice
        </Link>
      </PageHeader>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <ResponsiveDataList<Invoice>
          columns={columns}
          data={list}
          keyField="id"
          emptyMessage="No invoices yet."
          emptyAction={<Link href="/sales/invoices/new" className="inline-block rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-brand-700">Add your first invoice</Link>}
          renderMobileCard={(inv) => (
            <Link href={`/sales/invoices/${inv.id}/edit`} className="block">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50">
                <div className="flex justify-between items-start gap-2">
                  <span className="font-semibold text-slate-900">{inv.number}</span>
                  <span className="text-brand-600 font-medium text-sm">₹{Number(inv.total).toFixed(2)}</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{inv.customer?.name ?? inv.vendor?.name ?? '—'}</p>
                <p className="text-xs text-slate-500 mt-1">{typeof inv.invoice_date === 'string' ? inv.invoice_date.slice(0, 10) : '—'} · Paid ₹{Number(inv.paid_amount ?? 0).toFixed(2)}</p>
                <span className="text-brand-600 text-sm font-medium mt-2 inline-block">View & edit →</span>
              </div>
            </Link>
          )}
        />
      )}
    </div>
  );
}
