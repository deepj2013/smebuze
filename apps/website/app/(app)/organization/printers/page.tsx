'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bluetooth,
  Check,
  Printer as PrinterIcon,
  Trash2,
  Usb,
  Wifi,
  Globe,
  Smartphone,
} from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { useToast } from '../../components/ToastContext';
import {
  CONNECTION_OPTIONS,
  KIND_OPTIONS,
  PAPER_OPTIONS,
  PaperSize,
  PrinterConnection,
  PrinterKind,
  PrinterProfile,
  bluetoothSupported,
  buildTestEscPos,
  connectionLabel,
  deletePrinter,
  kindLabel,
  loadPrinters,
  openSystemPrint,
  pairBluetoothPrinter,
  paperLabel,
  sendBluetoothBytes,
  sendSerialBytes,
  serialSupported,
  setDefaultPrinter,
  upsertPrinter,
} from '@/lib/printers';

const EMPTY_FORM = {
  name: '',
  connection: 'local' as PrinterConnection,
  kind: 'inkjet' as PrinterKind,
  paper: 'a4' as PaperSize,
  host: '',
  isDefault: false,
};

function connectionIcon(c: PrinterConnection) {
  if (c === 'wifi') return Wifi;
  if (c === 'internet') return Globe;
  if (c === 'bluetooth') return Bluetooth;
  return Usb;
}

function suggestedPaper(kind: PrinterKind, connection: PrinterConnection): PaperSize {
  if (kind === 'thermal') return connection === 'bluetooth' ? 'thermal_58' : 'thermal_80';
  return 'a4';
}

function suggestedName(kind: PrinterKind, connection: PrinterConnection): string {
  const kindPart = kind === 'thermal' ? 'Bill printer' : kind === 'laser' ? 'Office laser' : kind === 'dot_matrix' ? 'Dot matrix' : 'Inkjet';
  const connPart = CONNECTION_OPTIONS.find((o) => o.id === connection)?.title ?? '';
  return `${kindPart} · ${connPart}`;
}

export default function PrintersPage() {
  const { success, error } = useToast();
  const [list, setList] = useState<PrinterProfile[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pairing, setPairing] = useState(false);
  const [paired, setPaired] = useState<{ id: string; name: string } | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const refresh = () => setList(loadPrinters());

  useEffect(() => {
    refresh();
  }, []);

  const mobile = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, []);

  const startAdd = (connection?: PrinterConnection) => {
    const conn = connection ?? (mobile ? 'bluetooth' : 'local');
    const kind: PrinterKind = conn === 'bluetooth' ? 'thermal' : 'inkjet';
    setForm({
      ...EMPTY_FORM,
      connection: conn,
      kind,
      paper: suggestedPaper(kind, conn),
      name: suggestedName(kind, conn),
      isDefault: list.length === 0,
    });
    setPaired(null);
    setHint(null);
    setOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) {
      error('Give this printer a name so the shop can recognise it.');
      return;
    }
    upsertPrinter({
      name: form.name.trim(),
      connection: form.connection,
      kind: form.kind,
      paper: form.paper,
      host: form.host.trim() || undefined,
      isDefault: form.isDefault || list.length === 0,
      bluetoothId: paired?.id,
      bluetoothName: paired?.name,
    });
    refresh();
    setOpen(false);
    success('Printer saved on this device. Invoices will offer it when you print.');
  };

  const pair = async () => {
    setPairing(true);
    setHint(null);
    try {
      const device = await pairBluetoothPrinter();
      setPaired(device);
      setForm((f) => ({
        ...f,
        name: f.name || device.name,
        connection: 'bluetooth',
        kind: 'thermal',
        paper: f.paper.startsWith('thermal') ? f.paper : 'thermal_58',
      }));
      success(`Paired ${device.name}. Save it, then send a test slip.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bluetooth pairing failed.';
      setHint(msg);
      error(msg);
    } finally {
      setPairing(false);
    }
  };

  const testPrint = async (p: PrinterProfile) => {
    setTestingId(p.id);
    try {
      if (p.connection === 'bluetooth') {
        if (!bluetoothSupported()) {
          throw new Error('Open this page in Chrome on Android to send a Bluetooth test slip. On iPhone, pair the printer in Settings, then use Print and pick it from the share sheet.');
        }
        await sendBluetoothBytes(buildTestEscPos(p.name, p.paper), p.bluetoothId);
        success('Test slip sent to the Bluetooth printer.');
      } else if (p.kind === 'thermal' && p.connection === 'local' && serialSupported()) {
        await sendSerialBytes(buildTestEscPos(p.name, p.paper));
        success('Test slip sent over USB.');
      } else {
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Test print</title></head><body style="font-family:sans-serif;padding:16px">
          <h1 style="margin:0 0 8px">SMEBUZZ printer test</h1>
          <p>${p.name}</p>
          <p>${connectionLabel(p.connection)} · ${kindLabel(p.kind)} · ${paperLabel(p.paper)}</p>
          <p>If this page prints, this printer is ready for invoices and quotations.</p>
        </body></html>`;
        openSystemPrint(html, p.paper);
        success('Pick this printer in the system dialog to confirm.');
      }
    } catch (err) {
      error(err instanceof Error ? err.message : 'Test print failed.');
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Printers"
        description="Connect the printer you already have — USB, Wi-Fi, internet or Bluetooth. Inkjet, laser, thermal, big office machines and pocket bill printers all work."
      >
        <button
          type="button"
          onClick={() => startAdd()}
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 min-h-[44px]"
        >
          Add printer
        </button>
      </PageHeader>

      {mobile && (
        <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-brand-800 flex items-center gap-2">
            <Smartphone className="h-4 w-4" /> You are on a phone
          </p>
          <p className="mt-1">
            Pair a Bluetooth thermal printer here (Chrome on Android), or use the phone’s own print sheet for AirPrint / Wi-Fi printers. The setup is stored on this device so the counter phone and the office PC can each have their own printer.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {CONNECTION_OPTIONS.map((c) => {
          const Icon = connectionIcon(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => startAdd(c.id)}
              className="text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-300 hover:shadow-sm transition-all"
            >
              <span className="inline-flex rounded-lg bg-brand-50 p-2 text-brand-700">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-2 font-semibold text-slate-900">{c.title}</p>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">{c.blurb}</p>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <PrinterIcon className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">No printer on this device yet</p>
          <p className="mt-1 text-sm text-slate-600 max-w-md mx-auto">
            Add one in a minute. You can still print today from the browser dialog — this page remembers paper size and Bluetooth pairing so bills come out right every time.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((p) => {
            const Icon = connectionIcon(p.connection);
            return (
              <li key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Icon className="h-4 w-4 text-brand-600 shrink-0" />
                      <h2 className="font-semibold text-slate-900">{p.name}</h2>
                      {p.isDefault && (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800">Default</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {connectionLabel(p.connection)} · {kindLabel(p.kind)} · {paperLabel(p.paper)}
                      {p.host ? ` · ${p.host}` : ''}
                      {p.bluetoothName ? ` · ${p.bluetoothName}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!p.isDefault && (
                      <button
                        type="button"
                        onClick={() => {
                          setDefaultPrinter(p.id);
                          refresh();
                          success('Default printer updated for this device.');
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 min-h-[40px]"
                      >
                        Set default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => testPrint(p)}
                      disabled={testingId === p.id}
                      className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 min-h-[40px]"
                    >
                      {testingId === p.id ? 'Testing…' : 'Test print'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deletePrinter(p.id);
                        refresh();
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 min-h-[40px]"
                      aria-label="Remove printer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 space-y-2">
        <h3 className="font-semibold text-slate-900">What works where</h3>
        <p><strong className="text-slate-800">Computer:</strong> USB inkjet/laser, network Wi-Fi printers and large office machines appear in the system print dialog. USB thermal printers can also send a raw bill from Chrome or Edge.</p>
        <p><strong className="text-slate-800">Phone (Android):</strong> Bluetooth thermal printers pair in Chrome. Wi-Fi and internet printers use the phone’s print sheet.</p>
        <p><strong className="text-slate-800">iPhone / iPad:</strong> AirPrint and printers already in iOS settings work from Print. Classic Bluetooth bill printers should be paired in iOS Settings first, then chosen in the share sheet.</p>
        <p>Printers are saved on this device only, so the counter phone can keep a pocket Bluetooth printer while accounts keeps an A4 laser.</p>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-5 sm:p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Add a printer</h2>
            <p className="mt-1 text-sm text-slate-600">Tell us how it connects and what paper it uses. You can change this later.</p>

            <div className="mt-4">
              <p className="text-sm font-medium text-slate-700 mb-2">How does it connect?</p>
              <div className="grid grid-cols-2 gap-2">
                {CONNECTION_OPTIONS.map((c) => (
                  <label
                    key={c.id}
                    className={`rounded-xl border-2 p-3 cursor-pointer text-sm ${
                      form.connection === c.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={form.connection === c.id}
                      onChange={() =>
                        setForm((f) => ({
                          ...f,
                          connection: c.id,
                          paper: suggestedPaper(f.kind, c.id),
                          name: f.name || suggestedName(f.kind, c.id),
                        }))
                      }
                    />
                    <span className="font-semibold text-slate-900">{c.title}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-slate-700 mb-2">What kind of printer?</p>
              <div className="grid grid-cols-2 gap-2">
                {KIND_OPTIONS.map((k) => (
                  <label
                    key={k.id}
                    className={`rounded-xl border-2 p-3 cursor-pointer text-sm ${
                      form.kind === k.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={form.kind === k.id}
                      onChange={() =>
                        setForm((f) => ({
                          ...f,
                          kind: k.id,
                          paper: suggestedPaper(k.id, f.connection),
                          name: suggestedName(k.id, f.connection),
                        }))
                      }
                    />
                    <span className="font-semibold text-slate-900">{k.title}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{k.blurb}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Paper size</label>
              <select
                value={form.paper}
                onChange={(e) => setForm((f) => ({ ...f, paper: e.target.value as PaperSize }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 min-h-[44px]"
              >
                {PAPER_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} — {p.hint}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Name on this device</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Counter 80 mm, Accounts A4"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 min-h-[44px]"
              />
            </div>

            {(form.connection === 'wifi' || form.connection === 'internet') && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Printer address (optional)
                </label>
                <input
                  value={form.host}
                  onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                  placeholder="e.g. 192.168.1.50 or printer.office.local"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 min-h-[44px]"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Add this printer in your computer or phone settings first. SMEBUZZ will then send the right paper size when you print.
                </p>
              </div>
            )}

            {form.connection === 'bluetooth' && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-800">Pair Bluetooth printer</p>
                <p className="mt-1 text-xs text-slate-600">
                  Turn the printer on, then tap Pair. Chrome on Android can talk to most BLE thermal printers. If pairing is blocked, add the printer in phone Bluetooth settings and print from the system dialog.
                </p>
                <button
                  type="button"
                  onClick={pair}
                  disabled={pairing || !bluetoothSupported()}
                  className="mt-3 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 min-h-[44px]"
                >
                  {pairing ? 'Waiting for printer…' : paired ? `Paired: ${paired.name}` : 'Pair printer'}
                </button>
                {!bluetoothSupported() && (
                  <p className="mt-2 text-xs text-amber-800">This browser cannot open Web Bluetooth. Pair in phone settings, save the printer here, and use Print on the invoice.</p>
                )}
                {hint && <p className="mt-2 text-xs text-red-700">{hint}</p>}
              </div>
            )}

            <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                className="rounded border-slate-300 text-brand-600"
              />
              Use as the default printer on this device
            </label>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-slate-300 py-2.5 text-slate-700 hover:bg-slate-50 min-h-[48px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700 min-h-[48px]"
              >
                <Check className="h-4 w-4" />
                Save printer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
