'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { formatInr } from '@/lib/plans';

type Partner = {
  id: string;
  name: string;
  code: string;
  coupon_code?: string;
  referral_link?: string;
  commission_percent: number;
  status: string;
  contact_email?: string | null;
  contact_name?: string | null;
};

type Commission = {
  id: string;
  status: string;
  amount_rupees: number;
  commission_rupees: number;
  notes?: string | null;
  tenant?: { name: string; slug: string } | null;
  created_at: string;
};

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [form, setForm] = useState({
    name: '',
    code: '',
    commission_percent: '20',
    contact_name: '',
    contact_email: '',
    login_email: '',
    login_password: '',
  });

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([
      apiGet<Partner[]>('partners'),
      apiGet<Commission[]>('partners/commissions'),
    ]);
    if (p.error) setError(p.error);
    else if (Array.isArray(p.data)) setPartners(p.data);
    if (Array.isArray(c.data)) setCommissions(c.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createPartner(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setOk('');
    const r = await apiPost<Partner>('partners', {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      commission_percent: Number(form.commission_percent) || 20,
      contact_name: form.contact_name.trim() || undefined,
      contact_email: form.contact_email.trim() || undefined,
      login_email: form.login_email.trim() || undefined,
      login_password: form.login_password || undefined,
    });
    if (r.error) {
      setError(r.error);
      return;
    }
    setOk(`Partner created. Share code ${r.data?.code} or ${r.data?.referral_link}`);
    setForm({
      name: '',
      code: '',
      commission_percent: '20',
      contact_name: '',
      contact_email: '',
      login_email: '',
      login_password: '',
    });
    void load();
  }

  async function setCommissionStatus(id: string, status: string) {
    const r = await apiPatch(`partners/commissions/${id}`, { status });
    if (r.error) setError(r.error);
    else void load();
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Marketing agencies</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Partners & coupons</h1>
        <p className="mt-1 text-sm text-slate-600">
          Give each agency a coupon code and referral link. When a workspace signs up with that code and pays via Razorpay, commission is recorded automatically.
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {ok && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{ok}</p>}

      <form onSubmit={createPartner} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="font-semibold text-slate-900">Add agency</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            required
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Agency name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            required
            minLength={3}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase"
            placeholder="Coupon / referral code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          />
          <input
            type="number"
            min={0}
            max={50}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Commission %"
            value={form.commission_percent}
            onChange={(e) => setForm({ ...form, commission_percent: e.target.value })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Contact name"
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Contact email"
            value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
          />
          <input
            type="email"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Partner login email (optional)"
            value={form.login_email}
            onChange={(e) => setForm({ ...form, login_email: e.target.value })}
          />
          <input
            type="password"
            minLength={8}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Partner login password"
            value={form.login_password}
            onChange={(e) => setForm({ ...form, login_password: e.target.value })}
          />
        </div>
        <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">
          Create partner
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Active partners</h2>
        {partners.length === 0 ? (
          <p className="text-sm text-slate-500">None yet.</p>
        ) : (
          partners.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-slate-900">
                  {p.name}{' '}
                  <span className="font-mono text-brand-700">{p.code}</span>
                </p>
                <p className="text-slate-600">{p.commission_percent}% · {p.status}</p>
              </div>
              {p.referral_link && (
                <p className="mt-2 break-all text-xs text-slate-500">
                  Referral link: <span className="text-slate-800">{p.referral_link}</span>
                </p>
              )}
            </div>
          ))
        )}
      </section>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-900">Commissions</h2>
        {commissions.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No commissions yet — they appear when referred tenants pay.</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Tenant</th>
                <th className="px-3 py-2">Paid</th>
                <th className="px-3 py-2">Commission</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => (
                <tr key={c.id} className="border-b border-slate-50">
                  <td className="px-3 py-2">{c.tenant?.name || c.tenant?.slug || '—'}</td>
                  <td className="px-3 py-2">{formatInr(c.amount_rupees)}</td>
                  <td className="px-3 py-2 font-medium">{formatInr(c.commission_rupees)}</td>
                  <td className="px-3 py-2 capitalize">{c.status}</td>
                  <td className="px-3 py-2 space-x-2">
                    {c.status === 'pending' && (
                      <button type="button" className="text-brand-700 hover:underline" onClick={() => setCommissionStatus(c.id, 'approved')}>
                        Approve
                      </button>
                    )}
                    {c.status === 'approved' && (
                      <button type="button" className="text-brand-700 hover:underline" onClick={() => setCommissionStatus(c.id, 'paid')}>
                        Mark paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
