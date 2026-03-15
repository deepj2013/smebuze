'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';
import { LEAD_SOURCE_OPTIONS, SOURCE_OTHER_VALUE } from '@/lib/lead-sources';
import { PageHeader } from '../../../../components/PageHeader';

function validatePhone(phone: string): string | null {
  if (!phone.trim()) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return 'Phone must be at least 10 digits';
  if (digits.length > 15) return 'Phone must be at most 15 digits';
  return null;
}

function validateEmail(email: string): string | null {
  if (!email.trim()) return null;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim()) ? null : 'Enter a valid email address';
}

function validateEstimatedValue(value: string): string | null {
  if (!value.trim()) return null;
  const n = parseFloat(value.replace(/,/g, ''));
  if (Number.isNaN(n)) return 'Enter a valid number';
  if (n < 0) return 'Estimated value cannot be negative';
  return null;
}

const PREDEFINED_SOURCE_VALUES = new Set(LEAD_SOURCE_OPTIONS.map((o) => o.value).filter(Boolean));

export default function EditLeadPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState('new');
  const [sourceSelect, setSourceSelect] = useState('');
  const [sourceOther, setSourceOther] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [productInterest, setProductInterest] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    apiGet<Record<string, unknown>>(`crm/leads/${id}`).then((res) => {
      if (res.error) setLoadErr(res.error);
      else if (res.data) {
        const d = res.data as Record<string, unknown>;
        setName((d.name as string) ?? '');
        setEmail((d.email as string) ?? '');
        setPhone((d.phone as string) ?? '');
        setStage((d.stage as string) ?? 'new');
        const src = (d.source as string) ?? '';
        if (PREDEFINED_SOURCE_VALUES.has(src)) {
          setSourceSelect(src);
          setSourceOther('');
        } else {
          setSourceSelect(SOURCE_OTHER_VALUE);
          setSourceOther(src);
        }
        const dv = d.deal_value;
        setEstimatedValue(dv != null ? String(dv) : '');
        const meta = d.metadata as Record<string, unknown> | undefined;
        setProductInterest((meta?.product_interest as string) ?? '');
      }
    });
  }, [id]);

  const runValidation = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    const phoneErr = validatePhone(phone);
    if (phoneErr) errs.phone = phoneErr;
    const emailErr = validateEmail(email);
    if (emailErr) errs.email = emailErr;
    if (sourceSelect === SOURCE_OTHER_VALUE && !sourceOther.trim()) errs.source = 'Enter source when "Other" is selected';
    const estErr = validateEstimatedValue(estimatedValue);
    if (estErr) errs.estimatedValue = estErr;
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (!runValidation()) return;
    const sourceValue = sourceSelect === SOURCE_OTHER_VALUE ? sourceOther.trim() : sourceSelect;
    const payload = {
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      stage,
      source: sourceValue || undefined,
      deal_value: estimatedValue.trim() ? parseFloat(estimatedValue.replace(/,/g, '')) : undefined,
      metadata: productInterest.trim() ? { product_interest: productInterest.trim() } : undefined,
    };
    setLoading(true);
    const { error: err } = await apiPatch(`crm/leads/${id}`, payload);
    setLoading(false);
    if (err) setError(err);
    else router.push('/crm/leads');
  };

  const showSourceOther = sourceSelect === SOURCE_OTHER_VALUE;

  if (loadErr) return <div className="p-4 text-red-600">{loadErr}</div>;

  return (
    <div>
      <Link href="/crm/leads" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Leads</Link>
      <PageHeader title="Edit lead" />
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <form onSubmit={submit} className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 input-touch">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full rounded border px-3 py-2 text-sm ${fieldErrors.name ? 'border-red-500' : 'border-slate-300'}`}
            placeholder="Lead name"
          />
          {fieldErrors.name && <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full rounded border px-3 py-2 text-sm ${fieldErrors.email ? 'border-red-500' : 'border-slate-300'}`}
            placeholder="email@example.com"
          />
          {fieldErrors.email && <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={`w-full rounded border px-3 py-2 text-sm ${fieldErrors.phone ? 'border-red-500' : 'border-slate-300'}`}
            placeholder="10–15 digits"
          />
          {fieldErrors.phone && <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Stage</label>
          <select value={stage} onChange={(e) => setStage(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="proposal">Proposal</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
          <select
            value={sourceSelect}
            onChange={(e) => setSourceSelect(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          >
            {LEAD_SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {showSourceOther && (
            <div className="mt-2">
              <input
                type="text"
                value={sourceOther}
                onChange={(e) => setSourceOther(e.target.value)}
                className={`w-full rounded border px-3 py-2 text-sm ${fieldErrors.source ? 'border-red-500' : 'border-slate-300'}`}
                placeholder="Enter source (e.g. Event, Direct)"
              />
              {fieldErrors.source && <p className="mt-1 text-sm text-red-600">{fieldErrors.source}</p>}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Estimated value (₹)</label>
          <input
            type="text"
            inputMode="decimal"
            value={estimatedValue}
            onChange={(e) => setEstimatedValue(e.target.value)}
            className={`w-full rounded border px-3 py-2 text-sm ${fieldErrors.estimatedValue ? 'border-red-500' : 'border-slate-300'}`}
            placeholder="e.g. 50000"
          />
          {fieldErrors.estimatedValue && <p className="mt-1 text-sm text-red-600">{fieldErrors.estimatedValue}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Product we can sell to this lead</label>
          <input
            type="text"
            value={productInterest}
            onChange={(e) => setProductInterest(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. Software license, Service package"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50 min-h-[44px]">Save</button>
          <Link href="/crm/leads" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 inline-flex items-center min-h-[44px]">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
