'use client';

import { useState } from 'react';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const field = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 min-h-[44px]';

export default function CustomPlanEnquiry({ compact = false }: { compact?: boolean }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', company: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.phone.trim() && !form.email.trim()) {
      setStatus('err');
      setMsg('Add a phone number or email so we can reply.');
      return;
    }
    setStatus('sending');
    setMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/billing/custom-enquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          company: form.company.trim() || undefined,
          message: form.message.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const raw = (json as { message?: string | string[] }).message;
        throw new Error(Array.isArray(raw) ? raw.join(' ') : raw || 'Could not send');
      }
      setStatus('ok');
      setMsg('Message sent. We will get back to you shortly.');
      setForm({ name: '', phone: '', email: '', company: '', message: '' });
    } catch (err) {
      setStatus('err');
      setMsg(err instanceof Error ? err.message : 'Could not send');
    }
  }

  return (
    <form onSubmit={submit} className={compact ? 'space-y-3' : 'space-y-4'}>
      {!compact && (
        <p className="text-sm text-slate-600">
          Tell us seats, companies, modules or an industry pack. We reply from support@smebuze.com.
        </p>
      )}
      <div className={compact ? 'grid gap-3' : 'grid gap-3 sm:grid-cols-2'}>
        <label className="text-sm text-slate-700">
          Your name *
          <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={field} />
        </label>
        <label className="text-sm text-slate-700">
          Business / shop
          <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={field} />
        </label>
        <label className="text-sm text-slate-700">
          Phone
          <input type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={field} />
        </label>
        <label className="text-sm text-slate-700">
          Email
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={field} />
        </label>
      </div>
      <label className="block text-sm text-slate-700">
        What do you need?
        <textarea
          rows={compact ? 3 : 4}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Users, companies, WhatsApp, ice plant, wholesale…"
          className={`${field} min-h-[88px]`}
        />
      </label>
      {msg && (
        <p className={`rounded-lg p-3 text-sm ${status === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{msg}</p>
      )}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 min-h-[48px]"
      >
        {status === 'sending' ? 'Sending…' : 'Send message to SMEBUZE'}
      </button>
    </form>
  );
}
