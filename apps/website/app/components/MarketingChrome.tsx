'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { SITE_NAME } from '@/lib/site';

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#who', label: 'Who it is for' },
  { href: '#printing', label: 'Printing' },
  { href: '#ai', label: 'AI' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#features', label: 'Features' },
  { href: '#future', label: 'Roadmap' },
];

export default function MarketingChrome({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between min-h-[56px]">
          <Link href="/" className="text-lg sm:text-xl font-bold text-brand-600 font-display tracking-tight shrink-0">
            {SITE_NAME}
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-brand-600 transition-colors">
                {link.label}
              </a>
            ))}
            <Link href="/login" className="text-slate-600 hover:text-brand-600 transition-colors">Login</Link>
            <Link href="/signup" className="bg-brand-600 text-white px-4 py-2.5 rounded-xl hover:bg-brand-700 transition-all shadow-md shadow-brand-500/20 font-semibold">
              Sign up
            </Link>
          </nav>
          <div className="flex md:hidden items-center gap-2">
            <Link href="/signup" className="rounded-xl bg-brand-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-brand-700 shadow-md min-h-[44px] inline-flex items-center justify-center">
              Sign up
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2.5 -mr-2 rounded-xl text-slate-600 hover:bg-slate-100 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={closeMenu} aria-hidden />
          <div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-y-0 right-0 z-50 w-full max-w-[280px] bg-white shadow-2xl md:hidden flex flex-col"
            style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <span className="font-bold text-brand-600 font-display">Menu</span>
              <button type="button" onClick={closeMenu} className="p-2 rounded-lg hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Mobile">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className="block rounded-xl px-4 py-3.5 text-slate-700 font-medium hover:bg-brand-50 hover:text-brand-700 min-h-[48px] flex items-center"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/login"
                onClick={closeMenu}
                className="block rounded-xl px-4 py-3.5 text-slate-700 font-medium hover:bg-slate-100 min-h-[48px] flex items-center border-t border-slate-100 mt-4"
              >
                Login
              </Link>
              <Link
                href="/signup"
                onClick={closeMenu}
                className="mt-2 block rounded-xl px-4 py-3.5 bg-brand-600 text-white font-semibold text-center hover:bg-brand-700 min-h-[48px] flex items-center justify-center"
              >
                Sign up
              </Link>
            </nav>
          </div>
        </>
      )}

      {children}

      <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white/95 backdrop-blur border-t border-slate-200 py-3 px-4" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <Link
          href="/signup"
          className="block w-full rounded-xl bg-brand-600 text-white py-3.5 text-center font-semibold shadow-lg hover:bg-brand-700 min-h-[48px] flex items-center justify-center"
        >
          Start 7-day free trial
        </Link>
      </div>
      <div className="h-20 md:h-0" />
    </div>
  );
}
