import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/signup', '/privacy', '/terms', '/cookies', '/ice-crest'],
        disallow: [
          '/login',
          '/join',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
          '/dashboard',
          '/crm/',
          '/sales/',
          '/purchase/',
          '/inventory/',
          '/accounting/',
          '/organization/',
          '/reports',
          '/admin/',
          '/pos',
          '/onboarding',
          '/bulk-upload',
          '/hr/',
          '/service/',
          '/ice-crest/dashboard',
          '/ice-crest/guide',
          '/ice-crest/whatsapp',
          '/ice-crest/tutorial',
          '/ice-crest/expenses',
          '/ice-crest/stock-movements',
          '/ice-crest/production-plan',
          '/api/',
          '/pay/',
          '/billing',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
