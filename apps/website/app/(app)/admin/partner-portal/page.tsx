'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { formatInr } from '@/lib/plans';

type Dash = {
  partner: {
    name: string;
    code: string;
    coupon_code: string;
    referral_link: string;
    commission_percent: number;
  } | null;
  referred_tenants: Array<{ id: string; name: string; slug: string; plan: string; created_at: string }>;
  commissions: Array<{
    id: string;
    status: string;
    amount_rupees: number;
    commission_rupees: number;
    tenant?: { name: string; slug: string } | null;
  }>;
  totals: { pending_rupees: number; approved_rupees: number; paid_rupees: number };
};

export default function PartnerPortalPage() {
  const [dash, setDash] = useState<Dash | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const r = await apiGet<Dash>('partners/me');
    if (r.error) setError(r.error);
    else if (r.data) setDash(r.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <main className="p-4">
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>
      </main>
    );
  }

  if (!dash) {
    return (
      <main className="p-4">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  if (!dash.partner) {
    return (
      <main className="p-4">
        <p className="text-sm text-slate-600">No partners yet. Create one under Partners & coupons.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Agency portal</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{dash.partner.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Share your coupon <span className="font-mono font-semibold text-brand-700">{dash.partner.coupon_code}</span> or referral
          link. You earn {dash.partner.commission_percent}% when attributed workspaces pay SMEBUZE.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <p className="text-xs uppercase text-slate-500">Your referral link</p>
        <p className="mt-1 break-all font-medium text-slate-900">{dash.partner.referral_link}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Pending</p>
          <p className="text-lg font-semibold">{formatInr(dash.totals.pending_rupees)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Approved</p>
          <p className="text-lg font-semibold">{formatInr(dash.totals.approved_rupees)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Paid</p>
          <p className="text-lg font-semibold">{formatInr(dash.totals.paid_rupees)}</p>
        </div>
      </div>

      <section>
        <h2 className="font-semibold text-slate-900">Referred workspaces</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {dash.referred_tenants.length === 0 && <li className="text-slate-500">None yet.</li>}
          {dash.referred_tenants.map((t) => (
            <li key={t.id} className="rounded-lg border border-slate-100 px-3 py-2">
              {t.name} <span className="text-slate-500">({t.slug})</span> · {t.plan}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold text-slate-900">Commission history</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {dash.commissions.length === 0 && <li className="text-slate-500">None yet.</li>}
          {dash.commissions.map((c) => (
            <li key={c.id} className="flex justify-between rounded-lg border border-slate-100 px-3 py-2">
              <span>
                {c.tenant?.name || 'Workspace'} · {formatInr(c.commission_rupees)}
              </span>
              <span className="capitalize text-slate-500">{c.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
