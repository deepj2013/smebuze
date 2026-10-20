'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { PageHeader } from '../../components/PageHeader';

type Settlement = {
  id: string;
  tenant_id: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  status: string;
  payment_reference?: string | null;
  period_start: string;
  period_end: string;
};

type Job = {
  id: string;
  status: string;
  pickup_label?: string | null;
  fee: number;
  rider_name?: string | null;
  rider_phone?: string | null;
  seller_tenant_id?: string | null;
  marketplace_order_id?: string | null;
  hub_order_id?: string | null;
};

type Finance = {
  summary: { gmv: number; platform_commission: number; open_settlement_net: number; default_fee_pct: number; settle_default: string };
  tenants: Array<{ tenant_id: string; name: string; slug?: string | null; gross: number; commission: number; net: number; orders: number; unsettled_net: number }>;
  compliance: Array<{ id: string; title: string; detail: string }>;
};

export default function AdminMarketplacePage() {
  const [tab, setTab] = useState<'finance' | 'settlements' | 'delivery'>('finance');
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [finance, setFinance] = useState<Finance | null>(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  async function load() {
    setError('');
    if (tab === 'finance') {
      const r = await apiGet<Finance>('admin/marketplace/finance');
      if (r.error) setError(Array.isArray(r.error) ? r.error.join(' ') : r.error);
      else setFinance(r.data ?? null);
    } else if (tab === 'settlements') {
      const r = await apiGet<Settlement[]>('admin/marketplace/settlements');
      if (r.error) setError(Array.isArray(r.error) ? r.error.join(' ') : r.error);
      else setSettlements(Array.isArray(r.data) ? r.data : []);
    } else {
      const r = await apiGet<Job[]>('admin/delivery-jobs');
      if (r.error) setError(Array.isArray(r.error) ? r.error.join(' ') : r.error);
      else setJobs(Array.isArray(r.data) ? r.data : []);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function build() {
    const { data, error: err } = await apiPost<{ created: number }>('admin/marketplace/settlements/build', {});
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else {
      setOk(`Built ${data?.created ?? 0} settlement(s)`);
      load();
    }
  }

  async function pay(s: Settlement) {
    const ref = window.prompt('NEFT / UPI reference');
    if (ref === null) return;
    const { error: err } = await apiPost(`admin/marketplace/settlements/${s.id}/pay`, { reference: ref });
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else {
      setOk('Marked paid');
      load();
    }
  }

  async function patchJob(job: Job, status: string) {
    const rider_name = status === 'assigned' ? window.prompt('Rider name', job.rider_name || '') || undefined : undefined;
    const rider_phone = status === 'assigned' ? window.prompt('Rider phone', job.rider_phone || '') || undefined : undefined;
    const { error: err } = await apiPatch(`admin/delivery-jobs/${job.id}`, { status, rider_name, rider_phone });
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else load();
  }

  return (
    <div>
      <PageHeader title="Marketplace ops" description="Settlements (platform collect → shop) and delivery jobs." />
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {ok && <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm">{ok}</div>}
      <div className="mb-4 flex gap-2 flex-wrap">
        <button type="button" onClick={() => setTab('finance')} className={`rounded-lg px-3 py-2 text-sm ${tab === 'finance' ? 'bg-slate-900 text-white' : 'border'}`}>Finance</button>
        <button type="button" onClick={() => setTab('settlements')} className={`rounded-lg px-3 py-2 text-sm ${tab === 'settlements' ? 'bg-slate-900 text-white' : 'border'}`}>Settlements</button>
        <button type="button" onClick={() => setTab('delivery')} className={`rounded-lg px-3 py-2 text-sm ${tab === 'delivery' ? 'bg-slate-900 text-white' : 'border'}`}>Delivery jobs</button>
      </div>

      {tab === 'finance' && finance && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-4 text-sm"><p className="text-slate-500">GMV</p><p className="text-xl font-semibold">₹{finance.summary.gmv.toFixed(2)}</p></div>
            <div className="rounded-xl border bg-white p-4 text-sm"><p className="text-slate-500">Our commission</p><p className="text-xl font-semibold">₹{finance.summary.platform_commission.toFixed(2)}</p></div>
            <div className="rounded-xl border bg-white p-4 text-sm"><p className="text-slate-500">Open settle net</p><p className="text-xl font-semibold">₹{finance.summary.open_settlement_net.toFixed(2)}</p><p className="text-xs text-slate-500">{finance.summary.default_fee_pct}% · {finance.summary.settle_default}</p></div>
          </div>
          <div className="rounded-xl border bg-white overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left"><tr><th className="p-2">Shop</th><th className="p-2">Orders</th><th className="p-2">Gross</th><th className="p-2">Commission</th><th className="p-2">Unsettled</th></tr></thead>
              <tbody>
                {finance.tenants.map((t) => (
                  <tr key={t.tenant_id} className="border-t">
                    <td className="p-2">{t.name} <span className="text-slate-400">{t.slug}</span></td>
                    <td className="p-2">{t.orders}</td>
                    <td className="p-2">₹{t.gross.toFixed(2)}</td>
                    <td className="p-2">₹{t.commission.toFixed(2)}</td>
                    <td className="p-2">₹{t.unsettled_net.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {finance.tenants.length === 0 && <p className="p-4 text-slate-500 text-sm">No platform-collect payments yet.</p>}
          </div>
          <ul className="space-y-2 text-sm">
            {finance.compliance.map((c) => (
              <li key={c.id} className="rounded-xl border bg-white p-3">
                <p className="font-medium">{c.title}</p>
                <p className="text-slate-600 text-xs mt-0.5">{c.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'settlements' && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <button type="button" onClick={build} className="rounded-lg bg-brand-600 text-white px-3 py-2 text-sm">
              Build open settlements from paid orders
            </button>
            <button
              type="button"
              onClick={async () => {
                const { data, error: err } = await apiPost<{ created: number }>('admin/marketplace/settlements/run-weekly', {});
                if (err) setError(Array.isArray(err) ? err.join(' ') : err);
                else {
                  setOk(`Weekly run created ${data?.created ?? 0}`);
                  load();
                }
              }}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              Run weekly settlement now
            </button>
          </div>
          <ul className="space-y-2">
            {settlements.map((s) => (
              <li key={s.id} className="rounded-xl border bg-white p-4 flex flex-wrap justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium">{s.period_start} → {s.period_end} · {s.status}</p>
                  <p className="text-slate-500">
                    Gross ₹{s.gross_amount.toFixed(2)} − commission ₹{s.commission_amount.toFixed(2)} = net ₹{s.net_amount.toFixed(2)}
                  </p>
                  {s.payment_reference && <p className="text-xs">Ref: {s.payment_reference}</p>}
                </div>
                {s.status !== 'paid' && (
                  <button type="button" onClick={() => pay(s)} className="rounded-lg border px-3 py-2">Mark paid</button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === 'delivery' && (
        <ul className="space-y-2">
          {jobs.map((j) => (
            <li key={j.id} className="rounded-xl border bg-white p-4 text-sm">
              <p className="font-medium">{j.pickup_label || 'Job'} · {j.status} · ₹{Number(j.fee).toFixed(2)}</p>
              <p className="text-slate-500 text-xs">
                {j.marketplace_order_id ? 'Mall' : 'Hub'} · rider {j.rider_name || '—'} {j.rider_phone || ''}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {['assigned', 'picked_up', 'out_for_delivery', 'delivered', 'failed'].map((st) => (
                  <button key={st} type="button" disabled={j.status === st} onClick={() => patchJob(j, st)} className="rounded border px-2 py-1 text-xs disabled:opacity-40">
                    {st}
                  </button>
                ))}
              </div>
            </li>
          ))}
          {jobs.length === 0 && <p className="text-slate-500">No delivery jobs.</p>}
        </ul>
      )}
    </div>
  );
}
