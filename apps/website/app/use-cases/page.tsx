import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import MarketingChrome from '../components/MarketingChrome';
import SiteFooter from '../components/SiteFooter';
import { PUBLIC_USE_CASE_GROUPS, PUBLIC_USE_CASES } from '@/lib/public-use-cases';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'GST Billing Use Cases for Indian Shops — Restaurant, Retail, Salon, Wholesale',
  description:
    'See how SMEBUZE helps dine-in restaurants, kirana, pharmacy, salon, clinic, coaching, trading and wholesale — with type-based GST billing, POS and stock.',
  keywords: [
    'restaurant POS India',
    'kirana billing software',
    'pharmacy POS software',
    'salon billing software',
    'wholesale GST software',
    'MSME use cases',
    'SMEBUZE',
  ],
  alternates: { canonical: `${SITE_URL}/use-cases` },
  openGraph: {
    title: `Shop use cases | ${SITE_NAME}`,
    description:
      'Every business type SMEBUZE opens — and how we help with GST bills, stock, floor and leads.',
    url: `${SITE_URL}/use-cases`,
    type: 'website',
    locale: 'en_IN',
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'SMEBUZE shop use cases',
  url: `${SITE_URL}/use-cases`,
  description:
    'How SMEBUZE GST billing software helps restaurants, retail shops, local services and trading desks in India.',
  isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
  mainEntity: PUBLIC_USE_CASES.map((u) => ({
    '@type': 'Service',
    name: `${u.title} GST workspace`,
    description: u.help,
    provider: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    areaServed: 'IN',
  })),
};

export default function UseCasesPage() {
  return (
    <MarketingChrome>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main id="main" className="bg-[#f7f8fa]">
        <header className="border-b border-slate-200 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Use cases</p>
            <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-slate-900 max-w-3xl leading-tight text-balance">
              How SMEBUZE helps every shop type we serve
            </h1>
            <p className="mt-4 max-w-2xl text-slate-600 text-base leading-relaxed">
              Indian MSMEs are not one product. A dine-in restaurant needs floor and kitchen. A kirana needs barcode
              POS. A trader needs quotations and godown. At signup we shape the workspace — then you print GST bills on
              the printer you already own.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-800 min-h-[44px]"
              >
                Start free trial
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/#mission"
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-brand-300 min-h-[44px]"
              >
                Read our mission
              </Link>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-14">
          {PUBLIC_USE_CASE_GROUPS.map((group) => (
            <section key={group.id} aria-labelledby={`group-${group.id}`}>
              <h2 id={`group-${group.id}`} className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                {group.label}
              </h2>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.items.map((b) => (
                  <article
                    key={b.id}
                    id={b.id}
                    className="rounded-xl border border-slate-200 bg-white p-6 scroll-mt-24"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-lg font-bold text-slate-900">{b.title}</h3>
                      <span className="text-[11px] font-medium text-brand-800 bg-sky-50 px-2 py-0.5 rounded shrink-0">
                        {b.tag}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600 leading-relaxed">{b.help}</p>
                    <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      What you get day one
                    </h4>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {b.gets.map((g) => (
                        <li
                          key={g}
                          className="text-[11px] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2 py-1"
                        >
                          {g}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="border-t border-slate-200 bg-white py-12 text-center px-4">
          <h2 className="font-display text-xl font-bold text-slate-900">Ready to open your shop type?</h2>
          <p className="mt-2 text-sm text-slate-600">7-day free trial · No card · GST-ready from day one</p>
          <Link
            href="/signup"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-700 px-6 py-3.5 text-sm font-semibold text-white hover:bg-brand-800 min-h-[48px]"
          >
            Create workspace
            <ChevronRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </MarketingChrome>
  );
}
