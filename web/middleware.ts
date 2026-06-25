import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Restricted paths to redirect to homepage for purely informational website
const RESTRICTED_PATHS = [
  '/auth',
  '/app',
  '/doctor-visit',
  '/plans',
  '/cart',
  '/checkout',
  '/success',
  '/account'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isRestricted = RESTRICTED_PATHS.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  );

  if (isRestricted) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/auth/:path*',
    '/auth',
    '/plans/:path*',
    '/plans',
    '/doctor-visit/:path*',
    '/doctor-visit',
    '/app/:path*',
    '/app',
    '/account/:path*',
    '/cart/:path*',
    '/checkout/:path*',
    '/checkout',
    '/success/:path*',
    '/success',
  ],
};
