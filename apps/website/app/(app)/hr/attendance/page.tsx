'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost, apiUploadFile, getApiUrl, getToken } from '@/lib/api';

type Attendance = {
  id: string;
  attendance_date: string;
  status: string;
  employee?: { name: string; employee_code?: string | null };
};

export default function AttendancePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState<Attendance[]>([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = () => {
    void apiGet<Attendance[]>(`hr/attendance?year=${year}&month=${month}`).then((r) => {
      if (r.error) setError(r.error);
      else setRows(Array.isArray(r.data) ? r.data : []);
    });
  };

  useEffect(() => { load(); }, [year, month]);

  async function onUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    setMsg('');
    setError('');
    const r = await apiUploadFile<{ saved: number; errors: string[]; parsed_rows: number }>(
      'hr/attendance/upload',
      file,
      'file',
      { year: String(year), month: String(month) },
    );
    setUploading(false);
    if (r.error) setError(r.error);
    else {
      setMsg(`Imported ${r.data?.saved ?? 0} of ${r.data?.parsed_rows ?? 0} rows.` +
        (r.data?.errors?.length ? ` Skipped: ${r.data.errors.slice(0, 3).join('; ')}` : ''));
      load();
    }
  }

  function downloadTemplate() {
    const token = getToken();
    void fetch(getApiUrl('hr/attendance/template'), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'attendance-template.csv';
        a.click();
      });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Staff &amp; payroll · owner only</p>
          <h1 className="mt-1 text-2xl font-bold">Attendance</h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload Excel or CSV for the month. Columns: <code className="text-xs">employee_code</code>, <code className="text-xs">date</code>, <code className="text-xs">status</code> (P / A / H / L).
            PDF auto-read is not ready yet — export the register to Excel/CSV.
          </p>
        </div>
        <Link href="/hr/employees" className="rounded-lg border px-3 py-2 text-sm">← Employees</Link>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
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
        <button type="button" onClick={downloadTemplate} className="rounded-lg border px-3 py-2 text-sm">Download CSV template</button>
        <label className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white cursor-pointer">
          {uploading ? 'Uploading…' : 'Upload Excel / CSV'}
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="hidden"
            onChange={(e) => void onUpload(e.target.files?.[0] || null)}
          />
        </label>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {msg && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</div>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Employee</th>
              <th className="p-3 text-left">Code</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="p-6 text-center text-slate-500">No attendance for this month yet.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="p-3">{String(r.attendance_date).slice(0, 10)}</td>
                  <td className="p-3">{r.employee?.name ?? '—'}</td>
                  <td className="p-3">{r.employee?.employee_code ?? '—'}</td>
                  <td className="p-3 capitalize">{r.status.replace('_', ' ')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
