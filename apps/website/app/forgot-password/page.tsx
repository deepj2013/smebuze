'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResetLink(null);
    try {
      const body = { email: email.trim() };
      const res = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || data.error || `HTTP ${res.status}`);
        return;
      }
      setSent(true);
      if (data.resetLink) setResetLink(data.resetLink);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network or server error');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetWithOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (otp.replace(/\D/g, '').length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setResetting(true);
    try {
      const body = {
        email: email.trim(),
        otp: otp.replace(/\D/g, '').slice(0, 6),
        newPassword,
      };
      const res = await fetch(`${API_URL}/api/v1/auth/reset-password-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || data.error || `HTTP ${res.status}`);
        return;
      }
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network or server error');
    } finally {
      setResetting(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="border-b border-slate-200 bg-white">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <Link href="/" className="text-xl font-bold text-brand-700">SMEBUZZ</Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h1>
            <p className="text-slate-600 text-sm mb-6">
              If an account exists, we sent a 6-digit code from <span className="font-medium text-slate-800">support@smebuze.com</span>. It is valid for 10 minutes. You can also use the 24-hour reset button in the same mail.
            </p>
            {resetLink && (
              <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-xs font-medium text-amber-800 mb-2">Mail was not sent (SMTP missing). Use this development link:</p>
                <a href={resetLink} className="text-sm text-brand-600 break-all hover:underline">{resetLink}</a>
              </div>
            )}
            <form onSubmit={handleResetWithOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">6-digit code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 text-center text-2xl tracking-[0.4em] font-semibold text-slate-900 focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-brand-500"
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>
              {error && <div className="p-3 rounded-lg bg-red-50 text-red-800 text-sm">{error}</div>}
              <button
                type="submit"
                disabled={resetting}
                className="w-full rounded-lg bg-brand-600 text-white py-2.5 font-semibold hover:bg-brand-700 disabled:opacity-50"
              >
                {resetting ? 'Updating…' : 'Set new password'}
              </button>
            </form>
            <Link href="/login" className="mt-4 block w-full text-center rounded-lg border border-slate-300 py-2.5 text-slate-700 hover:bg-slate-50">
              Back to sign in
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-brand-700">SMEBUZZ</Link>
          <Link href="/login" className="text-sm text-slate-600 hover:text-brand-600">Back to sign in</Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Forgot password?</h1>
          <p className="text-slate-600 text-sm mb-6">
            Enter your email. We will send a 6-digit code and a reset link from support@smebuze.com.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              />
            </div>
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-800 text-sm">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-600 text-white py-2.5 font-semibold hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send reset code'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
