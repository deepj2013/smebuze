import type { ReactNode } from 'react';
import Link from 'next/link';
import SiteFooter from './SiteFooter';

export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-display font-bold text-brand-700">SMEBUZZ</Link>
          <Link href="/signup" className="text-sm font-semibold text-brand-700">Start trial</Link>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated {updated}</p>
        <div className="prose-legal mt-8 space-y-4 text-sm leading-relaxed text-slate-700">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
