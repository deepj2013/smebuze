'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPatch, apiUploadFile, getStaticUrl } from '@/lib/api';

export default function EditCompanyPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [gstin, setGstin] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [pincode, setPincode] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountName, setAccountName] = useState('');
  const [fssai, setFssai] = useState('');
  const [msme, setMsme] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ name?: string; legal_name?: string; gstin?: string; logo_url?: string | null; address?: Record<string, unknown>; bank_details?: Record<string, unknown> }>(`organization/companies/${id}`).then((res) => {
      if (res.error) setLoadErr(res.error);
      else if (res.data) {
        const d = res.data;
        setName(d.name ?? '');
        setLegalName((d.legal_name as string) ?? '');
        setGstin((d.gstin as string) ?? '');
        setLogoUrl(d.logo_url ?? null);
        const addr = (d.address as Record<string, string>) ?? {};
        setLine1(addr.line1 ?? '');
        setCity(addr.city ?? '');
        setStateVal(addr.state ?? '');
        setPincode(addr.pincode ?? '');
        setEmail(addr.email ?? '');
        setPhone(addr.phone ?? '');
        setFssai(addr.fssai ?? '');
        setMsme(addr.msme ?? '');
        const bank = (d.bank_details as Record<string, string>) ?? {};
        setBankName(bank.bank_name ?? '');
        setBankBranch(bank.branch ?? '');
        setAccountNo(bank.account_no ?? '');
        setIfsc(bank.ifsc ?? '');
        setAccountName(bank.account_name ?? '');
      }
    });
  }, [id]);

  const logoPreview = logoUrl ? getStaticUrl(logoUrl) : null;

  const onLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setError(null);
    const res = await apiUploadFile<{ logo_url?: string }>(`organization/companies/${id}/logo`, file);
    setLogoUploading(false);
    if (res.error) setError(res.error);
    else if (res.data?.logo_url) setLogoUrl(res.data.logo_url);
    e.target.value = '';
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await apiPatch(`organization/companies/${id}`, {
      name,
      legal_name: legalName || undefined,
      gstin: gstin || undefined,
      address: {
        line1: line1 || undefined,
        city,
        state: stateVal,
        pincode,
        email: email || undefined,
        phone: phone || undefined,
        fssai: fssai || undefined,
        msme: msme || undefined,
      },
      bank_details: {
        bank_name: bankName || undefined,
        branch: bankBranch || undefined,
        account_no: accountNo || undefined,
        ifsc: ifsc || undefined,
        account_name: accountName || undefined,
      },
    });
    setLoading(false);
    if (err) setError(err);
    else router.push('/organization/companies');
  };

  if (loadErr) return <div className="p-4 text-red-600">{loadErr}</div>;
  return (
    <div>
      <Link href="/organization/companies" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Companies</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Edit company</h1>
      <p className="mb-4 text-sm text-slate-500">
        Logo, company name, GSTIN, FSSAI, MSME, and bank details print on the tax invoice. Change them here whenever you need.
      </p>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <form onSubmit={submit} className="max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Name *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Legal name</label><input type="text" value={legalName} onChange={(e) => setLegalName(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">GSTIN</label><input type="text" value={gstin} onChange={(e) => setGstin(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Address line 1</label><input type="text" value={line1} onChange={(e) => setLine1(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">City</label><input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">State</label><input type="text" value={stateVal} onChange={(e) => setStateVal(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Pincode</label><input type="text" value={pincode} onChange={(e) => setPincode(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone</label><input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" /></div>
        </div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">FSSAI No.</label><input type="text" value={fssai} onChange={(e) => setFssai(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Printed on invoice" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">MSME No.</label><input type="text" value={msme} onChange={(e) => setMsme(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Printed on invoice" /></div>
        </div>
        <hr className="border-slate-200" />
        <p className="text-sm font-medium text-slate-700">Company logo (printed on invoices)</p>
        <div className="flex items-center gap-4">
          {logoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoPreview} alt="Company logo" className="h-14 w-14 rounded-lg border object-contain bg-white p-1" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-cyan-700 text-lg font-bold text-white">IC</div>
          )}
          <div>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onLogoChange} disabled={logoUploading} className="text-sm" />
            <p className="mt-1 text-xs text-slate-500">PNG, JPG, WEBP or SVG · max 2 MB. This logo appears at the top of the tax invoice.</p>
          </div>
        </div>
        <hr className="border-slate-200" />
        <p className="text-sm font-medium text-slate-700">Bank details (printed on invoices)</p>
        <div><label className="block text-sm text-slate-600 mb-1">Bank name</label><input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" /></div>
        <div><label className="block text-sm text-slate-600 mb-1">Branch</label><input type="text" value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" /></div>
        <div><label className="block text-sm text-slate-600 mb-1">Account holder&apos;s name</label><input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm text-slate-600 mb-1">Account no.</label><input type="text" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm text-slate-600 mb-1">IFSC</label><input type="text" value={ifsc} onChange={(e) => setIfsc(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" /></div>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Save</button>
          <Link href="/organization/companies" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
