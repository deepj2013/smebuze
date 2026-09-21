import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/site';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

type SiteMeta = {
  name?: string;
  pages?: { hero_title?: string; hero_subtitle?: string; about?: string };
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  try {
    const res = await fetch(`${API}/api/v1/public/sites/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return {
        title: 'Website not found',
        robots: { index: false, follow: false },
      };
    }
    const site = (await res.json()) as SiteMeta;
    const title = site.pages?.hero_title || site.name || 'Business website';
    const description =
      site.pages?.hero_subtitle ||
      site.pages?.about ||
      `${site.name || title} — website powered by ${SITE_NAME}.`;
    const url = `${SITE_URL}/site/${encodeURIComponent(slug)}`;
    return {
      title: `${title} | ${SITE_NAME}`,
      description: description.slice(0, 160),
      alternates: { canonical: url },
      openGraph: {
        title,
        description: description.slice(0, 160),
        url,
        type: 'website',
        locale: 'en_IN',
        siteName: SITE_NAME,
      },
      robots: { index: true, follow: true },
    };
  } catch {
    return {
      title: 'Business website',
      robots: { index: true, follow: true },
    };
  }
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
