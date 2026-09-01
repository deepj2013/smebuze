import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const INDEXABLE = new Set(['/', '/signup', '/privacy', '/terms', '/cookies', '/ice-crest']);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const res = NextResponse.next();
  if (!INDEXABLE.has(pathname)) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  res.headers.set('X-Content-Type-Options', 'nosniff');
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|apple-touch-icon|manifest.webmanifest).*)'],
};
