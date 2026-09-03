import Link from 'next/link';
import {
  Building2,
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
  ChevronRight,
  Check,
  SlidersHorizontal,
  User,
  ArrowUpRight,
  Bot,
  Bell,
  Activity,
  MessageSquare,
  Printer,
  Bluetooth,
  Wifi,
  Usb,
  Globe,
  Smartphone,
} from 'lucide-react';
import MarketingChrome from './components/MarketingChrome';
import SiteFooter from './components/SiteFooter';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, SUPPORT_EMAIL } from '@/lib/site';

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR', description: '7-day free trial' },
      description: SITE_DESCRIPTION,
      areaServed: 'IN',
    },
    {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      email: SUPPORT_EMAIL,
      logo: `${SITE_URL}/icons/icon-512.png`,
    },
  ],
};

export default function Home() {
  return (
    <MarketingChrome>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main id="main">
        {/* Hero — mobile-first, eye-catching */}
        <section className="relative overflow-hidden py-12 sm:py-20 lg:py-28">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-slate-50" />
          <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-brand-200/40 blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-brand-300/30 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-brand-100/20" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#94a3b8_0.5px,transparent_0.5px),linear-gradient(to_bottom,#94a3b8_0.5px,transparent_0.5px)] bg-[size:24px_24px] opacity-[0.03]" />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-brand-200/80 px-3 py-2 sm:px-4 sm:py-1.5 text-xs sm:text-sm font-semibold text-brand-700 shadow-md backdrop-blur-sm">
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="whitespace-nowrap">7-day free trial · No card needed</span>
            </span>
            <h1 className="mt-5 sm:mt-6 font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight">
              Run the shop from one login.
              <span className="block text-brand-600">Print the bill on the printer you already own.</span>
            </h1>
            <p className="mt-4 sm:mt-5 text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              SMEBUZZ is the GST-ready workspace for Indian MSMEs — dine-in restaurants, sweet shops, garment stores, and trading desks. Start as one person. Try it free for seven days. At signup we ask how you sell, then open a POS counter or a full ERP.
            </p>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
              <Link
                href="/signup"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-4 sm:py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-700 transition-all min-h-[52px] sm:min-h-0"
              >
                Start 7-day free trial
                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a
                href="#printing"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-6 py-4 sm:py-3.5 text-base font-semibold text-slate-700 hover:border-brand-200 hover:bg-brand-50/50 transition-colors min-h-[52px] sm:min-h-0"
              >
                See printer setup
              </a>
            </div>
            <div className="mt-5 sm:mt-6 flex flex-wrap justify-center gap-2 sm:gap-3">
              {['Restaurant & shop POS', 'USB · Wi-Fi · Internet · Bluetooth', 'GST & HSN billing', 'Upgrade anytime'].map((tag) => (
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
                { value: '7 days', label: 'Free trial, no card' },
                { value: 'Any printer', label: 'USB, Wi-Fi, net, Bluetooth' },
                { value: 'GST', label: 'HSN invoices, out of the box' },
                { value: '1+1', label: 'User & company to start' },
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
              You do not buy a giant ERP. You open a workspace, connect the printer at the counter, and run the same flow you already know — quotation to cash — with GST in the bill.
            </p>
            <div className="mt-10 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {[
                { step: '01', icon: User, title: 'Start free for 7 days', desc: 'One company. One login. Full Starter access — CRM, GST invoices, stock, vendors and a live dashboard — ready the same afternoon. No card to begin.' },
                { step: '02', icon: Printer, title: 'Connect your printer', desc: 'USB at the desk, Wi-Fi in the shop, a printer on another floor, or a Bluetooth bill printer from the phone. Inkjet, laser, thermal — large or pocket-size.' },
                { step: '03', icon: Building2, title: 'Run the real flow', desc: 'Quotation → order → delivery → invoice → payment. Purchase, GRN and stock stay in the same picture. Print the bill before the truck leaves.' },
                { step: '04', icon: SlidersHorizontal, title: 'Grow, then let AI watch', desc: 'Add people and companies when the floor gets busy. AI summarises sales, scores health, and drafts payment reminders from live books — not the internet.' },
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

        <section id="who" className="py-12 sm:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-brand-600">Who it is for</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-center mt-2">Restaurant, shop, department store — or the full trading desk</h2>
            <p className="mt-2 text-slate-600 text-center max-w-2xl mx-auto text-sm sm:text-base">
              At signup we ask how you work. A dine-in restaurant gets a menu and a cash counter. A department store gets barcode POS and stock by aisle. A trader gets quotations, GST invoices and godown stock. Same product — opened the way you sell.
            </p>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[
                { title: 'Dine-in restaurant', desc: 'Put the menu on the counter screen. Tap dishes, take cash or UPI, print a kitchen/bill slip. Walk-in customers are ready on day one.' },
                { title: 'Sweet shop', desc: 'Bill mithai and boxes as they go. Cash drawer style entry, stock down on each sale, printer at the counter.' },
                { title: 'Garment shop', desc: 'One store, one counter. Tap or scan garments, settle in cash or UPI, keep stock honest without an accountant on the floor.' },
                { title: 'Kirana / single store', desc: 'Fast billing for a neighbourhood shop. Barcode search, cash received and change, day bills in one list.' },
                { title: 'Department store / supermarket', desc: 'USB or Bluetooth barcode reader at the till. On a phone, open the camera and scan. Inventory by department, receive stock, sell like a normal store.' },
                { title: 'Trading / wholesale', desc: 'The full ERP: quotation to invoice, purchase, warehouses and books — for people who sell to other businesses.' },
                { title: 'Services / general', desc: 'CRM and GST invoices when you are not a shop counter — consultants, workshops, mixed firms.' },
              ].map((b) => (
                <div key={b.title} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 hover:border-brand-200 hover:bg-white transition-all">
                  <h3 className="font-semibold text-slate-900">{b.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-brand-700 min-h-[48px]">
                Choose how you will use it
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section id="printing" className="py-12 sm:py-20 bg-gradient-to-b from-white to-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-brand-600">Any printer. Any size. Phone or desk.</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-center mt-2">Set up the printer you already have</h2>
            <p className="mt-2 text-slate-600 text-center max-w-2xl mx-auto text-sm sm:text-base">
              A GST bill is only useful if it comes out of the machine at the counter. SMEBUZZ does not lock you to one brand. During the 7-day trial — and after — you add printers in Organization → Printers. Paper size is remembered on that device, so the office laser and the pocket Bluetooth printer can live side by side.
            </p>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {[
                { icon: Usb, title: 'Local / USB', desc: 'Plugged into the computer with a cable, or already installed in Windows, macOS or Linux. Works for small inkjets and large office lasers alike.' },
                { icon: Wifi, title: 'Wi-Fi / LAN', desc: 'On the same shop network. Add the printer once in phone or computer settings, then pick it when you print an invoice or quotation.' },
                { icon: Globe, title: 'Internet / AirPrint', desc: 'A printer on another floor, another branch, or reachable over IPP / AirPrint. Accounts can print A4 while the godown prints a challan.' },
                { icon: Bluetooth, title: 'Bluetooth on mobile', desc: 'Open SMEBUZZ on the phone, pair a thermal bill printer, and cut an 58 mm or 80 mm slip at the counter — no extra app for Chrome on Android.' },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-brand-200 hover:shadow-md transition-all">
                  <span className="inline-flex rounded-xl bg-brand-100 p-2.5 text-brand-700">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3 font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 sm:mt-14 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
              <h3 className="font-display text-lg sm:text-xl font-bold text-slate-900 text-center">Inkjet, laser, thermal — big machine or pocket printer</h3>
              <p className="mt-2 text-sm text-slate-600 text-center max-w-2xl mx-auto">
                Choose the kind of printer and the paper it uses. SMEBUZZ then sends A4 / A5 invoices to office printers, and 58 mm or 80 mm bills to thermal machines.
              </p>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { t: 'Inkjet', d: 'Colour or mono, home or shop counter' },
                  { t: 'Laser / office', d: 'Departmental A4, including large MFPs' },
                  { t: 'Thermal bill', d: '58 mm & 80 mm USB, Wi-Fi or Bluetooth' },
                  { t: 'Dot matrix', d: 'Multi-part stationery still in the shop' },
                ].map((x) => (
                  <div key={x.t} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4">
                    <p className="font-semibold text-slate-900">{x.t}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{x.d}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl bg-brand-50 border border-brand-100 px-4 py-4">
                <Smartphone className="h-6 w-6 text-brand-700 shrink-0" />
                <p className="text-sm text-slate-700">
                  <strong className="text-slate-900">On a phone:</strong> open the website, go to Printers, and pair Bluetooth or pick a Wi-Fi / AirPrint machine. Each device keeps its own default, so the counter phone does not steal the accounts laser.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="ai" className="py-12 sm:py-20 bg-gradient-to-b from-slate-50 to-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-brand-600">AI inside the ERP</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-center mt-2">A second brain for the person running the shop</h2>
            <p className="mt-2 text-slate-600 text-center max-w-2xl mx-auto text-sm sm:text-base">
              SMEBUZZ AI does not guess from the internet. It reads <em>your</em> invoices, collections and pending money — then tells you what to do before the day gets away.
            </p>

            <div className="mt-10 sm:mt-14">
              <h3 className="font-display text-lg sm:text-xl font-bold text-slate-900 text-center">How AI works</h3>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {[
                  { n: '1', icon: FileText, title: 'You work as usual', desc: 'Raise quotations, invoices, receipts and follow-ups. Nothing extra to type for the AI.' },
                  { n: '2', icon: Activity, title: 'It reads live numbers', desc: 'Agents pull last-month sales, cash received, what is still pending, and a 1–10 health score.' },
                  { n: '3', icon: Bot, title: 'You get a plain answer', desc: '“Invoiced ₹X, received ₹Y, pending ₹Z. Health 7/10 — collections are slipping.” One screen, not a spreadsheet.' },
                  { n: '4', icon: Bell, title: 'It nudges the next action', desc: 'Payment-reminder copy for overdue bills. WhatsApp when you switch it on. You send; the AI does not spam customers alone.' },
                ].map((s) => (
                  <div key={s.n} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-brand-200 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                        <s.icon className="h-5 w-5" />
                      </span>
                      <span className="text-xs font-mono font-semibold text-brand-600">Step {s.n}</span>
                    </div>
                    <h4 className="mt-3 font-semibold text-slate-900">{s.title}</h4>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12 sm:mt-16">
              <h3 className="font-display text-lg sm:text-xl font-bold text-slate-900 text-center">What you gain</h3>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {[
                  { icon: TrendingUp, title: 'See the month in one line', desc: 'Sales-summary agent: invoiced vs received vs pending. Stop opening five reports before a customer call.' },
                  { icon: Activity, title: 'Know if the business is healthy', desc: 'Health score 1–10 from real receivables and activity — not a vanity dashboard. Act when the score drops, not after cash dries up.' },
                  { icon: MessageSquare, title: 'Reminders that get paid', desc: 'Payment-reminder agent drafts the chase message. Pair with WhatsApp so overdue invoices leave your head and hit the customer’s phone.' },
                ].map((b) => (
                  <div key={b.title} className="rounded-2xl border-2 border-slate-100 bg-slate-50/70 p-6 hover:border-brand-200 hover:bg-white transition-all">
                    <span className="inline-flex rounded-xl bg-brand-600 p-2.5 text-white">
                      <b.icon className="h-5 w-5" />
                    </span>
                    <h4 className="mt-4 font-display text-lg font-bold text-slate-900">{b.title}</h4>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{b.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-8 text-center text-sm text-slate-500 max-w-xl mx-auto">
              AI sits on Custom / AI-enabled plans. Your data stays in your workspace. Agents only see what you already booked in SMEBUZZ.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                href="/signup?plan=ai_pro"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 hover:bg-brand-700 min-h-[48px]"
              >
                Try AI on Custom
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-12 sm:py-20 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-brand-600">Pricing that grows with you</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-center mt-2">Start with 7 days free. Upgrade when it fits.</h2>
            <p className="mt-2 text-slate-600 text-center max-w-2xl mx-auto text-sm sm:text-base">
              Every new workspace begins with a full 7-day trial — no card, no salesman. Starter is built for one person and one company. Pay yearly and save 15%. Add seats, companies and modules when you are ready, or tell us how you work and we will tailor it.
            </p>
            <div className="mt-10 sm:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[
                {
                  id: 'basic',
                  name: 'Starter',
                  price: '₹999',
                  period: '/month',
                  badge: 'For you',
                  desc: 'One user. One company. The full desk to run sales and stock.',
                  features: [
                    '1 company, 1 user',
                    'CRM: leads, customers, follow-ups',
                    'Quotations, orders, GST invoices',
                    'Print: USB, Wi-Fi, internet, Bluetooth',
                    'Purchase, vendors & payables',
                    'Items, warehouses & stock',
                    'Dashboard & ageing reports',
                  ],
                  cta: 'Start 7-day trial',
                  highlight: false,
                },
                {
                  id: 'advanced',
                  name: 'Growth',
                  price: '₹2,499',
                  period: '/month',
                  badge: 'Most chosen',
                  desc: 'When the team joins and the pipeline gets busy.',
                  features: [
                    'Up to 3 companies, 5 users',
                    'Everything in Starter',
                    'Sales pipeline & campaigns',
                    'Delivery challans & credit notes',
                    'GRN, stock transfers, bulk upload',
                    'Priority support',
                  ],
                  cta: 'Upgrade to Growth',
                  highlight: true,
                },
                {
                  id: 'enterprise',
                  name: 'Business',
                  price: '₹4,999',
                  period: '/month',
                  badge: 'Scale',
                  desc: 'More companies, tighter books, roles that match the floor.',
                  features: [
                    'Up to 10 companies, 25 users',
                    'Everything in Growth',
                    'P&L, balance sheet, bank rec',
                    'HR employees & service tickets',
                    'Custom roles & audit trail',
                    'Dedicated onboarding',
                  ],
                  cta: 'Go Business',
                  highlight: false,
                },
                {
                  id: 'custom',
                  name: 'Custom',
                  price: 'Let’s talk',
                  period: '',
                  badge: 'Your shape',
                  desc: 'Pick modules, extra seats, or an industry workspace.',
                  features: [
                    'Users & companies you need',
                    'Switch modules on or off',
                    'Industry pack (e.g. ice plant, wholesale)',
                    'WhatsApp lead capture & reminders',
                    'AI sales summary & health score',
                    'Online payments on invoices',
                    'We set it up around your process',
                  ],
                  cta: 'Customise my plan',
                  highlight: false,
                  custom: true,
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl border-2 p-5 sm:p-6 bg-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                    plan.highlight ? 'border-brand-500 shadow-lg ring-2 ring-brand-500/20 sm:scale-[1.02]' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className={`inline-block w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                    plan.highlight ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {plan.badge}
                  </span>
                  <h3 className="mt-3 text-xl font-bold text-slate-900 font-display">{plan.name}</h3>
                  <p className="mt-1 text-slate-600 text-sm min-h-[2.5rem]">{plan.desc}</p>
                  <p className="mt-4 font-display font-bold text-slate-900">
                    <span className={plan.custom ? 'text-2xl' : 'text-3xl'}>{plan.price}</span>
                    {plan.period && <span className="text-base font-normal text-slate-500">{plan.period}</span>}
                  </p>
                  {!plan.custom && (
                    <p className="mt-1 text-xs font-medium text-emerald-700">Save 15% when you pay yearly</p>
                  )}
                  <ul className="mt-5 space-y-2 text-sm text-slate-600 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 shrink-0 text-brand-500" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.custom ? '/signup?plan=ai_pro' : `/signup?plan=${plan.id}`}
                    className={`mt-6 block w-full rounded-xl py-3.5 sm:py-2.5 text-center font-semibold transition-colors min-h-[48px] flex items-center justify-center ${
                      plan.highlight ? 'bg-brand-600 text-white hover:bg-brand-700' : plan.custom ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>

            <div className="mt-10 sm:mt-12 rounded-2xl border border-brand-200 bg-white p-5 sm:p-8 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 text-brand-700 font-semibold text-sm">
                    <SlidersHorizontal className="h-4 w-4" />
                    Mix, match, upgrade
                  </div>
                  <h3 className="mt-2 font-display text-xl font-bold text-slate-900">Already on Starter? Grow without starting over.</h3>
                  <p className="mt-2 text-sm text-slate-600 max-w-xl">
                    Add a colleague, a second company, WhatsApp, or a vertical built around your floor — ice, trading, services. Your data stays. The product stretches.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
                  {[
                    { t: 'Extra user', d: 'Add a seat' },
                    { t: 'Extra company', d: 'Same login, new books' },
                    { t: 'WhatsApp', d: 'Leads & reminders' },
                    { t: 'AI agents', d: 'Summary & health' },
                  ].map((x) => (
                    <div key={x.t} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="text-sm font-semibold text-slate-900">{x.t}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{x.d}</p>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-5 text-center text-sm text-slate-500">
                Need a number for extra users or a custom pack?{' '}
                <a href="mailto:hello@smebuzz.com" className="font-semibold text-brand-700 hover:underline">Talk to us</a>
                {' · '}
                <Link href="/signup" className="font-semibold text-brand-700 hover:underline">Start a 7-day free trial</Link>
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="py-12 sm:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-center">What you actually get</h2>
            <p className="mt-2 text-slate-600 text-center max-w-2xl mx-auto text-sm sm:text-base">
              Live modules — not a slide deck. Switch on more as you upgrade or customise.
            </p>
            <div className="mt-10 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[
                { module: 'CRM that follows up', icon: Users, items: ['Leads & customers in one list', 'Pipeline stages you can drag', 'Follow-up board: today / overdue', 'Website enquiry capture', 'Campaigns when you are ready'] },
                { module: 'Sales, GST-ready', icon: FileText, items: ['Quotation → order → challan → invoice', 'HSN/SAC, GST, shipping & discount', 'Print on any printer, PDF, payments', 'Credit notes & recurring bills', 'Pay-online link on invoices'] },
                { module: 'Purchase & payables', icon: ShoppingCart, items: ['Vendors and purchase orders', 'GRN — stock in when goods arrive', 'Debit notes and vendor bills', 'Payables ageing', 'TDS-ready payments'] },
                { module: 'Stock that moves', icon: Package, items: ['Item master, SKU, MRP, tax', 'Warehouses and live stock', 'Inward / outward ledger', 'Transfers between godowns', 'Low-stock alerts on dashboard'] },
                { module: 'Books you can trust', icon: Calculator, items: ['Chart of accounts & journal', 'Real P&L and balance sheet', 'Bank statement match', 'GST-friendly reports', 'Ageing of money in and out'] },
                { module: 'Your workspace', icon: LayoutDashboard, items: ['Roles & permissions', 'Companies as you grow', 'Printer setup on each device', 'Bulk upload customers & items', 'Industry packs on Custom'] },
                { module: 'AI on your books', icon: Sparkles, items: ['Last-month sales in one sentence', 'Business health score 1–10', 'Payment reminder drafts', 'Works off live invoices — not guesses', 'WhatsApp when you turn it on'] },
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
            <h2 className="font-display text-2xl sm:text-3xl font-bold">Built for the person who wears every hat</h2>
            <p className="mt-3 sm:mt-4 text-brand-100 max-w-2xl mx-auto text-sm sm:text-base">
              Sales on the phone. Stock in the godown. A GST bill off the printer before the truck leaves — USB, Wi-Fi or Bluetooth from the mobile site. SMEBUZZ keeps that in one login, free for seven days, then grows when you hire the second person.
            </p>
            <ul className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-left max-w-4xl mx-auto">
              {[
                { icon: Sparkles, text: 'AI that reads your invoices, not the internet' },
                { icon: User, text: '7-day free trial — one user, one company' },
                { icon: Printer, text: 'USB, Wi-Fi, internet and Bluetooth printing' },
                { icon: FileText, text: 'GST invoices that match the stock' },
                { icon: TrendingUp, text: 'See money in, money out, today' },
                { icon: ArrowUpRight, text: 'Add people and companies later' },
                { icon: SlidersHorizontal, text: 'Customise modules to how you work' },
                { icon: Shield, text: 'Your data, your workspace, your rules' },
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
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-center">What’s next</h2>
            <p className="mt-2 text-slate-600 text-center max-w-2xl mx-auto text-sm sm:text-base">
              HR, service tickets and WhatsApp are already in the product. This is what we are deepening next.
            </p>
            <div className="mt-8 sm:mt-12 flex flex-wrap justify-center gap-2 sm:gap-3">
              {[
                { icon: Users, label: 'Payroll (PF / ESI)' },
                { icon: Package, label: 'BOM & shop-floor production' },
                { icon: MessageCircle, label: 'Richer AMC & field service' },
                { icon: Sparkles, label: 'Smarter demand & cash alerts' },
                { icon: BarChart3, label: 'Mobile app for the floor' },
                { icon: Plug, label: 'More marketplaces & banks' },
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
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Ready when you are</h2>
            <p className="mt-2 text-slate-600 text-sm sm:text-base">
              Open a workspace free for 7 days. Connect the printer at the counter. Upgrade seats later — or tell us your process and we will customise it.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
              <Link
                href="/signup?plan=basic"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-4 sm:py-3.5 text-base font-semibold text-white hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 min-h-[52px] sm:min-h-0"
              >
                Start 7-day free trial
              </Link>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Customise%20SMEBUZZ`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-6 py-4 sm:py-3.5 text-base font-semibold text-slate-700 hover:border-brand-200 hover:bg-brand-50/50 transition-colors min-h-[52px] sm:min-h-0"
              >
                Customise with us
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </MarketingChrome>
  );
}
