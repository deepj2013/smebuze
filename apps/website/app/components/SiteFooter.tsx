import Link from 'next/link';
import { SITE_NAME, SUPPORT_EMAIL } from '@/lib/site';

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 py-8 sm:py-10 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <span className="font-semibold text-slate-700 font-display">{SITE_NAME}</span>
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs sm:text-sm text-slate-500" aria-label="Legal">
          <Link href="/privacy" className="hover:text-brand-700">Privacy</Link>
          <Link href="/terms" className="hover:text-brand-700">Terms</Link>
          <Link href="/cookies" className="hover:text-brand-700">Cookies</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-brand-700">{SUPPORT_EMAIL}</a>
        </nav>
      </div>
      <p className="mt-4 text-center text-xs text-slate-400 px-4">
        © {new Date().getFullYear()} {SITE_NAME}. GST billing software for Indian MSMEs. 7-day free trial.
      </p>
    </footer>
  );
}
