'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { limitDecimalPlaces } from '@/lib/money';

interface Company { id: string; name: string }
interface Branch { id: string; name: string }
interface Invoice {
  id: string;
  number: string;
  total: string | number;
  company_id?: string;
  balance_due?: string | number;
  customer?: { name: string };
  vendor?: { name: string };
}

const REASONS = [
  { code: 'sales_return', label: 'Sales return' },
  { code: 'post_sale_discount', label: 'Post-sale discount' },
  { code: 'deficiency', label: 'Deficiency in goods or service' },
  { code: 'rate_difference', label: 'Rate difference' },
  { code: 'other', label: 'Other' },
];

export default function NewCreditNotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetInvoice = searchParams?.get('invoice_id') ?? '';
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [invoiceId, setInvoiceId] = useState(presetInvoice);
  const [noteDate, setNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [taxable, setTaxable] = useState('');
  const [cgst, setCgst] = useState('');
  const [sgst, setSgst] = useState('');
  const [igst, setIgst] = useState('');
  const [reasonCode, setReasonCode] = useState('sales_return');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [cRes, invRes] = await Promise.all([
        apiGet<Company[] | { data: Company[] }>('organization/companies'),
        apiGet<Invoice[] | { data: Invoice[] }>('sales/invoices'),
      ]);
      const cList = Array.isArray(cRes.data) ? cRes.data : (cRes.data as { data?: Company[] })?.data ?? [];
      const invList = Array.isArray(invRes.data) ? invRes.data : (invRes.data as { data?: Invoice[] })?.data ?? [];
      setCompanies(cList);
      setInvoices(invList);
      const preset = invList.find((inv) => inv.id === presetInvoice);
      if (preset?.company_id) setCompanyId(preset.company_id);
      else if (cList.length) setCompanyId(cList[0].id);
      if (presetInvoice) setInvoiceId(presetInvoice);
    })();
  }, [presetInvoice]);

  useEffect(() => {
    if (!companyId) return;
    apiGet<Branch[] | { data: Branch[] }>(`organization/companies/${companyId}/branches`).then(({ data }) => {
      const list = Array.isArray(data) ? data : (data as { data?: Branch[] })?.data ?? [];
      setBranches(list);
      setBranchId(list[0]?.id ?? '');
    });
  }, [companyId]);

  useEffect(() => {
    const q = new URLSearchParams({ kind: 'credit_note', date: noteDate });
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
    const taxParts = [taxable, cgst, sgst, igst].map((v) => Number(v || 0));
    const taxSum = taxParts.reduce((s, n) => s + (Number.isFinite(n) ? n : 0), 0);
    const amt = taxSum > 0 ? Math.round(taxSum * 100) / 100 : parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setError(null);
    setLoading(true);
    const body = {
      company_id: companyId,
      branch_id: branchId || undefined,
      invoice_id: invoiceId,
      note_date: noteDate,
      amount: amt,
      taxable_amount: Number(taxable || 0),
      cgst_amount: Number(cgst || 0),
      sgst_amount: Number(sgst || 0),
      igst_amount: Number(igst || 0),
      reason_code: reasonCode,
      reason: reason || undefined,
    };
    const { error: err } = await apiPost('sales/credit-notes', body);
    setLoading(false);
    if (err) setError(err);
    else router.push('/sales/credit-notes');
  };

  const selectedInv = invoices.find((i) => i.id === invoiceId);

  return (
    <div>
      <Link href="/sales/credit-notes" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Credit notes</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Create credit note</h1>
      <p className="mb-4 text-sm text-slate-600">GST credit note against the original invoice. It reduces what the party still owes. The invoice number stays the same.</p>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <form onSubmit={submit} className="max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Company *</label>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Invoice *</label>
          <select value={invoiceId} onChange={(e) => {
            const id = e.target.value;
            setInvoiceId(id);
            const inv = invoices.find((row) => row.id === id);
            if (inv?.company_id) setCompanyId(inv.company_id);
          }} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select invoice</option>
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>{inv.number} — {inv.customer?.name ?? inv.vendor?.name ?? '—'} — ₹{Number(inv.total).toFixed(2)}</option>
            ))}
          </select>
          {selectedInv && <p className="text-xs text-slate-500 mt-0.5">Invoice total ₹{Number(selectedInv.total).toFixed(2)}{selectedInv.balance_due != null ? ` · still due ₹${Number(selectedInv.balance_due).toFixed(2)}` : ''}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Note date *</label>
          <input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          {preview && <p className="mt-1 text-xs text-slate-500">{preview}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">GST reason *</label>
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
          <label className="block text-sm font-medium text-slate-700 mb-1">Note amount *</label>
          <input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(limitDecimalPlaces(e.target.value))} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="0.00" />
          <p className="text-xs text-slate-500 mt-0.5">If you fill taxable and GST, the note total is their sum. Same-state notes use CGST and SGST. Other states use IGST.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Details</label>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Optional note" />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Issue credit note</button>
          <Link href="/sales/credit-notes" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
