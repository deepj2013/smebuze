import type { Metadata } from 'next';
import IceCrestEnquiry from './IceCrestEnquiry';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Ice Crest — premium ice for hotels and bars in Mumbai',
  description:
    'Crystal-clear cubes, highballs and spheres for restaurants, hotels, caterers and events. Request a quote from Ice Crest.',
  alternates: { canonical: '/ice-crest' },
  openGraph: {
    title: 'Ice Crest — premium ice Mumbai',
    description: 'Crystal-clear ice delivered on time for hotels, bars and events.',
    url: `${SITE_URL}/ice-crest`,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Ice Crest',
  url: `${SITE_URL}/ice-crest`,
  areaServed: 'Mumbai',
  description: 'Premium ice cubes, highballs and spheres for hotels, bars and events.',
};

export default function IceCrestPublicPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <IceCrestEnquiry />
    </>
  );
}
