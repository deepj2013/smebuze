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
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-brand-700">SMEBUZZ</Link>
          <Link href="/" className="text-sm text-slate-600 hover:text-brand-600">Back to home</Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Sign in</h1>
          <p className="text-slate-600 text-sm mb-6">
            Enter your business email and password to access your SMEBUZZ workspace.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@demo.com"
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
                placeholder="Password123"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Workspace slug (optional)</label>
              <input
                type="text"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="e.g. demo"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
              <p className="mt-1 text-xs text-slate-500">Ask your admin for the workspace slug if you’re joining a team.</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-600 text-white py-2.5 font-semibold hover:bg-brand-700 disabled:opacity-50"
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
              Don’t have an account? <Link href="/signup" className="text-brand-600 hover:underline">Sign up</Link>
              {' · '}
              Joining a team? <Link href="/join" className="text-brand-600 hover:underline">Join workspace</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
