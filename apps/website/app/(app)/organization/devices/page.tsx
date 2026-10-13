'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';
import {
  CONNECTION_OPTIONS,
  EDC_EXTRA_FIELDS,
  HardwareApiResponse,
  HardwareDeviceConfig,
  HardwareDeviceId,
  statusTone,
} from '@/lib/hardware-devices';

export default function OrganizationDevicesPage() {
  const [data, setData] = useState<HardwareApiResponse | null>(null);
  const [devices, setDevices] = useState<HardwareDeviceConfig[]>([]);
  const [agentUrl, setAgentUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    apiGet<HardwareApiResponse>('organization/hardware').then((r) => {
      if (r.error) setError(r.error);
      else if (r.data) {
        setData(r.data);
        setDevices(r.data.devices);
        setAgentUrl(r.data.local_agent_url || '');
      }
      setLoading(false);
    });
  }, []);

  const catalogById = useMemo(() => {
    const map = new Map((data?.catalog || []).map((c) => [c.id, c]));
    return map;
  }, [data]);

  const patchDevice = (id: HardwareDeviceId, patch: Partial<HardwareDeviceConfig>) => {
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const patchExtra = (id: HardwareDeviceId, key: string, value: string) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, extras: { ...(d.extras || {}), [key]: value } } : d,
      ),
    );
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    const { data: next, error: err } = await apiPatch<HardwareApiResponse>('organization/hardware', {
      devices,
      local_agent_url: agentUrl.trim(),
    });
    setSaving(false);
    if (err) setError(err);
    else if (next) {
      setData(next);
      setDevices(next.devices);
      setAgentUrl(next.local_agent_url || '');
      setNotice('Device settings saved for this workspace.');
    }
  };

  if (loading) return <p className="text-slate-600">Loading devices…</p>;

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Organization</p>
          <h1 className="text-2xl font-bold text-slate-900">Counter devices</h1>
          <p className="mt-1 text-sm text-slate-600">
            SMEBUZE runs in the browser on the internet. Scanners and printers attach to the counter PC or phone and talk to that browser — not to our cloud server directly. Card machines need a small local bridge later; save your vendor details now so we can switch them on when ready.
          </p>
        </div>
        <Link href="/organization/printers" className="text-sm text-slate-600 hover:underline">
          Printers →
        </Link>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 space-y-2">
        <p className="font-semibold text-slate-900">How local hardware works with the cloud portal</p>
        <ul className="list-disc space-y-1 pl-5 text-xs sm:text-sm">
          <li>
            <strong>Barcode scanner</strong> — plug into the PC/phone; it types the code into POS or search. No special driver in SMEBUZE.
          </li>
          <li>
            <strong>Thermal / office printer</strong> — set up under{' '}
            <Link href="/organization/printers" className="text-brand-700 underline">
              Printers
            </Link>{' '}
            on each counter browser (USB serial, Bluetooth, or system print for Wi‑Fi).
          </li>
          <li>
            <strong>UPI / scan-to-pay</strong> — already cloud:{' '}
            <Link href="/organization/payments" className="text-brand-700 underline">
              Scan to pay
            </Link>
            .
          </li>
          <li>
            <strong>PIN pad / EDC / soundbox</strong> — device stays on the shop network; a future local agent will receive the bill amount from the portal and return the payment result. Tick it below and store merchant/terminal IDs.
          </li>
        </ul>
      </div>

      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
      {notice && <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{notice}</div>}

      <div className="space-y-3">
        {devices.map((device) => {
          const meta = catalogById.get(device.id);
          if (!meta) return null;
          return (
            <section key={device.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={device.enabled}
                    onChange={(e) => patchDevice(device.id, { enabled: e.target.checked })}
                  />
                  <span>
                    <span className="font-semibold text-slate-900">{meta.title}</span>
                    <span className="mt-0.5 block text-xs text-slate-600">{meta.blurb}</span>
                  </span>
                </label>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone(meta.status)}`}>
                  {meta.status_label}
                </span>
              </div>

              {device.enabled && (
                <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
                  <label className="text-xs text-slate-600">
                    Vendor
                    <input
                      type="text"
                      value={device.vendor}
                      onChange={(e) => patchDevice(device.id, { vendor: e.target.value })}
                      placeholder={device.id === 'payment_edc' ? 'Pine Labs / Paytm / Bank' : 'e.g. TVS, Epson'}
                      className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs text-slate-600">
                    Model / serial note
                    <input
                      type="text"
                      value={device.model}
                      onChange={(e) => patchDevice(device.id, { model: e.target.value })}
                      className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs text-slate-600 sm:col-span-2">
                    Connection
                    <select
                      value={device.connection}
                      onChange={(e) => patchDevice(device.id, { connection: e.target.value })}
                      className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    >
                      {CONNECTION_OPTIONS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {device.id === 'payment_edc' &&
                    EDC_EXTRA_FIELDS.map((f) => (
                      <label key={f.key} className="text-xs text-slate-600">
                        {f.label}
                        <input
                          type="text"
                          value={device.extras?.[f.key] || ''}
                          onChange={(e) => patchExtra(device.id, f.key, e.target.value)}
                          placeholder={f.placeholder}
                          className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </label>
                    ))}
                  {device.id === 'thermal_printer' && (
                    <p className="sm:col-span-2 text-xs text-slate-500">
                      After saving here, open{' '}
                      <Link href="/organization/printers" className="underline">
                        Organization → Printers
                      </Link>{' '}
                      on this counter and add the actual profile (paper width, Bluetooth pair, USB test).
                    </p>
                  )}
                  {device.id === 'payment_qr' && (
                    <p className="sm:col-span-2 text-xs text-slate-500">
                      Keys live under{' '}
                      <Link href="/organization/payments" className="underline">
                        Scan to pay
                      </Link>
                      .
                    </p>
                  )}
                  <label className="text-xs text-slate-600 sm:col-span-2">
                    Notes for support
                    <textarea
                      value={device.notes}
                      onChange={(e) => patchDevice(device.id, { notes: e.target.value })}
                      rows={2}
                      className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                      placeholder="Counter name, which PC, Wi‑Fi SSID, etc."
                    />
                  </label>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-3">
        <label className="block text-sm font-semibold text-slate-900">
          Local bridge URL (optional, for later EDC / scale)
          <input
            type="url"
            value={agentUrl}
            onChange={(e) => setAgentUrl(e.target.value)}
            placeholder="http://127.0.0.1:3920"
            className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-normal"
          />
        </label>
        <p className="mt-1 text-xs text-slate-500">
          When we ship the counter agent, it will listen on the shop PC (usually localhost). Leave blank until then. Do not put cloud secrets here.
        </p>
      </div>

      <div className="sticky bottom-4 mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save devices'}
        </button>
      </div>
    </div>
  );
}
