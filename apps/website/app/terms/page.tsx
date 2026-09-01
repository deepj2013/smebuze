import type { Metadata } from 'next';
import LegalPage from '../components/LegalPage';
import { SITE_NAME, SUPPORT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Terms of use',
  description: `Terms for using ${SITE_NAME} GST billing software and the 7-day trial.`,
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="2 September 2026">
      <p>
        By creating a workspace or using smebuze.com you agree to these terms. If you are signing up for a company, you
        confirm you are authorised to bind that company.
      </p>
      <h2 className="pt-2 text-base font-semibold text-slate-900">The service</h2>
      <p>
        {SITE_NAME} is online GST billing, inventory and accounts software. A 7-day trial is free and does not require a
        card. Paid plans begin after the trial unless you cancel. Features depend on the plan you choose.
      </p>
      <h2 className="pt-2 text-base font-semibold text-slate-900">Your responsibilities</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Keep login details confidential and assign roles carefully.</li>
        <li>Enter accurate GSTIN, invoice and stock data. You remain responsible for tax filings.</li>
        <li>Do not misuse the API, attempt unauthorised access, or upload malware.</li>
        <li>Comply with GST, IT and other Indian laws that apply to your business.</li>
      </ul>
      <h2 className="pt-2 text-base font-semibold text-slate-900">Availability</h2>
      <p>
        We aim for high uptime but do not guarantee uninterrupted service. We may maintain, update or suspend the product
        with notice where practical.
      </p>
      <h2 className="pt-2 text-base font-semibold text-slate-900">Liability</h2>
      <p>
        The software is provided as-is. To the extent permitted by law we are not liable for lost profits, incorrect GST
        returns, or data loss beyond restoring reasonable backups. Our aggregate liability is limited to fees you paid us
        in the previous three months.
      </p>
      <h2 className="pt-2 text-base font-semibold text-slate-900">Governing law</h2>
      <p>These terms are governed by the laws of India. Courts at Mumbai have exclusive jurisdiction.</p>
      <p>
        Questions: <a className="text-brand-700 underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
