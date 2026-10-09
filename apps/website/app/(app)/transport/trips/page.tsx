'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';

type Vehicle = { id: string; registration_no: string };
type Customer = { id: string; name: string };
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
  bill_status: string;
  invoice_id?: string | null;
  vehicle?: { registration_no: string } | null;
  customer?: { name: string } | null;
};
type UnbilledGroup = {
  key: string;
  label: string;
  party_type: string;
  trip_ids: string[];
  fare: number;
  count: number;
};

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [unbilled, setUnbilled] = useState<UnbilledGroup[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);
  const [billing, setBilling] = useState(false);
  const [form, setForm] = useState({
    trip_date: new Date().toISOString().slice(0, 10),
    vehicle_id: '',
    customer_id: '',
    party_name: '',
    party_type: 'company',
    lr_number: '',
    from_place: '',
    to_place: '',
    fare_amount: '',
    diesel_amount: '',
    other_expense: '',
    advance_amount: '',
    distance_km: '',
    notes: '',
  });

  const load = () => {
    void apiGet<Trip[]>('transport/trips').then((r) => {
      if (r.error) setError(r.error);
      else setTrips(Array.isArray(r.data) ? r.data : []);
    });
    void apiGet<UnbilledGroup[]>('transport/unbilled').then((r) => {
      if (Array.isArray(r.data)) setUnbilled(r.data);
    });
  };

  useEffect(() => {
    load();
    void apiGet<Vehicle[]>('transport/vehicles').then((r) => setVehicles(Array.isArray(r.data) ? r.data : []));
    void apiGet<Customer[] | { data: Customer[] }>('crm/customers').then((r) => {
      const rows = Array.isArray(r.data) ? r.data : (r.data as { data?: Customer[] })?.data || [];
      setCustomers(rows);
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    const r = await apiPost('transport/trips', {
      ...form,
      vehicle_id: form.vehicle_id || undefined,
      customer_id: form.customer_id || undefined,
      fare_amount: Number(form.fare_amount || 0),
      diesel_amount: Number(form.diesel_amount || 0),
      other_expense: Number(form.other_expense || 0),
      advance_amount: Number(form.advance_amount || 0),
      distance_km: form.distance_km ? Number(form.distance_km) : undefined,
    });
    if (r.error) setError(r.error);
    else {
      setMsg('Trip saved');
      setShow(false);
      setForm({
        ...form,
        from_place: '',
        to_place: '',
        lr_number: '',
        fare_amount: '',
        diesel_amount: '',
        other_expense: '',
        advance_amount: '',
        distance_km: '',
        notes: '',
        party_name: '',
      });
      load();
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function billSelected() {
    if (!selected.size) return;
    setBilling(true);
    setError('');
    setMsg('');
    const r = await apiPost<{ invoice: { id: string; number: string; total: string }; invoice_path: string }>('transport/bill', {
      trip_ids: [...selected],
    });
    setBilling(false);
    if (r.error) setError(r.error);
    else {
      setMsg(`Invoice ${r.data?.invoice.number} created for ₹${Number(r.data?.invoice.total || 0).toLocaleString('en-IN')}.`);
      setSelected(new Set());
      load();
    }
  }

  async function billParty(g: UnbilledGroup) {
    setBilling(true);
    setError('');
    setMsg('');
    const r = await apiPost<{ invoice: { id: string; number: string; total: string } }>('transport/bill', {
      trip_ids: g.trip_ids,
    });
    setBilling(false);
    if (r.error) setError(r.error);
    else {
      setMsg(`Monthly bill for ${g.label}: ${r.data?.invoice.number} · ₹${Number(r.data?.invoice.total || 0).toLocaleString('en-IN')}`);
      load();
    }
  }

  const input = 'mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm';
  const profit = (t: Trip) => Number(t.fare_amount) - Number(t.diesel_amount) - Number(t.other_expense);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Fleet · this workspace only</p>
          <h1 className="mt-1 text-2xl font-bold">Trips</h1>
          <p className="mt-1 text-sm text-slate-500">
            Record routes, print LR, then bill one trip or the whole party (monthly). Invoices land in Sales for this tenant only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/transport/profit" className="rounded-lg border px-3 py-2 text-sm">Profit</Link>
          <button
            type="button"
            disabled={!selected.size || billing}
            onClick={() => void billSelected()}
            className="rounded-lg border border-emerald-700 px-3 py-2 text-sm text-emerald-800 disabled:opacity-40"
          >
            {billing ? 'Billing…' : `Bill selected (${selected.size})`}
          </button>
          <button type="button" onClick={() => setShow(true)} className="rounded-lg bg-blue-700 px-3 py-2 text-sm text-white">Add trip</button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {msg && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</div>}

      {unbilled.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
          <h2 className="text-sm font-semibold text-blue-950">Unbilled by party (monthly bill)</h2>
          <ul className="mt-2 space-y-2">
            {unbilled.map((g) => (
              <li key={g.key} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <strong>{g.label}</strong>
                  <span className="ml-2 capitalize text-slate-600">{g.party_type}</span>
                  <span className="ml-2 text-slate-500">{g.count} trip(s) · ₹{g.fare.toLocaleString('en-IN')}</span>
                </span>
                <button
                  type="button"
                  disabled={billing}
                  onClick={() => void billParty(g)}
                  className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs text-white disabled:opacity-50"
                >
                  Create invoice
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {show && (
        <form onSubmit={save} className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">Date *<input required type="date" className={input} value={form.trip_date} onChange={(e) => setForm({ ...form, trip_date: e.target.value })} /></label>
          <label className="text-sm">Vehicle
            <select className={input} value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}>
              <option value="">—</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_no}</option>)}
            </select>
          </label>
          <label className="text-sm">LR / bilty no.<input className={input} value={form.lr_number} onChange={(e) => setForm({ ...form, lr_number: e.target.value })} /></label>
          <label className="text-sm">From *<input required className={input} value={form.from_place} onChange={(e) => setForm({ ...form, from_place: e.target.value })} placeholder="Pune" /></label>
          <label className="text-sm">To *<input required className={input} value={form.to_place} onChange={(e) => setForm({ ...form, to_place: e.target.value })} placeholder="Mumbai" /></label>
          <label className="text-sm">Distance (km)<input type="number" className={input} value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: e.target.value })} /></label>
          <label className="text-sm">CRM party
            <select className={input} value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">— optional —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Party name (if not in CRM)<input className={input} value={form.party_name} onChange={(e) => setForm({ ...form, party_name: e.target.value })} /></label>
          <label className="text-sm">Party type
            <select className={input} value={form.party_type} onChange={(e) => setForm({ ...form, party_type: e.target.value })}>
              <option value="company">Company</option>
              <option value="individual">Individual</option>
              <option value="broker">Broker</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="text-sm">Fare ₹<input type="number" step="0.01" className={input} value={form.fare_amount} onChange={(e) => setForm({ ...form, fare_amount: e.target.value })} /></label>
          <label className="text-sm">Diesel ₹<input type="number" step="0.01" className={input} value={form.diesel_amount} onChange={(e) => setForm({ ...form, diesel_amount: e.target.value })} /></label>
          <label className="text-sm">Other expense ₹<input type="number" step="0.01" className={input} value={form.other_expense} onChange={(e) => setForm({ ...form, other_expense: e.target.value })} /></label>
          <label className="text-sm">Advance ₹<input type="number" step="0.01" className={input} value={form.advance_amount} onChange={(e) => setForm({ ...form, advance_amount: e.target.value })} /></label>
          <label className="text-sm lg:col-span-2">Notes<input className={input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <div className="flex items-end gap-2">
            <button type="submit" className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white">Save trip</button>
            <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => setShow(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="p-3" />
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Route</th>
              <th className="p-3 text-left">Vehicle</th>
              <th className="p-3 text-left">Party</th>
              <th className="p-3 text-right">Fare</th>
              <th className="p-3 text-right">Profit</th>
              <th className="p-3 text-left">Bill</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {trips.length === 0 ? (
              <tr><td colSpan={9} className="p-6 text-center text-slate-500">No trips yet.</td></tr>
            ) : trips.map((t) => (
              <tr key={t.id} className="border-b border-slate-100">
                <td className="p-3">
                  {t.bill_status !== 'billed' && (
                    <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} aria-label="Select trip" />
                  )}
                </td>
                <td className="p-3">{String(t.trip_date).slice(0, 10)}
                  {t.lr_number ? <span className="block text-xs text-slate-500">LR {t.lr_number}</span> : null}
                </td>
                <td className="p-3">{t.from_place} → {t.to_place}</td>
                <td className="p-3">{t.vehicle?.registration_no || '—'}</td>
                <td className="p-3">{t.customer?.name || t.party_name || '—'}
                  <span className="block text-xs capitalize text-slate-500">{t.party_type}</span>
                </td>
                <td className="p-3 text-right">₹{Number(t.fare_amount).toLocaleString('en-IN')}</td>
                <td className="p-3 text-right font-medium">₹{profit(t).toLocaleString('en-IN')}</td>
                <td className="p-3 capitalize">
                  {t.bill_status === 'billed' && t.invoice_id ? (
                    <Link href={`/sales/invoices/${t.invoice_id}`} className="text-emerald-700">Invoiced</Link>
                  ) : (
                    <span className="text-slate-500">unbilled</span>
                  )}
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Link href={`/transport/trips/${t.id}/lr`} className="text-blue-700" target="_blank">LR</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
