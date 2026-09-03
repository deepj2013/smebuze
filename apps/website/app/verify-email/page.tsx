'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { postLoginPath } from '@/lib/workspace-setup';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get('email') ?? '';
  const slugFromUrl = searchParams.get('slug') ?? '';

  const [email, setEmail] = useState(emailFromUrl);
  const tenantSlug = slugFromUrl;
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const otpClean = useMemo(() => otp.replace(/\D/g, '').slice(0, 6), [otp]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (otpClean.length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    try {
      const body: { email: string; otp: string; tenantSlug?: string; purpose: string } = {
        email: email.trim(),
        otp: otpClean,
        purpose: 'verify_email',
      };
      if (tenantSlug.trim()) body.tenantSlug = tenantSlug.trim();
      const res = await fetch(`${API_URL}/api/v1/auth/verify-otp`, {
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
        window.localStorage.setItem('smebuzz_token', data.access_token);
        window.localStorage.setItem('smebuzz_user', JSON.stringify(data.user ?? {}));
        router.push(postLoginPath(data));
        return;
      }
      setError('Unexpected response from server.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network or server error');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError('Enter your email first.');
      return;
    }
    setResending(true);
    try {
      const body: { email: string; tenantSlug?: string; purpose: string } = {
        email: email.trim(),
        purpose: 'verify_email',
      };
      if (tenantSlug.trim()) body.tenantSlug = tenantSlug.trim();
      const res = await fetch(`${API_URL}/api/v1/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || data.error || `HTTP ${res.status}`);
        return;
      }
      setInfo(data.message || 'If an account exists, a new code has been sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network or server error');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between min-h-[44px]">
          <Link href="/" className="text-lg sm:text-xl font-bold text-brand-700 min-h-[44px] flex items-center">SMEBUZE</Link>
          <Link href="/login" className="text-sm text-slate-600 hover:text-brand-600 py-2 px-1 min-h-[44px] inline-flex items-center">Back to sign in</Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-5 sm:p-8">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Confirm your email</h1>
          <p className="text-slate-600 text-sm mb-6">
            We sent a 6-digit code from <span className="font-medium text-slate-800">support@smebuze.com</span>. Enter it here to open your workspace.
          </p>
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-3 sm:py-2 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base min-h-[44px]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">6-digit code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                className="w-full rounded-lg border border-slate-300 px-3 py-3 text-center text-2xl tracking-[0.4em] font-semibold text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 min-h-[52px]"
                required
              />
            </div>
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-800 text-sm">{error}</div>}
            {info && <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-sm">{info}</div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-600 text-white py-3 font-semibold hover:bg-brand-700 disabled:opacity-50 min-h-[48px]"
            >
              {loading ? 'Confirming…' : 'Confirm email'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            Didn’t get the mail? Check spam, then{' '}
            <button type="button" onClick={handleResend} disabled={resending} className="text-brand-600 hover:underline disabled:opacity-50">
              {resending ? 'Sending…' : 'send a new code'}
            </button>
            .
          </p>
        </div>
      </main>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-600">Loading…</p></div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
