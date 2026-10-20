import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'SMEBUZE Mall',
  description: 'Shop from local stores on SMEBUZE. One seller per checkout.',
};

export default function MallLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/mall" className="text-lg font-semibold tracking-tight text-slate-900">
            SMEBUZE Mall
          </Link>
          <nav className="flex gap-4 text-sm text-slate-600">
            <Link href="/mall" className="hover:text-slate-900">Browse</Link>
            <Link href="/shops" className="hover:text-slate-900">All shops</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        Powered by SMEBUZE · Checkout is one shop at a time
      </footer>
    </div>
  );
}
