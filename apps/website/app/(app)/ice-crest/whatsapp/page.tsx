'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';

type Templates = { reminder: string; invoice: string; quotation: string; order: string };

type Status = {
  configured: boolean;
  mode: string;
  templates: Templates;
};

const KINDS: { key: keyof Templates; label: string; hint: string }[] = [
  { key: 'reminder', label: 'Payment reminder', hint: 'Overdue or pending bills' },
  { key: 'invoice', label: 'Invoice / receipt', hint: 'After you raise a bill' },
  { key: 'quotation', label: 'Quotation', hint: 'Price offer to a customer' },
  { key: 'order', label: 'Order confirmation', hint: 'When an order is confirmed' },
];

function canManageWhatsapp(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const u = JSON.parse(window.localStorage.getItem('smebuzz_user') || '{}') as {
      permissions?: string[];
      isSuperAdmin?: boolean;
    };
    const perms = u.permissions ?? [];
    return u.isSuperAdmin === true || perms.includes('*') || perms.includes('org.company.update');
  } catch {
    return false;
  }
}

export default function IceCrestWhatsappPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status>();
  const [templates, setTemplates] = useState<Templates>({ reminder: '', invoice: '', quotation: '', order: '' });
  const [phone, setPhone] = useState('');
  const [kind, setKind] = useState<keyof Templates>('reminder');
  const [param, setParam] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const load = () => {
    apiGet<Status>('integrations/whatsapp/status').then((r) => {
      if (r.data) {
        setStatus(r.data);
        setTemplates({ reminder: '', invoice: '', quotation: '', order: '', ...r.data.templates });
      }
      setError(r.error || '');
    });
  };

  useEffect(() => {
    setAllowed(canManageWhatsapp());
    void load();
  }, []);

  if (allowed === null) {
    return <p className="text-slate-500">Loading…</p>;
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border bg-white p-6">
        <h1 className="text-xl font-bold">WhatsApp</h1>
        <p className="mt-2 text-sm text-slate-600">Only an administrator matches WhatsApp templates. Send messages from Campaigns.</p>
      </div>
    );
  }

  async function saveTemplates(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setOk('');
    const r = await apiPatch<Templates>('integrations/whatsapp/templates', templates);
    setSaving(false);
    if (r.error) setError(r.error);
    else {
      if (r.data) setTemplates({ reminder: '', invoice: '', quotation: '', order: '', ...r.data });
      setOk('Template names saved. Campaigns and this screen will use them.');
    }
  }

  async function sendTest(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError('');
    setOk('');
    const r = await apiPost<{ sent?: boolean; message?: string; to?: string }>('integrations/whatsapp/send', {
      to: phone,
      template: kind,
      param: param.trim() || undefined,
      fileUrl: fileUrl.trim() || undefined,
    });
    setSending(false);
    if (r.error) setError(r.error);
    else if (!r.data?.sent) setError(r.data?.message || 'Message was not sent.');
    else setOk(`Sent to ${r.data.to || phone}.`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-cyan-700">ICE CREST</p>
        <h1 className="text-2xl font-bold">WhatsApp messages</h1>
        <p className="mt-1 text-sm text-slate-500">
          Match each message type to the template name you already have with your WhatsApp provider. Staff never see keys or technical setup — they just send from Campaigns.
        </p>
      </div>
      {error && <p className="rounded bg-red-50 p-3 text-red-700 text-sm">{error}</p>}
      {ok && <p className="rounded bg-green-50 p-3 text-green-800 text-sm">{ok}</p>}
      {status && (
        <section className={`rounded-xl border p-5 ${status.configured ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          <p className="font-semibold">{status.configured ? 'WhatsApp is connected' : 'WhatsApp is not connected yet'}</p>
          <p className="mt-1 text-sm text-slate-600">
            {status.configured
              ? 'You can send payment reminders, invoices and quotations from here or from Campaigns.'
              : 'Ask the platform admin to connect the WhatsApp service. You can still save template names below.'}
          </p>
        </section>
      )}

      <form onSubmit={saveTemplates} className="rounded-xl border bg-white p-5 space-y-4">
        <h2 className="font-semibold">Match our messages to your templates</h2>
        <p className="text-sm text-slate-500">Type the exact template name from your WhatsApp provider for each kind of message.</p>
        {KINDS.map((k) => (
          <label key={k.key} className="block text-sm">
            <span className="font-medium text-slate-800">{k.label}</span>
            <span className="ml-2 text-slate-500">{k.hint}</span>
            <input
              value={templates[k.key]}
              onChange={(e) => setTemplates((t) => ({ ...t, [k.key]: e.target.value }))}
              placeholder="Template name"
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </label>
        ))}
        <button disabled={saving} className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 min-h-[44px]">
          {saving ? 'Saving…' : 'Save template names'}
        </button>
      </form>

      <form onSubmit={sendTest} className="rounded-xl border bg-white p-5 space-y-4">
        <h2 className="font-semibold">Send a message</h2>
        <label className="block text-sm">Customer mobile
          <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <label className="block text-sm">Message type
          <select value={kind} onChange={(e) => setKind(e.target.value as keyof Templates)} className="mt-1 w-full rounded-lg border px-3 py-2">
            {KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
        </label>
        <label className="block text-sm">Values for the template (comma separated, in order)
          <input value={param} onChange={(e) => setParam(e.target.value)} placeholder="Customer name, amount, due date" className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <label className="block text-sm">PDF / file link (optional)
          <input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <button disabled={sending} className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 min-h-[44px]">
          {sending ? 'Sending…' : 'Send WhatsApp'}
        </button>
      </form>
    </div>
  );
}
