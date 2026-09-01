'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import PrintDocument from '@/app/(app)/components/PrintDocument';
import { apiGet } from '@/lib/api';
import type { ReceiptPayload } from '@/lib/printers';

interface InvoicePrintSource {
  number?: string;
  invoice_date?: string;
  total?: string | number;
  paid_amount?: string | number;
  gst_applicable?: boolean;
  company?: { name?: string; gstin?: string };
  customer?: { name?: string } | null;
  vendor?: { name?: string } | null;
  lines?: Array<{ description?: string; qty?: string | number; taxable_value?: string | number }>;
}

export default function InvoicePrintPage() {
  const params = useParams();
  const id = params.id as string;
  const [receipt, setReceipt] = useState<ReceiptPayload | null>(null);

  useEffect(() => {
    apiGet<InvoicePrintSource>(`sales/invoices/${id}`).then(({ data }) => {
      if (!data) return;
      const total = Number(data.total ?? 0);
      const paid = Number(data.paid_amount ?? 0);
      setReceipt({
        company: data.company?.name || 'SMEBUZZ',
        gstin: data.company?.gstin,
        title: data.gst_applicable ? 'TAX INVOICE' : 'INVOICE',
        number: data.number || id,
        date: typeof data.invoice_date === 'string' ? data.invoice_date.slice(0, 10) : '',
        billTo: data.customer?.name || data.vendor?.name || 'Customer',
        lines: (data.lines ?? []).map((l) => ({
          description: String(l.description ?? ''),
          qty: l.qty ?? '',
          amount: l.taxable_value ?? 0,
        })),
        total: total.toFixed(2),
        paid: paid.toFixed(2),
        due: (total - paid).toFixed(2),
        footer: 'Thank you | SMEBUZZ',
      });
    });
  }, [id]);

  return <PrintDocument title="Invoice" fetchPath={`sales/invoices/${id}/print`} receipt={receipt} />;
}
