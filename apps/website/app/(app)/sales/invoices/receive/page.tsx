'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { limitDecimalPlaces } from '@/lib/money';
import { invoiceStanding, isOverdue } from '@/lib/invoice-standing';

interface OpenInvoice {
  id: string;
  number: string;
  customer_id?: string | null;
  vendor_id?: string | null;
  customer?: { name?: string } | null;
  vendor?: { name?: string } | null;
  due_date?: string | null;
  invoice_date?: string | null;
  total: string | number;
  paid_amount?: string | number;
  balance_due?: string | number;
  payment_status?: string;
}

function partyKey(row: OpenInvoice): string {
  if (row.customer_id) return `c:${row.customer_id}`;
  if (row.vendor_id) return `v:${row.vendor_id}`;
  return '';
}

function partyName(row: OpenInvoice): string {
  return row.customer?.name || row.vendor?.name || 'Unknown party';
}

function money(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);
}

/** Oldest due invoices take the money first. */
function fillOldest(invoices: OpenInvoice[], receipt: number): Record<string, string> {
  let left = Math.round(receipt * 100) / 100;
  const next: Record<string, string> = {};
  for (const inv of invoices) {
    const due = invoiceStanding(inv).balance;
    const take = Math.round(Math.min(Math.max(left, 0), Math.max(due, 0)) * 100) / 100;
    next[inv.id] = take > 0 ? take.toFixed(2) : '';
    left = Math.round((left - take) * 100) / 100;
  }
  return next;
}

export default function ReceivePaymentPage() {
  const [list, setList] = useState<OpenInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [party, setParty] = useState('');
  const [receipt, setReceipt] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState('upi');
  const [reference, setReference] = useState('');
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await apiGet<{ invoices?: OpenInvoice[] }>('sales/invoices/pending');
    if (res.error) setError(res.error);
    else setList(res.data?.invoices ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const parties = useMemo(() => {
    const map = new Map<string, { name: string; due: number; count: number }>();
    for (const row of list) {
      const key = partyKey(row);
      if (!key) continue;
      const current = map.get(key) ?? { name: partyName(row), due: 0, count: 0 };
      current.due += invoiceStanding(row).balance;
      current.count += 1;
      map.set(key, current);
    }
    return [...map.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [list]);

  const openInvoices = useMemo(
    () => list.filter((row) => partyKey(row) === party),
    [list, party],
  );

  const receiptNumber = Number(receipt) || 0;
  const allocated = openInvoices.reduce((sum, inv) => sum + (Number(amounts[inv.id]) || 0), 0);
  const partyDue = openInvoices.reduce((sum, inv) => sum + invoiceStanding(inv).balance, 0);
  const roundedAllocated = Math.round(allocated * 100) / 100;
  const leftover = Math.round((receiptNumber - roundedAllocated) * 100) / 100;
  const ready = receiptNumber >= 0.01 && Math.abs(leftover) < 0.01 && roundedAllocated <= partyDue + 0.01;

  const chooseParty = (key: string) => {
    setParty(key);
    setNotice(null);
    setError(null);
    const rows = list.filter((row) => partyKey(row) === key);
    const due = rows.reduce((sum, inv) => sum + invoiceStanding(inv).balance, 0);
    const nextReceipt = due > 0 ? due.toFixed(2) : '';
    setReceipt(nextReceipt);
    setAmounts(fillOldest(rows, Number(nextReceipt) || 0));
  };

  const changeReceipt = (value: string) => {
    const next = limitDecimalPlaces(value);
    setReceipt(next);
    setAmounts(fillOldest(openInvoices, Number(next) || 0));
  };

  const changeLine = (id: string, value: string) => {
    setAmounts((prev) => ({ ...prev, [id]: limitDecimalPlaces(value) }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    const allocations = openInvoices
      .map((inv) => ({ invoice_id: inv.id, amount: Number(amounts[inv.id]) || 0 }))
      .filter((line) => line.amount >= 0.01);
    const { data, error: err } = await apiPost<{ total: number; invoices: Array<{ number: string; amount: number }> }>(
      'sales/payments/receive',
      {
        payment_date: paymentDate,
        mode,
        reference: reference.trim() || undefined,
        allocations,
      },
    );
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    const names = (data?.invoices ?? []).map((row) => `${row.number} ${money(row.amount)}`).join(', ');
    setNotice(`Saved ${money(data?.total ?? roundedAllocated)} across ${allocations.length} invoice${allocations.length === 1 ? '' : 's'}${names ? `: ${names}` : ''}.`);
    setReceipt('');
    setReference('');
    setAmounts({});
    setParty('');
    await load();
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/sales/invoices/pending" className="mb-4 inline-block text-sm text-slate-600 hover:text-slate-900">← Pending receivables</Link>
      <h1 className="text-2xl font-bold text-slate-900">Receive payment</h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        When a customer pays for several invoices together, enter that amount once. It is applied to the oldest due invoices first. Change a line if you want a different split.
      </p>

      {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {notice && <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      {loading && <p className="mt-4 text-slate-600">Loading open invoices…</p>}

      {!loading && (
        <form onSubmit={(e) => void save(e)} className="mt-4 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="party">Customer</label>
              <select
                id="party"
                value={party}
                onChange={(e) => chooseParty(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Choose a customer</option>
                {parties.map(([key, info]) => (
                  <option key={key} value={key}>{info.name} · {info.count} open · {money(info.due)} due</option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="amount">Amount received</label>
                <input id="amount" inputMode="decimal" value={receipt} onChange={(e) => changeReceipt(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="0.00" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="date">Date</label>
                <input id="date" type="date" required value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="mode">Mode</label>
                <select id="mode" value={mode} onChange={(e) => setMode(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  <option value="upi">UPI</option>
                  <option value="bank">Bank</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="ref">Reference</label>
                <input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR, cheque no." className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          {party && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">Open invoices · due {money(partyDue)}</p>
                <button
                  type="button"
                  onClick={() => setAmounts(fillOldest(openInvoices, receiptNumber))}
                  className="inline-flex min-h-[40px] items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800"
                >
                  Fill oldest first
                </button>
              </div>
              {openInvoices.map((inv) => {
                const due = invoiceStanding(inv).balance;
                const overdue = isOverdue(inv.due_date, invoiceStanding(inv).status);
                return (
                  <div key={inv.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{inv.number}</p>
                        <p className="text-xs text-slate-500">
                          Due {inv.due_date ? String(inv.due_date).slice(0, 10) : '—'}
                          {overdue ? ' · Overdue' : ''} · still {money(due)}
                        </p>
                      </div>
                      <label className="shrink-0 text-right">
                        <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Apply</span>
                        <input
                          inputMode="decimal"
                          value={amounts[inv.id] ?? ''}
                          onChange={(e) => changeLine(inv.id, e.target.value)}
                          className="w-28 rounded-lg border border-slate-300 px-2 py-2 text-right text-sm"
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
              <div className="rounded-xl bg-slate-50 p-3 text-sm">
                <p>Received {money(receiptNumber)} · applied {money(roundedAllocated)}</p>
                {leftover > 0.01 && <p className="mt-1 text-amber-800">{money(leftover)} is not applied to an invoice yet.</p>}
                {leftover < -0.01 && <p className="mt-1 text-red-700">Applied amount is higher than the amount received.</p>}
                {Math.abs(leftover) < 0.01 && receiptNumber >= 0.01 && <p className="mt-1 text-emerald-800">The full amount is applied.</p>}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!ready || saving}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
          >
            {saving ? 'Saving…' : 'Save receipt'}
          </button>
        </form>
      )}
    </div>
  );
}
