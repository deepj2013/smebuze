'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch, apiUploadFile, getStaticUrl } from '@/lib/api';
import { DEFAULT_BRANDING, parseTenantBranding, type TenantBranding } from '@/lib/branding';
import { VARIANT_THEMES } from '@/lib/variant-theme';

const PRESETS = [
  { name: 'Restaurant', primary: VARIANT_THEMES.dine_restaurant.primary, accent: VARIANT_THEMES.dine_restaurant.accent },
  { name: 'Sweets', primary: VARIANT_THEMES.sweet_shop.primary, accent: VARIANT_THEMES.sweet_shop.accent },
  { name: 'Garments', primary: VARIANT_THEMES.garment_shop.primary, accent: VARIANT_THEMES.garment_shop.accent },
  { name: 'Kirana', primary: VARIANT_THEMES.retail_shop.primary, accent: VARIANT_THEMES.retail_shop.accent },
  { name: 'Department', primary: VARIANT_THEMES.department_store.primary, accent: VARIANT_THEMES.department_store.accent },
  { name: 'Trading', primary: VARIANT_THEMES.trading.primary, accent: VARIANT_THEMES.trading.accent },
  { name: 'Services', primary: VARIANT_THEMES.services.primary, accent: VARIANT_THEMES.services.accent },
];

export default function BrandingPage() {
  const [branding, setBranding] = useState<TenantBranding>(DEFAULT_BRANDING);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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
          Upload your logo for the app corner and for printed invoices and quotations. Pick colours and save — this workspace only.
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

      <form onSubmit={save} className="rounded-xl border bg-white p-5 space-y-4">
        <h2 className="font-semibold">Name in the corner</h2>
        <input
          value={branding.display_name ?? ''}
          onChange={(e) => setBranding((b) => ({ ...b, display_name: e.target.value }))}
          placeholder="e.g. Ice Crest"
          className="w-full rounded-lg border px-3 py-2"
        />
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
