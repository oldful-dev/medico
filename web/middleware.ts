import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_PATHS = ['/app', '/account', '/cart'];

// Marketing/public routes that logged-in users should NOT see (landing page)
const MARKETING_PATHS = ['/'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Use refresh-token as session indicator (30-day lifetime).
  // Even if the access token has expired, presence of refresh-token
  // means the user has a valid session that can be silently restored
  // (authStore.initialize() handles it client-side on mount).
  const hasSession = !!request.cookies.get('refresh-token')?.value;

  const isProtected   = PROTECTED_PATHS.some(p => pathname.startsWith(p));
  const isAuthRoute   = pathname === '/auth';
  const isMarketing   = MARKETING_PATHS.includes(pathname);

  // ── Rule 1: Logged-in users → always land on dashboard ──────────────────
  // Block access to the marketing landing page and auth page
  if (hasSession && (isMarketing || isAuthRoute)) {
    return NextResponse.redirect(new URL('/app/dashboard', request.url));
  }

  // ── Rule 2: Guests → redirect to login for protected routes ─────────────
  if (!hasSession && isProtected) {
    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Include '/' and marketing routes so we can redirect logged-in users away
  matcher: [
    '/',
    '/auth',
    '/plans',
    '/about',
    '/wellness',
    '/doctor-visit',
    '/app/:path*',
    '/account/:path*',
    '/cart/:path*',
  ],
};
