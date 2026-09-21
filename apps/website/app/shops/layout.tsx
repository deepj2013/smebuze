import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Browse shops on SMEBUZE',
  description: `Discover Indian shops and catalogues on ${SITE_NAME} — order online or visit the business website.`,
  alternates: { canonical: `${SITE_URL}/shops` },
  openGraph: {
    title: `Shops directory | ${SITE_NAME}`,
    description: `Browse public shops and websites powered by ${SITE_NAME}.`,
    url: `${SITE_URL}/shops`,
    type: 'website',
    locale: 'en_IN',
  },
  robots: { index: true, follow: true },
};

export default function ShopsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
