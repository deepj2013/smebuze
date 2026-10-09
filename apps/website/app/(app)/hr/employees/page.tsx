'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost, apiPatch, apiPut } from '@/lib/api';

type Company = { id: string; name: string };
type Component = {
  id?: string;
  name: string;
  code?: string | null;
  kind: 'allowance' | 'deduction';
  amount: string | number;
  is_percent?: boolean;
};
type Employee = {
  id: string;
  name: string;
  employee_code?: string | null;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  basic_salary?: string;
  working_days_per_month?: number;
  company?: { name: string } | null;
  company_id?: string;
  components?: Component[];
  is_active?: boolean;
};

const blankComp = (kind: 'allowance' | 'deduction'): Component => ({
  name: '',
  kind,
  amount: 0,
  is_percent: false,
});

export default function EmployeesPage() {
  const [list, setList] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    company_id: '',
    name: '',
    employee_code: '',
    phone: '',
    designation: '',
    basic_salary: '',
    working_days_per_month: '26',
  });
  const [components, setComponents] = useState<Component[]>([]);

  const load = async () => {
    setLoading(true);
    const { data, error: err } = await apiGet<Employee[]>('hr/employees');
    if (err) setError(err);
    else setList(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    void apiGet<Company[] | { data: Company[] }>('organization/companies').then((r) => {
      const rows = Array.isArray(r.data) ? r.data : (r.data as { data?: Company[] })?.data || [];
      setCompanies(rows);
      if (rows[0]) setForm((f) => ({ ...f, company_id: f.company_id || rows[0].id }));
    });
  }, []);

  function openNew() {
    setEditing(null);
    setShowForm(true);
    setComponents([
      { name: 'HRA', kind: 'allowance', amount: 40, is_percent: true },
      { name: 'Special allowance', kind: 'allowance', amount: 0, is_percent: false },
      { name: 'PF (employee)', kind: 'deduction', amount: 12, is_percent: true },
      { name: 'Professional tax', kind: 'deduction', amount: 200, is_percent: false },
    ]);
    setForm({
      company_id: companies[0]?.id || '',
      name: '',
      employee_code: '',
      phone: '',
      designation: '',
      basic_salary: '',
      working_days_per_month: '26',
    });
  }

  function openEdit(e: Employee) {
    setEditing(e);
    setShowForm(true);
    setForm({
      company_id: e.company_id || '',
      name: e.name,
      employee_code: e.employee_code || '',
      phone: e.phone || '',
      designation: e.designation || '',
      basic_salary: String(e.basic_salary || ''),
      working_days_per_month: String(e.working_days_per_month || 26),
    });
    setComponents(
      (e.components || []).map((c) => ({
        name: c.name,
        code: c.code,
        kind: c.kind,
        amount: Number(c.amount),
        is_percent: c.is_percent,
      })),
    );
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    setMsg('');
    setError(null);
    if (editing) {
      const r = await apiPatch(`hr/employees/${editing.id}`, {
        name: form.name,
        employee_code: form.employee_code || undefined,
        phone: form.phone || undefined,
        designation: form.designation || undefined,
        basic_salary: Number(form.basic_salary || 0),
        working_days_per_month: Number(form.working_days_per_month || 26),
      });
      if (r.error) {
        setError(r.error);
        return;
      }
      const c = await apiPut(`hr/employees/${editing.id}/components`, {
        components: components.filter((x) => x.name.trim()),
      });
      if (c.error) {
        setError(c.error);
        return;
      }
      setMsg('Employee updated');
    } else {
      const r = await apiPost('hr/employees', {
        ...form,
        basic_salary: Number(form.basic_salary || 0),
        working_days_per_month: Number(form.working_days_per_month || 26),
        seed_default_components: false,
        components: components.filter((x) => x.name.trim()),
      });
      if (r.error) {
        setError(r.error);
        return;
      }
      setMsg('Employee added');
    }
    setShowForm(false);
    void load();
  }

  const input = 'mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Staff &amp; payroll · owner only</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Employees</h1>
          <p className="mt-1 text-sm text-slate-500">
            Set basic salary and per-person allowances / deductions. Staff logins do not see this menu.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/hr/attendance" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Attendance</Link>
          <Link href="/hr/leaves" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Leaves</Link>
          <Link href="/hr/payroll" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Payroll</Link>
          <button type="button" onClick={openNew} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">
            Add employee
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {msg && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</div>}

      {showForm && (
        <form onSubmit={save} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">{editing ? 'Edit employee' : 'New employee'}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {!editing && (
              <label className="text-sm">
                Company
                <select className={input} required value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-sm">
              Name
              <input className={input} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="text-sm">
              Code
              <input className={input} value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} placeholder="E001" />
            </label>
            <label className="text-sm">
              Phone
              <input className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label className="text-sm">
              Designation
              <input className={input} value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            </label>
            <label className="text-sm">
              Basic salary / month
              <input className={input} type="number" min={0} step="0.01" value={form.basic_salary} onChange={(e) => setForm({ ...form, basic_salary: e.target.value })} />
            </label>
            <label className="text-sm">
              Working days / month
              <input className={input} type="number" min={1} max={31} value={form.working_days_per_month} onChange={(e) => setForm({ ...form, working_days_per_month: e.target.value })} />
            </label>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-800">Allowances &amp; deductions</p>
              <div className="flex gap-2">
                <button type="button" className="text-xs text-cyan-700" onClick={() => setComponents([...components, blankComp('allowance')])}>+ Allowance</button>
                <button type="button" className="text-xs text-cyan-700" onClick={() => setComponents([...components, blankComp('deduction')])}>+ Deduction</button>
              </div>
            </div>
            <div className="space-y-2">
              {components.map((c, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <label className="col-span-3 text-xs">
                    Type
                    <select
                      className={input}
                      value={c.kind}
                      onChange={(e) => {
                        const next = [...components];
                        next[i] = { ...c, kind: e.target.value as 'allowance' | 'deduction' };
                        setComponents(next);
                      }}
                    >
                      <option value="allowance">Allowance</option>
                      <option value="deduction">Deduction</option>
                    </select>
                  </label>
                  <label className="col-span-4 text-xs">
                    Name
                    <input
                      className={input}
                      value={c.name}
                      onChange={(e) => {
                        const next = [...components];
                        next[i] = { ...c, name: e.target.value };
                        setComponents(next);
                      }}
                    />
                  </label>
                  <label className="col-span-2 text-xs">
                    Amount
                    <input
                      className={input}
                      type="number"
                      step="0.01"
                      value={c.amount}
                      onChange={(e) => {
                        const next = [...components];
                        next[i] = { ...c, amount: e.target.value };
                        setComponents(next);
                      }}
                    />
                  </label>
                  <label className="col-span-2 text-xs flex items-center gap-2 pb-2">
                    <input
                      type="checkbox"
                      checked={Boolean(c.is_percent)}
                      onChange={(e) => {
                        const next = [...components];
                        next[i] = { ...c, is_percent: e.target.checked };
                        setComponents(next);
                      }}
                    />
                    % of basic
                  </label>
                  <button
                    type="button"
                    className="col-span-1 pb-2 text-xs text-red-600"
                    onClick={() => setComponents(components.filter((_, j) => j !== i))}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">Save</button>
            <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-slate-600">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="p-3 text-left font-medium text-slate-700">Name</th>
                <th className="p-3 text-left font-medium text-slate-700">Code</th>
                <th className="p-3 text-left font-medium text-slate-700">Designation</th>
                <th className="p-3 text-right font-medium text-slate-700">Basic</th>
                <th className="p-3 text-left font-medium text-slate-700">Components</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-500">No employees yet. Add your staff to run payroll.</td></tr>
              ) : (
                list.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3 font-medium">{e.name}</td>
                    <td className="p-3">{e.employee_code ?? '—'}</td>
                    <td className="p-3">{e.designation ?? '—'}</td>
                    <td className="p-3 text-right">₹{Number(e.basic_salary || 0).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-slate-500">{e.components?.length || 0} items</td>
                    <td className="p-3 text-right">
                      <button type="button" className="text-cyan-700" onClick={() => openEdit(e)}>Edit</button>
                    </td>
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
