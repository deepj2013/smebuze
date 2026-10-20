'use client';

import { useState } from 'react';
import { getApiUrl, getToken } from '@/lib/api';
import { PageHeader } from '../../components/PageHeader';

export default function AccountingExportPage() {
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [flavour, setFlavour] = useState('tally');
  const [error, setError] = useState('');

  async function download() {
    setError('');
    const token = getToken();
    if (!token) return;
    const url = `${getApiUrl('reports/accounting-export')}?from=${from}&to=${to}&flavour=${flavour}&format=csv`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError((j as { error?: string }).error || 'Export not enabled. Ask SMEBUZE admin to turn on Accounting export.');
      return;
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${flavour}-daybook-${from}-to-${to}.csv`;
    a.click();
  }

  return (
    <div>
      <PageHeader title="Accounting export" description="CSV day-book for Tally, Busy or Marg upload. No live login to those apps. Enabled per tenant by universal admin." />
      {error && <div className="mb-3 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <div className="rounded-xl border bg-white p-5 max-w-md space-y-3">
        <label className="text-sm block">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" /></label>
        <label className="text-sm block">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" /></label>
        <label className="text-sm block">Format
          <select value={flavour} onChange={(e) => setFlavour(e.target.value)} className="mt-1 w-full rounded border px-3 py-2">
            <option value="tally">Tally (CSV)</option>
            <option value="busy">Busy (CSV)</option>
            <option value="marg">Marg (CSV)</option>
          </select>
        </label>
        <button type="button" onClick={download} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm">Download</button>
      </div>
    </div>
  );
}
