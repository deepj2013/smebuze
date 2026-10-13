'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';

type Kind = 'invoice' | 'credit_note' | 'sales_debit_note' | 'purchase_debit_note';

interface SeriesConfig {
  enabled: boolean;
  prefix: string;
  separator: '-' | '/';
  include_fy: boolean;
  fy_position: 'before' | 'after';
  fy_format: 'short' | 'full';
  pad: number;
  start_number: number;
  effective_from: string;
}

const LABELS: Record<Kind, { title: string; help: string }> = {
  invoice: { title: 'Tax invoices', help: 'Used when the invoice number is left blank.' },
  credit_note: { title: 'Credit notes', help: 'Sales credit notes that reduce an invoice.' },
  sales_debit_note: { title: 'Debit notes', help: 'Sales debit notes that increase an invoice.' },
  purchase_debit_note: { title: 'Purchase debit notes', help: 'Debit notes raised on a purchase order.' },
};

const EMPTY: Record<Kind, SeriesConfig> = {
  invoice: { enabled: false, prefix: 'INV', separator: '/', include_fy: true, fy_position: 'before', fy_format: 'short', pad: 4, start_number: 1, effective_from: '' },
  credit_note: { enabled: false, prefix: 'CN', separator: '/', include_fy: true, fy_position: 'before', fy_format: 'short', pad: 4, start_number: 1, effective_from: '' },
  sales_debit_note: { enabled: false, prefix: 'DN', separator: '/', include_fy: true, fy_position: 'before', fy_format: 'short', pad: 4, start_number: 1, effective_from: '' },
  purchase_debit_note: { enabled: false, prefix: 'PDN', separator: '/', include_fy: true, fy_position: 'before', fy_format: 'short', pad: 4, start_number: 1, effective_from: '' },
};

/** Same shape the server will save. The year shown is the 2026-27 financial year, as an example. */
function exampleNumber(row: SeriesConfig): string {
  const pad = Math.min(6, Math.max(3, Number(row.pad) || 4));
  const body = String(Math.max(1, Number(row.start_number) || 1)).padStart(pad, '0');
  const year = !row.include_fy ? '' : row.fy_format === 'full' ? '2026-27' : '2627';
  const prefix = (row.prefix || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const bits: string[] = [];
  if (prefix) bits.push(prefix);
  if (year && row.fy_position !== 'after') bits.push(year);
  bits.push(body);
  if (year && row.fy_position === 'after') bits.push(year);
  return bits.join(row.separator === '-' ? '-' : '/');
}

export default function InvoiceSeriesPage() {
  const [series, setSeries] = useState<Record<Kind, SeriesConfig>>(EMPTY);
  const [previews, setPreviews] = useState<Record<string, { message?: string; number?: string | null }>>({});
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<{ series: Record<Kind, SeriesConfig>; previews: Record<string, { message?: string; number?: string | null }> }>('sales/document-series').then((res) => {
      if (res.error) setError(res.error);
      else if (res.data?.series) {
        setSeries({
          invoice: { ...EMPTY.invoice, ...res.data.series.invoice },
          credit_note: { ...EMPTY.credit_note, ...res.data.series.credit_note },
          sales_debit_note: { ...EMPTY.sales_debit_note, ...res.data.series.sales_debit_note },
          purchase_debit_note: { ...EMPTY.purchase_debit_note, ...res.data.series.purchase_debit_note },
        });
        setPreviews(res.data.previews ?? {});
      }
    });
  }, []);

  function patch(kind: Kind, next: Partial<SeriesConfig>) {
    setSeries((cur) => ({ ...cur, [kind]: { ...cur[kind], ...next } }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setOk('');
    const res = await apiPatch<{ series: Record<Kind, SeriesConfig>; previews: Record<string, { message?: string; number?: string | null }> }>('sales/document-series', { series });
    setSaving(false);
    if (res.error) setError(res.error);
    else if (res.data) {
      setSeries({
        invoice: { ...EMPTY.invoice, ...res.data.series.invoice },
        credit_note: { ...EMPTY.credit_note, ...res.data.series.credit_note },
        sales_debit_note: { ...EMPTY.sales_debit_note, ...res.data.series.sales_debit_note },
        purchase_debit_note: { ...EMPTY.purchase_debit_note, ...res.data.series.purchase_debit_note },
      });
      setPreviews(res.data.previews ?? {});
      setOk('Series saved for this workspace. Numbers already issued stay as they are.');
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/organization/companies" className="text-sm text-slate-600 hover:text-slate-900">← Organization</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Invoice series</h1>
        <p className="mt-1 text-sm text-slate-600">
          Set your own serial for GST. Put letters before the number, or put the year after it, as in 0001/2026-27.
          A series is consecutive, unique in the financial year (1 April–31 March), and at most 16 characters.
          It starts on the date you choose. Documents before that date keep an automatic number.
        </p>
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {ok && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{ok}</p>}
      <form onSubmit={save} className="space-y-4">
        {(Object.keys(LABELS) as Kind[]).map((kind) => {
          const row = series[kind];
          return (
            <section key={kind} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">{LABELS[kind].title}</h2>
                  <p className="text-xs text-slate-500">{LABELS[kind].help}</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={row.enabled} onChange={(e) => patch(kind, { enabled: e.target.checked })} />
                  Use this series
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">Prefix
                  <input value={row.prefix} onChange={(e) => patch(kind, { prefix: e.target.value.toUpperCase() })} maxLength={8} placeholder="Optional, e.g. INV" className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm">Separator
                  <select value={row.separator} onChange={(e) => patch(kind, { separator: e.target.value as '-' | '/' })} className="mt-1 w-full rounded-lg border px-3 py-2">
                    <option value="/">/</option>
                    <option value="-">-</option>
                  </select>
                </label>
                <label className="text-sm">Digits
                  <input type="number" min={3} max={6} value={row.pad} onChange={(e) => patch(kind, { pad: Number(e.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm">Start from number
                  <input type="number" min={1} value={row.start_number} onChange={(e) => patch(kind, { start_number: Number(e.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm sm:col-span-2">Start using this series from
                  <input type="date" value={row.effective_from} onChange={(e) => patch(kind, { effective_from: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">Financial year
                  <select
                    value={row.include_fy ? (row.fy_position === 'after' ? 'after' : 'before') : 'off'}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'off') patch(kind, { include_fy: false });
                      else if (value === 'after') patch(kind, { include_fy: true, fy_position: 'after', fy_format: 'full' });
                      else patch(kind, { include_fy: true, fy_position: 'before', fy_format: 'short' });
                    }}
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  >
                    <option value="off">Do not include</option>
                    <option value="before">Before the number</option>
                    <option value="after">After the number (suffix)</option>
                  </select>
                </label>
                {row.include_fy && (
                  <label className="text-sm">Year style
                    <select
                      value={row.fy_format === 'full' ? 'full' : 'short'}
                      onChange={(e) => patch(kind, { fy_format: e.target.value === 'full' ? 'full' : 'short' })}
                      className="mt-1 w-full rounded-lg border px-3 py-2"
                    >
                      <option value="short">2627</option>
                      <option value="full">2026-27</option>
                    </select>
                  </label>
                )}
              </div>
              <p className="text-sm text-slate-700">Example: <span className="font-mono font-semibold">{exampleNumber(row)}</span></p>
              {previews[kind]?.message && <p className="text-xs text-slate-600">{previews[kind].message}</p>}
            </section>
          );
        })}
        <button type="submit" disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save series'}
        </button>
      </form>
    </div>
  );
}
