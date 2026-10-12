'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

interface Report {
  from: string;
  to: string;
  categories: { category: string; taxable_value: number; cgst: number; sgst: number; igst: number; invoice_value: number; cost: number; margin: number }[];
  items: { category: string; subcategory: string; name: string; variant_size: string; variant_shape: string; qty: number; taxable_value: number; cgst: number; sgst: number; igst: number; invoice_value: number; cost: number; margin: number }[];
  credit: { id: string; name: string; phone: string | null; invoiced: number; paid: number; due: number }[];
  packs: { bulk_name: string; bulk_unit: string; bulk_qty: number; pack_name: string; variant_size: string; pack_qty: number; packs_left: number; mrp: number; cost_price: number; sale_price: number; discount_percent: number; margin: number }[];
}

function money(n: number) {
  return `₹${Number(n || 0).toFixed(2)}`;
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function DepartmentReportPage() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (start = from, end = to) => {
    setLoading(true);
    const { data: body, error: err } = await apiGet<Report>(`reports/department-counter?from=${start}&to=${end}`);
    setLoading(false);
    if (err) setError(err);
    else {
      setError(null);
      setData(body ?? null);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Store reports</h1>
        <p className="text-sm text-slate-600">Sales by department, GST, cost and margin, credit accounts, and how many packs the bulk stock can still make.</p>
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <label className="text-xs text-slate-600">From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded border border-slate-300 px-2 py-2 text-sm" />
        </label>
        <label className="text-xs text-slate-600">To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded border border-slate-300 px-2 py-2 text-sm" />
        </label>
        <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white min-h-[40px]">{loading ? 'Loading…' : 'View'}</button>
        <Link href="/reports?report=customer-ledger" className="text-sm font-medium text-brand-700">Customer ledger</Link>
      </form>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {data && (
        <>
          <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <h2 className="px-3 py-2 text-sm font-semibold text-slate-800">By department</h2>
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="p-2">Department</th>
                  <th className="p-2 text-right">Taxable</th>
                  <th className="p-2 text-right">CGST</th>
                  <th className="p-2 text-right">SGST</th>
                  <th className="p-2 text-right">IGST</th>
                  <th className="p-2 text-right">Invoice value</th>
                  <th className="p-2 text-right">Cost</th>
                  <th className="p-2 text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {data.categories.length === 0 && <tr><td colSpan={8} className="p-3 text-slate-500">No bills in these dates.</td></tr>}
                {data.categories.map((r) => (
                  <tr key={r.category} className="border-t border-slate-100">
                    <td className="p-2">{r.category}</td>
                    <td className="p-2 text-right">{money(r.taxable_value)}</td>
                    <td className="p-2 text-right">{money(r.cgst)}</td>
                    <td className="p-2 text-right">{money(r.sgst)}</td>
                    <td className="p-2 text-right">{money(r.igst)}</td>
                    <td className="p-2 text-right">{money(r.invoice_value)}</td>
                    <td className="p-2 text-right">{money(r.cost)}</td>
                    <td className="p-2 text-right">{money(r.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <h2 className="px-3 py-2 text-sm font-semibold text-slate-800">By product</h2>
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="p-2">Product</th>
                  <th className="p-2">Department</th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-right">Taxable</th>
                  <th className="p-2 text-right">CGST</th>
                  <th className="p-2 text-right">SGST</th>
                  <th className="p-2 text-right">IGST</th>
                  <th className="p-2 text-right">Invoice value</th>
                  <th className="p-2 text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={`${r.category}-${r.name}-${r.variant_size}`} className="border-t border-slate-100">
                    <td className="p-2">{r.name} {[r.variant_size, r.variant_shape].filter(Boolean).join(' · ')}</td>
                    <td className="p-2">{[r.category, r.subcategory].filter(Boolean).join(' / ')}</td>
                    <td className="p-2 text-right">{r.qty}</td>
                    <td className="p-2 text-right">{money(r.taxable_value)}</td>
                    <td className="p-2 text-right">{money(r.cgst)}</td>
                    <td className="p-2 text-right">{money(r.sgst)}</td>
                    <td className="p-2 text-right">{money(r.igst)}</td>
                    <td className="p-2 text-right">{money(r.invoice_value)}</td>
                    <td className="p-2 text-right">{money(r.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <h2 className="px-3 py-2 text-sm font-semibold text-slate-800">Credit customers</h2>
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="p-2">Customer</th>
                  <th className="p-2 text-right">Billed</th>
                  <th className="p-2 text-right">Received</th>
                  <th className="p-2 text-right">Due</th>
                </tr>
              </thead>
              <tbody>
                {data.credit.length === 0 && <tr><td colSpan={4} className="p-3 text-slate-500">No credit customers yet. Mark a customer as credit when you add them.</td></tr>}
                {data.credit.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="p-2">
                      {r.name}
                      {r.due > 0 && (
                        <Link href={`/reports?report=customer-ledger&customer_id=${encodeURIComponent(r.id)}`} className="ml-2 font-medium text-brand-700">
                          Statement
                        </Link>
                      )}
                    </td>
                    <td className="p-2 text-right">{money(r.invoiced)}</td>
                    <td className="p-2 text-right">{money(r.paid)}</td>
                    <td className="p-2 text-right font-semibold">{money(r.due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <h2 className="px-3 py-2 text-sm font-semibold text-slate-800">Bulk stock and packs</h2>
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="p-2">Bulk</th>
                  <th className="p-2 text-right">On hand</th>
                  <th className="p-2">Pack</th>
                  <th className="p-2 text-right">Packs left</th>
                  <th className="p-2 text-right">MRP</th>
                  <th className="p-2 text-right">Cost</th>
                  <th className="p-2 text-right">Shelf</th>
                  <th className="p-2 text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {data.packs.length === 0 && <tr><td colSpan={8} className="p-3 text-slate-500">No packed products yet.</td></tr>}
                {data.packs.map((r) => (
                  <tr key={`${r.bulk_name}-${r.pack_name}`} className="border-t border-slate-100">
                    <td className="p-2">{r.bulk_name}</td>
                    <td className="p-2 text-right">{r.bulk_qty} {r.bulk_unit}</td>
                    <td className="p-2">{r.pack_name} {r.variant_size}</td>
                    <td className="p-2 text-right">{r.packs_left}</td>
                    <td className="p-2 text-right">{money(r.mrp)}</td>
                    <td className="p-2 text-right">{money(r.cost_price)}</td>
                    <td className="p-2 text-right">{money(r.sale_price)}</td>
                    <td className="p-2 text-right">{money(r.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
