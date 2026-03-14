'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const PLANS = [
  { id: 'basic', name: 'Basic', price: '₹999/mo' },
  { id: 'advanced', name: 'Advanced', price: '₹2,499/mo' },
  { id: 'enterprise', name: 'Enterprise', price: '₹4,999/mo' },
  { id: 'ai_pro', name: 'AI Pro', price: '₹7,499/mo' },
];

const INTERVALS = [
  { id: 'monthly', name: 'Monthly' },
  { id: 'quarterly', name: 'Quarterly' },
  { id: 'yearly', name: 'Yearly' },
];

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planFromUrl = searchParams.get('plan') || 'basic';

  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState('');
  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState(planFromUrl);
  const [interval, setInterval] = useState('monthly');
  const [trial, setTrial] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const deriveSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

  const handleOrgNameChange = (v: string) => {
    setOrgName(v);
    if (!slug || slug === deriveSlug(orgName)) setSlug(deriveSlug(v));
  };

  const handleSubmitStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!orgName.trim()) {
      setError('Organisation name is required');
      return;
    }
    const s = deriveSlug(slug || orgName);
    if (s.length < 2) {
      setError('Workspace slug must be at least 2 characters');
      return;
    }
    setStep(2);
  };

  const handleSubmitStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setStep(3);
  };

  const handleSubmitStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body = {
        orgName: orgName.trim(),
        slug: (slug || deriveSlug(orgName)).trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
        email: email.trim(),
        password,
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        plan: plan || 'basic',
        interval: interval || 'monthly',
        trial: trial ? 'true' : undefined,
      };
      const res = await fetch(`${API_URL}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || data.error || `HTTP ${res.status}`);
        return;
      }
      if (data.access_token) {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('smebuzz_token', data.access_token);
          window.localStorage.setItem('smebuzz_user', JSON.stringify(data.user ?? {}));
        }
        router.push('/dashboard');
        return;
      }
      setError('Unexpected response from server.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network or server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between min-h-[44px]">
          <Link href="/" className="text-lg sm:text-xl font-bold text-brand-700 min-h-[44px] flex items-center">SMEBUZZ</Link>
          <Link href="/login" className="text-sm text-slate-600 hover:text-brand-600 py-2 px-1 min-h-[44px] inline-flex items-center">Already have an account? Log in</Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-5 sm:p-8">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Create your workspace</h1>
          <p className="text-slate-600 text-sm mb-6">
            {step === 1 && 'Set up your organisation and workspace URL.'}
            {step === 2 && 'Create your account.'}
            {step === 3 && 'Choose your plan. You can start with a free trial.'}
          </p>

          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${step >= s ? 'bg-brand-600' : 'bg-slate-200'}`}
              />
            ))}
          </div>

          {step === 1 && (
            <form onSubmit={handleSubmitStep1} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Organisation name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => handleOrgNameChange(e.target.value)}
                  placeholder="e.g. Acme Pvt Ltd"
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 sm:py-2 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base min-h-[44px]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Workspace slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. acme"
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 sm:py-2 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base min-h-[44px]"
                />
                <p className="mt-1 text-xs text-slate-500">Your workspace URL: app.smebuzz.com/{slug || deriveSlug(orgName) || '...'}</p>
              </div>
              <button type="submit" className="w-full rounded-lg bg-brand-600 text-white py-3 sm:py-2.5 font-semibold hover:bg-brand-700 min-h-[48px] text-base">
                Continue
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmitStep2} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 sm:py-2 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base min-h-[44px]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 sm:py-2 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base min-h-[44px]"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 sm:py-2 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base min-h-[44px]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Your name (optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 sm:py-2 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone (optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 sm:py-2 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base min-h-[44px]"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(1)} className="flex-1 rounded-lg border border-slate-300 py-3 sm:py-2.5 text-slate-700 hover:bg-slate-50 min-h-[48px]">
                  Back
                </button>
                <button type="submit" className="flex-1 rounded-lg bg-brand-600 text-white py-3 sm:py-2.5 font-semibold hover:bg-brand-700 min-h-[48px]">
                  Continue
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleSubmitStep3} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Plan</label>
                <div className="grid grid-cols-2 gap-2">
                  {PLANS.map((p) => (
                    <label
                      key={p.id}
                      className={`flex items-center justify-between rounded-lg border-2 p-3 cursor-pointer ${
                        plan === p.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input type="radio" name="plan" value={p.id} checked={plan === p.id} onChange={() => setPlan(p.id)} className="sr-only" />
                      <span className="font-medium text-slate-900">{p.name}</span>
                      <span className="text-xs text-slate-500">{p.price}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Billing interval</label>
                <div className="flex gap-2">
                  {INTERVALS.map((i) => (
                    <label
                      key={i.id}
                      className={`flex-1 rounded-lg border-2 py-2 text-center text-sm cursor-pointer ${
                        interval === i.id ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input type="radio" name="interval" value={i.id} checked={interval === i.id} onChange={() => setInterval(i.id)} className="sr-only" />
                      {i.name}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={trial} onChange={(e) => setTrial(e.target.checked)} className="rounded border-slate-300 text-brand-600" />
                <span className="text-sm text-slate-700">Start 14-day free trial (no payment now)</span>
              </label>
              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-800 text-sm">{error}</div>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(2)} className="flex-1 rounded-lg border border-slate-300 py-3 sm:py-2.5 text-slate-700 hover:bg-slate-50 min-h-[48px]">
                  Back
                </button>
                <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-brand-600 text-white py-3 sm:py-2.5 font-semibold hover:bg-brand-700 disabled:opacity-50 min-h-[48px]">
                  {loading ? 'Creating…' : 'Create workspace'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-600">Loading…</p></div>}>
      <SignupForm />
    </Suspense>
  );
}
