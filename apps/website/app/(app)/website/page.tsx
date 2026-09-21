'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { PageHeader } from '../components/PageHeader';

type Site = {
  slug: string;
  is_published: boolean;
  shop_enabled: boolean;
  shop_url: string;
  site_url: string;
  custom_url?: string | null;
  domain_status?: string;
  custom_domain?: string | null;
  pages?: {
    hero_title?: string;
    hero_subtitle?: string;
    about?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
};

export default function WebsiteEditorPage() {
  const [site, setSite] = useState<Site | null>(null);
  const [hero, setHero] = useState('');
  const [sub, setSub] = useState('');
  const [about, setAbout] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [published, setPublished] = useState(false);
  const [shop, setShop] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [saving, setSaving] = useState(false);
  const [packs, setPacks] = useState<Array<{ id: string; title: string }>>([]);
  const [packId, setPackId] = useState('');

  useEffect(() => {
    apiGet<Site>('growth/site').then((r) => {
      if (r.error) setError(Array.isArray(r.error) ? r.error.join(' ') : r.error);
      else if (r.data) {
        setSite(r.data);
        setHero(r.data.pages?.hero_title || '');
        setSub(r.data.pages?.hero_subtitle || '');
        setAbout(r.data.pages?.about || '');
        setPhone(r.data.pages?.phone || '');
        setEmail(r.data.pages?.email || '');
        setAddress(r.data.pages?.address || '');
        setPublished(Boolean(r.data.is_published));
        setShop(r.data.shop_enabled !== false);
      }
    });
    apiGet<Array<{ id: string; title: string }>>('growth/packs').then((r) => {
      if (Array.isArray(r.data)) setPacks(r.data);
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setOk('');
    const { data, error: err } = await apiPatch<Site>('growth/site', {
      is_published: published,
      shop_enabled: shop,
      pages: { hero_title: hero, hero_subtitle: sub, about, phone, email, address },
    });
    setSaving(false);
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else {
      if (data) setSite(data);
      setOk('Website saved. Share the public link with buyers.');
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Public website" description="SMEBUZE hosts this site. Edit the copy; ask platform admin if you want your own domain." />
      {site && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 text-sm space-y-1">
          <p>Website: <a className="text-brand-600 hover:underline" href={site.site_url} target="_blank" rel="noreferrer">{site.site_url}</a></p>
          <p>Shop: <a className="text-brand-600 hover:underline" href={site.shop_url} target="_blank" rel="noreferrer">{site.shop_url}</a></p>
          {site.custom_domain && (
            <p>Custom domain: {site.custom_domain} ({site.domain_status})
              {site.custom_url ? <> · <a className="text-brand-600" href={site.custom_url}>{site.custom_url}</a></> : null}
            </p>
          )}
          <p className="text-slate-500">Need shop.yourbrand.com? Ask SMEBUZE admin to bind the domain.</p>
        </div>
      )}
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {ok && <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm">{ok}</div>}
      <form onSubmit={save} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Publish website & shop</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={shop} onChange={(e) => setShop(e.target.checked)} /> Allow checkout (turn off for enquiry-only sites)</label>
        <label className="block text-sm">Headline
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={hero} onChange={(e) => setHero(e.target.value)} />
        </label>
        <label className="block text-sm">Subheading
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={sub} onChange={(e) => setSub(e.target.value)} />
        </label>
        <label className="block text-sm">About
          <textarea className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 min-h-[100px]" value={about} onChange={(e) => setAbout(e.target.value)} />
        </label>
        <label className="block text-sm">Phone
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="block text-sm">Email
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block text-sm">Address
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={saving} className="rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium min-h-[44px] disabled:opacity-60">{saving ? 'Saving…' : 'Save website'}</button>
          <Link href="/catalog" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm min-h-[44px] inline-flex items-center">Catalog</Link>
        </div>
      </form>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">One-click setup for your business type</h2>
        <p className="mt-1 text-sm text-slate-500">Turns on the right modules, default website copy, shared WhatsApp, and catalog behaviour.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={packId} onChange={(e) => setPackId(e.target.value)}>
            <option value="">Choose type…</option>
            {packs.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <button
            type="button"
            onClick={async () => {
              if (!packId) return;
              setError('');
              const { error: err } = await apiPost(`growth/packs/${packId}/apply`, {});
              if (err) setError(Array.isArray(err) ? err.join(' ') : err);
              else setOk('Pack applied. Review the website copy and publish.');
            }}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm min-h-[44px]"
          >
            Apply pack
          </button>
        </div>
      </div>
    </div>
  );
}
