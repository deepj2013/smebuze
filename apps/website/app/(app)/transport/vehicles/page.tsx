'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

type Doc = {
  id?: string;
  doc_type: string;
  document_number?: string | null;
  issued_on?: string | null;
  expires_on?: string | null;
  remind_days?: number;
};
type Vehicle = {
  id: string;
  registration_no: string;
  vehicle_type: string;
  make_model?: string | null;
  capacity_tons?: string | null;
  ownership: string;
  driver_name?: string | null;
  helper_name?: string | null;
  status: string;
  documents?: Doc[];
};

const DOC_LABELS: Record<string, string> = {
  rc: 'RC',
  insurance: 'Insurance',
  fitness: 'Fitness',
  permit: 'Permit',
  national_permit: 'National permit',
  puc: 'PUC',
  other: 'Other',
};

const blankDoc = (): Doc => ({
  doc_type: 'insurance',
  document_number: '',
  issued_on: '',
  expires_on: '',
  remind_days: 30,
});

export default function VehiclesPage() {
  const [list, setList] = useState<Vehicle[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState({
    registration_no: '',
    vehicle_type: 'truck',
    make_model: '',
    capacity_tons: '',
    ownership: 'owned',
    driver_name: '',
    helper_name: '',
  });
  const [docs, setDocs] = useState<Doc[]>([
    { ...blankDoc(), doc_type: 'rc' },
    { ...blankDoc(), doc_type: 'insurance' },
    { ...blankDoc(), doc_type: 'fitness' },
    { ...blankDoc(), doc_type: 'permit' },
  ]);

  const load = () =>
    apiGet<Vehicle[]>('transport/vehicles').then((r) => {
      if (r.error) setError(r.error);
      else setList(Array.isArray(r.data) ? r.data : []);
    });

  useEffect(() => {
    void load();
  }, []);

  function openNew() {
    setEditing(null);
    setShow(true);
    setForm({
      registration_no: '',
      vehicle_type: 'truck',
      make_model: '',
      capacity_tons: '',
      ownership: 'owned',
      driver_name: '',
      helper_name: '',
    });
    setDocs([
      { ...blankDoc(), doc_type: 'rc' },
      { ...blankDoc(), doc_type: 'insurance' },
      { ...blankDoc(), doc_type: 'fitness' },
      { ...blankDoc(), doc_type: 'permit' },
    ]);
  }

  function openEdit(v: Vehicle) {
    setEditing(v);
    setShow(true);
    setForm({
      registration_no: v.registration_no,
      vehicle_type: v.vehicle_type,
      make_model: v.make_model || '',
      capacity_tons: v.capacity_tons || '',
      ownership: v.ownership,
      driver_name: v.driver_name || '',
      helper_name: v.helper_name || '',
    });
    setDocs(
      (v.documents || []).map((d) => ({
        id: d.id,
        doc_type: d.doc_type,
        document_number: d.document_number || '',
        issued_on: d.issued_on ? String(d.issued_on).slice(0, 10) : '',
        expires_on: d.expires_on ? String(d.expires_on).slice(0, 10) : '',
        remind_days: d.remind_days ?? 30,
      })),
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    if (editing) {
      const r = await apiPatch(`transport/vehicles/${editing.id}`, {
        ...form,
        capacity_tons: form.capacity_tons ? Number(form.capacity_tons) : undefined,
      });
      if (r.error) {
        setError(r.error);
        return;
      }
      for (const d of docs.filter((x) => x.doc_type && (x.expires_on || x.document_number))) {
        await apiPost(`transport/vehicles/${editing.id}/documents`, d);
      }
      setMsg('Vehicle updated');
    } else {
      const r = await apiPost('transport/vehicles', {
        ...form,
        capacity_tons: form.capacity_tons ? Number(form.capacity_tons) : undefined,
        documents: docs.filter((d) => d.expires_on || d.document_number),
      });
      if (r.error) {
        setError(r.error);
        return;
      }
      setMsg('Vehicle added to your fleet');
    }
    setShow(false);
    void load();
  }

  const input = 'mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Fleet · this workspace only</p>
          <h1 className="mt-1 text-2xl font-bold">Vehicles</h1>
          <p className="mt-1 text-sm text-slate-500">
            Registration, driver/helper, and document expiry dates. Renewals stay private to your tenant.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/transport/renewals" className="rounded-lg border px-3 py-2 text-sm">Renewals</Link>
          <Link href="/transport/trips" className="rounded-lg border px-3 py-2 text-sm">Trips</Link>
          <button type="button" onClick={openNew} className="rounded-lg bg-blue-700 px-3 py-2 text-sm text-white">Add vehicle</button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {msg && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</div>}

      {show && (
        <form onSubmit={save} className="space-y-4 rounded-xl border bg-white p-4">
          <h2 className="font-semibold">{editing ? 'Edit vehicle' : 'New vehicle'}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">Registration no. *
              <input required className={input} value={form.registration_no} onChange={(e) => setForm({ ...form, registration_no: e.target.value.toUpperCase() })} placeholder="MH12AB1234" />
            </label>
            <label className="text-sm">Type
              <select className={input} value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}>
                {['truck', 'tempo', 'trailer', 'container', 'pickup', 'tanker', 'other'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="text-sm">Make / model
              <input className={input} value={form.make_model} onChange={(e) => setForm({ ...form, make_model: e.target.value })} />
            </label>
            <label className="text-sm">Capacity (tons)
              <input type="number" step="0.1" className={input} value={form.capacity_tons} onChange={(e) => setForm({ ...form, capacity_tons: e.target.value })} />
            </label>
            <label className="text-sm">Ownership
              <select className={input} value={form.ownership} onChange={(e) => setForm({ ...form, ownership: e.target.value })}>
                <option value="owned">Owned</option>
                <option value="hired">Hired</option>
              </select>
            </label>
            <label className="text-sm">Usual driver
              <input className={input} value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} />
            </label>
            <label className="text-sm">Helper
              <input className={input} value={form.helper_name} onChange={(e) => setForm({ ...form, helper_name: e.target.value })} />
            </label>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Documents &amp; renewal dates</p>
              <button type="button" className="text-xs text-blue-700" onClick={() => setDocs([...docs, blankDoc()])}>+ Document</button>
            </div>
            <div className="space-y-2">
              {docs.map((d, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <label className="col-span-3 text-xs">Type
                    <select className={input} value={d.doc_type} onChange={(e) => { const n = [...docs]; n[i] = { ...d, doc_type: e.target.value }; setDocs(n); }}>
                      {Object.entries(DOC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </label>
                  <label className="col-span-3 text-xs">Number
                    <input className={input} value={d.document_number || ''} onChange={(e) => { const n = [...docs]; n[i] = { ...d, document_number: e.target.value }; setDocs(n); }} />
                  </label>
                  <label className="col-span-2 text-xs">Expires
                    <input type="date" className={input} value={d.expires_on || ''} onChange={(e) => { const n = [...docs]; n[i] = { ...d, expires_on: e.target.value }; setDocs(n); }} />
                  </label>
                  <label className="col-span-2 text-xs">Remind (days)
                    <input type="number" className={input} value={d.remind_days ?? 30} onChange={(e) => { const n = [...docs]; n[i] = { ...d, remind_days: Number(e.target.value) }; setDocs(n); }} />
                  </label>
                  <button type="button" className="col-span-2 pb-2 text-xs text-red-600" onClick={() => {
                    if (d.id && editing) void apiDelete(`transport/vehicles/${editing.id}/documents/${d.id}`);
                    setDocs(docs.filter((_, j) => j !== i));
                  }}>Remove</button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white">Save</button>
            <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => setShow(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="p-3 text-left">Vehicle</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Driver / helper</th>
              <th className="p-3 text-left">Docs tracked</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-slate-500">No vehicles yet. Add your first truck or tempo.</td></tr>
            ) : list.map((v) => (
              <tr key={v.id} className="border-b border-slate-100">
                <td className="p-3 font-semibold">{v.registration_no}
                  <span className="mt-0.5 block text-xs font-normal text-slate-500">{v.make_model || v.ownership}</span>
                </td>
                <td className="p-3 capitalize">{v.vehicle_type}{v.capacity_tons ? ` · ${v.capacity_tons}T` : ''}</td>
                <td className="p-3">{v.driver_name || '—'}{v.helper_name ? ` / ${v.helper_name}` : ''}</td>
                <td className="p-3 text-slate-600">{(v.documents || []).length} document(s)</td>
                <td className="p-3 text-right"><button type="button" className="text-blue-700" onClick={() => openEdit(v)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
