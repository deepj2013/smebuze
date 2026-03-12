'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slugFromUrl = searchParams.get('slug') ?? '';
  const tokenFromUrl = searchParams.get('token') ?? '';
  const [tenantSlug, setTenantSlug] = useState(slugFromUrl);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (slugFromUrl) setTenantSlug(slugFromUrl);
  }, [slugFromUrl]);

  async function handleAcceptInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!tokenFromUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/accept-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenFromUrl, password, name: name.trim() || undefined }),
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
      } else setError('Unexpected response.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug: tenantSlug.trim(),
          email: email.trim(),
          password,
          name: name.trim() || undefined,
        }),
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
      } else setError('Unexpected response.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  const isInviteFlow = !!tokenFromUrl;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-brand-700">SMEBUZZ</Link>
          <Link href="/login" className="text-sm text-slate-600 hover:text-brand-600">Sign in</Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {isInviteFlow ? 'Accept invite' : 'Join a workspace'}
          </h1>
          <p className="text-slate-600 text-sm mb-6">
            {isInviteFlow
              ? 'Set your password to join your team on SMEBUZZ.'
              : 'Your team invited you. Enter your workspace slug and create your account.'}
          </p>
          {isInviteFlow ? (
            <form onSubmit={handleAcceptInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Your name (optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-brand-600 text-white py-2.5 font-semibold hover:bg-brand-700 disabled:opacity-50"
              >
                {loading ? 'Joining…' : 'Join workspace'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Workspace slug</label>
                <input
                  type="text"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  placeholder="e.g. acme or demo"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">Ask your admin for the workspace slug if you don’t have it.</p>
              </div>
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Your name (optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-brand-600 text-white py-2.5 font-semibold hover:bg-brand-700 disabled:opacity-50"
              >
                {loading ? 'Joining…' : 'Join workspace'}
              </button>
            </form>
          )}
          {error && (
            <div className="mt-4 p-4 rounded-lg bg-red-50 text-red-800 text-sm">{error}</div>
          )}
          <p className="mt-6 text-center text-sm text-slate-500">
            Don’t have an account? <Link href="/signup" className="text-brand-600 hover:underline">Create a workspace</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-600">Loading…</p></div>}>
      <JoinForm />
    </Suspense>
  );
}
