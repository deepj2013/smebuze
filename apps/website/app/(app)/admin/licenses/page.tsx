'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';

type Contact = { id: string; email: string; name?: string | null };
type PaymentRow = {
  id: string;
  gateway: string;
  plan: string;
  interval: string;
  amount_rupees: number;
  status: string;
  reference?: string | null;
  created_at: string;
};

type LicenceRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  plan_label: string;
  is_active: boolean;
  business_type?: string | null;
  license_key?: string | null;
  expired: boolean;
  ends_at: string | null;
  days_left: number | null;
  bucket: 'expired' | 'expiring_soon' | 'active' | 'no_end';
  contacts: Contact[];
  recent_payments: PaymentRow[];
};

type LicencesResponse = {
  summary: {
    total: number;
    expired: number;
    expiring_soon: number;
    active: number;
    no_end: number;
    paused: number;
  };
  prices: Record<string, number>;
  plans: { id: string; label: string; monthly_rupees: number }[];
  offline_methods: { id: string; label: string }[];
  note: string;
  tenants: LicenceRow[];
};

const BUCKET_LABEL: Record<LicenceRow['bucket'], string> = {
  expired: 'Expired',
  expiring_soon: 'Expiring ≤14d',
  active: 'Active',
  no_end: 'No end date',
};

export default function AdminLicencesPage() {
  const [data, setData] = useState<LicencesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | LicenceRow['bucket'] | 'paused'>('all');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<LicenceRow | null>(null);
  const [payForm, setPayForm] = useState({
    method: 'upi',
    plan: 'basic',
    interval: 'monthly',
    amount_rupees: 1599,
    reference: '',
    note: '',
  });

  const load = async () => {
    setLoading(true);
    const { data: res, error: err } = await apiGet<LicencesResponse>('billing/admin/licences');
    if (err) setError(err);
    else if (res) {
      setData(res);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const s = q.trim().toLowerCase();
    return data.tenants.filter((t) => {
      if (filter === 'paused' && t.is_active) return false;
      if (filter !== 'all' && filter !== 'paused' && t.bucket !== filter) return false;
      if (!s) return true;
      return (
        t.name.toLowerCase().includes(s) ||
        t.slug.toLowerCase().includes(s) ||
        (t.business_type || '').toLowerCase().includes(s) ||
        (t.plan || '').toLowerCase().includes(s)
      );
    });
  }, [data, filter, q]);

  const payablePlan = (plan: string) => ['basic', 'advanced', 'enterprise'].includes(plan);

  const openPay = (t: LicenceRow) => {
    setPayFor(t);
    setNotice(null);
    setError(null);
    const monthly = data?.prices?.[t.plan] ?? 1599;
    setPayForm({
      method: 'upi',
      plan: payablePlan(t.plan) ? t.plan : 'basic',
      interval: 'monthly',
      amount_rupees: monthly,
      reference: '',
      note: '',
    });
  };

  const submitPay = async () => {
    if (!payFor) return;
    setBusy(payFor.id);
    const { error: err, data: res } = await apiPost<{ subscription_ends_at?: string; amount_rupees?: number }>(
      'billing/admin/offline-payment',
      {
        tenant_id: payFor.id,
        method: payForm.method,
        plan: payForm.plan,
        interval: payForm.interval,
        amount_rupees: Number(payForm.amount_rupees),
        reference: payForm.reference || undefined,
        note: payForm.note || undefined,
        activate: true,
      },
    );
    setBusy(null);
    if (err) setError(err);
    else {
      setNotice(
        `Recorded ${payForm.method.toUpperCase()} ₹${payForm.amount_rupees} for ${payFor.name}. Licence now ends ${res?.subscription_ends_at?.slice(0, 10) ?? '—'}.`,
      );
      setPayFor(null);
      load();
    }
  };

  const remind = async (t: LicenceRow) => {
    setBusy(t.id);
    setNotice(null);
    const { error: err, data: res } = await apiPost<{ sent?: number; failed?: string[] }>('billing/admin/remind', {
      tenant_id: t.id,
    });
    setBusy(null);
    if (err) setError(err);
    else {
      setNotice(
        `Reminder mailed to ${res?.sent ?? 0} user(s) on ${t.name}${res?.failed?.length ? ` (failed: ${res.failed.join(', ')})` : ''}.`,
      );
      load();
    }
  };

  const activateMonth = async (t: LicenceRow) => {
    setBusy(t.id);
    setNotice(null);
    const { error: err, data: res } = await apiPost<{ ends_at?: string | null }>('billing/admin/activate', {
      tenant_id: t.id,
      interval: 'monthly',
      plan: payablePlan(t.plan) ? t.plan : 'basic',
      is_active: true,
    });
    setBusy(null);
    if (err) setError(err);
    else {
      setNotice(`Activated ${t.name} through ${res?.ends_at?.slice(0, 10) ?? '—'}.`);
      load();
    }
  };

  if (loading && !data) return <p className="text-slate-600">Loading licences…</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-1">Licence renewals</h1>
      <p className="text-sm text-slate-600 mb-4 max-w-3xl">
        Universal admin view of every workspace licence. Record cash, cheque or UPI paid into the SMEBUZE account,
        send renewal reminders, and activate the next period. Online payment gateway can plug in later — same payment ledger.
      </p>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mb-3 text-sm text-emerald-700">{notice}</p>}

      {data && (
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { key: 'all' as const, label: 'All', n: data.summary.total },
            { key: 'expired' as const, label: 'Expired', n: data.summary.expired },
            { key: 'expiring_soon' as const, label: 'Expiring', n: data.summary.expiring_soon },
            { key: 'active' as const, label: 'OK', n: data.summary.active },
            { key: 'no_end' as const, label: 'No date', n: data.summary.no_end },
            { key: 'paused' as const, label: 'Paused', n: data.summary.paused },
          ].map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilter(c.key)}
              className={`rounded-lg border px-3 py-2 text-left text-sm ${
                filter === c.key ? 'border-brand-500 bg-sky-50 text-brand-800' : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              <div className="text-xs text-slate-500">{c.label}</div>
              <div className="text-lg font-semibold">{c.n}</div>
            </button>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, slug, type"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-full sm:w-64 min-h-[44px]"
        />
        <span className="text-xs text-slate-500">{rows.length} workspaces</span>
        <button type="button" onClick={load} className="text-sm text-brand-600 hover:underline">
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[1080px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-3 font-medium text-slate-700">Workspace</th>
              <th className="text-left p-3 font-medium text-slate-700">Type</th>
              <th className="text-left p-3 font-medium text-slate-700">Plan</th>
              <th className="text-left p-3 font-medium text-slate-700">Status</th>
              <th className="text-left p-3 font-medium text-slate-700">Ends</th>
              <th className="text-left p-3 font-medium text-slate-700">Contacts</th>
              <th className="text-left p-3 font-medium text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 align-top">
                <td className="p-3">
                  <div className="font-medium text-slate-800">{t.name}</div>
                  <div className="text-xs font-mono text-slate-500">{t.slug}</div>
                  {!t.is_active && <div className="text-xs text-red-600 mt-0.5">Paused</div>}
                </td>
                <td className="p-3 text-slate-600">{t.business_type || '—'}</td>
                <td className="p-3">{t.plan_label || t.plan}</td>
                <td className="p-3">
                  <span
                    className={
                      t.bucket === 'expired'
                        ? 'text-red-600'
                        : t.bucket === 'expiring_soon'
                          ? 'text-amber-700'
                          : t.bucket === 'active'
                            ? 'text-emerald-700'
                            : 'text-slate-500'
                    }
                  >
                    {BUCKET_LABEL[t.bucket]}
                    {t.days_left != null ? ` (${t.days_left}d)` : ''}
                  </span>
                </td>
                <td className="p-3">{t.ends_at ? t.ends_at.slice(0, 10) : '—'}</td>
                <td className="p-3 text-xs text-slate-600">
                  {t.contacts.length === 0
                    ? '—'
                    : t.contacts.map((c) => c.email).join(', ')}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy === t.id}
                      onClick={() => openPay(t)}
                      className="rounded-md bg-brand-600 text-white px-2.5 py-1 text-xs font-medium disabled:opacity-50"
                    >
                      Record payment
                    </button>
                    <button
                      type="button"
                      disabled={busy === t.id || t.contacts.length === 0}
                      onClick={() => remind(t)}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs disabled:opacity-50"
                    >
                      Remind
                    </button>
                    <button
                      type="button"
                      disabled={busy === t.id}
                      onClick={() => activateMonth(t)}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs disabled:opacity-50"
                    >
                      +1 month
                    </button>
                  </div>
                  {t.recent_payments[0] && (
                    <p className="mt-2 text-[11px] text-slate-500">
                      Last: {t.recent_payments[0].gateway} ₹{t.recent_payments[0].amount_rupees} · {t.recent_payments[0].status}
                      {t.recent_payments[0].reference ? ` · ${t.recent_payments[0].reference}` : ''}
                    </p>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  No workspaces match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {payFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-lg border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-800">Record offline payment</h2>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              {payFor.name} — cash / cheque / UPI received on the SMEBUZE account. Extends the licence and activates the workspace.
            </p>
            <div className="grid gap-3">
              <label className="text-xs text-slate-600">
                Method
                <select
                  value={payForm.method}
                  onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}
                  className="mt-1 block w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                >
                  {(data?.offline_methods ?? [
                    { id: 'cash', label: 'Cash' },
                    { id: 'cheque', label: 'Cheque' },
                    { id: 'upi', label: 'UPI' },
                  ]).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-600">
                Plan
                <select
                  value={payForm.plan}
                  onChange={(e) => {
                    const plan = e.target.value;
                    setPayForm((f) => ({
                      ...f,
                      plan,
                      amount_rupees: data?.prices?.[plan] ?? f.amount_rupees,
                    }));
                  }}
                  className="mt-1 block w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                >
                  {(data?.plans ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} (₹{p.monthly_rupees}/mo)
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-600">
                Period
                <select
                  value={payForm.interval}
                  onChange={(e) => setPayForm((f) => ({ ...f, interval: e.target.value }))}
                  className="mt-1 block w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                >
                  <option value="monthly">1 month</option>
                  <option value="quarterly">3 months</option>
                  <option value="yearly">12 months</option>
                </select>
              </label>
              <label className="text-xs text-slate-600">
                Amount received (₹)
                <input
                  type="number"
                  min={1}
                  value={payForm.amount_rupees}
                  onChange={(e) => setPayForm((f) => ({ ...f, amount_rupees: Number(e.target.value) }))}
                  className="mt-1 block w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs text-slate-600">
                Reference (UPI txn / cheque no.)
                <input
                  type="text"
                  value={payForm.reference}
                  onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))}
                  className="mt-1 block w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                  placeholder="Optional"
                />
              </label>
              <label className="text-xs text-slate-600">
                Note
                <input
                  type="text"
                  value={payForm.note}
                  onChange={(e) => setPayForm((f) => ({ ...f, note: e.target.value }))}
                  className="mt-1 block w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                  placeholder="Optional"
                />
              </label>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button type="button" onClick={() => setPayFor(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
                Cancel
              </button>
              <button
                type="button"
                disabled={busy === payFor.id}
                onClick={submitPay}
                className="rounded-lg bg-brand-600 text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              >
                Save &amp; activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
