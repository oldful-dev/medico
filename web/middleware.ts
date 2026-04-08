import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware protects all routes under /app
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define which paths are protected
  const isAppRoute = pathname.startsWith('/app');
  
  // Get the token from cookies (to be set by the client after Firebase login)
  const token = request.cookies.get('auth-token')?.value;

  if (isAppRoute && !token) {
    // Redirect unauthenticated users to login
    // We append the current path as a redirect parameter for UX
    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Config to optimize performance by only running middleware on specific paths
export const config = {
  matcher: ['/app/:path*'],
};
