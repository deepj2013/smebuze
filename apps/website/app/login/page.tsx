'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { isPosBusinessType } from '@/lib/business-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type WorkspaceChoice = {
  slug: string;
  name: string;
  tenantId: string | null;
  isSuperAdmin: boolean;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaces, setWorkspaces] = useState<WorkspaceChoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function goAfterLogin(data: {
    user?: { isSuperAdmin?: boolean; tenantId?: string | null };
    tenant?: { slug?: string; settings?: { business_type?: string }; subscription_expired?: boolean };
  }) {
    if (data.user?.isSuperAdmin && !data.user?.tenantId) {
      router.push('/admin/tenants');
      return;
    }
    if (data.tenant?.subscription_expired) {
      router.push('/billing');
      return;
    }
    if (data.tenant?.slug === 'ice-crest' || data.tenant?.settings?.business_type === 'ice_crest') {
      router.push('/ice-crest/dashboard');
      return;
    }
    if (isPosBusinessType(data.tenant?.settings?.business_type)) {
      router.push('/pos');
      return;
    }
    router.push('/dashboard');
  }

  async function signIn(extra?: { tenantSlug?: string; platformAdmin?: boolean }) {
    setLoading(true);
    setError(null);
    try {
      const body: { email: string; password: string; tenantSlug?: string; platformAdmin?: boolean } = {
        email,
        password,
      };
      if (extra?.tenantSlug) body.tenantSlug = extra.tenantSlug;
      if (extra?.platformAdmin) body.platformAdmin = true;
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
          const slug =
            data.tenantSlug ||
            (typeof data.message === 'object' ? data.message?.tenantSlug : '') ||
            extra?.tenantSlug ||
            '';
          router.push(`/verify-email?email=${encodeURIComponent(em || email)}&slug=${encodeURIComponent(slug)}`);
          return;
        }
        const msg = typeof data.message === 'string' ? data.message : data.message?.message || data.error || `HTTP ${res.status}`;
        setError(msg);
        return;
      }
      if (Array.isArray(data.workspaces) && data.workspaces.length > 1 && !data.access_token) {
        setWorkspaces(data.workspaces);
        return;
      }
      if (data.access_token) {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('smebuzz_token', data.access_token);
          window.localStorage.setItem('smebuzz_user', JSON.stringify(data.user ?? {}));
        }
        goAfterLogin(data);
        return;
      }
      setError('Unexpected response from server.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network or server error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await signIn();
  }

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between min-h-[44px]">
          <Link href="/" className="text-lg sm:text-xl font-bold text-brand-700 min-h-[44px] flex items-center">SMEBUZZ</Link>
          <Link href="/" className="text-sm text-slate-600 hover:text-brand-600 py-2 px-1 min-h-[44px] inline-flex items-center">Back to home</Link>
        </div>
      </header>
      <main id="main" className="flex-1 flex items-center justify-center p-4 sm:p-6" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-5 sm:p-8">
          {workspaces ? (
            <>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Choose a workspace</h1>
              <p className="text-slate-600 text-sm mb-6">
                This email is in more than one workspace. Pick the one you want to open.
              </p>
              <div className="space-y-2">
                {workspaces.map((ws) => (
                  <button
                    key={ws.tenantId ?? 'platform'}
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      signIn(ws.isSuperAdmin ? { platformAdmin: true } : { tenantSlug: ws.slug })
                    }
                    className="w-full text-left rounded-lg border border-slate-200 px-4 py-3 hover:border-brand-400 hover:bg-brand-50 disabled:opacity-50 min-h-[52px]"
                  >
                    <span className="block font-semibold text-slate-900">{ws.name}</span>
                    {ws.slug ? <span className="block text-xs text-slate-500 mt-0.5">{ws.slug}</span> : null}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="mt-4 text-sm text-slate-500 hover:text-brand-600"
                onClick={() => {
                  setWorkspaces(null);
                  setError(null);
                }}
              >
                Use a different account
              </button>
            </>
          ) : (
            <>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Sign in</h1>
              <p className="text-slate-600 text-sm mb-6">
                Use the email and password for your account. We open the matching workspace for you.
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
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-brand-600 text-white py-3 sm:py-2.5 font-semibold hover:bg-brand-700 disabled:opacity-50 min-h-[48px] text-base"
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            </>
          )}
          {error && (
            <div className="mt-6 p-4 rounded-lg bg-red-50 text-red-800 text-sm">
              <p className="font-medium">{error}</p>
            </div>
          )}
          {!workspaces && (
            <div className="mt-6 space-y-2 text-center text-sm">
              <p>
                <Link href="/forgot-password" className="text-brand-600 hover:underline">Forgot password?</Link>
              </p>
              <p className="text-slate-500">
                Don’t have an account? <Link href="/signup" className="text-brand-600 hover:underline">Start a 7-day free trial</Link>
                {' · '}
                Joining a team? <Link href="/join" className="text-brand-600 hover:underline">Join workspace</Link>
              </p>
              <p className="text-xs text-slate-400">
                <Link href="/privacy" className="hover:underline">Privacy</Link>
                {' · '}
                <Link href="/terms" className="hover:underline">Terms</Link>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
