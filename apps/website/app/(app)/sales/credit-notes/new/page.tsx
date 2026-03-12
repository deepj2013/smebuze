'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';

interface Company { id: string; name: string }
interface Branch { id: string; name: string }
interface Invoice { id: string; number: string; total: string | number; customer?: { name: string } }

export default function NewCreditNotePage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [noteDate, setNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
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
      if (cList.length) setCompanyId(cList[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!companyId) return;
    apiGet<Branch[] | { data: Branch[] }>(`organization/companies/${companyId}/branches`).then(({ data }) => {
      const list = Array.isArray(data) ? data : (data as { data?: Branch[] })?.data ?? [];
      setBranches(list);
      setBranchId(list[0]?.id ?? '');
    });
  }, [companyId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId) {
      setError('Select an invoice.');
      return;
    }
    const amt = parseFloat(amount);
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
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Create credit note</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <form onSubmit={submit} className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6">
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
          <select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select invoice</option>
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>{inv.number} — {inv.customer?.name ?? '—'} — ₹{Number(inv.total).toFixed(2)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Note date *</label>
          <input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Amount * (reduces receivable)</label>
          <input type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="0.00" />
          {selectedInv && <p className="text-xs text-slate-500 mt-0.5">Invoice total: ₹{Number(selectedInv.total).toFixed(2)}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Return, discount, etc." />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Create</button>
          <Link href="/sales/credit-notes" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
