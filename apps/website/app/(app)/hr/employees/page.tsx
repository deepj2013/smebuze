'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

interface Employee {
  id: string;
  name: string;
  employee_code?: string | null;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  company?: { name: string } | null;
}

export default function EmployeesPage() {
  const [list, setList] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await apiGet<Employee[] | { data: Employee[] }>('hr/employees');
      if (err) setError(err);
      else if (Array.isArray(data)) setList(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: Employee[] }).data)) setList((data as { data: Employee[] }).data);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Employees</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Name</th>
                <th className="text-left p-3 font-medium text-slate-700">Code</th>
                <th className="text-left p-3 font-medium text-slate-700">Company</th>
                <th className="text-left p-3 font-medium text-slate-700">Designation</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-slate-500">No employees yet.</td></tr>
              ) : (
                list.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{e.name}</td>
                    <td className="p-3">{e.employee_code ?? '—'}</td>
                    <td className="p-3">{e.company?.name ?? '—'}</td>
                    <td className="p-3">{e.designation ?? '—'}</td>
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
