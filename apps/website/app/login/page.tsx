'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body: { email: string; password: string; tenantSlug?: string } = { email, password };
      if (tenantSlug.trim()) body.tenantSlug = tenantSlug.trim();
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = data.code || (typeof data.message === 'object' ? data.message?.code : undefined);
        if (res.status === 403 && code === 'EMAIL_NOT_VERIFIED') {
          const em = data.email || (typeof data.message === 'object' ? data.message?.email : email);
          router.push(`/verify-email?email=${encodeURIComponent(em || email)}&slug=${encodeURIComponent(tenantSlug.trim())}`);
          return;
        }
        const msg = typeof data.message === 'string' ? data.message : data.message?.message || data.error || `HTTP ${res.status}`;
        setError(msg);
        return;
      }
      if (data.access_token) {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('smebuzz_token', data.access_token);
          window.localStorage.setItem('smebuzz_user', JSON.stringify(data.user ?? {}));
        }
        if (data.user?.isSuperAdmin && !data.user?.tenantId) {
          router.push('/admin/tenants');
          return;
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
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between min-h-[44px]">
          <Link href="/" className="text-lg sm:text-xl font-bold text-brand-700 min-h-[44px] flex items-center">SMEBUZZ</Link>
          <Link href="/" className="text-sm text-slate-600 hover:text-brand-600 py-2 px-1 min-h-[44px] inline-flex items-center">Back to home</Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-5 sm:p-8">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Sign in</h1>
          <p className="text-slate-600 text-sm mb-6">
            Open your workspace to raise invoices, check stock, and print from the printer you set up on this device.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
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
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-300 px-3 py-3 sm:py-2 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base min-h-[44px]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Workspace (optional)</label>
              <input
                type="text"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="your-workspace"
                autoComplete="off"
                className="w-full rounded-lg border border-slate-300 px-3 py-3 sm:py-2 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base min-h-[44px]"
              />
              <p className="mt-1 text-xs text-slate-500">Needed when your team has a shared workspace name.</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-600 text-white py-3 sm:py-2.5 font-semibold hover:bg-brand-700 disabled:opacity-50 min-h-[48px] text-base"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          {error && (
            <div className="mt-6 p-4 rounded-lg bg-red-50 text-red-800 text-sm">
              <p className="font-medium">{error}</p>
            </div>
          )}
          <div className="mt-6 space-y-2 text-center text-sm">
            <p>
              <Link href="/forgot-password" className="text-brand-600 hover:underline">Forgot password?</Link>
            </p>
            <p className="text-slate-500">
              Don’t have an account? <Link href="/signup" className="text-brand-600 hover:underline">Start a 7-day free trial</Link>
              {' · '}
              Joining a team? <Link href="/join" className="text-brand-600 hover:underline">Join workspace</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
