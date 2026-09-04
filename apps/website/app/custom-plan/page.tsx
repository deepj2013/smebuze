import type { Metadata } from 'next';
import Link from 'next/link';
import CustomPlanEnquiry from '../components/CustomPlanEnquiry';
import SiteFooter from '../components/SiteFooter';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Custom plan',
  description: `Tell ${SITE_NAME} what seats, companies and modules you need. We will quote a custom pack.`,
};

export default function CustomPlanPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-display font-bold text-brand-700">{SITE_NAME}</Link>
          <Link href="/signup" className="text-sm font-semibold text-brand-700">Start trial</Link>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Custom workspace</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-slate-900">Tell us how you work</h1>
        <p className="mt-2 text-sm text-slate-600">
          Extra seats, more companies, WhatsApp, AI, or an industry pack (ice plant, wholesale, restaurant). Send a note — it goes to the SMEBUZE team.
        </p>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <CustomPlanEnquiry />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
