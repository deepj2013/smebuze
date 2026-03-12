'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';

interface Company { id: string; name: string }
interface Branch { id: string; name: string }
interface Customer { id: string; name: string }
interface SalesOrder { id: string; number: string; customer_id?: string | null }

export default function NewDeliveryChallanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams?.get('order_id') ?? '';
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [orderId, setOrderId] = useState(orderIdParam);
  const [challanDate, setChallanDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [cRes, custRes, oRes] = await Promise.all([
        apiGet<Company[] | { data: Company[] }>('organization/companies'),
        apiGet<Customer[] | { data: Customer[] }>('crm/customers'),
        apiGet<SalesOrder[] | { data: SalesOrder[] }>('sales/orders'),
      ]);
      const cList = Array.isArray(cRes.data) ? cRes.data : (cRes.data as { data?: Company[] })?.data ?? [];
      const custList = Array.isArray(custRes.data) ? custRes.data : (custRes.data as { data?: Customer[] })?.data ?? [];
      const oList = Array.isArray(oRes.data) ? oRes.data : (oRes.data as { data?: SalesOrder[] })?.data ?? [];
      setCompanies(cList);
      setCustomers(custList);
      setOrders(oList);
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
    if (orderIdParam) setOrderId(orderIdParam);
  }, [orderIdParam]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const body = {
      company_id: companyId,
      branch_id: branchId || undefined,
      customer_id: customerId || undefined,
      order_id: orderId || undefined,
      challan_date: challanDate,
    };
    const { error: err } = await apiPost('sales/delivery-challans', body);
    setLoading(false);
    if (err) setError(err);
    else router.push('/sales/delivery-challans');
  };

  return (
    <div>
      <Link href="/sales/delivery-challans" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Delivery challans</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Create delivery challan</h1>
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
          <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Sales order</label>
          <select value={orderId} onChange={(e) => setOrderId(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            {orders.map((o) => <option key={o.id} value={o.id}>{o.number}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Challan date *</label>
          <input type="date" value={challanDate} onChange={(e) => setChallanDate(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Create</button>
          <Link href="/sales/delivery-challans" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
