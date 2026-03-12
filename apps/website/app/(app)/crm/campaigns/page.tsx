'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { Sparkles, Send, FileText, Tag } from 'lucide-react';

interface ContactCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

interface MessageTemplate {
  id: string;
  name: string;
  subject?: string | null;
  body: string;
  channel: string;
}

interface AiSample {
  subject?: string;
  body: string;
}

type Tab = 'categories' | 'templates' | 'send';

export default function CampaignsPage() {
  const [tab, setTab] = useState<Tab>('categories');
  const [categories, setCategories] = useState<ContactCategory[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Category form
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  // Template form
  const [tplName, setTplName] = useState('');
  const [tplSubject, setTplSubject] = useState('');
  const [tplBody, setTplBody] = useState('');
  const [tplChannel, setTplChannel] = useState('email');
  const [savingTpl, setSavingTpl] = useState(false);

  // Send message
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [aiSamples, setAiSamples] = useState<AiSample[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const loadCategories = async () => {
    const { data } = await apiGet<ContactCategory[]>('crm/campaigns/categories');
    if (Array.isArray(data)) setCategories(data);
  };

  const loadTemplates = async () => {
    const { data } = await apiGet<MessageTemplate[]>('crm/campaigns/templates');
    if (Array.isArray(data)) setTemplates(data);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      await Promise.all([loadCategories(), loadTemplates()]);
      setLoading(false);
    })();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setSavingCat(true);
    setError(null);
    const { error: err } = await apiPost('crm/campaigns/categories', { name: catName.trim(), description: catDesc.trim() || undefined });
    if (err) setError(err);
    else {
      setCatName('');
      setCatDesc('');
      await loadCategories();
    }
    setSavingCat(false);
  };

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim() || !tplBody.trim()) return;
    setSavingTpl(true);
    setError(null);
    const { error: err } = await apiPost('crm/campaigns/templates', {
      name: tplName.trim(),
      subject: tplSubject.trim() || undefined,
      body: tplBody.trim(),
      channel: tplChannel,
    });
    if (err) setError(err);
    else {
      setTplName('');
      setTplSubject('');
      setTplBody('');
      await loadTemplates();
    }
    setSavingTpl(false);
  };

  const loadAiSamples = async () => {
    setLoadingAi(true);
    setError(null);
    const { data, error: err } = await apiGet<AiSample[]>('crm/campaigns/ai-message-samples');
    if (err) setError(err);
    else if (Array.isArray(data)) setAiSamples(data);
    setLoadingAi(false);
  };

  const applyAiSample = (sample: AiSample) => {
    if (sample.subject) setMessageSubject(sample.subject);
    setMessageBody(sample.body);
  };

  const handleTemplateSelect = (id: string) => {
    setSelectedTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) {
      setMessageSubject(t.subject || '');
      setMessageBody(t.body);
    }
  };

  const handleSendMessage = async () => {
    setError(null);
    setSendSuccess(null);
    const phone = testPhone.trim();
    if (!phone) {
      setError('Enter a phone number (e.g. 919876543210) to send the message.');
      return;
    }
    setSending(true);
    const templateName = selectedTemplateId ? templates.find((t) => t.id === selectedTemplateId)?.name || 'generic' : 'generic';
    const { data, error: err } = await apiPost<{ sent?: boolean; message?: string; to?: string }>('integrations/whatsapp/send', {
      to: phone,
      template: templateName,
      params: { body: messageBody, subject: messageSubject },
    });
    setSending(false);
    if (err) {
      setError(err);
      return;
    }
    setSendSuccess(data?.sent ? `Message sent to ${data.to ?? phone}.` : (data as { message?: string })?.message || 'Done.');
    setTimeout(() => setSendSuccess(null), 4000);
  };

  const tabs: { id: Tab; label: string; icon: typeof Tag }[] = [
    { id: 'categories', label: 'Contact categories', icon: Tag },
    { id: 'templates', label: 'Message templates', icon: FileText },
    { id: 'send', label: 'Send message', icon: Send },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>
      )}
      {sendSuccess && (
        <div className="mb-4 rounded-lg bg-green-50 text-green-800 p-3 text-sm">{sendSuccess}</div>
      )}

      <div className="flex gap-2 border-b border-slate-200 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg ${
              tab === t.id ? 'bg-white border border-slate-200 border-b-0 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-slate-600">Loading…</p>}

      {!loading && tab === 'categories' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4 max-w-md">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Add category</h2>
            <p className="text-sm text-slate-500 mb-3">Categories help you group contacts (leads and customers) for campaigns.</p>
            <form onSubmit={handleAddCategory} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="e.g. Enterprise, SMB"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Short description"
                />
              </div>
              <button
                type="submit"
                disabled={savingCat || !catName.trim()}
                className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {savingCat ? 'Saving…' : 'Add category'}
              </button>
            </form>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <h2 className="text-lg font-semibold text-slate-900 p-4 border-b border-slate-200">Your categories</h2>
            {categories.length === 0 ? (
              <p className="p-4 text-slate-500 text-sm">No categories yet. Add one above.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {categories.map((c) => (
                  <li key={c.id} className="p-4 flex justify-between items-center">
                    <div>
                      <span className="font-medium text-slate-900">{c.name}</span>
                      <span className="text-slate-400 ml-2 text-sm">({c.slug})</span>
                      {c.description && <p className="text-sm text-slate-500 mt-0.5">{c.description}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {!loading && tab === 'templates' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4 max-w-2xl">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Create template</h2>
            <form onSubmit={handleAddTemplate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={tplName}
                    onChange={(e) => setTplName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="e.g. Follow-up email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Channel</label>
                  <select
                    value={tplChannel}
                    onChange={(e) => setTplChannel(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject (optional)</label>
                <input
                  type="text"
                  value={tplSubject}
                  onChange={(e) => setTplSubject(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Email subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Body</label>
                <textarea
                  value={tplBody}
                  onChange={(e) => setTplBody(e.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Use {{name}} and {{company}} for personalization."
                />
              </div>
              <button
                type="submit"
                disabled={savingTpl || !tplName.trim() || !tplBody.trim()}
                className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {savingTpl ? 'Saving…' : 'Save template'}
              </button>
            </form>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <h2 className="text-lg font-semibold text-slate-900 p-4 border-b border-slate-200">Your templates</h2>
            {templates.length === 0 ? (
              <p className="p-4 text-slate-500 text-sm">No templates yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {templates.map((t) => (
                  <li key={t.id} className="p-4">
                    <div className="font-medium text-slate-900">{t.name}</div>
                    <div className="text-sm text-slate-500">{t.channel} {t.subject && `· ${t.subject}`}</div>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{t.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {!loading && tab === 'send' && (
        <div className="space-y-6 max-w-2xl">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Compose & send</h2>
            <p className="text-sm text-slate-500 mb-4">Select a contact category and a template (or write your own). Use AI to generate sample messages.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact category</label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">All contacts</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Load template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Choose a template…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadAiSamples}
                  disabled={loadingAi}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  {loadingAi ? 'Loading…' : 'AI: Generate message samples'}
                </button>
              </div>

              {aiSamples.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-medium text-slate-700 mb-2">Pick a sample to use:</p>
                  <div className="space-y-2">
                    {aiSamples.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => applyAiSample(s)}
                        className="block w-full text-left rounded border border-slate-200 bg-white p-3 text-sm hover:bg-brand-50 hover:border-brand-200"
                      >
                        <span className="font-medium text-slate-700">{s.subject || '(No subject)'}</span>
                        <p className="text-slate-600 mt-1 line-clamp-2">{s.body}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Email subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Test phone (WhatsApp)</label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="e.g. 919876543210 — optional; used when sending to a single number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message body</label>
                <textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  rows={8}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Your message. Use {{name}}, {{company}} for personalization."
                />
              </div>

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={sending}
                className="flex items-center gap-2 rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Sending…' : 'Send message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
