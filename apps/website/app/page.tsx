import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Building2,
  Check,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Package,
  Printer,
  Shield,
  ShoppingCart,
  SlidersHorizontal,
  User,
  Users,
  Bluetooth,
  Wifi,
  Usb,
  Globe,
  Smartphone,
} from 'lucide-react';
import MarketingChrome from './components/MarketingChrome';
import SiteFooter from './components/SiteFooter';
import CustomPlanEnquiry from './components/CustomPlanEnquiry';
import {
  SITE_DESCRIPTION,
  SITE_FAQS,
  SITE_KEYWORDS,
  SITE_MISSION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  SITE_VISION,
  SUPPORT_EMAIL,
} from '@/lib/site';
import { formatInr, monthlyOffer } from '@/lib/plans';
import { PUBLIC_USE_CASE_GROUPS } from '@/lib/public-use-cases';

export const metadata: Metadata = {
  title: {
    absolute: `${SITE_NAME} — GST Billing Software for Indian MSMEs | Free 7-Day Trial`,
  },
  description: SITE_DESCRIPTION,
  keywords: [...SITE_KEYWORDS],
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — GST billing for Indian shops & MSMEs`,
    description: SITE_DESCRIPTION,
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: `${SITE_NAME} GST billing software` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — GST billing for Indian MSMEs`,
    description: SITE_DESCRIPTION,
    images: ['/icons/icon-512.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en-IN',
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      email: SUPPORT_EMAIL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icons/icon-512.png` },
      areaServed: { '@type': 'Country', name: 'India' },
      slogan: SITE_TAGLINE,
    },
    {
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'INR',
        description: '7-day free trial, no card required',
        url: `${SITE_URL}/signup`,
      },
      featureList: [
        'GST invoices with HSN/SAC',
        'Restaurant floor, waiter and kitchen',
        'Retail and pharmacy POS',
        'Inventory and purchase',
        'USB, Wi-Fi and Bluetooth printing',
        'Type-based workspace for each shop',
      ],
      audience: { '@type': 'Audience', audienceType: 'Indian MSMEs and shops' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: SITE_FAQS.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    },
  ],
};

export default function Home() {
  return (
    <MarketingChrome>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main id="main">
        {/* Hero — brand first, one composition */}
        <section className="relative overflow-hidden border-b border-slate-200/80">
          <div className="absolute inset-0 bg-[linear-gradient(165deg,#0c4a6e_0%,#0369a1_42%,#0f172a_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(125,211,252,0.22),transparent_50%)]" />
          <div className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(to_right,rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.5)_1px,transparent_1px)] bg-[size:40px_40px]" />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 lg:pt-24 pb-16 sm:pb-24">
            <p className="font-display text-sm sm:text-base font-semibold tracking-[0.2em] uppercase text-sky-200/90">
              {SITE_NAME}
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-3xl sm:text-5xl lg:text-[3.25rem] font-bold text-white tracking-tight leading-[1.12] text-balance">
              GST billing software built around how Indian shops actually work.
            </h1>
            <p className="mt-5 max-w-2xl text-base sm:text-lg text-sky-100/95 leading-relaxed">
              {SITE_TAGLINE}. Start free for seven days. Print on the USB, Wi-Fi or Bluetooth printer you already own.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3.5 text-base font-semibold text-brand-900 hover:bg-sky-50 min-h-[52px] shadow-lg"
              >
                Start 7-day free trial
                <ChevronRight className="h-4 w-4" />
              </Link>
              <a
                href="#mission"
                className="inline-flex items-center justify-center rounded-lg border border-white/35 px-6 py-3.5 text-base font-semibold text-white hover:bg-white/10 min-h-[52px]"
              >
                Our mission
              </a>
            </div>
            <p className="mt-6 text-sm text-sky-200/80">
              For restaurants · kirana · pharmacy · salon · coaching · wholesale · and{' '}
              <Link href="/use-cases" className="underline decoration-sky-300/50 underline-offset-2 hover:text-white">
                every shop type we support
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Trust strip */}
        <section className="bg-white border-b border-slate-200" aria-label="Highlights">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-2 lg:grid-cols-4 gap-6 text-center sm:text-left">
            {[
              { k: '7 days', v: 'Full free trial — no card' },
              { k: 'GST + HSN', v: 'Invoices that match stock' },
              { k: 'Any printer', v: 'USB · Wi-Fi · Bluetooth' },
              { k: 'Your shop type', v: 'Only the menus you need' },
            ].map((s) => (
              <div key={s.k}>
                <p className="font-display text-lg sm:text-xl font-bold text-brand-800">{s.k}</p>
                <p className="mt-0.5 text-sm text-slate-600">{s.v}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Mission & vision */}
        <section id="mission" className="py-14 sm:py-20 bg-[#f7f8fa]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Vision &amp; mission</p>
            <h2 className="mt-3 font-display text-2xl sm:text-4xl font-bold text-slate-900 max-w-3xl leading-tight text-balance">
              Software that respects the person who wears every hat.
            </h2>
            <div className="mt-10 grid gap-8 lg:grid-cols-2">
              <article className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8">
                <h3 className="font-display text-lg font-bold text-brand-800">Our mission</h3>
                <p className="mt-3 text-slate-700 leading-relaxed text-base sm:text-[1.05rem]">{SITE_MISSION}</p>
                <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                  We ask how you sell at signup — dine-in floor, counter POS, or trading desk — then hide the clutter.
                  Staff see waiter or kitchen or till. You keep GST, day close and customers in one login.
                </p>
              </article>
              <article className="rounded-2xl bg-slate-900 text-white p-6 sm:p-8">
                <h3 className="font-display text-lg font-bold text-sky-200">Our vision</h3>
                <p className="mt-3 text-sky-50/95 leading-relaxed text-base sm:text-[1.05rem]">{SITE_VISION}</p>
                <p className="mt-4 text-sm text-slate-300 leading-relaxed">
                  Public pages, lead hubs and buyer catalogs grow with you — without forcing a one-size ERP on a
                  neighbourhood shop.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-14 sm:py-20 bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-center">How SMEBUZE works</h2>
            <p className="mt-3 text-slate-600 text-center max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
              You do not buy a giant ERP. You open a workspace for your shop type, connect the printer at the counter,
              and run the same flow you already know — with GST on the bill.
            </p>
            <ol className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  step: '01',
                  icon: User,
                  title: 'Choose your shop',
                  desc: 'Restaurant, kirana, pharmacy, salon, trading — signup opens only that shape of workspace.',
                },
                {
                  step: '02',
                  icon: Printer,
                  title: 'Connect your printer',
                  desc: 'USB, Wi-Fi, internet or Bluetooth thermal. Inkjet, laser or pocket bill printer.',
                },
                {
                  step: '03',
                  icon: Building2,
                  title: 'Run the real day',
                  desc: 'Floor to kitchen, counter to cash, or quotation to invoice — stock and customers stay together.',
                },
                {
                  step: '04',
                  icon: SlidersHorizontal,
                  title: 'Grow when ready',
                  desc: 'Add people, companies and packs later. Your data stays; the product stretches.',
                },
              ].map((item) => (
                <li key={item.step} className="relative">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-brand-800">
                    <item.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="mt-4 text-xs font-mono font-semibold text-brand-700">{item.step}</p>
                  <h3 className="mt-1 font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Use cases preview */}
        <section id="who" className="py-14 sm:py-20 bg-[#f7f8fa]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Use cases</p>
                <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-slate-900">
                  Built for the shops we can truly help
                </h2>
                <p className="mt-2 text-slate-600 max-w-xl text-sm sm:text-base">
                  Same product — opened the way you sell. Explore every type, or start with the groups below.
                </p>
              </div>
              <Link
                href="/use-cases"
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-800 hover:underline shrink-0"
              >
                Full use-case guide
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-10 space-y-10">
              {PUBLIC_USE_CASE_GROUPS.map((group) => (
                <div key={group.id}>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">{group.label}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.items.map((b) => (
                      <article
                        key={b.id}
                        className="rounded-xl border border-slate-200 bg-white p-5 hover:border-sky-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-slate-900">{b.title}</h4>
                          <span className="shrink-0 text-[11px] font-medium text-brand-800 bg-sky-50 px-2 py-0.5 rounded">
                            {b.tag}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600 leading-relaxed">{b.help}</p>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-6 py-3.5 text-sm font-semibold text-white hover:bg-brand-800 min-h-[48px]"
              >
                Choose your shop type
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Printing */}
        <section id="printing" className="py-14 sm:py-20 bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
              Printing for Indian counters
            </p>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-slate-900 text-center">
              The bill has to come out of the machine you already own
            </h2>
            <p className="mt-3 text-slate-600 text-center max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
              SMEBUZE does not lock you to one brand. Add printers during the trial in Organization → Printers. Paper
              size is remembered per device — office laser and pocket Bluetooth can live side by side.
            </p>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Usb, title: 'USB / local', desc: 'Cable or OS-installed inkjet and laser at the desk.' },
                { icon: Wifi, title: 'Wi-Fi / LAN', desc: 'Same shop network — pick it when you print.' },
                { icon: Globe, title: 'Internet / AirPrint', desc: 'Another floor or branch over IPP / AirPrint.' },
                { icon: Bluetooth, title: 'Bluetooth mobile', desc: '58 mm / 80 mm thermal from the phone browser.' },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-[#f7f8fa] p-5">
                  <item.icon className="h-5 w-5 text-brand-800" aria-hidden />
                  <h3 className="mt-3 font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex items-start gap-3 rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-4 max-w-3xl mx-auto">
              <Smartphone className="h-5 w-5 text-brand-800 shrink-0 mt-0.5" aria-hidden />
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong className="text-slate-900">On a phone:</strong> open SMEBUZE, go to Printers, pair Bluetooth or
                pick Wi-Fi / AirPrint. Each device keeps its own default so the counter phone does not steal the accounts
                laser.
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-14 sm:py-20 bg-[#f7f8fa]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-center">
              What you actually get
            </h2>
            <p className="mt-2 text-slate-600 text-center max-w-2xl mx-auto text-sm sm:text-base">
              Live modules for GST billing, stock and customers — switch on more as you grow.
            </p>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  module: 'CRM & follow-ups',
                  icon: Users,
                  items: ['Leads & customers', 'Follow-up board', 'Website enquiry capture', 'Lead hub by source'],
                },
                {
                  module: 'GST-ready sales',
                  icon: FileText,
                  items: ['Quotation → invoice', 'HSN/SAC & tax', 'Print on any printer', 'Credit notes'],
                },
                {
                  module: 'Purchase & stock',
                  icon: Package,
                  items: ['Vendors & GRN', 'Warehouses', 'Stock on sale (POS)', 'Day & ageing reports'],
                },
                {
                  module: 'Shop floor (restaurants)',
                  icon: LayoutDashboard,
                  items: ['Tables & floor', 'Waiter orders', 'Kitchen tickets', 'Counter bill'],
                },
                {
                  module: 'Purchase & payables',
                  icon: ShoppingCart,
                  items: ['Purchase orders', 'Vendor bills', 'Payables ageing', 'TDS-ready payments'],
                },
                {
                  module: 'Your workspace',
                  icon: Shield,
                  items: ['Roles & permissions', 'Companies as you grow', 'Tenant-private data', 'Industry packs'],
                },
              ].map((block) => (
                <div key={block.module} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-sky-100 p-2 text-brand-800">
                      <block.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <h3 className="font-semibold text-slate-900">{block.module}</h3>
                  </div>
                  <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                    {block.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 mt-1 text-brand-600 shrink-0" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-14 sm:py-20 bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Pricing</p>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-slate-900 text-center">
              Start free. Upgrade when the shop is ready.
            </h2>
            <p className="mt-3 text-slate-600 text-center max-w-2xl mx-auto text-sm sm:text-base">
              Every workspace begins with a full 7-day trial — no card. Pay yearly and save another 15%. Need a custom
              pack? Write to us.
            </p>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  id: 'basic',
                  name: 'Starter',
                  badge: 'For you',
                  desc: 'One user. One company. The desk to run sales and stock.',
                  features: [
                    '1 company, 1 user',
                    'CRM, GST invoices, stock',
                    'USB / Wi-Fi / Bluetooth print',
                    'Dashboard & reports',
                  ],
                  cta: 'Start free trial',
                  highlight: false,
                },
                {
                  id: 'advanced',
                  name: 'Growth',
                  badge: 'Most chosen',
                  desc: 'When the team joins and the pipeline gets busy.',
                  features: [
                    'Up to 3 companies, 5 users',
                    'Everything in Starter',
                    'Campaigns & challans',
                    'Bulk upload & priority support',
                  ],
                  cta: 'Upgrade to Growth',
                  highlight: true,
                },
                {
                  id: 'enterprise',
                  name: 'Business',
                  badge: 'Scale',
                  desc: 'More companies, books and roles that match the floor.',
                  features: [
                    'Up to 10 companies, 25 users',
                    'P&L, balance sheet, bank rec',
                    'Custom roles & audit',
                    'Dedicated onboarding',
                  ],
                  cta: 'Go Business',
                  highlight: false,
                },
                {
                  id: 'custom',
                  name: 'Custom',
                  badge: 'Your shape',
                  desc: 'Industry pack, seats and modules around your process.',
                  features: [
                    'Users & companies you need',
                    'Modules on or off',
                    'WhatsApp & AI options',
                    'We set it up with you',
                  ],
                  cta: 'Customise with us',
                  highlight: false,
                  custom: true,
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-xl border p-5 bg-white ${
                    plan.highlight ? 'border-brand-600 shadow-md ring-1 ring-brand-600/20' : 'border-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                      plan.highlight ? 'bg-sky-100 text-brand-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {plan.badge}
                  </span>
                  <h3 className="mt-3 text-xl font-bold text-slate-900 font-display">{plan.name}</h3>
                  <p className="mt-1 text-slate-600 text-sm min-h-[2.5rem]">{plan.desc}</p>
                  <p className="mt-4 font-display font-bold text-slate-900">
                    {plan.custom ? (
                      <span className="text-2xl">Let’s talk</span>
                    ) : (
                      <>
                        <span className="text-3xl">{formatInr(monthlyOffer(plan.id)!.sale)}</span>
                        <span className="text-base font-normal text-slate-500">/month</span>
                      </>
                    )}
                  </p>
                  {!plan.custom && monthlyOffer(plan.id) && (
                    <p className="mt-1 text-sm">
                      <span className="line-through text-slate-400">{formatInr(monthlyOffer(plan.id)!.list)}</span>
                      <span className="ml-2 font-semibold text-emerald-700">
                        {monthlyOffer(plan.id)!.discount_percent}% off
                      </span>
                    </p>
                  )}
                  <ul className="mt-5 space-y-2 text-sm text-slate-600 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 shrink-0 text-brand-600" aria-hidden />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.custom ? '/custom-plan' : `/signup?plan=${plan.id}`}
                    className={`mt-6 block w-full rounded-lg py-3 text-center font-semibold min-h-[48px] flex items-center justify-center ${
                      plan.highlight
                        ? 'bg-brand-700 text-white hover:bg-brand-800'
                        : plan.custom
                          ? 'bg-slate-900 text-white hover:bg-slate-800'
                          : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-slate-200 bg-[#f7f8fa] p-5 sm:p-8">
              <h3 className="font-display text-xl font-bold text-slate-900">Need a custom plan?</h3>
              <p className="mt-1 text-sm text-slate-600">
                Tell us seats, companies and modules. Message goes to the SMEBUZE team.
              </p>
              <div className="mt-5 max-w-xl">
                <CustomPlanEnquiry compact />
              </div>
            </div>
          </div>
        </section>

        {/* FAQ — organic SEO */}
        <section id="faq" className="py-14 sm:py-20 bg-[#f7f8fa]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-center">
              Frequently asked questions
            </h2>
            <p className="mt-2 text-center text-sm text-slate-600">
              Straight answers for shop owners comparing GST billing software in India.
            </p>
            <div className="mt-10 space-y-3">
              {SITE_FAQS.map((f) => (
                <details
                  key={f.question}
                  className="group rounded-xl border border-slate-200 bg-white open:shadow-sm"
                >
                  <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-slate-900 flex items-center justify-between gap-3">
                    <span>{f.question}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {f.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          id="contact"
          className="relative py-14 sm:py-20 text-white overflow-hidden"
          style={{ paddingBottom: 'max(3.5rem, env(safe-area-inset-bottom) + 1rem)' }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(165deg,#0c4a6e,#0369a1_55%,#0f172a)]" />
          <div className="relative max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="font-display text-2xl sm:text-3xl font-bold">Ready when your shop is</h2>
            <p className="mt-3 text-sky-100 text-sm sm:text-base leading-relaxed">
              Open a workspace free for 7 days. Pick your business type. Connect the printer. Upgrade seats later — or
              tell us your process and we customise it.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/signup?plan=basic"
                className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3.5 text-base font-semibold text-brand-900 hover:bg-sky-50 min-h-[52px]"
              >
                Start 7-day free trial
              </Link>
              <Link
                href="/use-cases"
                className="inline-flex items-center justify-center rounded-lg border border-white/40 px-6 py-3.5 text-base font-semibold text-white hover:bg-white/10 min-h-[52px]"
              >
                Browse use cases
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </MarketingChrome>
  );
}
