'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';

interface Company { id: string; name: string }
interface Branch { id: string; name: string }
interface Customer { id: string; name: string }
interface Lead { id: string; name: string }
interface Item { id: string; name: string; sale_price?: string }

interface LineRow { item_id?: string; description: string; qty: number; unit: string; rate: number; tax_rate: number }

export default function NewQuotationPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [leadId, setLeadId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState('');
  const [lines, setLines] = useState<LineRow[]>([{ description: '', qty: 1, unit: 'pcs', rate: 0, tax_rate: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [cRes, custRes, leadRes, itemRes] = await Promise.all([
        apiGet<Company[] | { data: Company[] }>('organization/companies'),
        apiGet<Customer[] | { data: Customer[] }>('crm/customers'),
        apiGet<Lead[] | { data: Lead[] }>('crm/leads'),
        apiGet<Item[] | { data: Item[] }>('inventory/items'),
      ]);
      const cList = Array.isArray(cRes.data) ? cRes.data : (cRes.data as { data?: Company[] })?.data ?? [];
      const custList = Array.isArray(custRes.data) ? custRes.data : (custRes.data as { data?: Customer[] })?.data ?? [];
      const leadList = Array.isArray(leadRes.data) ? leadRes.data : (leadRes.data as { data?: Lead[] })?.data ?? [];
      const itemList = Array.isArray(itemRes.data) ? itemRes.data : (itemRes.data as { data?: Item[] })?.data ?? [];
      setCompanies(cList);
      setCustomers(custList);
      setLeads(leadList);
      setItems(itemList);
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

  const addLine = () => setLines((p) => [...p, { description: '', qty: 1, unit: 'pcs', rate: 0, tax_rate: 0 }]);
  const updateLine = (i: number, field: keyof LineRow, value: string | number) => {
    setLines((p) => p.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  };
  const removeLine = (i: number) => {
    if (lines.length <= 1) return;
    setLines((p) => p.filter((_, idx) => idx !== i));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId && !leadId) {
      setError('Select either Customer or Lead.');
      return;
    }
    setError(null);
    setLoading(true);
    const body = {
      company_id: companyId,
      branch_id: branchId || undefined,
      customer_id: customerId || undefined,
      lead_id: leadId || undefined,
      issue_date: issueDate,
      valid_until: validUntil || undefined,
      lines: lines.map((l) => ({
        item_id: l.item_id || undefined,
        description: l.description || undefined,
        qty: Number(l.qty),
        unit: l.unit,
        rate: Number(l.rate),
        tax_rate: Number(l.tax_rate),
      })),
    };
    const { data, error: err } = await apiPost<{ id: string }>('sales/quotations', body);
    setLoading(false);
    if (err) setError(err);
    else if (data && typeof data === 'object' && 'id' in data) router.push(`/sales/quotations/${(data as { id: string }).id}`);
    else router.push('/sales/quotations');
  };

  return (
    <div>
      <Link href="/sales/quotations" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Quotations</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Create quotation (draft)</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <form onSubmit={submit} className="space-y-6 max-w-3xl">
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setLeadId(''); }} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
                <option value="">—</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lead</label>
              <select value={leadId} onChange={(e) => { setLeadId(e.target.value); setCustomerId(''); }} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
                <option value="">—</option>
                {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Issue date *</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valid until</label>
              <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-medium text-slate-800">Lines</h2>
            <button type="button" onClick={addLine} className="text-sm text-brand-600 hover:underline">+ Add line</button>
          </div>
          <div className="space-y-3">
            {lines.map((line, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-end border-b border-slate-100 pb-2">
                <div className="w-40">
                  <label className="block text-xs text-slate-500 mb-0.5">Item</label>
                  <select value={line.item_id ?? ''} onChange={(e) => updateLine(i, 'item_id', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
                    <option value="">—</option>
                    {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs text-slate-500 mb-0.5">Description</label>
                  <input value={line.description} onChange={(e) => updateLine(i, 'description', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" placeholder="Description" />
                </div>
                <div className="w-16">
                  <label className="block text-xs text-slate-500 mb-0.5">Qty</label>
                  <input type="number" min={0} step={1} value={line.qty} onChange={(e) => updateLine(i, 'qty', e.target.valueAsNumber || 0)} className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
                </div>
                <div className="w-16">
                  <label className="block text-xs text-slate-500 mb-0.5">Unit</label>
                  <input value={line.unit} onChange={(e) => updateLine(i, 'unit', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
                </div>
                <div className="w-24">
                  <label className="block text-xs text-slate-500 mb-0.5">Rate</label>
                  <input type="number" min={0} step={0.01} value={line.rate} onChange={(e) => updateLine(i, 'rate', e.target.valueAsNumber || 0)} className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
                </div>
                <div className="w-16">
                  <label className="block text-xs text-slate-500 mb-0.5">Tax %</label>
                  <input type="number" min={0} step={0.01} value={line.tax_rate} onChange={(e) => updateLine(i, 'tax_rate', e.target.valueAsNumber || 0)} className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
                </div>
                <button type="button" onClick={() => removeLine(i)} className="text-red-600 text-sm hover:underline">Remove</button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Save as draft</button>
          <Link href="/sales/quotations" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
