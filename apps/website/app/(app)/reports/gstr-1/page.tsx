'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, getApiUrl, getToken } from '@/lib/api';

type Gstr1 = {
  period: string;
  from: string;
  to: string;
  summary: {
    invoice_count: number;
    b2b_count: number;
    b2c_count: number;
    credit_note_count: number;
    taxable_value: number;
    cgst: number;
    sgst: number;
    igst: number;
    invoice_value: number;
    credit_note_value: number;
  };
  documents: { nature: string; count: number }[];
  b2b: Array<{ invoice_number: string; invoice_date: string; customer: string; gstin: string; taxable_value: number; cgst: number; sgst: number; igst: number; invoice_value: number; place_of_supply: string }>;
  b2c: Array<{ invoice_number: string; invoice_date: string; customer: string; taxable_value: number; cgst: number; sgst: number; igst: number; invoice_value: number }>;
  hsn: Array<{ hsn_sac: string; qty: number; taxable: number; cgst: number; sgst: number; igst: number }>;
  cdnr: Array<{ note_number: string; note_date: string; invoice_number: string; amount: number; reason: string }>;
};

const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

export default function Gstr1Page() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<Gstr1 | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    const { data: res, error: err } = await apiGet<Gstr1>(`reports/gstr-1?period=${period}`);
    setLoading(false);
    if (err) setError(err);
    else setData(res || null);
  }

  useEffect(() => { void load(); }, []);

  async function exportCsv() {
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${getApiUrl('reports/gstr-1')}?period=${period}&format=csv`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gstr-1-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const s = data?.summary;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/reports" className="text-sm text-slate-600 hover:text-slate-900">← Reports</Link>
        <h1 className="mt-2 text-2xl font-bold">GSTR-1</h1>
        <p className="mt-1 text-sm text-slate-500">Outward supplies from your sales invoices for the return month. Use this to file GSTR-1 — B2B, B2C, HSN and credit notes.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">Return month
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="mt-1 block rounded-lg border px-3 py-2" />
        </label>
        <button type="button" onClick={() => void load()} disabled={loading} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 min-h-[44px]">
          {loading ? 'Loading…' : 'View GSTR-1'}
        </button>
        <button type="button" onClick={() => void exportCsv()} className="rounded-lg border px-4 py-2 text-sm min-h-[44px]">Export CSV</button>
        <Link href="/reports/gstr-2a" className="text-sm text-brand-600">GSTR-2A recon →</Link>
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {s && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Invoices', s.invoice_count],
              ['B2B (GSTIN customers)', s.b2b_count],
              ['B2C (unregistered)', s.b2c_count],
              ['Credit notes', s.credit_note_count],
              ['Taxable value', money(s.taxable_value)],
              ['CGST', money(s.cgst)],
              ['SGST', money(s.sgst)],
              ['IGST', money(s.igst)],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-xl border bg-white p-4"><p className="text-xs uppercase text-slate-500">{k}</p><p className="mt-1 text-xl font-bold">{v}</p></div>
            ))}
          </section>
          <Table title={`4. B2B supplies (${data!.b2b.length})`} cols={['GSTIN', 'Customer', 'Invoice', 'Date', 'Taxable', 'Tax', 'Value', 'POS']} rows={data!.b2b.map((r) => [r.gstin, r.customer, r.invoice_number, r.invoice_date, money(r.taxable_value), money(r.cgst + r.sgst + r.igst), money(r.invoice_value), r.place_of_supply])} />
          <Table title={`7. B2C supplies (${data!.b2c.length})`} cols={['Customer', 'Invoice', 'Date', 'Taxable', 'Tax', 'Value']} rows={data!.b2c.map((r) => [r.customer, r.invoice_number, r.invoice_date, money(r.taxable_value), money(r.cgst + r.sgst + r.igst), money(r.invoice_value)])} />
          <Table title="12. HSN summary" cols={['HSN/SAC', 'Qty', 'Taxable', 'CGST', 'SGST', 'IGST']} rows={data!.hsn.map((r) => [r.hsn_sac, String(r.qty), money(r.taxable), money(r.cgst), money(r.sgst), money(r.igst)])} />
          <Table title="9. Credit notes (CDNR)" cols={['Note no', 'Date', 'Against invoice', 'Amount', 'Reason']} rows={data!.cdnr.map((r) => [r.note_number, r.note_date, r.invoice_number, money(r.amount), r.reason])} />
        </>
      )}
    </div>
  );
}

function Table({ title, cols, rows }: { title: string; cols: string[]; rows: string[][] }) {
  return (
    <section className="rounded-xl border bg-white p-4 overflow-x-auto">
      <h2 className="font-semibold">{title}</h2>
      {rows.length === 0 ? <p className="mt-2 text-sm text-slate-500">None in this month.</p> : (
        <table className="mt-3 w-full text-sm">
          <thead><tr className="border-b text-left text-slate-500">{cols.map((c) => <th key={c} className="py-2 pr-3">{c}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i} className="border-b">{r.map((c, j) => <td key={j} className="py-2 pr-3">{c || '—'}</td>)}</tr>)}</tbody>
        </table>
      )}
    </section>
  );
}
