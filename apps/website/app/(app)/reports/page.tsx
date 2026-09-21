'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet, getApiUrl } from '@/lib/api';

type ReportId =
  | 'dashboard'
  | 'sales-summary'
  | 'purchase-summary'
  | 'gst-summary'
  | 'ledger-summary'
  | 'general-ledger'
  | 'trial-balance'
  | 'vendor-ledger'
  | 'tds-summary'
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
  { id: 'general-ledger', label: 'General ledger', description: 'Journal entries grouped for GL view', hasExport: false },
  { id: 'trial-balance', label: 'Trial balance', description: 'Debits vs credits as of a date', hasExport: false },
  { id: 'vendor-ledger', label: 'Vendor ledger', description: 'Purchase orders and payments by vendor', hasExport: false },
  { id: 'tds-summary', label: 'TDS summary', description: 'TDS deducted on vendor payments', hasExport: false },
  { id: 'health-score', label: 'Business health score', description: 'Score 1–10 and message', hasExport: false },
  { id: 'ageing', label: 'Ageing report', description: 'Receivables/payables by bucket — CSV export', hasExport: true },
  { id: 'pl', label: 'P&L', description: 'Profit & Loss by period', hasExport: true },
  { id: 'balance-sheet', label: 'Balance sheet', description: 'Assets, liabilities, equity as of date', hasExport: true },
];

const money = (n: number | string | undefined | null) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);

const qty = (n: number | string | undefined | null) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 4 }).format(Number(n) || 0);

function monthBounds() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'amber' | 'slate' }) {
  const toneCls =
    tone === 'green' ? 'text-green-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-900';
  return (
    <div className="rounded-lg bg-slate-100 p-3">
      <span className="text-xs text-slate-600">{label}</span>
      <div className={`mt-0.5 font-semibold ${toneCls}`}>{value}</div>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">{message}</p>;
}

function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  if (!rows.length) return <Empty message="No rows for this period. Try a wider date range or create invoices first." />;
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left p-2 whitespace-nowrap font-medium text-slate-700">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-100">
              {r.map((c, j) => (
                <td key={j} className={`p-2 whitespace-nowrap ${typeof c === 'number' || (typeof c === 'string' && c.startsWith('₹')) ? 'text-right' : ''}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportResult({ reportId, data }: { reportId: ReportId; data: Record<string, unknown> }) {
  if (reportId === 'sales-summary') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Invoiced" value={money(data.totalInvoiced as number)} />
          <Stat label="Received" value={money(data.totalReceived as number)} tone="green" />
          <Stat label="Pending" value={money(data.totalPending as number)} tone="amber" />
          <Stat label="Invoices" value={String(data.invoiceCount ?? 0)} />
        </div>
        <DataTable
          headers={['Number', 'Date', 'Total', 'Paid', 'Due']}
          rows={((data.rows as Array<Record<string, unknown>>) || []).map((r) => [
            String(r.number ?? ''),
            String(r.date ?? '').slice(0, 10),
            money(r.total as number),
            money(r.paid as number),
            money(r.due as number),
          ])}
        />
      </div>
    );
  }

  if (reportId === 'purchase-summary') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Ordered" value={money(data.totalOrdered as number)} />
          <Stat label="Paid" value={money(data.totalPaid as number)} tone="green" />
          <Stat label="Pending" value={money(data.totalPending as number)} tone="amber" />
          <Stat label="Orders" value={String(data.orderCount ?? 0)} />
        </div>
        <DataTable
          headers={['Number', 'Date', 'Total', 'Paid', 'Due']}
          rows={((data.rows as Array<Record<string, unknown>>) || []).map((r) => [
            String(r.number ?? ''),
            String(r.date ?? '').slice(0, 10),
            money(r.total as number),
            money(r.paid as number),
            money(r.due as number),
          ])}
        />
      </div>
    );
  }

  if (reportId === 'gst-summary') {
    return (
      <DataTable
        headers={['HSN/SAC', 'Taxable', 'CGST', 'SGST', 'IGST', 'Lines']}
        rows={((data.rows as Array<Record<string, unknown>>) || []).map((r) => [
          String(r.hsn_sac ?? ''),
          money(r.taxable_value as number),
          money(r.cgst as number),
          money(r.sgst as number),
          money(r.igst as number),
          Number(r.count ?? 0),
        ])}
      />
    );
  }

  if (reportId === 'item-wise-sales') {
    return (
      <DataTable
        headers={['Item', 'Qty', 'Taxable', 'Lines']}
        rows={((data.rows as Array<Record<string, unknown>>) || []).map((r) => [
          String(r.description ?? ''),
          qty(r.quantity as number),
          money(r.taxable_value as number),
          Number(r.count ?? 0),
        ])}
      />
    );
  }

  if (reportId === 'requirement-vs-delivery') {
    const s = (data.summary || {}) as Record<string, number>;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Stat label="Orders" value={String(s.total_orders ?? 0)} />
          <Stat label="Lines" value={String(s.total_lines ?? 0)} />
          <Stat label="Required" value={qty(s.total_required)} />
          <Stat label="Delivered" value={qty(s.total_delivered)} tone="green" />
          <Stat label="Pending" value={qty(s.total_pending)} tone="amber" />
        </div>
        <DataTable
          headers={['Order #', 'Date', 'Customer', 'Item', 'Required', 'Delivered', 'Pending']}
          rows={((data.rows as Array<Record<string, unknown>>) || []).map((r) => [
            String(r.order_number ?? ''),
            String(r.order_date ?? ''),
            String(r.customer_name ?? ''),
            String(r.item_name ?? ''),
            qty(r.required_qty as number),
            qty(r.delivered_qty as number),
            qty(r.pending_qty as number),
          ])}
        />
      </div>
    );
  }

  if (reportId === 'stock-vs-delivery') {
    return (
      <DataTable
        headers={['Item', 'Stock on hand', 'Delivered in period']}
        rows={((data.rows as Array<Record<string, unknown>>) || []).map((r) => [
          String(r.item_name ?? ''),
          qty(r.stock_on_hand as number),
          qty(r.delivered_in_period as number),
        ])}
      />
    );
  }

  if (reportId === 'delivery-vs-invoiced') {
    const s = (data.summary || {}) as Record<string, number>;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Challans" value={String(s.total_challans ?? 0)} />
          <Stat label="Invoiced" value={String(s.invoiced ?? 0)} tone="green" />
          <Stat label="Not invoiced" value={String(s.not_invoiced ?? 0)} tone="amber" />
        </div>
        <DataTable
          headers={['Number', 'Date', 'Customer', 'Status', 'Invoiced', 'Invoice #']}
          rows={((data.rows as Array<Record<string, unknown>>) || []).map((r) => [
            String(r.number ?? ''),
            String(r.challan_date ?? ''),
            String(r.customer_name ?? ''),
            String(r.status ?? ''),
            r.invoiced ? 'Yes' : 'No',
            String(r.invoice_number ?? '—'),
          ])}
        />
      </div>
    );
  }

  if (reportId === 'invoice-vs-payment') {
    const s = (data.summary || {}) as Record<string, number>;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Invoiced" value={money(s.total_invoiced)} />
          <Stat label="Received" value={money(s.total_received)} tone="green" />
          <Stat label="Pending" value={money(s.total_pending)} tone="amber" />
        </div>
        <DataTable
          headers={['Customer', 'Invoices', 'Invoiced', 'Received', 'Pending']}
          rows={((data.rows as Array<Record<string, unknown>>) || []).map((r) => [
            String(r.customer_name ?? ''),
            Number(r.invoice_count ?? 0),
            money(r.total_invoiced as number),
            money(r.total_received as number),
            money(r.total_pending as number),
          ])}
        />
      </div>
    );
  }

  if (reportId === 'ledger-summary' || reportId === 'general-ledger') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Debit" value={money(data.totalDebit as number)} />
          <Stat label="Credit" value={money(data.totalCredit as number)} />
          <Stat label="Entries" value={String(data.entryCount ?? 0)} />
        </div>
        <DataTable
          headers={['Number', 'Date', 'Reference', 'Debit', 'Credit']}
          rows={((data.rows as Array<Record<string, unknown>>) || []).map((r) => [
            String(r.number ?? ''),
            String(r.date ?? '').slice(0, 10),
            String(r.reference ?? '—'),
            money(r.total_debit as number),
            money(r.total_credit as number),
          ])}
        />
      </div>
    );
  }

  if (reportId === 'trial-balance') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="As of" value={String(data.as_of ?? '')} />
          <Stat label="Total debit" value={money(data.total_debit as number)} />
          <Stat label="Total credit" value={money(data.total_credit as number)} />
          <Stat label="Balanced" value={data.balanced ? 'Yes' : 'No'} tone={data.balanced ? 'green' : 'amber'} />
        </div>
        <p className="text-sm text-slate-500">{Number(data.entry_count ?? 0)} journal entries included.</p>
      </div>
    );
  }

  if (reportId === 'vendor-ledger') {
    const vendors = (data.vendors as Array<Record<string, unknown>>) || [];
    if (!vendors.length) return <Empty message="No vendors yet. Add vendors under Purchase to see this ledger." />;
    return (
      <div className="space-y-6">
        {vendors.map((v) => (
          <div key={String(v.vendor_id)} className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold text-slate-900">{String(v.vendor_name ?? 'Vendor')}</h3>
              <span className="text-sm text-slate-600">Closing: {money(v.closing_balance as number)}</span>
            </div>
            <DataTable
              headers={['Date', 'Type', 'Reference', 'Debit', 'Credit', 'Balance']}
              rows={((v.transactions as Array<Record<string, unknown>>) || []).map((t) => [
                String(t.date ?? '').slice(0, 10),
                String(t.type ?? ''),
                String(t.reference ?? ''),
                money(t.debit as number),
                money(t.credit as number),
                money(t.balance as number),
              ])}
            />
          </div>
        ))}
      </div>
    );
  }

  if (reportId === 'tds-summary') {
    return (
      <div className="space-y-4">
        <Stat label="Total TDS deducted" value={money(data.total_tds_deducted as number)} />
        <DataTable
          headers={['Date', 'Vendor ID', 'Amount', 'TDS %', 'TDS amount']}
          rows={((data.rows as Array<Record<string, unknown>>) || []).map((r) => [
            String(r.payment_date ?? '').slice(0, 10),
            String(r.vendor_id ?? '').slice(0, 8),
            money(r.amount as number),
            `${Number(r.tds_percent ?? 0)}%`,
            money(r.tds_amount as number),
          ])}
        />
      </div>
    );
  }

  if (reportId === 'health-score') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 space-y-3">
        <p className="text-4xl font-bold text-brand-700">{Number(data.score ?? 0)}<span className="text-lg text-slate-500"> / 10</span></p>
        <p className="text-slate-800">{String(data.message ?? '')}</p>
        <div className="grid grid-cols-3 gap-3 pt-2">
          <Stat label="Receivables" value={money((data.factors as Record<string, number>)?.receivables)} tone="amber" />
          <Stat label="Payables" value={money((data.factors as Record<string, number>)?.payables)} />
          <Stat label="Pending invoices" value={String((data.factors as Record<string, number>)?.pendingCount ?? 0)} />
        </div>
      </div>
    );
  }

  if (reportId === 'ageing') {
    const buckets = (data.buckets || {}) as Record<string, number>;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="0–30 days" value={money(buckets['0-30'])} />
          <Stat label="31–60 days" value={money(buckets['31-60'])} tone="amber" />
          <Stat label="61–90 days" value={money(buckets['61-90'])} tone="amber" />
          <Stat label="90+ days" value={money(buckets['90+'])} />
        </div>
        <DataTable
          headers={data.type === 'payables' ? ['Number', 'Vendor', 'Due', 'Due date', 'Days', 'Bucket'] : ['Number', 'Buyer', 'Due', 'Due date', 'Days', 'Bucket']}
          rows={((data.rows as Array<Record<string, unknown>>) || []).map((r) => [
            String(r.number ?? ''),
            String((data.type === 'payables' ? r.vendor : r.buyer) ?? ''),
            money(r.due as number),
            String(r.due_date ?? '—').slice(0, 10),
            Number(r.daysOverdue ?? 0),
            String(r.bucket ?? ''),
          ])}
        />
      </div>
    );
  }

  if (reportId === 'pl') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Income" value={money(data.total_income as number)} tone="green" />
          <Stat label="Expense" value={money(data.total_expense as number)} tone="amber" />
          <Stat label="Net profit" value={money(data.net_profit as number)} />
        </div>
        <p className="text-sm text-slate-500">
          Period {String(data.from ?? '')} → {String(data.to ?? '')}. Based on journal entries for this workspace.
        </p>
      </div>
    );
  }

  if (reportId === 'balance-sheet') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Assets" value={money(data.assets as number)} />
          <Stat label="Liabilities" value={money(data.liabilities as number)} tone="amber" />
          <Stat label="Equity" value={money(data.equity as number)} tone="green" />
        </div>
        <p className="text-sm text-slate-500">As of {String(data.as_of ?? '')}.</p>
      </div>
    );
  }

  return (
    <pre className="text-xs bg-slate-50 p-4 rounded-lg overflow-auto max-h-96">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function ReportsPage() {
  const defaults = useMemo(() => monthBounds(), []);
  const [selected, setSelected] = useState<ReportId | null>(null);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [companyId, setCompanyId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ageingType, setAgeingType] = useState<'receivables' | 'payables'>('receivables');
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const unwrap = <T,>(raw: T[] | { data?: T[] } | null | undefined): T[] => {
      if (Array.isArray(raw)) return raw;
      if (raw && Array.isArray((raw as { data?: T[] }).data)) return (raw as { data: T[] }).data;
      return [];
    };
    void apiGet<Array<{ id: string; name: string }> | { data: Array<{ id: string; name: string }> }>('organization/companies').then((r) => {
      setCompanies(unwrap(r.data).map((c) => ({ id: c.id, name: c.name })));
    });
    void apiGet<Array<{ id: string; name: string }> | { data: Array<{ id: string; name: string }> }>('crm/customers').then((r) => {
      setCustomers(unwrap(r.data).map((c) => ({ id: c.id, name: c.name })));
    });
    void apiGet<Array<{ id: string; name: string }> | { data: Array<{ id: string; name: string }> }>('purchase/vendors').then((r) => {
      setVendors(unwrap(r.data).map((v) => ({ id: v.id, name: v.name })));
    });
  }, []);

  const runReport = useCallback(async (reportId: ReportId) => {
    if (reportId === 'dashboard') {
      window.location.href = '/dashboard';
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (reportId === 'ageing') params.set('type', ageingType);
      else if (reportId === 'health-score') {
        /* no filters */
      } else if (reportId === 'vendor-ledger') {
        if (vendorId) params.set('vendor_id', vendorId);
      } else if (reportId === 'trial-balance' || reportId === 'balance-sheet') {
        params.set('as_of', to || new Date().toISOString().slice(0, 10));
        if (companyId) params.set('company_id', companyId);
      } else {
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        if (companyId) params.set('company_id', companyId);
        if (
          customerId &&
          (reportId === 'requirement-vs-delivery' ||
            reportId === 'invoice-vs-payment' ||
            reportId === 'delivery-vs-invoiced')
        ) {
          params.set('customer_id', customerId);
        }
      }
      const qs = params.toString();
      const path =
        reportId === 'balance-sheet'
          ? `reports/balance-sheet${qs ? `?${qs}` : ''}`
          : `reports/${reportId}${qs ? `?${qs}` : ''}`;
      const { data: res, error: err } = await apiGet<Record<string, unknown>>(path);
      if (err) setError(err);
      else setData(res ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report');
    }
    setLoading(false);
  }, [ageingType, companyId, customerId, from, to, vendorId]);

  const selectReport = (id: ReportId) => {
    setSelected(id);
    setData(null);
    setError(null);
    if (id !== 'dashboard') void runReport(id);
  };

  const handleExport = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('smebuzz_token') : null;
    if (!token || !selected) return;
    const params = new URLSearchParams();
    params.set('format', 'csv');
    if (selected === 'ageing') params.set('type', ageingType);
    else {
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (selected === 'balance-sheet') params.set('as_of', to || new Date().toISOString().slice(0, 10));
      if (companyId) params.set('company_id', companyId);
      if (customerId) params.set('customer_id', customerId);
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
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Reports</h1>
      <p className="text-sm text-slate-500 mb-4">
        Live numbers for this workspace only. Pick a report — filters default to the current month.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <Link href="/reports/gstr-1" className="rounded-xl border-2 border-brand-200 bg-brand-50 p-6 hover:border-brand-400">
          <h2 className="font-semibold text-slate-900 mb-1">GSTR-1</h2>
          <p className="text-sm text-slate-600">Filing-ready outward supplies from all sales — B2B, B2C, HSN and credit notes. Export CSV.</p>
        </Link>
        <Link href="/reports/gstr-2a" className="rounded-xl border-2 border-slate-200 bg-white p-6 hover:border-brand-300">
          <h2 className="font-semibold text-slate-900 mb-1">GSTR-2A reconciliation</h2>
          <p className="text-sm text-slate-600">Match GST vendor bills in your books with the portal 2A download. See matched, mismatch and missing invoices.</p>
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {REPORTS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => selectReport(r.id)}
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
            {REPORTS.find((r) => r.id === selected)?.label}
          </h2>
          <div className="flex flex-wrap gap-4 items-end mb-4">
            {selected === 'ageing' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                <select
                  value={ageingType}
                  onChange={(e) => setAgeingType(e.target.value as 'receivables' | 'payables')}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[40px]"
                >
                  <option value="receivables">Receivables</option>
                  <option value="payables">Payables</option>
                </select>
              </div>
            )}
            {selected === 'vendor-ledger' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Vendor</label>
                <select
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[40px] min-w-[200px]"
                >
                  <option value="">All vendors</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            )}
            {selected !== 'ageing' && selected !== 'health-score' && selected !== 'vendor-ledger' && (
              <>
                {selected !== 'invoice-vs-payment' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {selected === 'trial-balance' || selected === 'balance-sheet' ? 'As of' : 'From date'}
                      </label>
                      {selected === 'trial-balance' || selected === 'balance-sheet' ? (
                        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      ) : (
                        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      )}
                    </div>
                    {selected !== 'trial-balance' && selected !== 'balance-sheet' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">To date</label>
                        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      </div>
                    )}
                  </>
                )}
                {(selected === 'requirement-vs-delivery' ||
                  selected === 'delivery-vs-invoiced' ||
                  selected === 'invoice-vs-payment') && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Customer</label>
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[40px] min-w-[200px]"
                    >
                      <option value="">All customers</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {selected !== 'tds-summary' &&
                  selected !== 'requirement-vs-delivery' &&
                  selected !== 'stock-vs-delivery' &&
                  selected !== 'delivery-vs-invoiced' &&
                  selected !== 'invoice-vs-payment' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Company</label>
                      <select
                        value={companyId}
                        onChange={(e) => setCompanyId(e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[40px] min-w-[200px]"
                      >
                        <option value="">All companies</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
              </>
            )}
            <button
              type="button"
              onClick={() => selected && void runReport(selected)}
              disabled={loading}
              className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50 min-h-[40px]"
            >
              {loading ? 'Loading…' : 'View report'}
            </button>
            {selected && REPORTS.find((r) => r.id === selected)?.hasExport && (
              <button
                type="button"
                onClick={() => void handleExport()}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[40px]"
              >
                Export CSV
              </button>
            )}
          </div>
          {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
          {loading && !data ? <p className="text-sm text-slate-500">Loading…</p> : null}
          {data != null ? <ReportResult reportId={selected} data={data} /> : null}
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
