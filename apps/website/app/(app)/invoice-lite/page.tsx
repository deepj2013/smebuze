'use client';

import Link from 'next/link';
import { FileText, Receipt, Users, Boxes, PhoneCall, PlusCircle } from 'lucide-react';
import { LITE } from '@/lib/invoice-lite-copy';

function BigTile({
  href,
  icon: Icon,
  title,
  hint,
  accent,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  accent?: 'brand' | 'slate';
}) {
  const bg = accent === 'brand' ? 'bg-brand-600 hover:bg-brand-700 text-white border-brand-700' : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200';
  const sub = accent === 'brand' ? 'text-brand-100' : 'text-slate-500';
  return (
    <Link
      href={href}
      className={`flex min-h-[88px] flex-col justify-center rounded-2xl border-2 px-5 py-4 shadow-sm transition active:scale-[0.98] ${bg}`}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-8 w-8 shrink-0 opacity-90" aria-hidden />
        <div>
          <div className="text-lg font-semibold leading-tight">{title}</div>
          <div className={`text-sm mt-0.5 ${sub}`}>{hint}</div>
        </div>
      </div>
    </Link>
  );
}

export default function InvoiceLiteHomePage() {
  return (
    <div className="mx-auto max-w-lg pb-8">
      <h1 className="text-2xl font-bold text-slate-900">Billing desk</h1>
      <p className="mt-1 text-slate-600 text-sm">Simple steps — big buttons. Estimates, follow-up, then bill.</p>

      <div className="mt-6 grid gap-3">
        <BigTile href="/invoice-lite/quotes/new" icon={PlusCircle} title={LITE.newEstimate.en} hint={LITE.newEstimate.hi} accent="brand" />
        <BigTile href="/invoice-lite/quotes" icon={FileText} title={LITE.estimates.en} hint={LITE.estimates.hi} />
        <BigTile href="/invoice-lite/follow-ups" icon={PhoneCall} title={LITE.followUps.en} hint={LITE.followUps.hi} />
        <BigTile href="/sales/invoices/new" icon={Receipt} title={LITE.newBill.en} hint={LITE.newBill.hi} accent="brand" />
        <BigTile href="/sales/invoices" icon={FileText} title={LITE.bills.en} hint={LITE.bills.hi} />
        <div className="grid grid-cols-2 gap-3">
          <BigTile href="/crm/customers" icon={Users} title={LITE.customers.en} hint={LITE.customers.hi} />
          <BigTile href="/inventory/items" icon={Boxes} title={LITE.workItems.en} hint={LITE.workItems.hi} />
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-slate-500">
        <Link href="/organization/branding" className="underline">Bill look</Link>
        {' · '}
        <Link href="/organization/printers" className="underline">Printer</Link>
        {' · '}
        <Link href="/help" className="underline">Help</Link>
      </p>
    </div>
  );
}
