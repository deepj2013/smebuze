import Link from 'next/link';
import { SITE_NAME, SUPPORT_EMAIL } from '@/lib/site';

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-10 sm:py-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="font-display font-bold text-brand-800 text-lg">{SITE_NAME}</p>
          <p className="mt-2 text-slate-600 leading-relaxed max-w-xs">
            GST billing and shop workspaces for Indian MSMEs — restaurant, retail, services and trading.
          </p>
        </div>
        <div>
          <p className="font-semibold text-slate-800 mb-3">Product</p>
          <ul className="space-y-2 text-slate-600">
            <li>
              <Link href="/#mission" className="hover:text-brand-700">
                Mission &amp; vision
              </Link>
            </li>
            <li>
              <Link href="/use-cases" className="hover:text-brand-700">
                Shop use cases
              </Link>
            </li>
            <li>
              <Link href="/#pricing" className="hover:text-brand-700">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/#faq" className="hover:text-brand-700">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/custom-plan" className="hover:text-brand-700">
                Custom plan
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-slate-800 mb-3">Get started</p>
          <ul className="space-y-2 text-slate-600">
            <li>
              <Link href="/signup" className="hover:text-brand-700">
                7-day free trial
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-brand-700">
                Sign in
              </Link>
            </li>
            <li>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-brand-700">
                {SUPPORT_EMAIL}
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-slate-800 mb-3">Legal</p>
          <ul className="space-y-2 text-slate-600">
            <li>
              <Link href="/privacy" className="hover:text-brand-700">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-brand-700">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="hover:text-brand-700">
                Cookies
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <p className="mt-10 text-center text-xs text-slate-400 px-4">
        © {new Date().getFullYear()} {SITE_NAME}. Made for Indian MSMEs · Organic GST billing software · smebuze.com
      </p>
    </footer>
  );
}
