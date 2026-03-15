'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { REQUIREMENT_CHANNEL_OPTIONS } from '@/lib/requirement-channels';

const GST_TREATMENT_OPTIONS = [
  { value: 'extra', label: 'GST extra' },
  { value: 'inclusive', label: 'Incl. GST' },
] as const;

interface Customer { id: string; name: string }
interface Item { id: string; name: string; unit?: string; mrp?: string | number | null }
interface Company { id: string; name: string }
interface OrderLine {
  item_id?: string;
  item?: { name: string };
  description?: string;
  quantity: string;
  rate: string;
  unit?: string;
  mrp?: string | null;
  discount_percent?: string | null;
  gst_treatment?: string;
}
interface SalesOrder {
  id: string;
  number: string;
  order_date: string;
  customer_id?: string;
  customer?: { name: string };
  lines?: OrderLine[];
  requirement_given_by?: string | null;
  requirement_channel?: string | null;
  requirement_proof_ref?: string | null;
  createdBy?: { name?: string | null; email?: string } | null;
}
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
  const [givenBy, setGivenBy] = useState('');
  const [channel, setChannel] = useState('');
  const [proofRef, setProofRef] = useState('');
  type LineState = { item_id: string; item_name: string; qty: number; rate: number; unit: string; mrp: number; discount_percent: number | null; gst_treatment: string };
  const [lines, setLines] = useState<LineState[]>([{ item_id: '', item_name: '', qty: 0, rate: 0, unit: 'pcs', mrp: 0, discount_percent: null, gst_treatment: 'extra' }]);
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
    setLines((prev) => [...prev, { item_id: '', item_name: '', qty: 0, rate: 0, unit: 'pcs', mrp: 0, discount_percent: null, gst_treatment: 'extra' }]);
  };

  const updateLine = (idx: number, f: Partial<LineState>) => {
    setLines((prev) => prev.map((l, i) => {
      if (i !== idx) return l;
      const next = { ...l, ...f };
      if (f.rate !== undefined || f.mrp !== undefined) {
        const mrp = next.mrp ?? 0;
        const rate = next.rate ?? 0;
        next.discount_percent = mrp > 0 && rate >= 0 ? Math.round((1 - rate / mrp) * 100 * 100) / 100 : null;
      }
      return next;
    }));
  };

  const setLineItem = (idx: number, itemId: string) => {
    const it = items.find((i) => i.id === itemId);
    const mrp = it?.mrp != null ? Number(it.mrp) : 0;
    updateLine(idx, { item_id: itemId, item_name: it?.name ?? '', unit: it?.unit ?? 'pcs', mrp, rate: lines[idx]?.rate ?? 0 });
  }

  const setLineRate = (idx: number, rate: number) => {
    updateLine(idx, { rate });
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
      lines: validLines.map((l) => ({
        item_id: l.item_id,
        qty: l.qty,
        rate: l.rate,
        unit: l.unit || 'pcs',
        mrp: l.mrp > 0 ? l.mrp : undefined,
        discount_percent: l.discount_percent != null ? l.discount_percent : undefined,
        gst_treatment: l.gst_treatment || 'extra',
      })),
      requirement_given_by: givenBy.trim() || undefined,
      requirement_channel: channel || undefined,
      requirement_proof_ref: proofRef.trim() || undefined,
    };
    const res = await apiPost('sales/orders', body);
    setLoading(false);
    if ((res as { error?: string }).error) setError((res as { error: string }).error);
    else {
      setLines([{ item_id: '', item_name: '', qty: 0, rate: 0, unit: 'pcs', mrp: 0, discount_percent: null, gst_treatment: 'extra' }]);
      setGivenBy('');
      setChannel('');
      setProofRef('');
      const r = await apiGet<RequirementRow[]>('sales/requirement-vs-delivery');
      setReqVsDel(Array.isArray((r as { data?: RequirementRow[] }).data) ? (r as { data: RequirementRow[] }).data : []);
    }
  };

  const channelLabel = (value: string) => REQUIREMENT_CHANNEL_OPTIONS.find((o) => o.value === value)?.label ?? value;
  const gstLabel = (value: string) => GST_TREATMENT_OPTIONS.find((o) => o.value === value)?.label ?? value;
  const fmtMoney = (v: string | number | null | undefined) => v != null && Number(v) > 0 ? `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

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
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Who gave the requirement *</label>
            <input
              type="text"
              value={givenBy}
              onChange={(e) => setGivenBy(e.target.value)}
              required
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. Contact person name, department, or customer rep"
            />
            <p className="mt-0.5 text-xs text-slate-500">Person or party who communicated this requirement</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">How communicated (for proof)</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              {REQUIREMENT_CHANNEL_OPTIONS.map((o) => (
                <option key={o.value || 'empty'} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p className="mt-0.5 text-xs text-slate-500">Channel used so team can verify</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Proof / reference</label>
            <input
              type="text"
              value={proofRef}
              onChange={(e) => setProofRef(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. WhatsApp screenshot, call ref #, email subject"
            />
            <p className="mt-0.5 text-xs text-slate-500">Optional reference for audit or dispute</p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700">Products</span>
          <button type="button" onClick={addLine} className="text-sm text-brand-600 hover:text-brand-700">+ Add line</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-min-width">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 text-left">
                <th className="py-2 pr-2">Product</th>
                <th className="py-2 pr-2 w-20 text-right">MRP (₹)</th>
                <th className="py-2 pr-2 w-24">Qty</th>
                <th className="py-2 pr-2 w-28 text-right">Rate (₹)</th>
                <th className="py-2 pr-2 w-20 text-right">Disc. %</th>
                <th className="py-2 pr-2 w-28">GST</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="py-1 pr-2">
                    <select
                      value={l.item_id}
                      onChange={(e) => setLineItem(idx, e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    >
                      <option value="">Select product</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 pr-2 text-right align-middle">
                    {l.mrp > 0 ? `₹${Number(l.mrp).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
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
                      onChange={(e) => setLineRate(idx, parseFloat(e.target.value) || 0)}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm text-right"
                      placeholder="Selling price"
                    />
                  </td>
                  <td className="py-1 pr-2 text-right align-middle text-slate-600">
                    {l.discount_percent != null ? `${l.discount_percent}%` : '—'}
                  </td>
                  <td className="py-1 pr-2">
                    <select
                      value={l.gst_treatment}
                      onChange={(e) => updateLine(idx, { gst_treatment: e.target.value })}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    >
                      {GST_TREATMENT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button type="button" onClick={() => removeLine(idx)} className="text-red-600 hover:text-red-700 text-sm">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-xs text-slate-500">MRP from product; enter Rate to see discount %. GST: Incl. = price includes tax; Extra = tax on top of rate.</p>
        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Save requirement</button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Requirement vs Delivery</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-min-width">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 text-left">
                <th className="py-2 pr-2">Order</th>
                <th className="py-2 pr-2">Customer</th>
                <th className="py-2 pr-2">Given by</th>
                <th className="py-2 pr-2">Channel</th>
                <th className="py-2 pr-2">Proof / ref</th>
                <th className="py-2 pr-2">Received by</th>
                <th className="py-2 pr-2">Product</th>
                <th className="py-2 pr-2 text-right">MRP</th>
                <th className="py-2 pr-2 text-right">Rate</th>
                <th className="py-2 pr-2 text-right">Disc. %</th>
                <th className="py-2 pr-2">GST</th>
                <th className="py-2 pr-2 text-right">Required</th>
                <th className="py-2 pr-2 text-right">Delivered</th>
                <th className="py-2 pr-2 text-right">Pending</th>
              </tr>
            </thead>
            <tbody>
              {reqVsDel.length === 0 && (
                <tr><td colSpan={14} className="py-4 text-slate-500">No requirements yet.</td></tr>
              )}
              {reqVsDel.map(({ order, lines: orderLines }) =>
                orderLines.map(({ line, delivered_qty, pending_qty }) => (
                  <tr key={`${order.id}-${line.id}`} className="border-b border-slate-100">
                    <td className="py-2 pr-2">{order.number}</td>
                    <td className="py-2 pr-2">{(order as SalesOrder).customer?.name ?? '—'}</td>
                    <td className="py-2 pr-2">{order.requirement_given_by ?? '—'}</td>
                    <td className="py-2 pr-2">{channelLabel(order.requirement_channel ?? '') || '—'}</td>
                    <td className="py-2 pr-2 max-w-[120px] truncate" title={order.requirement_proof_ref ?? undefined}>{order.requirement_proof_ref ?? '—'}</td>
                    <td className="py-2 pr-2">{order.createdBy?.name ?? order.createdBy?.email ?? '—'}</td>
                    <td className="py-2 pr-2">{line.item?.name ?? line.description ?? '—'}</td>
                    <td className="py-2 pr-2 text-right">{fmtMoney((line as OrderLine).mrp)}</td>
                    <td className="py-2 pr-2 text-right">{fmtMoney(line.rate)}</td>
                    <td className="py-2 pr-2 text-right">{(line as OrderLine).discount_percent != null ? `${(line as OrderLine).discount_percent}%` : '—'}</td>
                    <td className="py-2 pr-2">{gstLabel((line as OrderLine).gst_treatment ?? 'extra')}</td>
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
