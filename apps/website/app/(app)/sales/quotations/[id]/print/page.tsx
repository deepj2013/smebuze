'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import PrintDocument from '@/app/(app)/components/PrintDocument';
import { apiGet } from '@/lib/api';
import type { ReceiptPayload } from '@/lib/printers';

interface QuotationPrintSource {
  number?: string;
  quotation_date?: string;
  date?: string;
  total?: string | number;
  company?: { name?: string; gstin?: string };
  customer?: { name?: string } | null;
  lead?: { name?: string } | null;
  lines?: Array<{ description?: string; qty?: string | number; taxable_value?: string | number; amount?: string | number }>;
}

export default function QuotationPrintPage() {
  const params = useParams();
  const id = params.id as string;
  const [receipt, setReceipt] = useState<ReceiptPayload | null>(null);

  useEffect(() => {
    apiGet<QuotationPrintSource>(`sales/quotations/${id}`).then(({ data }) => {
      if (!data) return;
      setReceipt({
        company: data.company?.name || 'SMEBUZZ',
        gstin: data.company?.gstin,
        title: 'QUOTATION',
        number: data.number || id,
        date: String(data.quotation_date || data.date || '').slice(0, 10),
        billTo: data.customer?.name || data.lead?.name || 'Customer',
        lines: (data.lines ?? []).map((l) => ({
          description: String(l.description ?? ''),
          qty: l.qty ?? '',
          amount: l.taxable_value ?? l.amount ?? 0,
        })),
        total: Number(data.total ?? 0).toFixed(2),
        footer: 'Thank you | SMEBUZZ',
      });
    });
  }, [id]);

  return <PrintDocument title="Quotation" fetchPath={`sales/quotations/${id}/print`} receipt={receipt} />;
}
