'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

interface PartyRow {
  party_type: 'customer' | 'vendor' | 'none';
  party_id: string | null;
  name: string;
  invoice_count: number;
  total: number;
  paid: number;
  balance: number;
  pending_count: number;
  partial_count: number;
  paid_count: number;
}

export default function PartyInvoicesPage() {
  const [parties, setParties] = useState<PartyRow[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    apiGet<{ parties: PartyRow[]; totals?: { balance: number } }>('sales/invoices/parties').then((res) => {
      if (res.error) setError(res.error);
      else {
        setParties(res.data?.parties ?? []);
        setBalance(res.data?.totals?.balance ?? 0);
      }
      setLoading(false);
    });
  }, []);

  const shown = parties.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div>
      <Link href="/sales/invoices" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Invoices</Link>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Party-wise invoices</h1>
          <p className="mt-1 text-sm text-slate-600">Each customer or vendor, with what is still due. Open a party to see pending, partial and paid bills.</p>
        </div>
        <p className="text-sm font-medium text-amber-800">Still to collect ₹{balance.toFixed(2)}</p>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search party" className="mb-4 w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-3 text-left font-medium text-slate-700">Party</th>
                <th className="p-3 text-right font-medium text-slate-700">Bills</th>
                <th className="p-3 text-right font-medium text-slate-700">Pending</th>
                <th className="p-3 text-right font-medium text-slate-700">Partial</th>
                <th className="p-3 text-right font-medium text-slate-700">Paid</th>
                <th className="p-3 text-right font-medium text-slate-700">Billed</th>
                <th className="p-3 text-right font-medium text-slate-700">Received</th>
                <th className="p-3 text-right font-medium text-slate-700">Due</th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr><td colSpan={8} className="p-4 text-slate-500">No invoices yet.</td></tr>
              ) : shown.map((p) => {
                const href = p.party_type === 'customer' && p.party_id
                  ? `/sales/invoices?customer_id=${p.party_id}`
                  : p.party_type === 'vendor' && p.party_id
                    ? `/sales/invoices?vendor_id=${p.party_id}`
                    : '/sales/invoices';
                return (
                  <tr key={`${p.party_type}:${p.party_id}`} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">
                      <Link href={href} className="font-medium text-brand-700 hover:underline">{p.name}</Link>
                      <p className="text-xs text-slate-500 capitalize">{p.party_type === 'none' ? 'No party' : p.party_type}</p>
                    </td>
                    <td className="p-3 text-right">{p.invoice_count}</td>
                    <td className="p-3 text-right">{p.pending_count}</td>
                    <td className="p-3 text-right">{p.partial_count}</td>
                    <td className="p-3 text-right">{p.paid_count}</td>
                    <td className="p-3 text-right">₹{p.total.toFixed(2)}</td>
                    <td className="p-3 text-right">₹{p.paid.toFixed(2)}</td>
                    <td className={`p-3 text-right font-medium ${p.balance > 0.05 ? 'text-amber-800' : 'text-emerald-700'}`}>₹{p.balance.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
