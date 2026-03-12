'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';

export default function EditVendorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ name?: string; email?: string; phone?: string; gstin?: string; address?: Record<string, unknown> }>(`purchase/vendors/${id}`).then((res) => {
      if (res.error) setLoadErr(res.error);
      else if (res.data) {
        const d = res.data as { name?: string; email?: string; phone?: string; gstin?: string; address?: Record<string, string> };
        setName(d.name ?? '');
        setEmail(d.email ?? '');
        setPhone(d.phone ?? '');
        setGstin(d.gstin ?? '');
        const addr = d.address ?? {};
        setLine1(addr.line1 ?? '');
        setCity(addr.city ?? '');
        setState(addr.state ?? '');
        setPincode(addr.pincode ?? '');
      }
    });
  }, [id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await apiPatch(`purchase/vendors/${id}`, {
      name,
      email: email || undefined,
      phone: phone || undefined,
      gstin: gstin || undefined,
      address: { line1: line1 || undefined, city, state, pincode },
    });
    setLoading(false);
    if (err) setError(err);
    else router.push('/purchase/vendors');
  };

  if (loadErr) return <div className="p-4 text-red-600">{loadErr}</div>;
  return (
    <div>
      <Link href="/purchase/vendors" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Vendors</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Edit vendor</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <form onSubmit={submit} className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">GSTIN</label>
          <input type="text" value={gstin} onChange={(e) => setGstin(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Address line 1</label>
          <input type="text" value={line1} onChange={(e) => setLine1(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
            <input type="text" value={state} onChange={(e) => setState(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Pincode</label>
          <input type="text" value={pincode} onChange={(e) => setPincode(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Save</button>
          <Link href="/purchase/vendors" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
