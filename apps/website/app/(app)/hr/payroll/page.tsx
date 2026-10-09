'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';

type Company = { id: string; name: string };
type PayrollLine = {
  id: string;
  slip_number?: string | null;
  present_days: string;
  paid_days: string;
  absent_days: string;
  basic: string;
  allowances_json: Array<{ name: string; amount: number }>;
  deductions_json: Array<{ name: string; amount: number }>;
  gross: string;
  deductions_total: string;
  net: string;
  expense_id?: string | null;
  employee?: { name: string; employee_code?: string | null };
};
type PayrollRun = {
  id: string;
  year: number;
  month: number;
  status: string;
  total_gross: string;
  total_deductions: string;
  total_net: string;
  company?: { name: string };
  lines?: PayrollLine[];
};

export default function PayrollPage() {
  const now = new Date();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selected, setSelected] = useState<PayrollRun | null>(null);
  const [companyId, setCompanyId] = useState('');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const loadRuns = async () => {
    const r = await apiGet<PayrollRun[]>('hr/payroll');
    if (r.error) setError(r.error);
    else setRuns(Array.isArray(r.data) ? r.data : []);
  };

  useEffect(() => {
    void apiGet<Company[] | { data: Company[] }>('organization/companies').then((r) => {
      const rows = Array.isArray(r.data) ? r.data : (r.data as { data?: Company[] })?.data || [];
      setCompanies(rows);
      if (rows[0]) setCompanyId(rows[0].id);
    });
    void loadRuns();
  }, []);

  async function generate() {
    setBusy(true);
    setError('');
    setMsg('');
    const r = await apiPost<PayrollRun>('hr/payroll/generate', { company_id: companyId, year, month });
    setBusy(false);
    if (r.error) setError(r.error);
    else {
      setSelected(r.data || null);
      setMsg('Draft payroll generated from salary structure + attendance.');
      void loadRuns();
    }
  }

  async function openRun(id: string) {
    const r = await apiGet<PayrollRun>(`hr/payroll/${id}`);
    if (r.error) setError(r.error);
    else setSelected(r.data || null);
  }

  async function finalize() {
    if (!selected) return;
    if (!confirm('Finalize this payroll? Salary expenses will be created automatically under category Salary.')) return;
    setBusy(true);
    const r = await apiPost<PayrollRun>(`hr/payroll/${selected.id}/finalize`, {});
    setBusy(false);
    if (r.error) setError(r.error);
    else {
      setSelected(r.data || null);
      setMsg('Payroll finalized. Each slip is posted as an unpaid Salary expense (subcategory: Monthly payroll).');
      void loadRuns();
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Staff &amp; payroll · owner only</p>
          <h1 className="mt-1 text-2xl font-bold">Payroll &amp; salary slips</h1>
          <p className="mt-1 text-sm text-slate-500">
            Generate monthly slips from each person&apos;s allowances/deductions and attendance.
            Finalize to auto-add expenses (category <strong>Salary</strong>, subcategory <strong>Monthly payroll</strong>).
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/hr/attendance" className="rounded-lg border px-3 py-2 text-sm">Attendance</Link>
          <Link href="/hr/employees" className="rounded-lg border px-3 py-2 text-sm">Employees</Link>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {msg && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</div>}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-sm">
          Company
          <select className="mt-1 block rounded border px-2 py-2" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Year
          <input type="number" className="mt-1 block w-24 rounded border px-2 py-2" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </label>
        <label className="text-sm">
          Month
          <select className="mt-1 block rounded border px-2 py-2" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(2000, i, 1).toLocaleString('en', { month: 'long' })}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={busy || !companyId}
          onClick={() => void generate()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? 'Working…' : 'Generate draft'}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden lg:col-span-1">
          <p className="border-b bg-slate-50 p-3 text-sm font-medium">Past runs</p>
          <ul className="divide-y text-sm">
            {runs.length === 0 && <li className="p-4 text-slate-500">No payroll runs yet.</li>}
            {runs.map((r) => (
              <li key={r.id}>
                <button type="button" className="w-full p-3 text-left hover:bg-slate-50" onClick={() => void openRun(r.id)}>
                  <span className="font-medium">{r.month}/{r.year}</span>
                  <span className="ml-2 capitalize text-slate-500">{r.status}</span>
                  <span className="mt-1 block text-slate-600">Net ₹{Number(r.total_net).toLocaleString('en-IN')}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
          {!selected ? (
            <p className="text-sm text-slate-500">Generate or open a run to see salary slips.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{selected.month}/{selected.year} · {selected.company?.name}</h2>
                  <p className="text-sm text-slate-500 capitalize">
                    {selected.status} · Gross ₹{Number(selected.total_gross).toLocaleString('en-IN')} ·
                    Deductions ₹{Number(selected.total_deductions).toLocaleString('en-IN')} ·
                    Net ₹{Number(selected.total_net).toLocaleString('en-IN')}
                  </p>
                </div>
                {selected.status === 'draft' && (
                  <button type="button" disabled={busy} onClick={() => void finalize()} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white">
                    Finalize &amp; post expenses
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {(selected.lines || []).map((line) => (
                  <div key={line.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <div>
                        <p className="font-semibold">{line.employee?.name}</p>
                        <p className="text-xs text-slate-500">
                          {line.slip_number} · Paid days {line.paid_days} · Absent {line.absent_days}
                          {line.expense_id ? ' · Expense posted' : ''}
                        </p>
                      </div>
                      <p className="text-lg font-semibold">₹{Number(line.net).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-slate-500">Earnings</p>
                        <p>Basic ₹{Number(line.basic).toLocaleString('en-IN')}</p>
                        {(line.allowances_json || []).map((a, i) => (
                          <p key={i}>{a.name} ₹{Number(a.amount).toLocaleString('en-IN')}</p>
                        ))}
                        <p className="font-medium">Gross ₹{Number(line.gross).toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Deductions</p>
                        {(line.deductions_json || []).map((d, i) => (
                          <p key={i}>{d.name} ₹{Number(d.amount).toLocaleString('en-IN')}</p>
                        ))}
                        <p className="font-medium">Total ₹{Number(line.deductions_total).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
