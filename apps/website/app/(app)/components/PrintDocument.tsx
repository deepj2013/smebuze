'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiUrl, getToken } from '@/lib/api';
import {
  PrinterProfile,
  ReceiptPayload,
  getDefaultPrinter,
  injectPaperCss,
  isThermalPaper,
  loadPrinters,
  paperLabel,
  printViaProfile,
} from '@/lib/printers';

interface PrintDocumentProps {
  title: string;
  fetchPath: string;
  receipt?: ReceiptPayload | null;
}

export default function PrintDocument({ title, fetchPath, receipt }: PrintDocumentProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [printers, setPrinters] = useState<PrinterProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const list = loadPrinters();
    setPrinters(list);
    setSelectedId(getDefaultPrinter()?.id ?? list[0]?.id ?? '');
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError('Please sign in to print.');
      return;
    }
    fetch(getApiUrl(fetchPath), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('Could not load the document.');
        return r.text();
      })
      .then(setHtml)
      .catch(() => setError('Could not load this document for print.'));
  }, [fetchPath]);

  const selected = useMemo(
    () => printers.find((p) => p.id === selectedId) ?? getDefaultPrinter(),
    [printers, selectedId],
  );

  const previewHtml = useMemo(() => {
    if (!html) return '';
    return injectPaperCss(html, selected?.paper ?? 'a4');
  }, [html, selected]);

  const handlePrint = useCallback(async () => {
    if (!html) return;
    setBusy(true);
    setStatus(null);
    try {
      const profile: PrinterProfile = selected ?? {
        id: 'system',
        name: 'System printer',
        connection: 'local',
        kind: 'inkjet',
        paper: 'a4',
        isDefault: true,
        createdAt: new Date().toISOString(),
      };
      const mode = await printViaProfile(profile, html, receipt ?? undefined);
      if (mode === 'bluetooth') setStatus('Sent to the Bluetooth printer.');
      else if (mode === 'serial') setStatus('Sent to the USB thermal printer.');
      else setStatus('Choose your printer in the system dialog — USB, Wi-Fi, AirPrint or Bluetooth.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Print failed.');
    } finally {
      setBusy(false);
    }
  }, [html, receipt, selected]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <p className="text-red-700">{error}</p>
        <Link href="/login" className="mt-4 inline-block text-brand-700 hover:underline">Sign in</Link>
      </div>
    );
  }

  if (!html) {
    return <p className="p-6 text-slate-600">Preparing {title.toLowerCase()}…</p>;
  }

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Print</p>
            <h1 className="text-lg font-bold text-slate-900">{title}</h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            >
              {printers.length === 0 && <option value="">System printer (A4)</option>}
              {printers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {paperLabel(p.paper)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handlePrint}
              disabled={busy}
              className="min-h-[44px] rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {busy
                ? 'Sending…'
                : selected && isThermalPaper(selected.paper) && selected.connection === 'bluetooth'
                  ? 'Print to Bluetooth'
                  : 'Print'}
            </button>
            <Link
              href="/organization/printers"
              className="min-h-[44px] inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Printer setup
            </Link>
          </div>
        </div>
        {status && <p className="mx-auto max-w-5xl px-4 pb-3 text-sm text-slate-600">{status}</p>}
      </div>
      <div className="mx-auto max-w-5xl p-4 print:p-0">
        <iframe
          title={title}
          srcDoc={previewHtml}
          className="min-h-[80vh] w-full rounded-xl border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none"
        />
      </div>
    </div>
  );
}
