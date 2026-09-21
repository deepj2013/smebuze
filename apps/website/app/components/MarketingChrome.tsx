'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { SITE_NAME } from '@/lib/site';

const HOME_LINKS = [
  { href: '#mission', label: 'Mission' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#who', label: 'Use cases' },
  { href: '#printing', label: 'Printing' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

export default function MarketingChrome({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const closeMenu = () => setMobileMenuOpen(false);
  const onHome = pathname === '/';
  const navLinks = HOME_LINKS.map((l) => ({
    ...l,
    href: onHome ? l.href : `/${l.href}`,
  }));

  return (
    <div className="min-h-screen bg-[#f7f8fa]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between min-h-[56px]">
          <Link href="/" className="text-lg sm:text-xl font-bold text-brand-700 font-display tracking-tight shrink-0">
            {SITE_NAME}
          </Link>
          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-600" aria-label="Primary">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-brand-700 transition-colors">
                {link.label}
              </a>
            ))}
            <Link href="/use-cases" className="hover:text-brand-700 transition-colors">
              All shops
            </Link>
            <Link href="/login" className="text-slate-600 hover:text-brand-700 transition-colors">
              Login
            </Link>
            <Link
              href="/signup"
              className="bg-brand-700 text-white px-4 py-2.5 rounded-lg hover:bg-brand-800 transition-all font-semibold"
            >
              Free trial
            </Link>
          </nav>
          <div className="flex lg:hidden items-center gap-2">
            <Link
              href="/signup"
              className="rounded-lg bg-brand-700 text-white px-4 py-2.5 text-sm font-semibold hover:bg-brand-800 min-h-[44px] inline-flex items-center justify-center"
            >
              Free trial
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2.5 -mr-2 rounded-lg text-slate-600 hover:bg-slate-100 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
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
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={closeMenu} aria-hidden />
          <div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-y-0 right-0 z-50 w-full max-w-[280px] bg-white shadow-2xl lg:hidden flex flex-col"
            style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <span className="font-bold text-brand-700 font-display">Menu</span>
              <button
                type="button"
                onClick={closeMenu}
                className="p-2 rounded-lg hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Mobile">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className="block rounded-xl px-4 py-3.5 text-slate-700 font-medium hover:bg-sky-50 hover:text-brand-800 min-h-[48px] flex items-center"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/use-cases"
                onClick={closeMenu}
                className="block rounded-xl px-4 py-3.5 text-slate-700 font-medium hover:bg-sky-50 min-h-[48px] flex items-center"
              >
                All shops
              </Link>
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
                className="mt-2 block rounded-xl px-4 py-3.5 bg-brand-700 text-white font-semibold text-center hover:bg-brand-800 min-h-[48px] flex items-center justify-center"
              >
                Start free trial
              </Link>
            </nav>
          </div>
        </>
      )}

      {children}

      <div
        className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white/95 backdrop-blur border-t border-slate-200 py-3 px-4"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <Link
          href="/signup"
          className="block w-full rounded-lg bg-brand-700 text-white py-3.5 text-center font-semibold shadow-md hover:bg-brand-800 min-h-[48px] flex items-center justify-center"
        >
          Start 7-day free trial
        </Link>
      </div>
      <div className="h-20 lg:h-0" />
    </div>
  );
}
