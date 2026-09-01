'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

type Status = {
  configured: boolean;
  mode: string;
  webhook_url: string;
  verify_token_hint: string;
  default_tenant: string;
  phone_number_id_set: boolean;
  access_token_set: boolean;
  auto_reply_enabled: boolean;
  default_template: string | null;
  api_version: string;
};

export default function IceCrestWhatsappPage() {
  const [status, setStatus] = useState<Status>();
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    apiGet<Status>('integrations/whatsapp/status').then(r => {
      if (r.data) setStatus(r.data);
      setError(r.error || '');
    });
  }, []);

  const copy = (label: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-cyan-700">ICE CREST</p>
        <h1 className="text-2xl font-bold">WhatsApp (Meta Cloud API)</h1>
        <p className="mt-1 text-sm text-slate-500">Connect Meta Business Manager to receive enquiries as CRM leads and send invoice reminders.</p>
      </div>
      {error && <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>}
      {status && (
        <>
          <section className={`rounded-xl border p-5 ${status.configured ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
            <p className="font-semibold">{status.configured ? 'Live — Meta API connected' : 'Pending — add credentials to .env'}</p>
            <p className="mt-1 text-sm">Mode: {status.mode} · Token: {status.access_token_set ? 'set' : 'missing'} · Phone ID: {status.phone_number_id_set ? 'set' : 'missing'}</p>
          </section>
          <section className="rounded-xl border bg-white p-5 space-y-4 text-sm">
            <h2 className="font-semibold">1. Register webhook in Meta</h2>
            <p className="text-slate-600">WhatsApp → Configuration → Webhook in <a className="text-cyan-700 underline" href="https://developers.facebook.com/" target="_blank" rel="noreferrer">Meta for Developers</a></p>
            <div>
              <p className="text-xs uppercase text-slate-500">Callback URL</p>
              <div className="mt-1 flex gap-2">
                <code className="flex-1 rounded bg-slate-100 p-2 text-xs break-all">{status.webhook_url}</code>
                <button type="button" onClick={() => copy('url', status.webhook_url)} className="rounded border px-3 py-1 text-xs">{copied === 'url' ? 'Copied' : 'Copy'}</button>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Verify token</p>
              <p className="mt-1">Set <code className="bg-slate-100 px-1">WHATSAPP_VERIFY_TOKEN</code> in API .env {status.verify_token_hint}</p>
            </div>
            <p>Subscribe to field: <b>messages</b></p>
          </section>
          <section className="rounded-xl border bg-white p-5 space-y-3 text-sm">
            <h2 className="font-semibold">2. API .env variables</h2>
            <pre className="overflow-x-auto rounded bg-slate-900 p-4 text-xs text-green-100">{`WHATSAPP_ACCESS_TOKEN=your_meta_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=ice_crest_webhook_2026
WHATSAPP_DEFAULT_TENANT_SLUG=ice-crest
WHATSAPP_AUTO_REPLY=Thanks for contacting Ice Crest!
API_PUBLIC_URL=https://your-api-domain.com`}</pre>
            <p className="text-slate-500">Full guide: <code>docs/WHATSAPP_META_SETUP.md</code></p>
          </section>
          <section className="rounded-xl border bg-white p-5 text-sm">
            <h2 className="font-semibold">3. Test</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
              <li>Send a WhatsApp message to your business number → check <Link href="/crm/leads" className="text-cyan-700">CRM Leads</Link></li>
              <li>Send outbound test from <Link href="/crm/campaigns" className="text-cyan-700">Campaigns → Send message</Link></li>
              <li>In dev mode, add test phone numbers in Meta → WhatsApp → API Setup</li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
