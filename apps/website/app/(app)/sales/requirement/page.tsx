'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';

interface Customer { id: string; name: string }
interface Item { id: string; name: string; unit?: string }
interface Company { id: string; name: string }
interface OrderLine { item_id?: string; item?: { name: string }; description?: string; quantity: string; rate: string; unit?: string }
interface SalesOrder { id: string; number: string; order_date: string; customer_id?: string; customer?: { name: string }; lines?: OrderLine[] }
interface RequirementRow { order: SalesOrder; lines: Array<{ line: OrderLine & { item?: { name: string }; id: string }; delivered_qty: number; pending_qty: number }> }

export default function RequirementPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [orderDate, setOrderDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 16);
  });
  const [lines, setLines] = useState<Array<{ item_id: string; item_name: string; qty: number; rate: number; unit: string }>>([]);
  const [reqVsDel, setReqVsDel] = useState<RequirementRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [cRes, custRes, iRes] = await Promise.all([
        apiGet<Company[] | Company>('organization/companies'),
        apiGet<Customer[] | Customer>('crm/customers'),
        apiGet<Item[] | Item>('inventory/items'),
      ]);
      const cList = Array.isArray((cRes as { data?: unknown }).data) ? (cRes as { data: Company[] }).data : [];
      const custList = Array.isArray((custRes as { data?: unknown }).data) ? (custRes as { data: Customer[] }).data : [];
      const iList = Array.isArray((iRes as { data?: unknown }).data) ? (iRes as { data: Item[] }).data : [];
      setCompanies(cList);
      setCustomers(custList);
      setItems(iList);
      if (cList.length) setCompanyId(cList[0].id);
    })();
  }, []);

  useEffect(() => {
    apiGet<RequirementRow[]>('sales/requirement-vs-delivery').then((r) => {
      const data = (r as { data?: RequirementRow[] }).data;
      setReqVsDel(Array.isArray(data) ? data : []);
    });
  }, []);

  const addLine = () => {
    setLines((prev) => [...prev, { item_id: '', item_name: '', qty: 0, rate: 0, unit: 'pcs' }]);
  };

  const updateLine = (idx: number, f: Partial<typeof lines[0]>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...f } : l)));
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const submitRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!companyId || !customerId) {
      setError('Select company and customer.');
      return;
    }
    const validLines = lines.filter((l) => l.item_id && l.qty > 0);
    if (validLines.length === 0) {
      setError('Add at least one line (product, qty, rate).');
      return;
    }
    setLoading(true);
    const [datePart] = orderDate.split('T');
    const body = {
      company_id: companyId,
      customer_id: customerId,
      order_date: datePart,
      lines: validLines.map((l) => ({ item_id: l.item_id, qty: l.qty, rate: l.rate, unit: l.unit || 'pcs' })),
    };
    const res = await apiPost('sales/orders', body);
    setLoading(false);
    if ((res as { error?: string }).error) setError((res as { error: string }).error);
    else {
      setLines([]);
      const r = await apiGet<RequirementRow[]>('sales/requirement-vs-delivery');
      setReqVsDel(Array.isArray((r as { data?: RequirementRow[] }).data) ? (r as { data: RequirementRow[] }).data : []);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Requirement</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}

      <form onSubmit={submitRequirement} className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">New requirement</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date & time *</label>
            <input
              type="datetime-local"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              required
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer *</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700">Products</span>
          <button type="button" onClick={addLine} className="text-sm text-brand-600 hover:text-brand-700">+ Add line</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 text-left">
                <th className="py-2 pr-2">Product</th>
                <th className="py-2 pr-2 w-24">Qty</th>
                <th className="py-2 pr-2 w-28">Rate</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="py-1 pr-2">
                    <select
                      value={l.item_id}
                      onChange={(e) => {
                        const it = items.find((i) => i.id === e.target.value);
                        updateLine(idx, { item_id: e.target.value, item_name: it?.name ?? '', unit: it?.unit ?? 'pcs' });
                      }}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    >
                      <option value="">Select product</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={l.qty || ''}
                      onChange={(e) => updateLine(idx, { qty: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={l.rate || ''}
                      onChange={(e) => updateLine(idx, { rate: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td>
                    <button type="button" onClick={() => removeLine(idx)} className="text-red-600 hover:text-red-700 text-sm">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Save requirement</button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Requirement vs Delivery</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 text-left">
                <th className="py-2 pr-2">Order</th>
                <th className="py-2 pr-2">Customer</th>
                <th className="py-2 pr-2">Product</th>
                <th className="py-2 pr-2 text-right">Required</th>
                <th className="py-2 pr-2 text-right">Delivered</th>
                <th className="py-2 pr-2 text-right">Pending</th>
              </tr>
            </thead>
            <tbody>
              {reqVsDel.length === 0 && (
                <tr><td colSpan={6} className="py-4 text-slate-500">No requirements yet.</td></tr>
              )}
              {reqVsDel.map(({ order, lines: orderLines }) =>
                orderLines.map(({ line, delivered_qty, pending_qty }) => (
                  <tr key={`${order.id}-${line.id}`} className="border-b border-slate-100">
                    <td className="py-2 pr-2">{order.number}</td>
                    <td className="py-2 pr-2">{(order as SalesOrder).customer?.name ?? '—'}</td>
                    <td className="py-2 pr-2">{line.item?.name ?? line.description ?? '—'}</td>
                    <td className="py-2 pr-2 text-right">{line.quantity}</td>
                    <td className="py-2 pr-2 text-right">{delivered_qty}</td>
                    <td className="py-2 pr-2 text-right">{pending_qty}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
