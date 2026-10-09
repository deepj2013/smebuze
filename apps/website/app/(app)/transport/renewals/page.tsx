'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

type Renewal = {
  id: string;
  registration_no?: string;
  doc_type: string;
  document_number?: string | null;
  expires_on: string;
  days_left: number;
  urgency: 'expired' | 'due_soon' | 'upcoming';
};

const LABELS: Record<string, string> = {
  rc: 'RC', insurance: 'Insurance', fitness: 'Fitness', permit: 'Permit',
  national_permit: 'National permit', puc: 'PUC', other: 'Other',
};

export default function RenewalsPage() {
  const [rows, setRows] = useState<Renewal[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    void apiGet<Renewal[]>('transport/renewals?within_days=60').then((r) => {
      if (r.error) setError(r.error);
      else setRows(Array.isArray(r.data) ? r.data : []);
    });
  }, []);

  const badge = (u: Renewal['urgency']) =>
    u === 'expired' ? 'bg-red-100 text-red-800' : u === 'due_soon' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Fleet · this workspace only</p>
          <h1 className="mt-1 text-2xl font-bold">Document renewals</h1>
          <p className="mt-1 text-sm text-slate-500">RC, insurance, fitness, permit and PUC coming up in the next 60 days — or already expired.</p>
        </div>
        <Link href="/transport/vehicles" className="rounded-lg border px-3 py-2 text-sm">← Vehicles</Link>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="p-3 text-left">Vehicle</th>
              <th className="p-3 text-left">Document</th>
              <th className="p-3 text-left">Expires</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="p-6 text-center text-slate-500">No renewals in the next 60 days. Add expiry dates on Vehicles.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="p-3 font-medium">{r.registration_no || '—'}</td>
                <td className="p-3">{LABELS[r.doc_type] || r.doc_type}
                  {r.document_number ? <span className="block text-xs text-slate-500">{r.document_number}</span> : null}
                </td>
                <td className="p-3">{r.expires_on}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge(r.urgency)}`}>
                    {r.days_left < 0 ? `Expired ${Math.abs(r.days_left)}d ago` : r.days_left === 0 ? 'Expires today' : `${r.days_left} days left`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
