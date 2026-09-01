'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  FileText,
  BookMarked,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { apiPost } from '@/lib/api';

export const ICE_CREST_TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Ice Crest CRM',
    icon: Sparkles,
    body: 'This system helps your team track ice stock, convert enquiries into bills, record expenses, and see daily profit — all in one place.',
    tips: ['Use the left menu to move between Stock, Sales, CRM and Expenses.', 'Your login is tied to the Ice Crest tenant — data stays private to your factory.'],
  },
  {
    id: 'dashboard',
    title: 'Start at the dashboard',
    icon: LayoutDashboard,
    href: '/ice-crest/dashboard',
    body: 'The dashboard shows total sales, expenses, operating profit, SKU-wise stock, and a sales trend chart for the period you select.',
    tips: ['Use Today / This week / This month presets for quick review.', 'Low-stock alerts appear at the top when any SKU drops below reorder level.'],
  },
  {
    id: 'stock',
    title: 'Record stock movements',
    icon: Package,
    href: '/ice-crest/stock-movements',
    body: 'After production or purchase, post stock inward by ice SKU and size. Outward happens automatically when you invoice a customer order.',
    tips: ['Opening stock is recorded once at go-live.', 'Check Production plan before the next run to see tomorrow\'s requirement.'],
  },
  {
    id: 'sales',
    title: 'Enquiry → quotation → order → invoice',
    icon: FileText,
    href: '/crm/leads',
    body: 'Website and WhatsApp enquiries land in CRM Leads. Send a branded quotation, convert to order (stock reserved), then raise invoice (stock deducted).',
    tips: ['Print/download branded PDFs from Quotations and Invoices.', 'Track pending payments under Payment tracking.'],
  },
  {
    id: 'expenses',
    title: 'Log expenses & review profit',
    icon: BookMarked,
    href: '/ice-crest/expenses',
    body: 'Record transport, electricity, wages, packaging and other costs. These feed the expense breakdown and profit margin on your dashboard.',
    tips: ['Pick the correct expense category for accurate reports.', 'End each day by reviewing the dashboard numbers.'],
  },
  {
    id: 'setup',
    title: 'One-time setup',
    icon: Settings,
    href: '/organization/companies',
    body: 'Add your registered GSTIN, bank details and company logo under Organization → Company. Connect a USB, Wi-Fi or Bluetooth printer under Organization → Printers. Admins match WhatsApp templates under WhatsApp — other roles only send messages.',
    tips: ['Logo appears on printed invoices and quotations.', 'Printers: Organization → Printers. WhatsApp: admin matches template names; staff send from Campaigns.'],
  },
] as const;

type Props = {
  mode?: 'modal' | 'page';
  onComplete?: () => void;
  onDismiss?: () => void;
};

export default function IceCrestTutorial({ mode = 'modal', onComplete, onDismiss }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const current = ICE_CREST_TUTORIAL_STEPS[step];
  const Icon = current.icon;
  const isLast = step === ICE_CREST_TUTORIAL_STEPS.length - 1;

  const finish = async (goTo?: string) => {
    setFinishing(true);
    await apiPost('onboarding/complete', {});
    setFinishing(false);
    onComplete?.();
    if (goTo) router.push(goTo);
    else if (mode === 'modal') onDismiss?.();
  };

  const shell = mode === 'modal'
    ? 'fixed inset-0 z-[100] flex items-center justify-center p-4'
    : 'mx-auto max-w-2xl py-6';

  const card = mode === 'modal'
    ? 'relative w-full max-w-lg rounded-2xl border border-cyan-100 bg-white shadow-2xl'
    : 'rounded-2xl border bg-white shadow-sm';

  return (
    <div className={shell} role="dialog" aria-modal={mode === 'modal'} aria-labelledby="ic-tutorial-title">
      {mode === 'modal' && (
        <button
          type="button"
          onClick={() => void finish()}
          className="absolute inset-0 bg-slate-900/50"
          aria-label="Skip tutorial"
        />
      )}
      <div className={`${card} ${mode === 'modal' ? 'relative z-10' : ''}`}>
        <div className="rounded-t-2xl bg-gradient-to-r from-cyan-800 to-cyan-950 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">First-time guide</p>
              <h2 id="ic-tutorial-title" className="mt-1 text-xl font-bold">{current.title}</h2>
              <p className="mt-1 text-sm text-cyan-100">Step {step + 1} of {ICE_CREST_TUTORIAL_STEPS.length}</p>
            </div>
            {mode === 'modal' && (
              <button type="button" onClick={() => void finish()} className="rounded-lg p-1 hover:bg-white/10" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="mt-4 flex gap-1.5">
            {ICE_CREST_TUTORIAL_STEPS.map((s, i) => (
              <div key={s.id} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-800">
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-relaxed text-slate-700">{current.body}</p>
              {'href' in current && current.href && (
                <Link href={current.href} className="mt-2 inline-block text-sm font-medium text-cyan-700 hover:underline">
                  Open this screen →
                </Link>
              )}
              <ul className="mt-4 space-y-2">
                {current.tips.map((tip) => (
                  <li key={tip} className="flex gap-2 text-sm text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-600" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4">
          <button
            type="button"
            onClick={() => void finish('/ice-crest/guide')}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            Skip — open full guide
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            {!isLast ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-1 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={finishing}
                onClick={() => void finish('/ice-crest/dashboard')}
                className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800 disabled:opacity-50"
              >
                {finishing ? 'Saving…' : 'Start using CRM'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
