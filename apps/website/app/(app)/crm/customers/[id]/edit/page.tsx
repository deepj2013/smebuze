'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';
import { INDIAN_STATES, getCitiesForState } from '@/lib/india-states-cities';
import { Plus, Trash2 } from 'lucide-react';

const ENTITY_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'company', label: 'Company' },
  { value: 'other', label: 'Other' },
];

const CONTACT_DEPARTMENTS = [
  { value: 'account', label: 'Account' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'sales', label: 'Sales' },
  { value: 'other', label: 'Other' },
];

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

function validatePincode(pincode: string): string | null {
  if (!pincode.trim()) return null;
  return /^\d{6}$/.test(pincode.trim()) ? null : 'Pincode must be 6 digits';
}

function validateGstin(gstin: string): string | null {
  if (!gstin.trim()) return null;
  return /^[0-9A-Za-z]{15}$/.test(gstin.trim()) ? null : 'GSTIN must be 15 characters (alphanumeric)';
}

interface ContactPerson {
  name: string;
  email: string;
  phone: string;
  department: string;
}

const emptyContact = (): ContactPerson => ({ name: '', email: '', phone: '', department: 'other' });

function parseContacts(raw: unknown): ContactPerson[] {
  if (!Array.isArray(raw) || raw.length === 0) return [emptyContact()];
  return raw.map((c) => ({
    name: typeof (c as Record<string, unknown>).name === 'string' ? (c as Record<string, unknown>).name as string : '',
    email: typeof (c as Record<string, unknown>).email === 'string' ? (c as Record<string, unknown>).email as string : '',
    phone: typeof (c as Record<string, unknown>).phone === 'string' ? (c as Record<string, unknown>).phone as string : '',
    department: typeof (c as Record<string, unknown>).department === 'string' ? (c as Record<string, unknown>).department as string : 'other',
  }));
}

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [name, setName] = useState('');
  const [entityType, setEntityType] = useState('company');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [line1, setLine1] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [segment, setSegment] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [contacts, setContacts] = useState<ContactPerson[]>([emptyContact()]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const cities = useMemo(() => getCitiesForState(stateCode), [stateCode]);

  useEffect(() => {
    apiGet<Record<string, unknown>>(`crm/customers/${id}`).then((res) => {
      if (res.error) setLoadErr(res.error);
      else if (res.data) {
        const d = res.data as Record<string, unknown>;
        setName((d.name as string) ?? '');
        setEntityType((d.entity_type as string) ?? 'company');
        setEmail((d.email as string) ?? '');
        setPhone((d.phone as string) ?? '');
        setGstin((d.gstin as string) ?? '');
        const addr = (d.address as Record<string, string>) ?? {};
        setLine1(addr.line1 ?? '');
        setCity(addr.city ?? '');
        setPincode(addr.pincode ?? '');
        const stateName = addr.state ?? '';
        const state = INDIAN_STATES.find((s) => s.name === stateName || s.code === (addr.state_code ?? ''));
        if (state) setStateCode(state.code);
        setCreditLimit(d.credit_limit != null ? String(d.credit_limit) : '');
        setSegment((d.segment as string) ?? '');
        setTagsText(Array.isArray(d.tags) ? (d.tags as string[]).join(', ') : '');
        setContacts(parseContacts(d.contacts));
      }
    });
  }, [id]);

  const updateContact = (index: number, field: keyof ContactPerson, value: string) => {
    setContacts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addContact = () => setContacts((prev) => [...prev, emptyContact()]);
  const removeContact = (index: number) => {
    if (contacts.length <= 1) return;
    setContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const runValidation = (): boolean => {
    const err: Record<string, string> = {};
    const phoneErr = validatePhone(phone);
    if (phoneErr) err.phone = phoneErr;
    const emailErr = validateEmail(email);
    if (emailErr) err.email = emailErr;
    const pincodeErr = validatePincode(pincode);
    if (pincodeErr) err.pincode = pincodeErr;
    const gstinErr = validateGstin(gstin);
    if (gstinErr) err.gstin = gstinErr;
    contacts.forEach((c, i) => {
      if (c.phone) { const msg = validatePhone(c.phone); if (msg) err[`contact_${i}`] = msg; }
      if (c.email) { const msg = validateEmail(c.email); if (msg) err[`contact_${i}`] = (err[`contact_${i}`] ? err[`contact_${i}`] + ' ' : '') + msg; }
    });
    setFieldErrors(err);
    return Object.keys(err).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (!runValidation()) {
      setError('Please fix the errors below.');
      return;
    }
    setLoading(true);
    const stateName = INDIAN_STATES.find((s) => s.code === stateCode)?.name ?? stateCode;
    const body: Record<string, unknown> = {
      name: name.trim(),
      entity_type: entityType,
      email: email.trim() || undefined,
      phone: phone.replace(/\D/g, '') || undefined,
      gstin: gstin.trim() || undefined,
      address: { line1: line1.trim() || undefined, city: city || undefined, state: stateName, state_code: stateCode || undefined, pincode: pincode.trim() || undefined },
      segment: segment.trim() || undefined,
      contacts: contacts
        .filter((c) => c.name.trim())
        .map((c) => ({
          name: c.name.trim(),
          email: c.email.trim() || undefined,
          phone: c.phone.replace(/\D/g, '') || undefined,
          department: c.department || 'other',
        })),
    };
    if (creditLimit !== '') body.credit_limit = parseFloat(creditLimit) || 0;
    if (tagsText.trim()) body.tags = tagsText.split(',').map((t) => t.trim()).filter(Boolean);
    const { error: err } = await apiPatch(`crm/customers/${id}`, body);
    setLoading(false);
    if (err) setError(err);
    else router.push('/crm/customers');
  };

  if (loadErr) return <div className="p-4 text-red-600">{loadErr}</div>;

  return (
    <div>
      <Link href="/crm/customers" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Customers</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Edit customer</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <form onSubmit={submit} className="max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Entity type</label>
          <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white">
            {ENTITY_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm ${fieldErrors.email ? 'border-red-500' : 'border-slate-300'}`} />
          {fieldErrors.email && <p className="mt-0.5 text-xs text-red-600">{fieldErrors.email}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm ${fieldErrors.phone ? 'border-red-500' : 'border-slate-300'}`} maxLength={15} />
          {fieldErrors.phone && <p className="mt-0.5 text-xs text-red-600">{fieldErrors.phone}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">GSTIN</label>
          <input type="text" value={gstin} onChange={(e) => setGstin(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm uppercase ${fieldErrors.gstin ? 'border-red-500' : 'border-slate-300'}`} maxLength={15} />
          {fieldErrors.gstin && <p className="mt-0.5 text-xs text-red-600">{fieldErrors.gstin}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Address line 1</label>
          <input type="text" value={line1} onChange={(e) => setLine1(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
            <select value={stateCode} onChange={(e) => { setStateCode(e.target.value); setCity(''); }} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white">
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white" disabled={!stateCode}>
              <option value="">Select city</option>
              {city && !cities.includes(city) && <option value={city}>{city}</option>}
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {stateCode && cities.length === 0 && <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Enter city name" />}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Pincode</label>
          <input type="text" value={pincode} onChange={(e) => setPincode(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm ${fieldErrors.pincode ? 'border-red-500' : 'border-slate-300'}`} maxLength={6} inputMode="numeric" />
          {fieldErrors.pincode && <p className="mt-0.5 text-xs text-red-600">{fieldErrors.pincode}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Credit limit</label>
          <input type="number" step="0.01" min={0} value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Segment</label>
          <input type="text" value={segment} onChange={(e) => setSegment(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tags (comma-separated)</label>
          <input type="text" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="e.g. vip, enterprise" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h3 className="font-semibold text-slate-900 mb-2">Contact persons</h3>
          <p className="text-xs text-slate-500 mb-3">Add people linked to this customer (e.g. account, purchase, sales).</p>
          {contacts.map((c, i) => (
            <div key={i} className="mb-4 p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600">Contact {i + 1}</span>
                {contacts.length > 1 && (
                  <button type="button" onClick={() => removeContact(i)} className="text-red-600 hover:text-red-700 p-1" aria-label="Remove contact">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" value={c.name} onChange={(e) => updateContact(i, 'name', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Name" />
                <select value={c.department} onChange={(e) => updateContact(i, 'department', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white">
                  {CONTACT_DEPARTMENTS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
                <input type="email" value={c.email} onChange={(e) => updateContact(i, 'email', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Email" />
                <input type="tel" value={c.phone} onChange={(e) => updateContact(i, 'phone', e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Phone" maxLength={15} />
              </div>
              {fieldErrors[`contact_${i}`] && <p className="text-xs text-red-600">{fieldErrors[`contact_${i}`]}</p>}
            </div>
          ))}
          <button type="button" onClick={addContact} className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium">
            <Plus className="h-4 w-4" /> Add contact
          </button>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Save</button>
          <Link href="/crm/customers" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
