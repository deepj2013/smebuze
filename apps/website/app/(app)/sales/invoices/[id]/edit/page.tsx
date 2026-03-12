'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';

interface Company { id: string; name: string }
interface Branch { id: string; name: string }
interface Customer { id: string; name: string }
interface Vendor { id: string; name: string }

interface LineRow {
  hsn_sac: string;
  description: string;
  qty: number;
  unit: string;
  rate: number;
  cgst_rate: number;
  sgst_rate: number;
}

interface InvoiceLine {
  hsn_sac: string;
  description: string;
  qty: string | number;
  unit: string;
  rate: string | number;
  cgst_rate: string | number;
  sgst_rate: string | number;
}

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [number, setNumber] = useState('');
  const [lines, setLines] = useState<LineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [invRes, cRes, custRes, vRes] = await Promise.all([
        apiGet<{
          id: string;
          company_id: string;
          branch_id?: string | null;
          customer_id?: string | null;
          vendor_id?: string | null;
          number: string;
          invoice_date: string;
          due_date?: string | null;
          lines?: InvoiceLine[];
        }>(`sales/invoices/${id}`),
        apiGet<Company[] | { data: Company[] }>('organization/companies'),
        apiGet<Customer[] | { data: Customer[] }>('crm/customers'),
        apiGet<Vendor[] | { data: Vendor[] }>('purchase/vendors'),
      ]);
      const inv = invRes.data;
      const cList = Array.isArray(cRes.data) ? cRes.data : (cRes.data as { data?: Company[] })?.data ?? [];
      const custList = Array.isArray(custRes.data) ? custRes.data : (custRes.data as { data?: Customer[] })?.data ?? [];
      const vList = Array.isArray(vRes.data) ? vRes.data : (vRes.data as { data?: Vendor[] })?.data ?? [];
      setCompanies(cList);
      setCustomers(custList);
      setVendors(vList);
      if (inv) {
        setCompanyId(inv.company_id);
        setBranchId(inv.branch_id || '');
        setCustomerId(inv.customer_id || '');
        setVendorId(inv.vendor_id || '');
        setNumber(inv.number);
        setInvoiceDate(typeof inv.invoice_date === 'string' ? inv.invoice_date.slice(0, 10) : '');
        setDueDate(inv.due_date ? (typeof inv.due_date === 'string' ? inv.due_date.slice(0, 10) : '') : '');
        if (inv.lines?.length) {
          setLines(inv.lines.map((l) => ({
            hsn_sac: l.hsn_sac,
            description: l.description,
            qty: Number(l.qty),
            unit: l.unit || 'pcs',
            rate: Number(l.rate),
            cgst_rate: Number(l.cgst_rate),
            sgst_rate: Number(l.sgst_rate),
          })));
        } else {
          setLines([{ hsn_sac: '9983', description: '', qty: 1, unit: 'pcs', rate: 0, cgst_rate: 9, sgst_rate: 9 }]);
        }
      }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (!companyId) return;
    apiGet<Branch[] | { data: Branch[] }>(`organization/companies/${companyId}/branches`).then(({ data }) => {
      const list = Array.isArray(data) ? data : (data as { data?: Branch[] })?.data ?? [];
      setBranches(list);
      if (!branchId && list.length) setBranchId(list[0].id);
    });
  }, [companyId]);

  const addLine = () => {
    setLines((prev) => [...prev, { hsn_sac: '9983', description: '', qty: 1, unit: 'pcs', rate: 0, cgst_rate: 9, sgst_rate: 9 }]);
  };

  const updateLine = (i: number, field: keyof LineRow, value: string | number) => {
    setLines((prev) => prev.map((line, idx) => (idx === i ? { ...line, [field]: value } : line)));
  };

  const removeLine = (i: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (customerId && vendorId) {
      setError('Select only one: Customer or Vendor.');
      return;
    }
    setError(null);
    setSaving(true);
    const body = {
      company_id: companyId,
      branch_id: branchId || undefined,
      customer_id: customerId || undefined,
      vendor_id: vendorId || undefined,
      invoice_date: invoiceDate,
      due_date: dueDate || undefined,
      number: number || undefined,
      lines: lines.map((l) => ({
        hsn_sac: l.hsn_sac,
        description: l.description || 'Item',
        qty: l.qty,
        unit: l.unit,
        rate: l.rate,
        cgst_rate: l.cgst_rate,
        sgst_rate: l.sgst_rate,
      })),
    };
    const { error: err } = await apiPatch(`sales/invoices/${id}`, body);
    setSaving(false);
    if (err) setError(err);
    else router.push('/sales/invoices');
  };

  if (loading) {
    return (
      <div>
        <Link href="/sales/invoices" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Invoices</Link>
        <p className="text-slate-600">Loading invoice…</p>
      </div>
    );
  }

  return (
    <div>
      <Link href="/sales/invoices" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Invoices</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Edit invoice</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <form onSubmit={submit} className="space-y-6 max-w-4xl">
        <div className="rounded-xl border border-slate-200 bg-white p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company *</label>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Bill to: Customer</label>
            <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setVendorId(''); }} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
              <option value="">—</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bill to: Vendor</label>
            <select value={vendorId} onChange={(e) => { setVendorId(e.target.value); setCustomerId(''); }} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
              <option value="">—</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Invoice date *</label>
            <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Invoice number</label>
            <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-slate-900">Line items</h2>
            <button type="button" onClick={addLine} className="text-sm text-brand-600 hover:underline">+ Add line</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="text-left py-2 pr-2">HSN/SAC</th>
                  <th className="text-left py-2 pr-2">Description</th>
                  <th className="text-right py-2 pr-2">Qty</th>
                  <th className="text-left py-2 pr-2">Unit</th>
                  <th className="text-right py-2 pr-2">Rate</th>
                  <th className="text-right py-2 pr-2">CGST %</th>
                  <th className="text-right py-2 pr-2">SGST %</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-1 pr-2"><input type="text" value={line.hsn_sac} onChange={(e) => updateLine(i, 'hsn_sac', e.target.value)} className="w-20 rounded border border-slate-300 px-2 py-1 text-sm" /></td>
                    <td className="py-1 pr-2"><input type="text" value={line.description} onChange={(e) => updateLine(i, 'description', e.target.value)} className="w-full min-w-[120px] rounded border border-slate-300 px-2 py-1 text-sm" /></td>
                    <td className="py-1 pr-2"><input type="number" min={0} step={1} value={line.qty} onChange={(e) => updateLine(i, 'qty', parseFloat(e.target.value) || 0)} className="w-16 rounded border border-slate-300 px-2 py-1 text-sm text-right" /></td>
                    <td className="py-1 pr-2"><input type="text" value={line.unit} onChange={(e) => updateLine(i, 'unit', e.target.value)} className="w-14 rounded border border-slate-300 px-2 py-1 text-sm" /></td>
                    <td className="py-1 pr-2"><input type="number" min={0} step={0.01} value={line.rate} onChange={(e) => updateLine(i, 'rate', parseFloat(e.target.value) || 0)} className="w-20 rounded border border-slate-300 px-2 py-1 text-sm text-right" /></td>
                    <td className="py-1 pr-2"><input type="number" min={0} step={0.01} value={line.cgst_rate} onChange={(e) => updateLine(i, 'cgst_rate', parseFloat(e.target.value) || 0)} className="w-14 rounded border border-slate-300 px-2 py-1 text-sm text-right" /></td>
                    <td className="py-1 pr-2"><input type="number" min={0} step={0.01} value={line.sgst_rate} onChange={(e) => updateLine(i, 'sgst_rate', parseFloat(e.target.value) || 0)} className="w-14 rounded border border-slate-300 px-2 py-1 text-sm text-right" /></td>
                    <td className="py-1"><button type="button" onClick={() => removeLine(i)} className="text-red-600 text-xs hover:underline">Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Save changes</button>
          <Link href="/sales/invoices" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
          <Link href={`/sales/invoices/${id}/print`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Print</Link>
        </div>
      </form>
    </div>
  );
}
