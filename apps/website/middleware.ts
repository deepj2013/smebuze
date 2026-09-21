import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const INDEXABLE = new Set(['/', '/signup', '/privacy', '/terms', '/cookies', '/ice-crest']);

function isIndexable(pathname: string): boolean {
  if (INDEXABLE.has(pathname)) return true;
  if (pathname.startsWith('/shop/') || pathname.startsWith('/site/') || pathname === '/shops') return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase() || '';
  const platform = new Set(['smebuze.com', 'www.smebuze.com', 'localhost', '127.0.0.1']);

  if (!platform.has(host) && !pathname.startsWith('/_next') && !pathname.startsWith('/shop') && !pathname.startsWith('/site')) {
    const url = request.nextUrl.clone();
    url.pathname = `/site/${host}`;
    const res = NextResponse.rewrite(url);
    if (!isIndexable(pathname)) res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    return res;
  }

  const res = NextResponse.next();
  if (!isIndexable(pathname)) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  res.headers.set('X-Content-Type-Options', 'nosniff');
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|apple-touch-icon|manifest.webmanifest).*)'],
};
