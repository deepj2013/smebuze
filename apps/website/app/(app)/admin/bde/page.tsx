'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { formatInr } from '@/lib/plans';

type Lead = {
  id: string;
  company_name: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  status: string;
  estimated_price_rupees?: number | null;
  plan?: string;
  billing_interval?: string;
  notes?: string | null;
  source?: string;
  owner?: { id: string; email: string; name?: string | null } | null;
};

type BdeUser = { id: string; email: string; name?: string | null; phone?: string | null };

const STATUSES = ['new', 'contacted', 'demo', 'negotiation', 'won', 'lost'];
const PLANS = ['basic', 'advanced', 'enterprise'];
const INTERVALS = ['quarterly', 'yearly'];

const emptyForm = {
  company_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  status: 'new',
  estimated_price_rupees: '',
  plan: 'basic',
  billing_interval: 'quarterly',
  notes: '',
  source: 'outbound',
};

export default function AdminBdePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [bdeUsers, setBdeUsers] = useState<BdeUser[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(true);
  const [newBde, setNewBde] = useState({ email: '', password: '', name: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [l, u] = await Promise.all([
      apiGet<Lead[]>('bde/leads'),
      apiGet<BdeUser[]>('bde/users'),
    ]);
    if (l.error) setError(l.error);
    else if (Array.isArray(l.data)) setLeads(l.data);
    if (Array.isArray(u.data)) setBdeUsers(u.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveLead(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setOk('');
    const body = {
      company_name: form.company_name.trim(),
      contact_name: form.contact_name.trim() || undefined,
      contact_email: form.contact_email.trim() || undefined,
      contact_phone: form.contact_phone.trim() || undefined,
      status: form.status,
      estimated_price_rupees: form.estimated_price_rupees ? Number(form.estimated_price_rupees) : undefined,
      plan: form.plan,
      billing_interval: form.billing_interval,
      notes: form.notes.trim() || undefined,
      source: form.source,
    };
    const r = editingId
      ? await apiPatch(`bde/leads/${editingId}`, body)
      : await apiPost('bde/leads', body);
    if (r.error) {
      setError(r.error);
      return;
    }
    setOk(editingId ? 'Lead updated' : 'Lead added');
    setForm(emptyForm);
    setEditingId(null);
    void load();
  }

  async function createBde(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const r = await apiPost('bde/users', {
      email: newBde.email.trim(),
      password: newBde.password,
      name: newBde.name.trim() || undefined,
    });
    if (r.error) {
      setError(r.error);
      return;
    }
    setOk(`BDE ${newBde.email} created — they can sign in with Platform admin on the login page.`);
    setNewBde({ email: '', password: '', name: '' });
    void load();
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Platform sales</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">BDE pipeline</h1>
        <p className="mt-1 text-sm text-slate-600">
          Track SMEBUZE prospects only — company, status, and estimated package price (quarterly minimum or yearly with discount).
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {ok && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{ok}</p>}

      {bdeUsers.length >= 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">Create BDE login</h2>
          <p className="mt-1 text-xs text-slate-500">Universal admin only. BDEs see this pipeline — not tenant ERP data.</p>
          <form onSubmit={createBde} className="mt-3 grid gap-2 sm:grid-cols-4">
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Name"
              value={newBde.name}
              onChange={(e) => setNewBde({ ...newBde, name: e.target.value })}
            />
            <input
              required
              type="email"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Email"
              value={newBde.email}
              onChange={(e) => setNewBde({ ...newBde, email: e.target.value })}
            />
            <input
              required
              type="password"
              minLength={8}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Password"
              value={newBde.password}
              onChange={(e) => setNewBde({ ...newBde, password: e.target.value })}
            />
            <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">
              Add BDE
            </button>
          </form>
          {bdeUsers.length > 0 && (
            <ul className="mt-3 text-sm text-slate-600">
              {bdeUsers.map((u) => (
                <li key={u.id}>
                  {u.name || u.email} · {u.email}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <form onSubmit={saveLead} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="font-semibold text-slate-900">{editingId ? 'Edit lead' : 'Add customer / lead'}</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            required
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Company name"
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Contact name"
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Email"
            value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Phone"
            value={form.contact_phone}
            onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
          />
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Estimated price (₹)"
            value={form.estimated_price_rupees}
            onChange={(e) => setForm({ ...form, estimated_price_rupees: e.target.value })}
          />
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value })}
          >
            {PLANS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.billing_interval}
            onChange={(e) => setForm({ ...form, billing_interval: e.target.value })}
          >
            {INTERVALS.map((i) => (
              <option key={i} value={i}>
                {i === 'quarterly' ? 'Quarterly (minimum)' : 'Yearly (15% off)'}
              </option>
            ))}
          </select>
        </div>
        <textarea
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          rows={2}
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <div className="flex gap-2">
          <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">
            {editingId ? 'Save' : 'Add lead'}
          </button>
          {editingId && (
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <p className="p-4 text-sm text-slate-500">Loading…</p>
        ) : leads.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No leads yet.</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Est. price</th>
                <th className="px-3 py-2">Package</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b border-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-900">{l.company_name}</td>
                  <td className="px-3 py-2 capitalize">{l.status}</td>
                  <td className="px-3 py-2">
                    {l.estimated_price_rupees != null ? formatInr(l.estimated_price_rupees) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {l.plan} / {l.billing_interval}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {[l.contact_name, l.contact_phone, l.contact_email].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-brand-700 hover:underline"
                      onClick={() => {
                        setEditingId(l.id);
                        setForm({
                          company_name: l.company_name,
                          contact_name: l.contact_name || '',
                          contact_email: l.contact_email || '',
                          contact_phone: l.contact_phone || '',
                          status: l.status,
                          estimated_price_rupees: l.estimated_price_rupees != null ? String(l.estimated_price_rupees) : '',
                          plan: l.plan || 'basic',
                          billing_interval: l.billing_interval || 'quarterly',
                          notes: l.notes || '',
                          source: l.source || 'outbound',
                        });
                      }}
                    >
                      Edit
                    </button>
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
