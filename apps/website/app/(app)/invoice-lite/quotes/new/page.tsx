'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { LITE } from '@/lib/invoice-lite-copy';

interface Company { id: string; name: string }
interface Customer { id: string; name: string }

export default function InvoiceLiteNewQuotePage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [cRes, custRes] = await Promise.all([
        apiGet<Company[] | { data: Company[] }>('organization/companies'),
        apiGet<Customer[] | { data: Customer[] }>('crm/customers'),
      ]);
      const cList = Array.isArray(cRes.data) ? cRes.data : (cRes.data as { data?: Company[] })?.data ?? [];
      const custList = Array.isArray(custRes.data) ? custRes.data : (custRes.data as { data?: Customer[] })?.data ?? [];
      setCompanies(cList);
      setCustomers(custList);
      if (cList.length) setCompanyId(cList[0].id);
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !customerId) {
      setError('Pick a customer first.');
      return;
    }
    const rate = Number(amount);
    if (!description.trim() || !Number.isFinite(rate) || rate <= 0) {
      setError('Enter work description and amount.');
      return;
    }
    setLoading(true);
    setError(null);
    const issueDate = new Date().toISOString().slice(0, 10);
    const { data, error: err } = await apiPost<{ id: string }>('sales/quotations', {
      company_id: companyId,
      customer_id: customerId,
      issue_date: issueDate,
      lines: [{ description: description.trim(), qty: 1, unit: 'job', rate, tax_rate: 0 }],
    });
    if (err || !data?.id) {
      setLoading(false);
      setError(err || 'Could not save estimate.');
      return;
    }
    if (remark.trim()) {
      await apiPatch(`sales/quotations/${data.id}`, { internal_note: remark.trim() });
    }
    setLoading(false);
    router.push(`/invoice-lite/quotes/${data.id}`);
  };

  return (
    <div className="mx-auto max-w-lg pb-8">
      <Link href="/invoice-lite/quotes" className="text-sm text-slate-600 hover:text-slate-900">← {LITE.estimates.en}</Link>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">{LITE.newEstimate.en}</h1>
      <p className="text-sm text-slate-500">{LITE.newEstimate.hi}</p>

      <form onSubmit={submit} className="mt-6 space-y-5">
        <div>
          <label className="block text-base font-medium text-slate-800">{LITE.customers.en}</label>
          <p className="text-xs text-slate-500 mb-1">{LITE.customers.hi}</p>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-lg min-h-[52px] bg-white"
            required
          >
            <option value="">— choose —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Link href="/crm/customers/new" className="mt-2 inline-block text-sm text-brand-600 underline">+ New customer</Link>
        </div>

        <div>
          <label className="block text-base font-medium text-slate-800">Work / description</label>
          <p className="text-xs text-slate-500 mb-1">क्या काम — short line is OK</p>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Bathroom tiles — labour + material"
            className="mt-1 w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-lg min-h-[52px]"
          />
        </div>

        <div>
          <label className="block text-base font-medium text-slate-800">Total amount (₹)</label>
          <p className="text-xs text-slate-500 mb-1">कुल रकम</p>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-2xl font-semibold min-h-[56px] tabular-nums"
          />
        </div>

        <div>
          <label className="block text-base font-medium text-slate-800">{LITE.remark.en}</label>
          <p className="text-xs text-slate-500 mb-1">{LITE.remark.hi}</p>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={3}
            placeholder="e.g. Site visit done, waiting for material"
            className="mt-1 w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-base"
          />
        </div>

        {error && <div className="rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-brand-600 py-4 text-lg font-bold text-white hover:bg-brand-700 disabled:opacity-50 min-h-[56px]"
        >
          {loading ? 'Saving…' : 'Save estimate'}
        </button>
      </form>
      {companies[0] ? null : <p className="mt-4 text-sm text-amber-800">Add your company in Organization first.</p>}
    </div>
  );
}
