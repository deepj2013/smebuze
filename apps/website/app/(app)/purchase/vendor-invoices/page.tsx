'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { PageHeader } from '../../components/PageHeader';
import { ResponsiveDataList, type Column } from '../../components/ResponsiveDataList';

type Bill = {
  id: string;
  number: string;
  bill_date: string;
  vendor?: { name: string };
  taxable_amount: string | number;
  cgst_amount: string | number;
  sgst_amount: string | number;
  igst_amount: string | number;
  total: string | number;
  stock_received?: boolean;
};

export default function VendorInvoicesPage() {
  const [list, setList] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Bill[]>('purchase/vendor-invoices').then(({ data, error: err }) => {
      if (err) setError(Array.isArray(err) ? err.join(' ') : err);
      else setList(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  const columns: Column<Bill>[] = [
    { key: 'number', label: 'Bill no' },
    { key: 'vendor', label: 'Vendor', render: (b) => b.vendor?.name ?? '—' },
    { key: 'bill_date', label: 'Date', render: (b) => String(b.bill_date).slice(0, 10) },
    { key: 'taxable_amount', label: 'Taxable', className: 'text-right', render: (b) => `₹${Number(b.taxable_amount).toFixed(2)}` },
    {
      key: 'gst',
      label: 'Input GST',
      className: 'text-right',
      render: (b) => `₹${(Number(b.cgst_amount) + Number(b.sgst_amount) + Number(b.igst_amount)).toFixed(2)}`,
    },
    { key: 'total', label: 'Total', className: 'text-right', render: (b) => `₹${Number(b.total).toFixed(2)}` },
    { key: 'stock_received', label: 'Stock', render: (b) => (b.stock_received ? 'Received' : 'Cost only') },
  ];

  return (
    <div>
      <PageHeader title="Vendor bills" description="Supplier bill sets item cost and input GST. Optionally receive stock so margin stays true.">
        <Link href="/purchase/vendor-invoices/new" className="rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium min-h-[44px] inline-flex items-center">
          Record supplier bill
        </Link>
      </PageHeader>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <ResponsiveDataList<Bill>
          columns={columns}
          data={list}
          keyField="id"
          emptyMessage="No supplier bills yet."
          emptyAction={
            <Link href="/purchase/vendor-invoices/new" className="inline-block rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium">
              Record supplier bill
            </Link>
          }
        />
      )}
    </div>
  );
}
