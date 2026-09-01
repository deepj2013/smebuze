import type { Metadata } from 'next';
import LegalPage from '../components/LegalPage';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Cookies and local storage',
  description: `${SITE_NAME} cookie and local-storage notice — essential login only, no ads.`,
};

export default function CookiesPage() {
  return (
    <LegalPage title="Cookies and local storage" updated="2 September 2026">
      <p>
        {SITE_NAME} does not use advertising or third-party tracking cookies. We store a small amount of data on your
        device so the product works.
      </p>
      <h2 className="pt-2 text-base font-semibold text-slate-900">What we store</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Login token</strong> in browser local storage, so you stay signed in until you log out or the token
          expires.
        </li>
        <li>
          <strong>Privacy notice flag</strong> so we do not show the same banner on every visit after you tap OK.
        </li>
        <li>Optional printer and onboarding preferences for your workspace.</li>
      </ul>
      <h2 className="pt-2 text-base font-semibold text-slate-900">How to clear it</h2>
      <p>
        Use Logout in the app, or clear this site’s data in your browser settings. After that you will need to sign in
        again.
      </p>
      <p>
        Strictly necessary storage for a logged-in business app does not require a separate marketing-cookie opt-in. We
        will update this page if we add analytics.
      </p>
    </LegalPage>
  );
}
