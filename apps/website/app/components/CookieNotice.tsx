'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const KEY = 'smebuzz_privacy_ok';

export default function CookieNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      setShow(!window.localStorage.getItem(KEY));
    } catch {
      setShow(false);
    }
  }, []);

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Privacy notice"
      className="fixed bottom-0 left-0 right-0 z-[60] border-t border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          We store your login on this device so you stay signed in. We do not use advertising cookies.
          See <Link href="/privacy" className="font-medium text-brand-700 underline">Privacy</Link> and{' '}
          <Link href="/cookies" className="font-medium text-brand-700 underline">Cookies</Link>.
        </p>
        <button
          type="button"
          className="shrink-0 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 min-h-[44px]"
          onClick={() => {
            try {
              window.localStorage.setItem(KEY, '1');
            } catch { /* ignore */ }
            setShow(false);
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}
