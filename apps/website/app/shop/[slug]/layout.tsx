import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/site';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

type ShopMeta = {
  name?: string;
  shop_enabled?: boolean;
  pages?: { hero_title?: string; hero_subtitle?: string; about?: string };
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  try {
    const res = await fetch(`${API}/api/v1/public/shops/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return {
        title: 'Shop not found',
        robots: { index: false, follow: false },
      };
    }
    const shop = (await res.json()) as ShopMeta;
    const title = shop.pages?.hero_title || shop.name || 'Shop';
    const description =
      shop.pages?.hero_subtitle ||
      shop.pages?.about ||
      `Order from ${shop.name || title} online. Powered by ${SITE_NAME}.`;
    const url = `${SITE_URL}/shop/${encodeURIComponent(slug)}`;
    return {
      title: `${title} | Online shop`,
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
      title: 'Shop',
      robots: { index: true, follow: true },
    };
  }
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
