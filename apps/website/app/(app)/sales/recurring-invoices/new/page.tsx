'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { useToast } from '@/app/(app)/components/ToastContext';

interface Company { id: string; name: string }
interface Customer { id: string; name: string }
interface Invoice { id: string; number: string }

export default function NewRecurringInvoicePage() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [templateInvoiceId, setTemplateInvoiceId] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [nextRunAt, setNextRunAt] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [cRes, custRes, invRes] = await Promise.all([
        apiGet<Company[] | { data: Company[] }>('organization/companies'),
        apiGet<Customer[] | { data: Customer[] }>('crm/customers'),
        apiGet<Invoice[] | { data: Invoice[] }>('sales/invoices'),
      ]);
      const cList = Array.isArray(cRes.data) ? cRes.data : (cRes.data as { data?: Company[] })?.data ?? [];
      const custList = Array.isArray(custRes.data) ? custRes.data : (custRes.data as { data?: Customer[] })?.data ?? [];
      const invList = Array.isArray(invRes.data) ? invRes.data : (invRes.data as { data?: Invoice[] })?.data ?? [];
      setCompanies(cList);
      setCustomers(custList);
      setInvoices(invList);
      if (cList.length) setCompanyId(cList[0].id);
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const body = {
      company_id: companyId,
      customer_id: customerId || undefined,
      frequency,
      next_run_at: nextRunAt,
      template_invoice_id: templateInvoiceId || undefined,
    };
    const { error: err } = await apiPost('sales/recurring-invoices', body);
    setLoading(false);
    if (err) {
      setError(err);
      showError(err);
    } else {
      success('Recurring invoice created');
      router.push('/sales/recurring-invoices');
    }
  };

  return (
    <div>
      <Link href="/sales/recurring-invoices" className="text-sm text-slate-600 mb-4 inline-block">← Recurring invoices</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Create recurring invoice</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <form onSubmit={submit} className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Company *</label>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Template invoice (copy lines from)</label>
          <select value={templateInvoiceId} onChange={(e) => setTemplateInvoiceId(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">— Select invoice</option>
            {invoices.map((i) => <option key={i.id} value={i.id}>{i.number}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Frequency *</label>
          <select value={frequency} onChange={(e) => setFrequency(e.target.value as typeof frequency)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Next run date *</label>
          <input type="date" value={nextRunAt} onChange={(e) => setNextRunAt(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
          {loading ? 'Saving…' : 'Create'}
        </button>
      </form>
    </div>
  );
}
