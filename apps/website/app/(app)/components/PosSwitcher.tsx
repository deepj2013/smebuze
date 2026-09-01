'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/pos', label: 'Counter', match: (p: string) => p === '/pos' },
  { href: '/pos/manage', label: 'Manage shop', match: (p: string) => p.startsWith('/pos/manage') },
  { href: '/inventory/categories', label: 'Categories', match: (p: string) => p.startsWith('/inventory/categories') },
  { href: '/inventory/items', label: 'Items', match: (p: string) => p.startsWith('/inventory/items') },
  { href: '/inventory/stock', label: 'Stock', match: (p: string) => p.startsWith('/inventory/stock') },
  { href: '/sales/invoices', label: 'Bills', match: (p: string) => p.startsWith('/sales/invoices') },
];

export default function PosSwitcher() {
  const pathname = usePathname() || '';
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {TABS.map((t) => {
        const active = t.match(pathname);
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
    </div>
  );
}
