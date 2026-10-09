'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';

type Ticket = {
  id: string;
  number: string;
  subject: string;
  description?: string | null;
  category: string;
  status: string;
  priority: string;
  created_at: string;
};

export default function SupportTicketsPage() {
  const [list, setList] = useState<Ticket[]>([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [form, setForm] = useState({
    subject: '',
    description: '',
    category: 'general',
    priority: 'medium',
  });

  function load() {
    apiGet<Ticket[]>('support/tickets').then((r) => {
      if (r.error) setError(r.error);
      else if (Array.isArray(r.data)) setList(r.data);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const r = await apiPost('support/tickets', form);
    if (r.error) setError(r.error);
    else {
      setOk('Ticket submitted to SMEBUZE admin');
      setForm({ subject: '', description: '', category: 'general', priority: 'medium' });
      load();
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Support tickets</h1>
        <p className="mt-1 text-sm text-slate-600">
          Raise a ticket to the SMEBUZE platform team (billing, bugs, feature help). This is not your customer service module.
        </p>
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {ok && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{ok}</p>}

      <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <input
          required
          placeholder="Subject"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
        />
        <textarea
          rows={4}
          placeholder="Describe the issue"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div className="flex gap-2">
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="general">General</option>
            <option value="billing">Billing</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature request</option>
            <option value="onboarding">Onboarding</option>
          </select>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">
            Submit to admin
          </button>
        </div>
      </form>

      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Number</th>
              <th className="p-3">Subject</th>
              <th className="p-3">Status</th>
              <th className="p-3">Priority</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-slate-500">
                  No tickets yet.
                </td>
              </tr>
            ) : (
              list.map((t) => (
                <tr key={t.id} className="border-b border-slate-50">
                  <td className="p-3 font-mono text-xs">{t.number}</td>
                  <td className="p-3">{t.subject}</td>
                  <td className="p-3 capitalize">{t.status}</td>
                  <td className="p-3 capitalize">{t.priority}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
