'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/pos/waiter', label: 'Waiter' },
  { href: '/pos/kitchen', label: 'Kitchen' },
  { href: '/pos', label: 'POS' },
  { href: '/pos/floor', label: 'Admin' },
];

export default function FloorSwitcher({ role }: { role?: string }) {
  const pathname = usePathname() || '';
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {TABS.map((t) => {
        const active = t.href === '/pos' ? pathname === '/pos' : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-full px-3.5 py-2 text-sm font-semibold min-h-[40px] inline-flex items-center ${
              active ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:border-brand-300'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
      {role ? (
        <span className="ml-auto text-xs font-semibold uppercase tracking-wide text-slate-500">{role} view</span>
      ) : null}
    </div>
  );
}
