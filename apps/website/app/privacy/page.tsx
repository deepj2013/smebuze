import type { Metadata } from 'next';
import LegalPage from '../components/LegalPage';
import { LEGAL_EMAIL, SITE_NAME, SUPPORT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: `How ${SITE_NAME} collects, uses and stores personal and business data under Indian law.`,
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="2 September 2026">
      <p>
        {SITE_NAME} (smebuze.com) is a GST billing and ERP product for Indian MSMEs. This policy explains what we collect,
        why, and how you can ask us to change or delete it. It is written to align with the Digital Personal Data Protection
        Act, 2023 (DPDP Act) and the Information Technology Act, 2000.
      </p>
      <h2 className="pt-2 text-base font-semibold text-slate-900">Who we are</h2>
      <p>
        The data fiduciary for this website and the hosted product is the operator of {SITE_NAME}. Contact{' '}
        <a className="text-brand-700 underline" href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a> or{' '}
        <a className="text-brand-700 underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
      <h2 className="pt-2 text-base font-semibold text-slate-900">What we collect</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Account details: name, email, phone, workspace name, and login credentials (stored hashed).</li>
        <li>Business records you enter: customers, invoices, stock, GSTIN, and related documents.</li>
        <li>Technical logs: IP address, browser, and time of access, used to keep the service secure.</li>
        <li>Support messages you send us by email or in-product forms.</li>
      </ul>
      <h2 className="pt-2 text-base font-semibold text-slate-900">Why we use it</h2>
      <p>
        We use this data to provide the product, send login and invite emails, prevent abuse, bill subscriptions, and
        meet tax and accounting obligations. We do not sell personal data. We do not use advertising cookies.
      </p>
      <h2 className="pt-2 text-base font-semibold text-slate-900">Where it is stored</h2>
      <p>
        Production data is hosted on servers in use for smebuze.com. Uploads (for example logos) are stored on the
        application server and served only over HTTPS.
      </p>
      <h2 className="pt-2 text-base font-semibold text-slate-900">Your rights</h2>
      <p>
        You may request access, correction, or deletion of personal data, or withdraw consent, by emailing {LEGAL_EMAIL}.
        Workspace administrators can also deactivate users inside the product. We may retain invoices and GST records
        where Indian tax law requires it.
      </p>
      <h2 className="pt-2 text-base font-semibold text-slate-900">Children</h2>
      <p>The product is for business use. We do not knowingly collect data from children under 18.</p>
      <h2 className="pt-2 text-base font-semibold text-slate-900">Changes</h2>
      <p>We will update this page when our practices change. Continued use after an update means you accept the revised policy.</p>
    </LegalPage>
  );
}
