'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

type LicenceRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  plan_label: string;
  business_type?: string | null;
  account_kind?: 'demo' | 'real' | 'unknown';
  created_at?: string | null;
  expired: boolean;
  ends_at: string | null;
  days_left: number | null;
  bucket: 'expired' | 'expiring_soon' | 'active' | 'no_end';
  is_active: boolean;
  contacts: { email: string }[];
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
  tenants: LicenceRow[];
};

function isReal(t: LicenceRow) {
  return t.account_kind === 'real';
}

export default function AdminHomePage() {
  const [data, setData] = useState<LicencesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: res, error: err } = await apiGet<LicencesResponse>('billing/admin/licences');
      if (err) setError(err);
      else setData(res ?? null);
      setLoading(false);
    })();
  }, []);

  const real = useMemo(() => (data?.tenants ?? []).filter(isReal), [data]);
  const newSignups = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400000;
    return real
      .filter((t) => t.created_at && new Date(t.created_at).getTime() >= cutoff)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }, [real]);
  const trialNotConverted = useMemo(
    () => real.filter((t) => t.bucket === 'expired' || (t.bucket === 'expiring_soon' && (t.days_left ?? 99) <= 7)),
    [real],
  );
  const renewalsDue = useMemo(() => real.filter((t) => t.bucket === 'expired' || t.bucket === 'expiring_soon'), [real]);

  if (loading) return <p className="text-slate-600">Loading platform dashboard…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return null;

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold text-slate-800 mb-1">Universal admin</h1>
      <p className="text-sm text-slate-600 mb-6">
        Renewals, new signups, and trial follow-up. Record offline payments and extend days under{' '}
        <Link href="/admin/licenses" className="text-brand-600 underline">Licences</Link>
        ; create or edit workspaces under{' '}
        <Link href="/admin/tenants" className="text-brand-600 underline">Tenants</Link>.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-8">
        {[
          { label: 'Workspaces', n: data.summary.total, href: '/admin/licenses' },
          { label: 'Expired', n: data.summary.expired, href: '/admin/licenses' },
          { label: 'Expiring ≤14d', n: data.summary.expiring_soon, href: '/admin/licenses' },
          { label: 'Active', n: data.summary.active, href: '/admin/licenses' },
          { label: 'Real clients', n: real.length, href: '/admin/tenants?account=real' },
          { label: 'Paused', n: data.summary.paused, href: '/admin/licenses' },
        ].map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-brand-400"
          >
            <div className="text-xs text-slate-500">{c.label}</div>
            <div className="text-lg font-semibold text-slate-900">{c.n}</div>
          </Link>
        ))}
      </div>

      <Section title="New signups (last 30 days)" empty="No new real workspaces in the last 30 days.">
        {newSignups.map((t) => (
          <Row key={t.id} t={t} hint={t.created_at?.slice(0, 10) ?? '—'} />
        ))}
      </Section>

      <Section title="Trial expired or ending soon — call to convert" empty="No real workspaces need urgent licence follow-up.">
        {trialNotConverted.slice(0, 15).map((t) => (
          <Row key={t.id} t={t} hint={t.ends_at ? `ends ${t.ends_at.slice(0, 10)}` : 'no end date'} />
        ))}
      </Section>

      <Section title="All renewals due (real clients)" empty="All real clients are active beyond 14 days.">
        {renewalsDue.slice(0, 20).map((t) => (
          <Row key={t.id} t={t} hint={`${t.bucket}${t.days_left != null ? ` · ${t.days_left}d` : ''}`} />
        ))}
      </Section>

      <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-medium text-slate-800 mb-2">Quick actions</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Client paid (cash/UPI/cheque):</strong> Admin → Licences → Record payment (extends subscription automatically).
          </li>
          <li>
            <strong>Extend or shorten days:</strong> Admin → Tenants → edit subscription end date, or Licences → +1 month / activate.
          </li>
          <li>
            <strong>Email renewal:</strong> Licences → Remind (uses workspace admin emails).
          </li>
          <li>
            <strong>Create workspace:</strong> Admin → Tenants → Create tenant, then add user & set password.
          </li>
        </ul>
      </div>
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  const has = items.some(Boolean);
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">{title}</h2>
      <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
        {!has ? <p className="p-4 text-sm text-slate-500">{empty}</p> : children}
      </div>
    </section>
  );
}

function Row({ t, hint }: { t: LicenceRow; hint: string }) {
  const email = t.contacts[0]?.email;
  return (
    <div className="p-3 flex flex-wrap items-center justify-between gap-2">
      <div>
        <div className="font-medium text-slate-800">{t.name}</div>
        <div className="text-xs font-mono text-slate-500">{t.slug}</div>
        <div className="text-xs text-slate-500 mt-0.5">
          {t.business_type || '—'} · {t.plan_label} · {hint}
          {email ? ` · ${email}` : ''}
        </div>
      </div>
      <div className="flex gap-2">
        <Link href={`/admin/licenses`} className="text-xs rounded-md bg-brand-600 text-white px-2.5 py-1.5">
          Licences
        </Link>
        <Link href={`/admin/tenants`} className="text-xs rounded-md border border-slate-300 px-2.5 py-1.5">
          Tenant
        </Link>
      </div>
    </div>
  );
}
