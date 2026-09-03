'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Check, Printer, Shield } from 'lucide-react';
import { postLoginPath } from '@/lib/workspace-setup';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type WorkspaceChoice = {
  slug: string;
  name: string;
  tenantId: string | null;
  isSuperAdmin: boolean;
};

type LoginPayload = {
  access_token?: string;
  user?: { isSuperAdmin?: boolean; tenantId?: string | null };
  tenant?: { slug?: string; settings?: { business_type?: string }; subscription_expired?: boolean };
  workspaces?: WorkspaceChoice[];
};

const ERRORS: Record<string, string> = {
  google_denied: 'Google sign-in was cancelled.',
  google_off: 'Google sign-in is not configured yet.',
  google_failed: 'Google sign-in failed. Try email and password, or try again.',
  no_account: 'No SMEBUZZ workspace uses this Google account. Start a 7-day trial, or sign in with email.',
};

function GoogleMark() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.55-5.17 3.55-8.65Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.72-2.47 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4-3.09Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.45-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.62l4 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaces, setWorkspaces] = useState<WorkspaceChoice[] | null>(null);
  const [googleTicket, setGoogleTicket] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function goAfterLogin(data: LoginPayload) {
    router.push(postLoginPath(data));
  }

  function storeSession(data: LoginPayload) {
    if (!data.access_token) return false;
    window.localStorage.setItem('smebuzz_token', data.access_token);
    window.localStorage.setItem('smebuzz_user', JSON.stringify(data.user ?? {}));
    goAfterLogin(data);
    return true;
  }

  useEffect(() => {
    fetch(`${API_URL}/api/v1/auth/google/status`)
      .then((r) => r.json())
      .then((d) => setGoogleEnabled(d?.enabled === true))
      .catch(() => setGoogleEnabled(false));
  }, []);

  useEffect(() => {
    const qError = searchParams.get('error');
    if (qError && ERRORS[qError]) setError(ERRORS[qError]);
    const prefill = searchParams.get('email');
    if (prefill) setEmail(prefill);

    const ticket = searchParams.get('google_ticket');
    if (ticket) {
      setGoogleTicket(ticket);
      setLoading(true);
      fetch(`${API_URL}/api/v1/auth/google/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket }),
      })
        .then(async (res) => {
          const data = (await res.json().catch(() => ({}))) as LoginPayload;
          if (!res.ok) {
            setError(typeof data === 'object' && data && 'message' in data ? String((data as { message?: string }).message) : 'Google sign-in expired. Try again.');
            return;
          }
          if (Array.isArray(data.workspaces) && data.workspaces.length > 1 && !data.access_token) {
            setWorkspaces(data.workspaces);
            return;
          }
          storeSession(data);
        })
        .catch(() => setError('Google sign-in failed. Try again.'))
        .finally(() => setLoading(false));
    }

    if (typeof window === 'undefined') return;
    const raw = window.location.hash.startsWith('#g=') ? decodeURIComponent(window.location.hash.slice(3)) : '';
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as LoginPayload;
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      storeSession(data);
    } catch {
      setError('Could not finish Google sign-in. Try again.');
    }
  }, [searchParams, router]);

  async function signIn(extra?: { tenantSlug?: string; platformAdmin?: boolean }) {
    setLoading(true);
    setError(null);
    try {
      if (googleTicket) {
        const body: { ticket: string; tenantSlug?: string; platformAdmin?: boolean } = { ticket: googleTicket };
        if (extra?.tenantSlug) body.tenantSlug = extra.tenantSlug;
        if (extra?.platformAdmin) body.platformAdmin = true;
        const res = await fetch(`${API_URL}/api/v1/auth/google/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => ({}))) as LoginPayload & { message?: string };
        if (!res.ok) {
          setError(typeof data.message === 'string' ? data.message : `HTTP ${res.status}`);
          return;
        }
        if (storeSession(data)) return;
        setError('Unexpected response from server.');
        return;
      }

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
      if (storeSession(data)) return;
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
    <div className="min-h-dvh bg-slate-950 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex-1 grid lg:grid-cols-2">
        <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden px-12 py-10 text-white">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-700 via-brand-700 to-slate-950" />
          <div className="absolute -top-24 -left-16 h-80 w-80 rounded-full bg-sky-300/30 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.08)_1px,transparent_1px)] bg-[size:28px_28px] opacity-40" />
          <div className="relative">
            <Link href="/" className="font-display text-2xl font-bold tracking-tight">
              SMEBUZZ
            </Link>
            <h1 className="mt-16 font-display text-4xl font-bold leading-tight max-w-md">
              GST bills, stock and accounts from one login.
            </h1>
            <p className="mt-4 text-sky-100/90 max-w-md text-base leading-relaxed">
              Print on the USB, Wi-Fi or Bluetooth printer you already own. 7-day trial, no card.
            </p>
            <ul className="mt-10 space-y-3 text-sm text-sky-50">
              {[
                { icon: Printer, text: 'Invoices that come out of the counter printer' },
                { icon: Shield, text: 'Roles, GSTIN and a workspace per company' },
                { icon: Check, text: 'Leads, stock, purchase and books together' },
              ].map((item) => (
                <li key={item.text} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                    <item.icon className="h-4 w-4" />
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
          <p className="relative text-xs text-sky-200/70">Made for Indian MSMEs · smebuze.com</p>
        </aside>

        <main id="main" className="flex flex-col bg-slate-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
            <Link href="/" className="text-lg font-bold text-brand-700 font-display">SMEBUZZ</Link>
            <Link href="/" className="text-sm text-slate-600 hover:text-brand-600 py-2">Home</Link>
          </header>
          <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-md">
              <div className="hidden lg:flex justify-end mb-6">
                <Link href="/" className="text-sm text-slate-500 hover:text-brand-600">← Back to home</Link>
              </div>
              <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/80 border border-slate-200/80 p-6 sm:p-8">
                {workspaces ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Welcome back</p>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900 font-display">Choose a workspace</h1>
                    <p className="text-slate-600 text-sm mt-2 mb-6">This Google or email login is in more than one workspace.</p>
                    <div className="space-y-2">
                      {workspaces.map((ws) => (
                        <button
                          key={ws.tenantId ?? 'platform'}
                          type="button"
                          disabled={loading}
                          onClick={() =>
                            signIn(ws.isSuperAdmin ? { platformAdmin: true } : { tenantSlug: ws.slug })
                          }
                          className="w-full text-left rounded-xl border border-slate-200 px-4 py-3.5 hover:border-brand-400 hover:bg-brand-50 disabled:opacity-50 min-h-[52px] transition-colors"
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
                        setGoogleTicket(null);
                        setError(null);
                      }}
                    >
                      Use a different account
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">SMEBUZZ</p>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900 font-display">Sign in</h1>
                    <p className="text-slate-600 text-sm mt-2 mb-6">
                      Open the workspace that matches your email. Google works if that inbox already has a login.
                    </p>
                    {googleEnabled && (
                      <>
                        <a
                          href={`${API_URL}/api/v1/auth/google`}
                          className="w-full inline-flex items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 min-h-[48px] shadow-sm"
                        >
                          <GoogleMark />
                          Continue with Google
                        </a>
                        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
                          <span className="h-px flex-1 bg-slate-200" />
                          or email
                          <span className="h-px flex-1 bg-slate-200" />
                        </div>
                      </>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@company.com"
                          autoComplete="email"
                          className="w-full rounded-xl border border-slate-300 px-3 py-3 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base min-h-[44px]"
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
                          className="w-full rounded-xl border border-slate-300 px-3 py-3 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base min-h-[44px]"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-brand-600 text-white py-3 font-semibold hover:bg-brand-700 disabled:opacity-50 min-h-[48px] text-base shadow-md shadow-brand-600/20"
                      >
                        {loading ? 'Signing in…' : 'Sign in'}
                      </button>
                    </form>
                  </>
                )}
                {error && (
                  <div className="mt-5 p-3 rounded-xl bg-red-50 text-red-800 text-sm">{error}</div>
                )}
                {!workspaces && (
                  <div className="mt-6 space-y-2 text-center text-sm">
                    <p>
                      <Link href="/forgot-password" className="text-brand-600 hover:underline">Forgot password?</Link>
                    </p>
                    <p className="text-slate-500">
                      New shop? <Link href="/signup" className="text-brand-600 font-medium hover:underline">Start a 7-day free trial</Link>
                      <span className="mx-1">·</span>
                      <Link href="/join" className="text-brand-600 hover:underline">Join a team</Link>
                    </p>
                    <p className="text-xs text-slate-400 pt-2">
                      <Link href="/privacy" className="hover:underline">Privacy</Link>
                      {' · '}
                      <Link href="/terms" className="hover:underline">Terms</Link>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-slate-50 flex items-center justify-center text-slate-500">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
