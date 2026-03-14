'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Rocket,
  Building2,
  Zap,
  TrendingUp,
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  Calculator,
  BarChart3,
  Plug,
  Sparkles,
  Shield,
  MessageCircle,
  FileText,
  Wallet,
  Bot,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#features', label: 'Features' },
  { href: '#future', label: 'Roadmap' },
];

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between min-h-[56px]">
          <Link href="/" className="text-lg sm:text-xl font-bold text-brand-600 font-display tracking-tight shrink-0">
            SMEBUZZ
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-brand-600 transition-colors">
                {link.label}
              </a>
            ))}
            <Link href="/login" className="text-slate-600 hover:text-brand-600 transition-colors">Login</Link>
            <Link href="/signup" className="bg-brand-600 text-white px-4 py-2.5 rounded-xl hover:bg-brand-700 transition-all shadow-md shadow-brand-500/20 font-semibold">
              Sign up
            </Link>
          </nav>

          {/* Mobile: hamburger + CTA */}
          <div className="flex md:hidden items-center gap-2">
            <Link href="/signup" className="rounded-xl bg-brand-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-brand-700 shadow-md min-h-[44px] inline-flex items-center justify-center">
              Sign up
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2.5 -mr-2 rounded-xl text-slate-600 hover:bg-slate-100 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={closeMenu} aria-hidden />
          <div
            className="fixed inset-y-0 right-0 z-50 w-full max-w-[280px] bg-white shadow-2xl md:hidden flex flex-col"
            style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <span className="font-bold text-brand-600 font-display">Menu</span>
              <button type="button" onClick={closeMenu} className="p-2 rounded-lg hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className="block rounded-xl px-4 py-3.5 text-slate-700 font-medium hover:bg-brand-50 hover:text-brand-700 min-h-[48px] flex items-center"
                >
                  {link.label}
                </a>
              ))}
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
                className="mt-2 block rounded-xl px-4 py-3.5 bg-brand-600 text-white font-semibold text-center hover:bg-brand-700 min-h-[48px] flex items-center justify-center"
              >
                Sign up
              </Link>
            </nav>
          </div>
        </>
      )}

      <main>
        {/* Hero — mobile-first, eye-catching */}
        <section className="relative overflow-hidden py-12 sm:py-20 lg:py-28">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-slate-50" />
          <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-brand-200/40 blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-brand-300/30 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-brand-100/20" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#94a3b8_0.5px,transparent_0.5px),linear-gradient(to_bottom,#94a3b8_0.5px,transparent_0.5px)] bg-[size:24px_24px] opacity-[0.03]" />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-brand-200/80 px-3 py-2 sm:px-4 sm:py-1.5 text-xs sm:text-sm font-semibold text-brand-700 shadow-md backdrop-blur-sm">
              <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="whitespace-nowrap">GST-ready · India-first · No card</span>
            </span>
            <h1 className="mt-5 sm:mt-6 font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight">
              Modular AI-Powered ERP for MSME
            </h1>
            <p className="mt-4 sm:mt-5 text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Configure only what you need. WhatsApp-first, multi-tenant ERP for manufacturing, trading, and services — India & Global Bharat.
            </p>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
              <Link
                href="/signup"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-4 sm:py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-700 transition-all min-h-[52px] sm:min-h-0"
              >
                Start free trial
                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-6 py-4 sm:py-3.5 text-base font-semibold text-slate-700 hover:border-brand-200 hover:bg-brand-50/50 transition-colors min-h-[52px] sm:min-h-0"
              >
                See how it works
              </a>
            </div>
            <div className="mt-5 sm:mt-6 flex flex-wrap justify-center gap-2 sm:gap-3">
              {['Multi-branch', '80+ features', 'Go live in a day'].map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100/80 px-3 py-1.5 text-xs font-medium text-slate-600">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Stats strip — mobile-friendly grid */}
        <section className="border-y border-slate-200/80 bg-white py-6 sm:py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 text-center">
              {[
                { value: '80+', label: 'Features across 11 modules' },
                { value: '200+', label: 'Dynamic reports' },
                { value: 'GST', label: 'Compliant out of the box' },
                { value: '1 day', label: 'To go live' },
              ].map((stat, i) => (
                <div key={i} className="rounded-xl bg-slate-50/80 sm:bg-transparent py-4 sm:py-0 sm:rounded-none">
                  <div className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-brand-600">{stat.value}</div>
                  <div className="mt-0.5 text-xs sm:text-sm text-slate-600 px-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-12 sm:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-center">How it works</h2>
            <p className="mt-2 text-slate-600 text-center max-w-2xl mx-auto text-sm sm:text-base">
              Get from signup to daily operations in minutes. Your organisation, your data, your rules.
            </p>
            <div className="mt-10 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {[
                { step: '01', icon: Rocket, title: 'Sign up & choose plan', desc: 'Pick Basic, Advanced, Enterprise, or AI Pro. Only pay for the modules you need.' },
                { step: '02', icon: Building2, title: 'Set up your organisation', desc: 'Add companies, branches, and users. Assign roles and permissions in one place.' },
                { step: '03', icon: Zap, title: 'Go live in a day', desc: 'Bulk upload customers, items, and chart of accounts. Optional WhatsApp and AI from day one.' },
                { step: '04', icon: TrendingUp, title: 'Run & grow', desc: 'Use CRM, sales, purchase, inventory, and accounting. Get AI insights and reports on demand.' },
              ].map((item) => (
                <div
                  key={item.step}
                  className="group relative rounded-2xl border-2 border-slate-100 bg-slate-50/50 p-5 sm:pl-12 sm:border-l-2 sm:border-slate-100 sm:border-l-brand-300 hover:border-brand-200 hover:bg-brand-50/30 hover:shadow-md transition-all"
                >
                  <span className="inline-flex sm:absolute sm:left-0 sm:translate-x-[-50%] w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700 group-hover:bg-brand-200 transition-colors shrink-0">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-mono font-semibold text-brand-600 block mt-3 sm:mt-0">{item.step}</span>
                  <h3 className="font-semibold text-slate-900 mt-0.5 text-base sm:text-[1rem]">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="py-12 sm:py-20 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-center">Pricing</h2>
            <p className="mt-2 text-slate-600 text-center max-w-2xl mx-auto text-sm sm:text-base">
              Simple, transparent pricing. Scale as you grow. Monthly, quarterly, or yearly billing.
            </p>
            <div className="mt-10 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[
                { name: 'Basic', price: '₹999', period: '/month', desc: 'CRM, Sales, Purchase, Inventory, Basic Accounting', features: ['Up to 2 companies', '5 users', '25 reports', 'Email support'], highlight: false },
                { name: 'Advanced', price: '₹2,499', period: '/month', desc: 'Everything in Basic + Multi-branch, more reports', features: ['Up to 5 companies', '15 users', '50+ reports', 'Priority support'], highlight: true },
                { name: 'Enterprise', price: '₹4,999', period: '/month', desc: 'Full modules, custom roles, API access', features: ['Unlimited companies', 'Unlimited users', '200+ reports', 'Dedicated support'], highlight: false },
                { name: 'AI Pro', price: '₹7,499', period: '/month', desc: 'Enterprise + AI advisor, WhatsApp, predictions', features: ['All Enterprise features', 'AI business health', 'WhatsApp integration', 'Predictive reports'], highlight: false },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-2xl border-2 p-5 sm:p-6 bg-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                    plan.highlight ? 'border-brand-500 shadow-lg ring-2 ring-brand-500/20 sm:scale-[1.02]' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {plan.highlight && (
                    <span className="inline-block rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700 uppercase tracking-wide">
                      Popular
                    </span>
                  )}
                  <h3 className="mt-2 text-xl font-bold text-slate-900 font-display">{plan.name}</h3>
                  <p className="mt-1 text-slate-600 text-sm">{plan.desc}</p>
                  <p className="mt-4 text-3xl font-bold text-slate-900 font-display">
                    {plan.price}
                    <span className="text-base font-normal text-slate-500">{plan.period}</span>
                  </p>
                  <ul className="mt-6 space-y-2 text-sm text-slate-600">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <span className="text-brand-500 font-bold">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`mt-6 block w-full rounded-xl py-3.5 sm:py-2.5 text-center font-semibold transition-colors min-h-[48px] flex items-center justify-center ${
                      plan.highlight ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    Get started
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="py-12 sm:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-center">Features</h2>
            <p className="mt-2 text-slate-600 text-center max-w-2xl mx-auto text-sm sm:text-base">
              80+ features across 11 modules. Activate only what you need.
            </p>
            <div className="mt-10 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[
                { module: 'Organization & Admin', icon: LayoutDashboard, items: ['Multi-tenant, multi-company, multi-branch', 'Roles & permissions, custom role builder', 'License & subscription management', 'Audit logs, backup & restore', 'GST/VAT tax config'] },
                { module: 'CRM', icon: Users, items: ['Lead pipeline & stage tracking', 'Customer 360, segmentation, tags', 'WhatsApp follow-up automation', 'Bulk customer upload', 'Complaint & feedback'] },
                { module: 'Sales', icon: FileText, items: ['Quotation, proforma, sales order', 'Delivery challan, tax invoice', 'Recurring invoice, credit note', 'Price list, discount, commission', 'E-signature, WhatsApp sharing'] },
                { module: 'Purchase', icon: ShoppingCart, items: ['Vendor management & performance', 'RFQ, purchase order, GRN', 'Purchase return, debit note', 'Vendor payment, TDS, advance'] },
                { module: 'Inventory & Warehouse', icon: Package, items: ['Item master, SKU, batch tracking', 'Multi-warehouse, stock transfer', 'Barcode & QR, reorder alerts', 'FIFO/LIFO/weighted valuation', 'Expiry & dead stock reports'] },
                { module: 'Accounting & Finance', icon: Calculator, items: ['Chart of accounts, journal entries', 'P&L, balance sheet, cash flow', 'Bank reconciliation', 'GST & TDS reports', 'Budget, multi-currency'] },
                { module: 'Reports & Intelligence', icon: BarChart3, items: ['200+ dynamic reports', 'Custom report builder', 'AI business health score', 'Predictive sales & demand', 'PDF/Excel export'] },
                { module: 'Integrations', icon: Plug, items: ['WhatsApp API', 'Razorpay / Stripe', 'Tally, Zoho, Shopify', 'SMS, Email SMTP', 'REST API'] },
                { module: 'AI Differentiators', icon: Sparkles, items: ['AI Financial Advisor', 'AI Inventory Predictor', 'AI Sales Coach', 'AI Cashflow Risk Alert', 'WhatsApp chatbot for business data'] },
              ].map((block) => (
                <div
                  key={block.module}
                  className="group rounded-xl border border-slate-200 p-4 sm:p-6 bg-slate-50/50 hover:border-brand-200 hover:bg-brand-50/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-brand-100 p-2 text-brand-600 group-hover:bg-brand-200 transition-colors">
                      <block.icon className="h-5 w-5" />
                    </span>
                    <h3 className="font-semibold text-slate-900">{block.module}</h3>
                  </div>
                  <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                    {block.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-brand-400 mt-0.5">·</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative py-12 sm:py-20 bg-brand-900 text-white overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c4a6e_0.5px,transparent_0.5px),linear-gradient(to_bottom,#0c4a6e_0.5px,transparent_0.5px)] bg-[size:32px_32px] opacity-20" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="font-display text-2xl sm:text-3xl font-bold">How SMEBUZZ helps your business</h2>
            <p className="mt-3 sm:mt-4 text-brand-100 max-w-2xl mx-auto text-sm sm:text-base">
              One place for CRM, sales, purchase, inventory, and accounts. GST-ready. WhatsApp-first. AI-powered insights. Built for MSMEs who want to move fast without complexity.
            </p>
            <ul className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-left max-w-4xl mx-auto">
              {[
                { icon: BarChart3, text: 'Faster decisions with real-time reports' },
                { icon: Shield, text: 'GST & TDS compliant out of the box' },
                { icon: Zap, text: 'Bulk onboarding in a day' },
                { icon: Bot, text: 'AI daily business advisor' },
                { icon: Building2, text: 'Multi-branch, multi-company' },
                { icon: Wallet, text: 'Your data, your control' },
              ].map((item) => (
                <li key={item.text} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3.5 sm:py-3 backdrop-blur-sm min-h-[48px] sm:min-h-0">
                  <item.icon className="h-5 w-5 text-brand-300 shrink-0" />
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="future" className="py-12 sm:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-center">Future roadmap</h2>
            <p className="mt-2 text-slate-600 text-center max-w-2xl mx-auto text-sm sm:text-base">
              We're building the ERP that grows with you. Here's what's coming.
            </p>
            <div className="mt-8 sm:mt-12 flex flex-wrap justify-center gap-2 sm:gap-3">
              {[
                { icon: Users, label: 'HR & Payroll (PF/ESI)' },
                { icon: Package, label: 'Production & Manufacturing (BOM, work orders)' },
                { icon: MessageCircle, label: 'Service industry (tickets, AMC)' },
                { icon: Sparkles, label: 'Deeper AI (fraud detection, strategy)' },
                { icon: BarChart3, label: 'Flutter mobile app' },
                { icon: Plug, label: 'More integrations (Amazon, etc.)' },
              ].map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2.5 sm:px-4 text-xs sm:text-sm font-medium text-slate-700 hover:bg-brand-100 hover:text-brand-800 transition-colors min-h-[44px] sm:min-h-0 items-center"
                >
                  <item.icon className="h-4 w-4 text-brand-500" />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="py-12 sm:py-20 bg-slate-50" style={{ paddingBottom: 'max(3rem, env(safe-area-inset-bottom) + 1rem)' }}>
          <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Get started</h2>
            <p className="mt-2 text-slate-600 text-sm sm:text-base">
              Contact us for a demo or start your free trial. We'll help you go live in days, not months.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
              <a
                href="mailto:hello@smebuzz.com"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-4 sm:py-3.5 text-base font-semibold text-white hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 min-h-[52px] sm:min-h-0"
              >
                Contact sales
              </a>
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-6 py-4 sm:py-3.5 text-base font-semibold text-slate-700 hover:border-brand-200 hover:bg-brand-50/50 transition-colors min-h-[52px] sm:min-h-0"
              >
                Request demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Mobile: sticky bottom CTA for app-like feel */}
      <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white/95 backdrop-blur border-t border-slate-200 py-3 px-4" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <Link
          href="/signup"
          className="block w-full rounded-xl bg-brand-600 text-white py-3.5 text-center font-semibold shadow-lg hover:bg-brand-700 min-h-[48px] flex items-center justify-center"
        >
          Start free trial
        </Link>
      </div>
      <div className="h-20 md:h-0" />

      <footer className="border-t border-slate-200 py-8 sm:py-10 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <span className="font-semibold text-slate-700 font-display">SMEBUZZ</span>
          <p className="text-xs sm:text-sm text-slate-500">Modular AI-Powered ERP for MSME · India & Global Bharat</p>
        </div>
      </footer>
    </div>
  );
}
