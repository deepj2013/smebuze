'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiGet, getApiUrl } from '@/lib/api';

type ReportId =
  | 'dashboard'
  | 'sales-summary'
  | 'purchase-summary'
  | 'gst-summary'
  | 'ledger-summary'
  | 'health-score'
  | 'ageing'
  | 'pl'
  | 'balance-sheet'
  | 'item-wise-sales'
  | 'requirement-vs-delivery'
  | 'stock-vs-delivery'
  | 'delivery-vs-invoiced'
  | 'invoice-vs-payment';

const REPORTS: { id: ReportId; label: string; description: string; hasExport: boolean }[] = [
  { id: 'dashboard', label: 'Business overview', description: 'Summary, receivables & payables', hasExport: false },
  { id: 'sales-summary', label: 'Sales summary', description: 'Invoiced, received, pending — CSV export', hasExport: true },
  { id: 'purchase-summary', label: 'Purchase summary', description: 'Orders, paid, pending', hasExport: false },
  { id: 'gst-summary', label: 'HSN-wise sales / GST summary', description: 'By HSN, CGST/SGST/IGST — CSV export', hasExport: true },
  { id: 'item-wise-sales', label: 'Item-wise sales', description: 'Sales by item; quantity and value — CSV export', hasExport: true },
  { id: 'requirement-vs-delivery', label: 'Requirement vs delivery', description: 'Orders vs delivered/pending by line — CSV export', hasExport: true },
  { id: 'stock-vs-delivery', label: 'Stock vs delivery', description: 'Stock on hand vs delivered in period — CSV export', hasExport: true },
  { id: 'delivery-vs-invoiced', label: 'Delivery vs invoiced', description: 'Challans and whether they are invoiced — CSV export', hasExport: true },
  { id: 'invoice-vs-payment', label: 'Invoice vs payment', description: 'Customer-wise invoiced, received, pending — CSV export', hasExport: true },
  { id: 'ledger-summary', label: 'Ledger summary', description: 'Journal entries by period', hasExport: false },
  { id: 'health-score', label: 'Business health score', description: 'AI-style score 1–10 and message', hasExport: false },
  { id: 'ageing', label: 'Ageing report', description: 'Receivables/payables by bucket (0–30, 31–60, 61–90, 90+ days) — CSV export', hasExport: true },
  { id: 'pl', label: 'P&L', description: 'Profit & Loss by period', hasExport: true },
  { id: 'balance-sheet', label: 'Balance sheet', description: 'Assets, liabilities, equity as of date', hasExport: true },
];

const CUSTOM_REPORT_IDS: ReportId[] = [
  'requirement-vs-delivery',
  'stock-vs-delivery',
  'delivery-vs-invoiced',
  'invoice-vs-payment',
];

type CustomReportData =
  | { summary: { total_orders: number; total_lines: number; total_required: number; total_delivered: number; total_pending: number }; rows: Array<{ order_id: string; order_number: string; order_date: string; customer_name: string; item_name: string; required_qty: number; delivered_qty: number; pending_qty: number }> }
  | { summary: { total_challans: number; invoiced: number; not_invoiced: number }; rows: Array<{ id: string; number: string; challan_date: string; customer_name: string; status: string; invoiced: boolean; invoice_number: string | null }> }
  | { summary: { total_invoiced: number; total_received: number; total_pending: number }; rows: Array<{ customer_id: string; customer_name: string; total_invoiced: number; total_received: number; total_pending: number; invoice_count: number }> }
  | { rows: Array<{ item_id: string; item_name: string; stock_on_hand: number; delivered_in_period: number }> };

type ReqVsDelRow = { order_number: string; order_date: string; customer_name: string; item_name: string; required_qty: number; delivered_qty: number; pending_qty: number };
type StockVsDelRow = { item_id: string; item_name: string; stock_on_hand: number; delivered_in_period: number };
type DelVsInvRow = { id: string; number: string; challan_date: string; customer_name: string; status: string; invoiced: boolean; invoice_number: string | null };
type InvVsPayRow = { customer_id: string; customer_name: string; total_invoiced: number; total_received: number; total_pending: number; invoice_count: number };

function CustomReportView({ reportId, data }: { reportId: ReportId; data: unknown }) {
  const d = data as CustomReportData & { summary?: Record<string, number> };
  const rows = 'rows' in d ? d.rows : [];
  const summary = 'summary' in d ? d.summary : null;

  if (reportId === 'requirement-vs-delivery' && summary && 'total_orders' in summary) {
    const s = summary as { total_orders: number; total_lines: number; total_required: number; total_delivered: number; total_pending: number };
    const rRows = rows as ReqVsDelRow[];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
          <div className="rounded-lg bg-slate-100 p-3"><span className="text-slate-600">Orders</span><div className="font-semibold">{s.total_orders}</div></div>
          <div className="rounded-lg bg-slate-100 p-3"><span className="text-slate-600">Lines</span><div className="font-semibold">{s.total_lines}</div></div>
          <div className="rounded-lg bg-slate-100 p-3"><span className="text-slate-600">Required</span><div className="font-semibold">{s.total_required}</div></div>
          <div className="rounded-lg bg-slate-100 p-3"><span className="text-slate-600">Delivered</span><div className="font-semibold text-green-700">{s.total_delivered}</div></div>
          <div className="rounded-lg bg-slate-100 p-3"><span className="text-slate-600">Pending</span><div className="font-semibold text-amber-700">{s.total_pending}</div></div>
        </div>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-2">Order #</th><th className="text-left p-2">Date</th><th className="text-left p-2">Customer</th><th className="text-left p-2">Item</th>
                <th className="text-right p-2">Required</th><th className="text-right p-2">Delivered</th><th className="text-right p-2">Pending</th>
              </tr>
            </thead>
            <tbody>
              {rRows.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="p-2">{r.order_number}</td><td className="p-2">{r.order_date}</td><td className="p-2">{r.customer_name}</td><td className="p-2">{r.item_name}</td>
                  <td className="p-2 text-right">{r.required_qty}</td><td className="p-2 text-right text-green-700">{r.delivered_qty}</td><td className="p-2 text-right text-amber-700">{r.pending_qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (reportId === 'stock-vs-delivery') {
    const sRows = rows as StockVsDelRow[];
    return (
      <div className="space-y-4">
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-2">Item</th><th className="text-right p-2">Stock on hand</th><th className="text-right p-2">Delivered in period</th>
              </tr>
            </thead>
            <tbody>
              {sRows.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="p-2">{r.item_name}</td><td className="p-2 text-right">{r.stock_on_hand}</td><td className="p-2 text-right">{r.delivered_in_period}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (reportId === 'delivery-vs-invoiced' && summary && 'total_challans' in summary) {
    const s = summary as { total_challans: number; invoiced: number; not_invoiced: number };
    const dRows = rows as DelVsInvRow[];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg bg-slate-100 p-3"><span className="text-slate-600">Total challans</span><div className="font-semibold">{s.total_challans}</div></div>
          <div className="rounded-lg bg-slate-100 p-3"><span className="text-slate-600">Invoiced</span><div className="font-semibold text-green-700">{s.invoiced}</div></div>
          <div className="rounded-lg bg-slate-100 p-3"><span className="text-slate-600">Not invoiced</span><div className="font-semibold text-amber-700">{s.not_invoiced}</div></div>
        </div>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-2">Challan #</th><th className="text-left p-2">Date</th><th className="text-left p-2">Customer</th><th className="text-left p-2">Status</th><th className="text-left p-2">Invoiced</th><th className="text-left p-2">Invoice #</th>
              </tr>
            </thead>
            <tbody>
              {dRows.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="p-2">{r.number}</td><td className="p-2">{r.challan_date}</td><td className="p-2">{r.customer_name}</td><td className="p-2">{r.status}</td>
                  <td className="p-2">{r.invoiced ? 'Yes' : 'No'}</td><td className="p-2">{r.invoice_number ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (reportId === 'invoice-vs-payment' && summary && 'total_invoiced' in summary) {
    const s = summary as { total_invoiced: number; total_received: number; total_pending: number };
    const pRows = rows as InvVsPayRow[];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg bg-slate-100 p-3"><span className="text-slate-600">Total invoiced</span><div className="font-semibold">₹{s.total_invoiced.toLocaleString()}</div></div>
          <div className="rounded-lg bg-slate-100 p-3"><span className="text-slate-600">Total received</span><div className="font-semibold text-green-700">₹{s.total_received.toLocaleString()}</div></div>
          <div className="rounded-lg bg-slate-100 p-3"><span className="text-slate-600">Total pending</span><div className="font-semibold text-amber-700">₹{s.total_pending.toLocaleString()}</div></div>
        </div>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-2">Customer</th><th className="text-right p-2">Invoiced</th><th className="text-right p-2">Received</th><th className="text-right p-2">Pending</th><th className="text-right p-2">Invoices</th>
              </tr>
            </thead>
            <tbody>
              {pRows.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="p-2">{r.customer_name}</td><td className="p-2 text-right">₹{r.total_invoiced.toLocaleString()}</td><td className="p-2 text-right text-green-700">₹{r.total_received.toLocaleString()}</td><td className="p-2 text-right text-amber-700">₹{r.total_pending.toLocaleString()}</td><td className="p-2 text-right">{r.invoice_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <pre className="text-xs bg-slate-50 p-4 rounded-lg overflow-auto max-h-96">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

export default function ReportsPage() {
  const [selected, setSelected] = useState<ReportId | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ageingType, setAgeingType] = useState<'receivables' | 'payables'>('receivables');

  const runReport = async (_exportCsv = false) => {
    if (!selected || selected === 'dashboard') {
      window.location.href = '/dashboard';
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selected === 'ageing') params.set('type', ageingType);
      else {
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        if (companyId) params.set('company_id', companyId);
        if (customerId && (selected === 'requirement-vs-delivery' || selected === 'invoice-vs-payment' || selected === 'delivery-vs-invoiced'))
          params.set('customer_id', customerId);
      }
      if (selected === 'pl' || selected === 'balance-sheet') {
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        if (selected === 'balance-sheet') params.set('as_of', to || new Date().toISOString().slice(0, 10));
        if (companyId) params.set('company_id', companyId);
      }
      const qs = params.toString();
      const path = selected === 'balance-sheet' ? `reports/balance-sheet${qs ? `?${qs}` : ''}` : `reports/${selected}${qs ? `?${qs}` : ''}`;
      const { data: res, error: err } = await apiGet<unknown>(path);
      if (err) setError(err);
      else setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report');
    }
    setLoading(false);
  };

  const handleExport = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('smebuzz_token') : null;
    if (!token) return;
    const params = new URLSearchParams();
    params.set('format', 'csv');
    if (selected === 'ageing') params.set('type', ageingType);
    else {
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (selected === 'balance-sheet') params.set('as_of', to || new Date().toISOString().slice(0, 10));
      if (companyId) params.set('company_id', companyId);
      if (customerId && selected) params.set('customer_id', customerId);
    }
    const url = `${getApiUrl(selected === 'balance-sheet' ? 'reports/balance-sheet' : `reports/${selected}`)}?${params.toString()}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${selected}-${selected === 'ageing' ? ageingType : from || 'all'}-${to || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Reports</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {REPORTS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => { setSelected(r.id); setData(null); setError(null); }}
            className={`rounded-xl border-2 p-6 text-left transition ${
              selected === r.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-300'
            }`}
          >
            <h2 className="font-semibold text-slate-900 mb-1">{r.label}</h2>
            <p className="text-sm text-slate-500">{r.description}</p>
          </button>
        ))}
      </div>

      {selected && selected !== 'dashboard' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">
            {REPORTS.find((r) => r.id === selected)?.label} — Filters
          </h2>
          <div className="flex flex-wrap gap-4 items-end mb-4">
            {selected === 'ageing' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                <select value={ageingType} onChange={(e) => setAgeingType(e.target.value as 'receivables' | 'payables')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="receivables">Receivables</option>
                  <option value="payables">Payables</option>
                </select>
              </div>
            )}
            {selected !== 'ageing' && (
              <>
                {selected !== 'invoice-vs-payment' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">From date</label>
                      <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">To date</label>
                      <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                  </>
                )}
                {(selected === 'requirement-vs-delivery' || selected === 'delivery-vs-invoiced' || selected === 'invoice-vs-payment') && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Customer ID (optional)</label>
                    <input type="text" value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="Filter by customer UUID" className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-56" />
                  </div>
                )}
                {!CUSTOM_REPORT_IDS.includes(selected!) && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Company ID (optional)</label>
                    <input type="text" value={companyId} onChange={(e) => setCompanyId(e.target.value)} placeholder="UUID" className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-64" />
                  </div>
                )}
              </>
            )}
            <button
              type="button"
              onClick={() => runReport(false)}
              disabled={loading}
              className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'View report'}
            </button>
            {selected && REPORTS.find((r) => r.id === selected)?.hasExport && (
              <button
                type="button"
                onClick={handleExport}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Export CSV
              </button>
            )}
          </div>
          {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
          {data != null ? (
            CUSTOM_REPORT_IDS.includes(selected!) ? (
              <CustomReportView reportId={selected!} data={data} />
            ) : (
              <div className="overflow-x-auto">
                <pre className="text-xs bg-slate-50 p-4 rounded-lg overflow-auto max-h-96">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            )
          ) : null}
        </div>
      )}

      {selected === 'dashboard' && (
        <p className="text-slate-600">
          <Link href="/dashboard" className="text-brand-600 hover:underline">Open Business overview (Dashboard)</Link>
        </p>
      )}
    </div>
  );
}
