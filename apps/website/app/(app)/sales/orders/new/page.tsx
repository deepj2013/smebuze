'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';

interface Company { id: string; name: string }
interface Branch { id: string; name: string }
interface Customer { id: string; name: string }
interface Quotation { id: string; number: string; customer_id?: string | null; lead_id?: string | null; customer?: { name: string }; lead?: { name: string } }

export default function NewSalesOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quotationIdParam = searchParams?.get('quotation_id') ?? '';
  const [quotationId, setQuotationId] = useState(quotationIdParam);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [cRes, custRes, qRes] = await Promise.all([
        apiGet<Company[] | { data: Company[] }>('organization/companies'),
        apiGet<Customer[] | { data: Customer[] }>('crm/customers'),
        apiGet<Quotation[] | { data: Quotation[] }>('sales/quotations'),
      ]);
      const cList = Array.isArray(cRes.data) ? cRes.data : (cRes.data as { data?: Company[] })?.data ?? [];
      const custList = Array.isArray(custRes.data) ? custRes.data : (custRes.data as { data?: Customer[] })?.data ?? [];
      const qList = Array.isArray(qRes.data) ? qRes.data : (qRes.data as { data?: Quotation[] })?.data ?? [];
      setCompanies(cList);
      setCustomers(custList);
      setQuotations(qList);
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

  useEffect(() => {
    if (quotationIdParam) setQuotationId(quotationIdParam);
  }, [quotationIdParam]);

  useEffect(() => {
    if (quotationId && quotations.length) {
      const q = quotations.find((x) => x.id === quotationId);
      if (q) setCustomerId((q as { customer_id?: string }).customer_id ?? '');
    }
  }, [quotationId, quotations]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const body = {
      company_id: companyId,
      branch_id: branchId || undefined,
      customer_id: customerId || undefined,
      quotation_id: quotationId || undefined,
      order_date: orderDate,
    };
    const { data, error: err } = await apiPost<{ id: string }>('sales/orders', body);
    setLoading(false);
    if (err) setError(err);
    else if (data && typeof data === 'object' && 'id' in data) router.push(`/sales/orders/${(data as { id: string }).id}`);
    else router.push('/sales/orders');
  };

  return (
    <div>
      <Link href="/sales/orders" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Sales orders</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Create sales order</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <form onSubmit={submit} className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        {quotations.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Link from quotation</label>
            <select value={quotationId} onChange={(e) => setQuotationId(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" aria-label="Quotation">
              <option value="">— None</option>
              {quotations.map((q) => (
                <option key={q.id} value={q.id}>{q.number} — {q.customer?.name ?? q.lead?.name ?? '—'}</option>
              ))}
            </select>
          </div>
        )}
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
          <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Order date *</label>
          <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Create</button>
          <Link href="/sales/orders" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
