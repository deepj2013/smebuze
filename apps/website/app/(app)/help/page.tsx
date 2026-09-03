'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BookOpen, ChevronLeft, ChevronRight, CircleHelp, Printer, ScanLine, Store, Warehouse } from 'lucide-react';
import { businessTypeMeta, isPosBusinessType } from '@/lib/business-types';
import { apiGet } from '@/lib/api';

const TUTORIAL = [
  {
    id: 'home',
    title: 'This is your workspace',
    icon: Store,
    body: 'The left menu only shows what you switched on during setup. A shop opens on the billing counter. A trader opens on the dashboard.',
    tips: ['Change the shop type or menus anytime from Setup.', 'Help stays in the menu if you get stuck.'],
  },
  {
    id: 'stock',
    title: 'Add what you sell',
    icon: Warehouse,
    body: 'Create items with name, barcode, MRP and opening stock. On a phone, tap Scan to fill the barcode with the camera. A USB reader types into the barcode field.',
    tips: ['Department stores use categories as aisles (Grocery, Household, Apparel).', 'Receive stock when a supplier truck arrives — scan the pack, enter qty.'],
  },
  {
    id: 'bill',
    title: 'Take a bill',
    icon: ScanLine,
    body: 'At the counter, scan or tap items, take cash / UPI / card, and print. Walk-in customers are ready on day one for shops.',
    tips: ['USB/Bluetooth scanner: click search and scan.', 'Phone: tap Scan and point the camera at the pack.'],
  },
  {
    id: 'print',
    title: 'Connect your printer',
    icon: Printer,
    body: 'USB, Wi-Fi, internet/AirPrint or a pocket Bluetooth printer. If you skip this, the browser print dialog still works.',
    tips: ['Counter thermal printers usually use 80mm or 58mm paper.', 'Each computer or phone remembers its own printer.'],
    href: '/organization/printers',
  },
];

function HelpBody() {
  const search = useSearchParams();
  const guide = search.get('guide') === '1';
  const [step, setStep] = useState(0);
  const [shop, setShop] = useState<string>('retail_shop');

  useEffect(() => {
    apiGet<{ tenant?: { settings?: { business_type?: string } } }>('auth/me')
      .then((res) => {
        const t = res.data?.tenant?.settings?.business_type;
        if (typeof t === 'string') setShop(t);
      })
      .catch(() => undefined);
  }, []);

  const meta = businessTypeMeta(shop);
  const current = TUTORIAL[step];
  const Icon = current.icon;
  const pos = isPosBusinessType(shop);

  const manual = useMemo(
    () => [
      {
        id: 'start',
        title: 'Start here',
        body: pos
          ? `You are set up as ${meta.title}. Open Billing counter to sell. Manage shop to add products.`
          : `You are set up as ${meta.title}. Use Dashboard, then Customers and Invoices.`,
      },
      {
        id: 'inventory',
        title: 'Inventory',
        body: 'Items → Add item. Fill barcode (scan or type), category, MRP, sale price and opening stock. Stock → Receive to add quantity from a purchase.',
      },
      {
        id: 'pos',
        title: 'POS / bills',
        body: 'Scan barcode, tap the product, or search. Charge cash, UPI or card. Print the bill. Stock drops on sale for shops (not restaurants).',
      },
      {
        id: 'printers',
        title: 'Printers',
        body: 'Organization → Printers. Pick USB, Wi-Fi, internet or Bluetooth. Save paper size. You can still use the browser print box without adding a printer.',
      },
      {
        id: 'change',
        title: 'Change shop type or menus',
        body: 'Setup lets you pick restaurant, kirana, department store, trading or services, and which modules appear in the menu.',
      },
    ],
    [meta.title, pos],
  );

  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Help</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">Tutorial and manual</h1>
      <p className="mt-1 text-sm text-slate-600">Short walkthrough, or keep the written steps open while you work.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/help?guide=1" className={`rounded-full px-3 py-1.5 text-sm font-semibold ${guide ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
          Tutorial
        </Link>
        <Link href="/help" className={`rounded-full px-3 py-1.5 text-sm font-semibold ${!guide ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
          Manual
        </Link>
        <Link href="/onboarding" className="rounded-full px-3 py-1.5 text-sm font-semibold bg-white border border-slate-200 text-slate-700">
          Change shop / menus
        </Link>
      </div>

      {guide ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="bg-slate-900 px-5 py-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Step {step + 1} of {TUTORIAL.length}</p>
            <h2 className="mt-1 text-xl font-bold flex items-center gap-2">
              <Icon className="h-5 w-5" /> {current.title}
            </h2>
          </div>
          <div className="p-5">
            <p className="text-slate-700 leading-relaxed">{current.body}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {current.tips.map((t) => (
                <li key={t} className="flex gap-2">
                  <CircleHelp className="h-4 w-4 shrink-0 text-brand-600 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
            {current.href && (
              <Link href={current.href} className="mt-4 inline-flex text-sm font-semibold text-brand-700 hover:underline">
                Open this screen →
              </Link>
            )}
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                disabled={step === 0}
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              {step < TUTORIAL.length - 1 ? (
                <button type="button" onClick={() => setStep((s) => s + 1)} className="inline-flex items-center gap-1 rounded-lg bg-brand-600 text-white px-3 py-2 text-sm font-semibold">
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <Link href={pos ? '/pos' : '/dashboard'} className="rounded-lg bg-brand-600 text-white px-3 py-2 text-sm font-semibold">
                  Start working
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {manual.map((s) => (
            <section key={s.id} id={s.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-brand-700" />
                {s.title}
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  return (
    <Suspense fallback={<p className="text-slate-600">Loading help…</p>}>
      <HelpBody />
    </Suspense>
  );
}
