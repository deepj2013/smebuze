'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch, apiUploadFile, getStaticUrl } from '@/lib/api';
import { DEFAULT_BRANDING, parseTenantBranding, type TenantBranding } from '@/lib/branding';
import { INVOICE_PRINT_SIZE_OPTIONS, type InvoicePrintSize } from '@/lib/invoice-print-size';
import { INVOICE_TEMPLATE_OPTIONS, type InvoiceTemplate } from '@/lib/invoice-template';
import { VARIANT_THEMES } from '@/lib/variant-theme';

const PRESETS = Object.values(VARIANT_THEMES).map((t) => ({
  name: t.label,
  primary: t.primary,
  accent: t.accent,
}));

export default function BrandingPage() {
  const [branding, setBranding] = useState<TenantBranding>(DEFAULT_BRANDING);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const cropImg = useRef<HTMLImageElement | null>(null);

  const load = () => {
    apiGet<TenantBranding>('organization/branding').then((r) => {
      if (r.error) setError(r.error);
      else if (r.data) setBranding(parseTenantBranding({ branding: r.data }));
    });
  };

  useEffect(() => { void load(); }, []);

  const preview = branding.logo_url
    ? `${getStaticUrl(branding.logo_url)}${branding.updated_at ? `?t=${encodeURIComponent(branding.updated_at)}` : ''}`
    : null;
  const qrPreview = branding.invoice_qr_url
    ? `${getStaticUrl(branding.invoice_qr_url)}${branding.updated_at ? `?t=${encodeURIComponent(branding.updated_at)}` : ''}`
    : null;

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    setOk('');
    const res = await apiUploadFile<TenantBranding>('organization/branding/logo', file);
    setUploading(false);
    if (res.error) setError(res.error);
    else if (res.data) {
      setBranding(parseTenantBranding({ branding: res.data }));
      setOk('Logo saved. It will show in the corner and on invoices / quotations.');
      window.dispatchEvent(new CustomEvent('smebuzz-branding-updated', { detail: res.data }));
    }
    e.target.value = '';
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setOk('');
    const { data, error: err } = await apiPatch<TenantBranding>('organization/branding', {
      primary_color: branding.primary_color,
      accent_color: branding.accent_color,
      display_name: branding.display_name ?? '',
      invoice_print_size: branding.invoice_print_size,
      invoice_template: branding.invoice_template,
    });
    setSaving(false);
    if (err) setError(err);
    else if (data) {
      setBranding(parseTenantBranding({ branding: data }));
      setOk('Look saved for this workspace.');
      document.documentElement.style.setProperty('--tenant-primary', data.primary_color);
      document.documentElement.style.setProperty('--tenant-accent', data.accent_color);
      window.dispatchEvent(new CustomEvent('smebuzz-branding-updated', { detail: data }));
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/organization/companies" className="text-sm text-slate-600 hover:text-slate-900">← Organization</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Look & logo</h1>
        <p className="mt-1 text-sm text-slate-500">
          Logo, invoice template (Tally / Busy / Marg), print size, and a cropped UPI QR next to bank details — this workspace only.
        </p>
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {ok && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{ok}</p>}

      <section className="rounded-xl border bg-white p-5 space-y-4">
        <h2 className="font-semibold">Logo</h2>
        <div className="flex items-center gap-4">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Logo" className="h-16 w-16 rounded-xl border object-contain bg-white p-1" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl text-white font-bold" style={{ background: branding.primary_color }}>
              {(branding.display_name || 'IC').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onLogo} disabled={uploading} className="text-sm" />
            <p className="mt-1 text-xs text-slate-500">PNG, JPG, WEBP or SVG · max 2 MB. Used in the header and on bills.</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5 space-y-3">
        <h2 className="font-semibold">Invoice payment QR</h2>
        <p className="text-xs text-slate-500">
          Upload your UPI / bank QR, crop it square, and it prints next to bank details on every invoice.
        </p>
        <div className="flex items-center gap-4">
          {qrPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrPreview} alt="Invoice QR" className="h-24 w-24 rounded-lg border bg-white object-contain p-1" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed text-xs text-slate-400">No QR</div>
          )}
          <div className="space-y-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={uploading}
              className="text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                const url = URL.createObjectURL(file);
                setCropSrc(url);
                setZoom(1);
              }}
            />
            {qrPreview && (
              <button
                type="button"
                className="text-xs text-red-700 underline"
                onClick={async () => {
                  const { data, error: err } = await apiPatch<TenantBranding>('organization/branding', { invoice_qr_url: '' });
                  if (err) setError(err);
                  else if (data) {
                    setBranding(parseTenantBranding({ branding: data }));
                    setOk('QR removed from invoices.');
                  }
                }}
              >
                Remove QR
              </button>
            )}
          </div>
        </div>
        {cropSrc && (
          <div className="rounded-lg border bg-slate-50 p-3 space-y-2">
            <p className="text-xs font-medium text-slate-700">Crop to square, then save.</p>
            <div className="relative mx-auto h-56 w-56 overflow-hidden rounded-lg border bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={cropImg}
                src={cropSrc}
                alt="Crop"
                className="absolute left-1/2 top-1/2 max-w-none"
                style={{ transform: `translate(-50%, -50%) scale(${zoom})`, transformOrigin: 'center center' }}
              />
            </div>
            <label className="block text-xs text-slate-600">
              Zoom
              <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
                onClick={async () => {
                  const img = cropImg.current;
                  if (!img) return;
                  const out = 512;
                  const canvas = document.createElement('canvas');
                  canvas.width = out;
                  canvas.height = out;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;
                  const src = Math.min(img.naturalWidth, img.naturalHeight) / zoom;
                  const sx = (img.naturalWidth - src) / 2;
                  const sy = (img.naturalHeight - src) / 2;
                  ctx.drawImage(img, sx, sy, src, src, 0, 0, out, out);
                  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
                  if (!blob) return;
                  setUploading(true);
                  const file = new File([blob], 'invoice-qr.png', { type: 'image/png' });
                  const res = await apiUploadFile<TenantBranding>('organization/branding/qr', file);
                  setUploading(false);
                  if (res.error) setError(res.error);
                  else if (res.data) {
                    setBranding(parseTenantBranding({ branding: res.data }));
                    setOk('QR saved. It will print on invoices next to bank details.');
                    setCropSrc(null);
                  }
                }}
              >
                Crop & save
              </button>
              <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => setCropSrc(null)}>Cancel</button>
            </div>
          </div>
        )}
      </section>

      <form onSubmit={save} className="rounded-xl border bg-white p-5 space-y-4">
        <h2 className="font-semibold">Name in the corner</h2>
        <input
          value={branding.display_name ?? ''}
          onChange={(e) => setBranding((b) => ({ ...b, display_name: e.target.value }))}
          placeholder="e.g. Ice Crest"
          className="w-full rounded-lg border px-3 py-2"
        />

        <h2 className="font-semibold pt-2">Invoice template</h2>
        <p className="text-xs text-slate-500">
          Current keeps today&apos;s layout. Pick Tally, Busy or Marg style for GST A4 bills.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {INVOICE_TEMPLATE_OPTIONS.map((opt) => {
            const selected = branding.invoice_template === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setBranding((b) => ({ ...b, invoice_template: opt.id as InvoiceTemplate }))}
                className={`rounded-lg border px-3 py-3 text-left min-h-[56px] ${
                  selected ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900">{opt.label}</span>
                <span className="block text-xs text-slate-500 mt-0.5">{opt.hint}</span>
              </button>
            );
          })}
        </div>

        <h2 className="font-semibold pt-2">Invoice print size</h2>
        <p className="text-xs text-slate-500">
          Applies to tax invoices, quotations and counter receipts (including Ice Crest). Default is Large.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {INVOICE_PRINT_SIZE_OPTIONS.map((opt) => {
            const selected = branding.invoice_print_size === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setBranding((b) => ({ ...b, invoice_print_size: opt.id as InvoicePrintSize }))}
                className={`rounded-lg border px-3 py-3 text-left min-h-[56px] ${
                  selected ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900">{opt.label}</span>
                <span className="block text-xs text-slate-500 mt-0.5">{opt.hint}</span>
              </button>
            );
          })}
        </div>

        <h2 className="font-semibold pt-2">Colours</h2>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setBranding((b) => ({ ...b, primary_color: p.primary, accent_color: p.accent }))}
              className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm min-h-[40px]"
            >
              <span className="h-4 w-4 rounded-full" style={{ background: p.primary }} />
              {p.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm">Primary
            <input type="color" value={branding.primary_color} onChange={(e) => setBranding((b) => ({ ...b, primary_color: e.target.value }))} className="mt-1 h-11 w-full rounded border" />
          </label>
          <label className="text-sm">Accent
            <input type="color" value={branding.accent_color} onChange={(e) => setBranding((b) => ({ ...b, accent_color: e.target.value }))} className="mt-1 h-11 w-full rounded border" />
          </label>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: branding.primary_color }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: branding.accent_color }}>Preview</p>
          <p className="mt-1 font-bold" style={{ color: branding.primary_color }}>{branding.display_name || 'Your company'}</p>
          <button type="button" className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: branding.primary_color }}>Sample button</button>
        </div>
        <button disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 min-h-[44px]">
          {saving ? 'Saving…' : 'Save look'}
        </button>
      </form>
    </div>
  );
}
