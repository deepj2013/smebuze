'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

type Row = { label: string; party_type?: string; fare: number; diesel: number; other: number; trips: number; profit: number };

export default function TransportProfitPage() {
  const [vehicleWise, setVehicleWise] = useState<Row[]>([]);
  const [partyWise, setPartyWise] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const now = new Date();
  const [from, setFrom] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  const [to, setTo] = useState(now.toISOString().slice(0, 10));

  const load = () => {
    const q = new URLSearchParams({ from, to });
    void apiGet<{ vehicle_wise: Row[]; party_wise: Row[] }>(`transport/profit?${q}`).then((r) => {
      if (r.error) setError(r.error);
      else {
        setVehicleWise(r.data?.vehicle_wise || []);
        setPartyWise(r.data?.party_wise || []);
      }
    });
  };

  useEffect(() => { load(); }, [from, to]);

  function Table({ title, rows, showType }: { title: string; rows: Row[]; showType?: boolean }) {
    return (
      <div className="rounded-xl border bg-white overflow-hidden">
        <p className="border-b bg-slate-50 p-3 text-sm font-semibold">{title}</p>
        <table className="w-full text-sm">
          <thead className="border-b text-left text-slate-500">
            <tr>
              <th className="p-3">Name</th>
              {showType && <th className="p-3">Type</th>}
              <th className="p-3 text-right">Trips</th>
              <th className="p-3 text-right">Fare</th>
              <th className="p-3 text-right">Diesel+other</th>
              <th className="p-3 text-right">Profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={showType ? 6 : 5} className="p-6 text-center text-slate-500">No trip data in this period.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="p-3 font-medium">{r.label}</td>
                {showType && <td className="p-3 capitalize">{r.party_type || '—'}</td>}
                <td className="p-3 text-right">{r.trips}</td>
                <td className="p-3 text-right">₹{r.fare.toLocaleString('en-IN')}</td>
                <td className="p-3 text-right text-slate-600">₹{(r.diesel + r.other).toLocaleString('en-IN')}</td>
                <td className={`p-3 text-right font-semibold ${r.profit < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  ₹{r.profit.toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Fleet · this workspace only</p>
          <h1 className="mt-1 text-2xl font-bold">Profit by vehicle / party</h1>
          <p className="mt-1 text-sm text-slate-500">Fare minus diesel and other trip costs. Driver salary from Staff &amp; Payroll can be layered later.</p>
        </div>
        <Link href="/transport/trips" className="rounded-lg border px-3 py-2 text-sm">← Trips</Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="text-sm">From<input type="date" className="ml-2 rounded border px-2 py-1.5" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-sm">To<input type="date" className="ml-2 rounded border px-2 py-1.5" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Table title="Vehicle-wise" rows={vehicleWise} />
        <Table title="Party-wise" rows={partyWise} showType />
      </div>
    </div>
  );
}
