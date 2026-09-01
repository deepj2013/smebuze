'use client';

import { useState } from 'react';
import Link from 'next/link';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const SKUS = [
  { code: 'ICE-2X2X2', label: '2 × 2 × 2 inch cube' },
  { code: 'ICE-2X2X25', label: '2 × 2 × 2.5 inch cube' },
  { code: 'ICE-16X16X46', label: '1.6 × 1.6 × 4.6 inch highball' },
  { code: 'ICE-16X16X48', label: '1.6 × 1.6 × 4.8 inch highball' },
  { code: 'ICE-SPHERE', label: 'Ice ball / sphere' },
  { code: 'ICE-CUSTOM', label: 'Custom size' },
];

export default function IceCrestPublicPage() {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', company: '', product_sku: '', quantity: '', requirement: '', message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setStatusMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/ice-crest/website-leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: 'ice-crest',
          name: form.name,
          phone: form.phone || undefined,
          email: form.email || undefined,
          company: form.company || undefined,
          product_sku: form.product_sku || undefined,
          quantity: form.quantity ? Number(form.quantity) : undefined,
          requirement: form.requirement || undefined,
          message: form.message || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { message?: string }).message || 'Could not submit enquiry');
      setStatus('ok');
      setStatusMsg('Thank you! Our team will contact you shortly.');
      setForm({ name: '', phone: '', email: '', company: '', product_sku: '', quantity: '', requirement: '', message: '' });
    } catch (err) {
      setStatus('err');
      setStatusMsg(err instanceof Error ? err.message : 'Submission failed');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white text-slate-900">
      <header className="border-b border-cyan-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-900 text-lg font-bold text-white">IC</div>
            <div>
              <p className="text-lg font-bold text-cyan-900">Ice Crest</p>
              <p className="text-xs text-slate-500">Premium ice for hotels, bars & events</p>
            </div>
          </div>
          <Link href="/login" className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800">Staff login</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <section className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">Mumbai&apos;s trusted ice partner</p>
            <h1 className="mt-2 text-4xl font-bold leading-tight text-slate-900">Crystal-clear ice.<br />Delivered on time.</h1>
            <p className="mt-4 text-slate-600">Perfect cubes, highballs and spheres for restaurants, hotels, caterers and events. Tell us what you need — we&apos;ll confirm stock and delivery.</p>
            <ul className="mt-6 space-y-2 text-sm text-slate-700">
              {SKUS.map(s => <li key={s.code}><span className="font-medium text-cyan-800">{s.label}</span></li>)}
            </ul>
          </div>

          <form onSubmit={submit} className="rounded-2xl border border-cyan-100 bg-white p-6 shadow-lg shadow-cyan-100/40">
            <h2 className="text-xl font-bold text-slate-900">Enquire / Order</h2>
            <p className="mt-1 text-sm text-slate-500">Submit the form — it goes straight into our CRM as a new lead.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">Name *<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
              <label className="text-sm">Phone *<input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="10-digit mobile" /></label>
              <label className="text-sm">Email<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
              <label className="text-sm sm:col-span-2">Business / Hotel<input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
              <label className="text-sm">Ice type<select value={form.product_sku} onChange={e => setForm({ ...form, product_sku: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="">Select SKU</option>{SKUS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}</select></label>
              <label className="text-sm">Quantity (pcs)<input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
              <label className="text-sm sm:col-span-2">Requirement / delivery date<input value={form.requirement} onChange={e => setForm({ ...form, requirement: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="e.g. 500 spheres for Saturday event" /></label>
              <label className="text-sm sm:col-span-2">Message<textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
            </div>
            {statusMsg && <p className={`mt-4 rounded-lg p-3 text-sm ${status === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{statusMsg}</p>}
            <button disabled={status === 'sending'} type="submit" className="mt-4 w-full rounded-lg bg-cyan-700 py-3 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-60">
              {status === 'sending' ? 'Sending…' : 'Send enquiry'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
