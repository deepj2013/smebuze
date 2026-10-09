'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { PageHeader } from '../../components/PageHeader';
import { ResponsiveDataList, type Column } from '../../components/ResponsiveDataList';
import { invoiceStanding, isOverdue, standingClass, standingLabel, type PaymentStanding } from '@/lib/invoice-standing';

interface Invoice {
  id: string;
  number: string;
  invoice_date: string;
  due_date?: string | null;
  total: string | number;
  paid_amount?: string | number;
  balance_due?: string | number;
  payment_status?: string;
  status?: string;
  customer_id?: string | null;
  vendor_id?: string | null;
  customer?: { name: string } | null;
  vendor?: { name: string } | null;
}

type PayFilter = 'all' | PaymentStanding;
type SortKey = 'newest' | 'due' | 'party' | 'balance';

export default function InvoicesPage() {
  const searchParams = useSearchParams();
  const customerId = searchParams?.get('customer_id') ?? '';
  const vendorId = searchParams?.get('vendor_id') ?? '';
  const [list, setList] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [paymentLinkLoading, setPaymentLinkLoading] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [payFilter, setPayFilter] = useState<PayFilter>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [party, setParty] = useState(customerId || vendorId ? `${customerId ? 'c' : 'v'}:${customerId || vendorId}` : 'all');

  const load = async () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (customerId) query.set('customer_id', customerId);
    if (vendorId) query.set('vendor_id', vendorId);
    const path = query.toString() ? `sales/invoices?${query}` : 'sales/invoices';
    const { data, error: err } = await apiGet<Invoice[] | { data: Invoice[] }>(path);
    if (err) setError(err);
    else if (Array.isArray(data)) setList(data);
    else if (data && typeof data === 'object' && Array.isArray((data as { data?: Invoice[] }).data)) {
      setList((data as { data: Invoice[] }).data);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [customerId, vendorId]);

  const deleteInvoice = async (inv: Invoice) => {
    if (Number(inv.paid_amount ?? 0) > 0) {
      setError(`Invoice ${inv.number} has payments. Reverse payments first, then delete.`);
      return;
    }
    const reason = window.prompt(
      `Delete invoice ${inv.number}? It leaves the list but a full copy stays in Audit logs.\n\nOptional reason:`,
      'Entered by mistake',
    );
    if (reason === null) return;
    setDeletingId(inv.id);
    setError(null);
    const { error: err } = await apiPost(`sales/invoices/${inv.id}/delete`, {
      reason: reason.trim() || undefined,
    });
    setDeletingId(null);
    if (err) setError(err);
    else {
      setNotice(`Deleted ${inv.number}. Snapshot kept in Audit logs.`);
      void load();
    }
  };

  const parties = useMemo(() => {
    const map = new Map<string, string>();
    for (const inv of list) {
      if (inv.customer_id) map.set(`c:${inv.customer_id}`, inv.customer?.name || 'Customer');
      else if (inv.vendor_id) map.set(`v:${inv.vendor_id}`, inv.vendor?.name || 'Vendor');
    }
    return Array.from(map.entries());
  }, [list]);

  const counts = useMemo(() => {
    const base = { all: list.length, pending: 0, partial: 0, paid: 0, credit: 0 };
    for (const inv of list) base[invoiceStanding(inv).status] += 1;
    return base;
  }, [list]);

  const shown = useMemo(() => {
    let rows = list.filter((inv) => payFilter === 'all' || invoiceStanding(inv).status === payFilter);
    if (!customerId && !vendorId && party !== 'all') {
      rows = rows.filter((inv) => (inv.customer_id ? `c:${inv.customer_id}` : inv.vendor_id ? `v:${inv.vendor_id}` : '') === party);
    }
    const copy = [...rows];
    if (sort === 'due') {
      copy.sort((a, b) => (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31'));
    } else if (sort === 'party') {
      copy.sort((a, b) => (a.customer?.name || a.vendor?.name || '').localeCompare(b.customer?.name || b.vendor?.name || ''));
    } else if (sort === 'balance') {
      copy.sort((a, b) => invoiceStanding(b).balance - invoiceStanding(a).balance);
    }
    return copy;
  }, [list, payFilter, sort, party, customerId, vendorId]);

  const partyName = list[0]?.customer?.name || list[0]?.vendor?.name;

  const columns: Column<Invoice>[] = [
    { key: 'number', label: 'Number', cardLabel: 'Invoice' },
    {
      key: 'billTo',
      label: 'Party',
      cardLabel: 'Party',
      render: (r) => r.customer?.name ?? r.vendor?.name ?? '—',
    },
    {
      key: 'invoice_date',
      label: 'Date',
      cardLabel: 'Date',
      render: (r) => (typeof r.invoice_date === 'string' ? r.invoice_date.slice(0, 10) : '—'),
    },
    {
      key: 'due_date',
      label: 'Due',
      cardLabel: 'Due',
      render: (r) => {
        const due = r.due_date ? String(r.due_date).slice(0, 10) : '—';
        const late = isOverdue(r.due_date, invoiceStanding(r).status);
        return <span className={late ? 'font-medium text-red-700' : ''}>{late ? `${due} overdue` : due}</span>;
      },
    },
    {
      key: 'total',
      label: 'Total',
      cardLabel: 'Total',
      className: 'text-right',
      render: (r) => `₹${Number(r.total).toFixed(2)}`,
    },
    {
      key: 'paid_amount',
      label: 'Paid',
      cardLabel: 'Paid',
      className: 'text-right',
      render: (r) => `₹${Number(r.paid_amount ?? 0).toFixed(2)}`,
    },
    {
      key: 'balance',
      label: 'Due',
      cardLabel: 'Due now',
      className: 'text-right',
      render: (r) => `₹${invoiceStanding(r).balance.toFixed(2)}`,
    },
    {
      key: 'payment_status',
      label: 'Status',
      cardLabel: 'Status',
      render: (r) => {
        const status = invoiceStanding(r).status;
        return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${standingClass(status)}`}>{standingLabel(status)}</span>;
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (inv) => (
        <span className="flex flex-wrap gap-2">
          <Link href={`/sales/invoices/${inv.id}/edit`} className="text-brand-600 hover:underline text-sm">Edit</Link>
          <a href={`/sales/invoices/${inv.id}/print`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline text-sm">Print</a>
          <Link href={`/sales/credit-notes/new?invoice_id=${inv.id}`} className="text-brand-600 hover:underline text-sm">Credit note</Link>
          <Link href={`/sales/debit-notes/new?invoice_id=${inv.id}`} className="text-brand-600 hover:underline text-sm">Debit note</Link>
          {invoiceStanding(inv).balance > 0.05 && (
            <button
              type="button"
              disabled={paymentLinkLoading === inv.id}
              className="text-brand-600 hover:underline text-sm disabled:opacity-50"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                setPaymentLinkLoading(inv.id);
                const { data: link, error: linkErr } = await apiGet<{ enabled: boolean; url?: string }>(
                  `sales/invoices/${inv.id}/payment-link`,
                );
                setPaymentLinkLoading(null);
                if (link?.enabled && link?.url) window.open(link.url, '_blank');
                else setError(linkErr || 'Scan to pay is off. An admin can connect Razorpay under Organization → Scan to pay.');
              }}
            >
              {paymentLinkLoading === inv.id ? '…' : 'Pay online'}
            </button>
          )}
          <button
            type="button"
            disabled={deletingId === inv.id}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void deleteInvoice(inv);
            }}
            className="text-red-600 hover:underline text-sm disabled:opacity-50"
          >
            {deletingId === inv.id ? '…' : 'Delete'}
          </button>
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Pending, partial and paid stay on this list. Credit notes reduce what is due. Debit notes increase it. The original invoice number does not change."
      >
        <Link href="/sales/invoices/parties" className="rounded-lg border border-slate-300 px-3 sm:px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 min-h-[44px] inline-flex items-center justify-center">Party-wise</Link>
        <Link href="/organization/invoice-series" className="rounded-lg border border-slate-300 px-3 sm:px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 min-h-[44px] inline-flex items-center justify-center">Invoice series</Link>
        <Link href="/sales/invoices/pending" className="rounded-lg border border-slate-300 px-3 sm:px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 min-h-[44px] inline-flex items-center justify-center">Pending</Link>
        <Link href="/sales/invoices/new" className="rounded-lg bg-brand-600 text-white px-3 sm:px-4 py-2.5 text-sm font-medium hover:bg-brand-700 min-h-[44px] inline-flex items-center justify-center">Create invoice</Link>
      </PageHeader>
      {(customerId || vendorId) && (
        <p className="mb-3 text-sm text-slate-700">
          Showing invoices for <strong>{partyName || 'this party'}</strong>.{' '}
          <Link href="/sales/invoices" className="text-brand-700 hover:underline">Show all parties</Link>
        </p>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['all', 'pending', 'partial', 'paid', 'credit'] as PayFilter[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setPayFilter(key)}
            className={`inline-flex min-h-[40px] items-center rounded-full px-3.5 text-sm font-medium ${payFilter === key ? 'bg-brand-600 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}
          >
            {key === 'all' ? 'All' : standingLabel(key)} ({counts[key]})
          </button>
        ))}
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="newest">Newest first</option>
          <option value="due">Due date</option>
          <option value="balance">Amount due</option>
          <option value="party">Party name</option>
        </select>
        {!customerId && !vendorId && (
          <select value={party} onChange={(e) => setParty(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="all">All parties</option>
            {parties.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {notice && <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm">{notice}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <ResponsiveDataList<Invoice>
          columns={columns}
          data={shown}
          keyField="id"
          emptyMessage="No invoices for this view."
          emptyAction={
            <Link href="/sales/invoices/new" className="inline-block rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-brand-700">
              Add your first invoice
            </Link>
          }
          renderMobileCard={(inv) => {
            const standing = invoiceStanding(inv);
            return (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <Link href={`/sales/invoices/${inv.id}/edit`} className="block active:bg-slate-50 -m-1 p-1 rounded-lg">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-semibold text-slate-900">{inv.number}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${standingClass(standing.status)}`}>{standingLabel(standing.status)}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{inv.customer?.name ?? inv.vendor?.name ?? '—'}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Due ₹{standing.balance.toFixed(2)} · Paid ₹{standing.paid.toFixed(2)}
                    {isOverdue(inv.due_date, standing.status) ? ' · Overdue' : ''}
                  </p>
                </Link>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Link href={`/sales/invoices/${inv.id}/edit`} className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-800">Edit</Link>
                  <a href={`/sales/invoices/${inv.id}/print`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-800">Print</a>
                  <button type="button" disabled={deletingId === inv.id} onClick={() => void deleteInvoice(inv)} className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-red-50 text-sm font-semibold text-red-700 disabled:opacity-50">Delete</button>
                </div>
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
