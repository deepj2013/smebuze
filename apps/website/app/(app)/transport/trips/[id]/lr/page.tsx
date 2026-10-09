'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

type Trip = {
  id: string;
  trip_date: string;
  lr_number?: string | null;
  from_place: string;
  to_place: string;
  party_name?: string | null;
  party_type: string;
  fare_amount: string;
  diesel_amount: string;
  other_expense: string;
  advance_amount: string;
  distance_km?: string | null;
  notes?: string | null;
  vehicle?: { registration_no: string; vehicle_type?: string; driver_name?: string | null; helper_name?: string | null } | null;
  customer?: { name: string; phone?: string | null; gstin?: string | null } | null;
  company?: { name: string; gstin?: string | null; address?: Record<string, unknown> | null; legal_name?: string | null } | null;
};

export default function LrPrintPage({ params }: { params: { id: string } }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void apiGet<Trip>(`transport/trips/${params.id}`).then((r) => {
      if (r.error) setError(r.error);
      else setTrip(r.data || null);
    });
  }, [params.id]);

  if (error) return <p className="p-6 text-red-700">{error}</p>;
  if (!trip) return <p className="p-6 text-slate-500">Loading LR…</p>;

  const party = trip.customer?.name || trip.party_name || '—';
  const addr = trip.company?.address as { line1?: string; city?: string; state?: string } | null | undefined;

  return (
    <div className="mx-auto max-w-3xl bg-white p-6 print:p-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/transport/trips" className="text-sm text-blue-700">← Trips</Link>
        <button type="button" onClick={() => window.print()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">Print LR</button>
      </div>

      <div className="border-2 border-slate-800 p-5">
        <div className="flex justify-between gap-4 border-b border-slate-800 pb-3">
          <div>
            <p className="text-lg font-bold uppercase">{trip.company?.legal_name || trip.company?.name || 'Transport'}</p>
            {trip.company?.gstin && <p className="text-xs">GSTIN: {trip.company.gstin}</p>}
            {addr && <p className="text-xs text-slate-600">{[addr.line1, addr.city, addr.state].filter(Boolean).join(', ')}</p>}
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">LORRY RECEIPT</p>
            <p className="text-sm">LR / Bilty No. <strong>{trip.lr_number || trip.id.slice(0, 8).toUpperCase()}</strong></p>
            <p className="text-sm">Date: {String(trip.trip_date).slice(0, 10)}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Consignor / Party</p>
            <p className="font-medium">{party}</p>
            <p className="capitalize text-slate-600">{trip.party_type}</p>
            {trip.customer?.phone && <p>{trip.customer.phone}</p>}
            {trip.customer?.gstin && <p>GSTIN: {trip.customer.gstin}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Vehicle</p>
            <p className="font-medium">{trip.vehicle?.registration_no || '—'}</p>
            <p className="capitalize text-slate-600">{trip.vehicle?.vehicle_type}</p>
            <p>Driver: {trip.vehicle?.driver_name || '—'}</p>
            {trip.vehicle?.helper_name && <p>Helper: {trip.vehicle.helper_name}</p>}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 border border-slate-300 p-3 text-sm">
          <div>
            <p className="text-xs uppercase text-slate-500">From</p>
            <p className="text-lg font-semibold">{trip.from_place}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">To</p>
            <p className="text-lg font-semibold">{trip.to_place}</p>
          </div>
          {trip.distance_km && (
            <div className="col-span-2 text-slate-600">Distance: {trip.distance_km} km</div>
          )}
        </div>

        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border border-slate-800 bg-slate-50 text-left">
              <th className="border border-slate-800 p-2">Particulars</th>
              <th className="border border-slate-800 p-2 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-800 p-2">Freight charges</td>
              <td className="border border-slate-800 p-2 text-right">{Number(trip.fare_amount).toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td className="border border-slate-800 p-2">Advance received</td>
              <td className="border border-slate-800 p-2 text-right">{Number(trip.advance_amount).toLocaleString('en-IN')}</td>
            </tr>
            <tr className="font-semibold">
              <td className="border border-slate-800 p-2">Balance to collect</td>
              <td className="border border-slate-800 p-2 text-right">
                {(Number(trip.fare_amount) - Number(trip.advance_amount)).toLocaleString('en-IN')}
              </td>
            </tr>
          </tbody>
        </table>

        {trip.notes && <p className="mt-3 text-sm text-slate-600">Note: {trip.notes}</p>}

        <div className="mt-10 grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="border-t border-slate-400 pt-2">Consignor signature</p>
          </div>
          <div className="text-right">
            <p className="border-t border-slate-400 pt-2">For {trip.company?.name || 'Transporter'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
