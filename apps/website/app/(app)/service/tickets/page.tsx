'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';

interface Ticket {
  id: string;
  number: string;
  subject: string;
  status: string;
  priority: string;
  customer?: { name: string } | null;
}

interface Company {
  id: string;
  name: string;
}

export default function ServiceTicketsPage() {
  const [list, setList] = useState<Ticket[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ company_id: '', subject: '', description: '', priority: 'medium' });

  function load() {
    apiGet<Ticket[]>('service/tickets').then(({ data, error: err }) => {
      if (err) setError(err);
      else if (Array.isArray(data)) setList(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
    apiGet<Company[]>('organization/companies').then((r) => {
      const arr = Array.isArray(r.data) ? r.data : [];
      setCompanies(arr);
      if (arr[0]) setForm((f) => ({ ...f, company_id: arr[0].id }));
    });
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const { error: err } = await apiPost('service/tickets', form);
    if (err) setError(err);
    else {
      setForm((f) => ({ ...f, subject: '', description: '' }));
      load();
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Service tickets</h1>
      <p className="text-sm text-slate-600 mb-4">
        Customer / AMC service tickets inside your business. To contact SMEBUZE platform support, use Organization → Support to SMEBUZE.
      </p>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}

      <form onSubmit={create} className="mb-6 grid gap-2 sm:grid-cols-2 rounded-xl border border-slate-200 bg-white p-4">
        <select
          required
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          value={form.company_id}
          onChange={(e) => setForm({ ...form, company_id: e.target.value })}
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <input
          required
          placeholder="Subject"
          className="rounded border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
        />
        <textarea
          placeholder="Description"
          rows={2}
          className="rounded border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <button type="submit" className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium sm:col-span-2">
          Raise service ticket
        </button>
      </form>

      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Number</th>
                <th className="text-left p-3 font-medium text-slate-700">Subject</th>
                <th className="text-left p-3 font-medium text-slate-700">Customer</th>
                <th className="text-left p-3 font-medium text-slate-700">Status</th>
                <th className="text-left p-3 font-medium text-slate-700">Priority</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    No tickets yet.
                  </td>
                </tr>
              ) : (
                list.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{t.number}</td>
                    <td className="p-3">{t.subject}</td>
                    <td className="p-3">{t.customer?.name ?? '—'}</td>
                    <td className="p-3">{t.status}</td>
                    <td className="p-3">{t.priority}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
