'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost, apiPatch } from '@/lib/api';

type LeaveType = { id: string; name: string; code?: string | null; days_per_year: string };
type Employee = { id: string; name: string };
type Leave = {
  id: string;
  from_date: string;
  to_date: string;
  days: string;
  reason?: string | null;
  status: string;
  employee?: { name: string };
  leave_type?: { name: string };
};

export default function LeavesPage() {
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [list, setList] = useState<Leave[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    employee_id: '',
    leave_type_id: '',
    from_date: '',
    to_date: '',
    reason: '',
  });

  const load = async () => {
    const [t, e, l] = await Promise.all([
      apiGet<LeaveType[]>('hr/leave-types'),
      apiGet<Employee[]>('hr/employees'),
      apiGet<Leave[]>('hr/leaves'),
    ]);
    if (t.error || e.error || l.error) setError(t.error || e.error || l.error || '');
    setTypes(Array.isArray(t.data) ? t.data : []);
    setEmployees(Array.isArray(e.data) ? e.data : []);
    setList(Array.isArray(l.data) ? l.data : []);
    if (!form.employee_id && Array.isArray(e.data) && e.data[0]) {
      setForm((f) => ({ ...f, employee_id: e.data![0].id, leave_type_id: (t.data as LeaveType[])?.[0]?.id || '' }));
    }
  };

  useEffect(() => { void load(); }, []);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setMsg('');
    setError('');
    const r = await apiPost('hr/leaves', form);
    if (r.error) setError(r.error);
    else {
      setMsg('Leave recorded (approved).');
      setForm({ ...form, from_date: '', to_date: '', reason: '' });
      void load();
    }
  }

  async function setStatus(id: string, status: 'approved' | 'rejected') {
    const r = await apiPatch(`hr/leaves/${id}`, { status });
    if (r.error) setError(r.error);
    else void load();
  }

  const input = 'mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Staff &amp; payroll · owner only</p>
          <h1 className="mt-1 text-2xl font-bold">Leaves</h1>
          <p className="mt-1 text-sm text-slate-500">Owner records and approves leave. Paid leave counts toward payroll when attendance is not uploaded.</p>
        </div>
        <Link href="/hr/employees" className="rounded-lg border px-3 py-2 text-sm">← Employees</Link>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {msg && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</div>}

      <form onSubmit={submit} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm">
          Employee
          <select className={input} required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Leave type
          <select className={input} required value={form.leave_type_id} onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="text-sm">
          From
          <input type="date" className={input} required value={form.from_date} onChange={(e) => setForm({ ...form, from_date: e.target.value })} />
        </label>
        <label className="text-sm">
          To
          <input type="date" className={input} required value={form.to_date} onChange={(e) => setForm({ ...form, to_date: e.target.value })} />
        </label>
        <label className="text-sm sm:col-span-2">
          Reason
          <input className={input} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </label>
        <div className="flex items-end">
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">Save leave</button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="p-3 text-left">Employee</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Dates</th>
              <th className="p-3 text-left">Days</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">No leave records yet.</td></tr>
            ) : (
              list.map((l) => (
                <tr key={l.id} className="border-b border-slate-100">
                  <td className="p-3">{l.employee?.name ?? '—'}</td>
                  <td className="p-3">{l.leave_type?.name ?? '—'}</td>
                  <td className="p-3">{String(l.from_date).slice(0, 10)} → {String(l.to_date).slice(0, 10)}</td>
                  <td className="p-3">{l.days}</td>
                  <td className="p-3 capitalize">{l.status}</td>
                  <td className="p-3 text-right space-x-2">
                    {l.status === 'pending' && (
                      <>
                        <button type="button" className="text-emerald-700" onClick={() => void setStatus(l.id, 'approved')}>Approve</button>
                        <button type="button" className="text-red-600" onClick={() => void setStatus(l.id, 'rejected')}>Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
