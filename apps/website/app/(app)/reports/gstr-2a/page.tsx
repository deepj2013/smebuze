'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';

type Row = {
  supplier_gstin?: string;
  supplier_name?: string;
  invoice_number: string;
  invoice_date: string;
  taxable_value: number;
  invoice_value: number;
  portal_taxable?: number;
  portal_value?: number;
  source?: string;
};

type Recon = {
  period: string;
  uploaded: number;
  books: number;
  summary: { matched: number; amount_mismatch: number; in_books_not_in_2a: number; in_2a_not_in_books: number };
  matched: Row[];
  mismatch: Row[];
  in_books_not_in_2a: Row[];
  in_2a_not_in_books: Row[];
};

const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

export default function Gstr2aPage() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [paste, setPaste] = useState('');
  const [data, setData] = useState<Recon | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    setError('');
    const { data: res, error: err } = await apiGet<Recon>(`reports/gstr-2a?period=${period}`);
    setBusy(false);
    if (err) setError(err);
    else setData(res || null);
  }

  async function upload() {
    setBusy(true);
    setError('');
    setMsg('');
    const trimmed = paste.trim();
    if (!trimmed) {
      setError('Paste GSTR-2A JSON from the GST portal, or a CSV with supplier GSTIN and invoice number.');
      setBusy(false);
      return;
    }
    let body: { period: string; json?: unknown; csv?: string } = { period };
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        body.json = JSON.parse(trimmed);
      } catch {
        setError('JSON could not be parsed. Check you copied the full GSTR-2A file.');
        setBusy(false);
        return;
      }
    } else {
      body.csv = trimmed;
    }
    const { data: res, error: err } = await apiPost<{ uploaded: number }>('reports/gstr-2a/upload', body);
    if (err) {
      setError(err);
      setBusy(false);
      return;
    }
    setMsg(`Uploaded ${res?.uploaded ?? 0} portal invoices for ${period}.`);
    await load();
  }

  const s = data?.summary;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/reports" className="text-sm text-slate-600 hover:text-slate-900">← Reports</Link>
        <h1 className="mt-2 text-2xl font-bold">GSTR-2A reconciliation</h1>
        <p className="mt-1 text-sm text-slate-500">
          Match GST vendor bills in your books (purchase expenses and GST purchase orders) with GSTR-2A from the GST portal.
          ITC is claimed only when the invoice appears in 2A.
        </p>
      </div>

      <section className="rounded-xl border bg-white p-5 space-y-3">
        <label className="text-sm">Return month
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="mt-1 block rounded-lg border px-3 py-2" />
        </label>
        <label className="block text-sm">Paste GSTR-2A JSON or CSV
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={8} className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-xs" placeholder={'{\n  "b2b": [{ "ctin": "27AAAAA0000A1Z5", "inv": [{ "inum": "INV-1", "idt": "01-04-2026", "val": 1180 }] }]\n}\n\nor CSV:\nsupplier_gstin,invoice_number,invoice_date,taxable,cgst,sgst,igst,invoice_value'} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void upload()} disabled={busy} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 min-h-[44px]">{busy ? 'Working…' : 'Upload & reconcile'}</button>
          <button type="button" onClick={() => void load()} disabled={busy} className="rounded-lg border px-4 py-2 text-sm min-h-[44px]">View last recon</button>
          <Link href="/ice-crest/expenses" className="self-center text-sm text-brand-600">Book a GST purchase →</Link>
        </div>
        <p className="text-xs text-slate-500">Books side uses GST vendor invoices (expense purchases with GSTIN + GST, and purchase orders with tax). Invoice number + GSTIN is the match key.</p>
      </section>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {msg && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{msg}</p>}

      {s && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Matched', s.matched, 'text-emerald-700'],
              ['Amount mismatch', s.amount_mismatch, 'text-amber-700'],
              ['In books, not in 2A', s.in_books_not_in_2a, 'text-red-700'],
              ['In 2A, not in books', s.in_2a_not_in_books, 'text-slate-700'],
            ].map(([k, v, c]) => (
              <div key={String(k)} className="rounded-xl border bg-white p-4"><p className="text-xs uppercase text-slate-500">{k}</p><p className={`mt-1 text-2xl font-bold ${c}`}>{v}</p></div>
            ))}
          </section>
          <p className="text-sm text-slate-500">Portal rows: {data!.uploaded} · Books GST bills: {data!.books}</p>
          <Block title="Matched" rows={data!.matched} extra />
          <Block title="Amount mismatch" rows={data!.mismatch} extra />
          <Block title="In books, missing from GSTR-2A" rows={data!.in_books_not_in_2a} />
          <Block title="In GSTR-2A, missing from books" rows={data!.in_2a_not_in_books} />
        </>
      )}
    </div>
  );
}

function Block({ title, rows, extra }: { title: string; rows: Row[]; extra?: boolean }) {
  return (
    <section className="rounded-xl border bg-white p-4 overflow-x-auto">
      <h2 className="font-semibold">{title} ({rows.length})</h2>
      {rows.length === 0 ? <p className="mt-2 text-sm text-slate-500">None.</p> : (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="py-2 pr-3">GSTIN</th><th className="py-2 pr-3">Party / no.</th><th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Books taxable</th><th className="py-2 pr-3">Books value</th>
              {extra && <><th className="py-2 pr-3">2A taxable</th><th className="py-2 pr-3">2A value</th></>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b">
                <td className="py-2 pr-3 font-mono text-xs">{r.supplier_gstin || '—'}</td>
                <td className="py-2 pr-3">{r.supplier_name ? `${r.supplier_name} · ` : ''}{r.invoice_number}</td>
                <td className="py-2 pr-3">{r.invoice_date}</td>
                <td className="py-2 pr-3">{money(r.taxable_value)}</td>
                <td className="py-2 pr-3">{money(r.invoice_value)}</td>
                {extra && <><td className="py-2 pr-3">{money(Number(r.portal_taxable ?? 0))}</td><td className="py-2 pr-3">{money(Number(r.portal_value ?? 0))}</td></>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
