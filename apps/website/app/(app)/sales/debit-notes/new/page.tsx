'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { limitDecimalPlaces } from '@/lib/money';

interface Invoice {
  id: string;
  number: string;
  total: string | number;
  company_id?: string;
  customer?: { name: string };
  vendor?: { name: string };
}

const REASONS = [
  { code: 'price_increase', label: 'Price increased after invoice' },
  { code: 'additional_charges', label: 'Additional charges' },
  { code: 'rate_difference', label: 'Rate difference' },
  { code: 'other', label: 'Other' },
];

export default function NewSalesDebitNotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetInvoice = searchParams?.get('invoice_id') ?? '';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceId, setInvoiceId] = useState(presetInvoice);
  const [companyId, setCompanyId] = useState('');
  const [noteDate, setNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [taxable, setTaxable] = useState('');
  const [cgst, setCgst] = useState('');
  const [sgst, setSgst] = useState('');
  const [igst, setIgst] = useState('');
  const [reasonCode, setReasonCode] = useState('price_increase');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Invoice[] | { data: Invoice[] }>('sales/invoices').then(({ data }) => {
      const list = Array.isArray(data) ? data : (data as { data?: Invoice[] })?.data ?? [];
      setInvoices(list);
      const preset = list.find((inv) => inv.id === presetInvoice);
      if (preset?.company_id) setCompanyId(preset.company_id);
      if (presetInvoice) setInvoiceId(presetInvoice);
    });
  }, [presetInvoice]);

  useEffect(() => {
    const q = new URLSearchParams({ kind: 'sales_debit_note', date: noteDate });
    if (companyId) q.set('company_id', companyId);
    apiGet<{ message?: string; number?: string | null }>(`sales/document-series/preview?${q}`).then((res) => {
      setPreview(res.data?.number ? `Next number: ${res.data.number}` : res.data?.message || '');
    });
  }, [noteDate, companyId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId) {
      setError('Select an invoice.');
      return;
    }
    const taxSum = [taxable, cgst, sgst, igst].reduce((s, v) => s + Number(v || 0), 0);
    const amt = taxSum > 0 ? Math.round(taxSum * 100) / 100 : parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: err } = await apiPost('sales/debit-notes', {
      company_id: companyId || invoices.find((inv) => inv.id === invoiceId)?.company_id,
      invoice_id: invoiceId,
      note_date: noteDate,
      amount: amt,
      taxable_amount: Number(taxable || 0),
      cgst_amount: Number(cgst || 0),
      sgst_amount: Number(sgst || 0),
      igst_amount: Number(igst || 0),
      reason_code: reasonCode,
      reason: reason || undefined,
    });
    setLoading(false);
    if (err) setError(err);
    else router.push('/sales/debit-notes');
  };

  return (
    <div>
      <Link href="/sales/debit-notes" className="mb-4 inline-block text-sm text-slate-600 hover:text-slate-900">← Debit notes</Link>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Create debit note</h1>
      <p className="mb-4 text-sm text-slate-600">Use this when the invoice should have been higher. The original invoice stays, and the extra amount becomes due.</p>
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      <form onSubmit={submit} className="max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Invoice *</label>
          <select value={invoiceId} onChange={(e) => {
            setInvoiceId(e.target.value);
            const inv = invoices.find((row) => row.id === e.target.value);
            if (inv?.company_id) setCompanyId(inv.company_id);
          }} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select invoice</option>
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>{inv.number} — {inv.customer?.name ?? inv.vendor?.name ?? '—'} — ₹{Number(inv.total).toFixed(2)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Note date *</label>
          <input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          {preview && <p className="mt-1 text-xs text-slate-500">{preview}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">GST reason *</label>
          <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            {REASONS.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">Taxable<input value={taxable} onChange={(e) => setTaxable(limitDecimalPlaces(e.target.value))} className="mt-1 w-full rounded border px-3 py-2" /></label>
          <label className="text-sm">CGST<input value={cgst} onChange={(e) => setCgst(limitDecimalPlaces(e.target.value))} className="mt-1 w-full rounded border px-3 py-2" /></label>
          <label className="text-sm">SGST<input value={sgst} onChange={(e) => setSgst(limitDecimalPlaces(e.target.value))} className="mt-1 w-full rounded border px-3 py-2" /></label>
          <label className="text-sm">IGST<input value={igst} onChange={(e) => setIgst(limitDecimalPlaces(e.target.value))} className="mt-1 w-full rounded border px-3 py-2" /></label>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Note amount *</label>
          <input value={amount} onChange={(e) => setAmount(limitDecimalPlaces(e.target.value))} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="0.00" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Details</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">Issue debit note</button>
          <Link href="/sales/debit-notes" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
