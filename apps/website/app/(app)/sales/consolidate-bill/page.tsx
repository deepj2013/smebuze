'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';

interface Customer { id: string; name: string }
interface Company { id: string; name: string }
interface DeliveryChallan { id: string; number: string; challan_date: string; customer_id?: string; customer?: { name: string } }

export default function ConsolidateBillPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = new Date();
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    setFromDate(first.toISOString().slice(0, 10));
    setToDate(d.toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    (async () => {
      const [cRes, custRes] = await Promise.all([
        apiGet<Company[] | { data: Company[] }>('organization/companies'),
        apiGet<Customer[] | { data: Customer[] }>('crm/customers'),
      ]);
      const cList = Array.isArray((cRes as { data?: unknown }).data) ? (cRes as { data: Company[] }).data : [];
      const custList = Array.isArray((custRes as { data?: unknown }).data) ? (custRes as { data: Customer[] }).data : [];
      setCompanies(cList);
      setCustomers(custList);
      if (cList.length) setCompanyId(cList[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!customerId || !fromDate || !toDate) return;
    apiGet<DeliveryChallan[] | { data: DeliveryChallan[] }>(
      `sales/delivery-challans?customer_id=${customerId}&from_date=${fromDate}&to_date=${toDate}&not_invoiced=true`
    ).then((r) => {
      const data = (r as { data?: DeliveryChallan[] }).data;
      setChallans(Array.isArray(data) ? data : []);
    });
  }, [customerId, fromDate, toDate]);

  const generateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!companyId || !customerId || challans.length === 0) {
      setError('Select customer and date range. At least one uninvoiced delivery challan must be in range.');
      return;
    }
    setLoading(true);
    const res = await apiPost('sales/invoices/from-challans', {
      company_id: companyId,
      customer_id: customerId,
      challan_ids: challans.map((c) => c.id),
      invoice_date: invoiceDate,
    });
    setLoading(false);
    if ((res as { error?: string }).error) setError((res as { error: string }).error);
    else {
      const inv = (res as { data?: { id: string } }).data;
      if (inv?.id) window.location.href = `/sales/invoices/${inv.id}`;
      else setChallans([]);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Generate consolidate bill</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}

      <form onSubmit={generateInvoice} className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer *</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From date *</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To date *</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Invoice date *</label>
            <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-medium text-slate-700 mb-2">Delivery challans in range (not yet invoiced)</h3>
          {challans.length === 0 && <p className="text-sm text-slate-500">No uninvoiced challans for this customer in the selected date range.</p>}
          <ul className="list-disc list-inside text-sm text-slate-700">
            {challans.map((c) => (
              <li key={c.id}>{c.number} – {typeof c.challan_date === 'string' ? c.challan_date.slice(0, 10) : c.challan_date}</li>
            ))}
          </ul>
        </div>

        <button type="submit" disabled={loading || challans.length === 0} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
          Generate consolidated invoice
        </button>
      </form>

      <p className="text-sm text-slate-600">
        <Link href="/sales/invoices" className="text-brand-600 hover:underline">View all invoices</Link>
      </p>
    </div>
  );
}
