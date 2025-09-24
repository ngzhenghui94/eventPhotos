import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { signToken, verifyToken } from '@/lib/auth/session';

const protectedRoutes = '/dashboard';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session');
  const isProtectedRoute = pathname.startsWith(protectedRoutes);

  // Fast-path block for common WordPress/PHP probe requests and other suspicious paths
  // This helps cut down bot noise in logs and avoids unnecessary work.
  // Return a plain 404 (not a redirect) so crawlers don't retry elsewhere.
  const blockedPathPattern = /\.(?:php|cgi|asp|aspx)(?:$|\?)|^\/(?:wp-admin|wp-login\.php|wp-content|wp-includes|xmlrpc\.php|wordpress|\.env|\.git|vendor|phpmyadmin|server-status|autodiscover)(?:\/|$)/i;
  if (blockedPathPattern.test(pathname)) {
    return new NextResponse('Not found', {
      status: 404,
      headers: {
        'cache-control': 'public, max-age=0, s-maxage=0',
        'x-blocked-by': 'middleware',
      },
    });
  }

  // Optional: Block requests coming in with unknown/unexpected Host headers in production.
  // Configure a comma-separated list of hosts in ALLOWED_HOSTS (e.g., "example.com, www.example.com").
  // Requests to *.vercel.app are allowed by default to support preview deployments.
  const host = request.headers.get('host') || '';
  const allowedHosts = (process.env.ALLOWED_HOSTS || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);
  const isVercelHost = /\.vercel\.app$/i.test(host);
  const hostMatchesAllowlist = allowedHosts.length === 0
    ? true // if not configured, don't block
    : allowedHosts.some((allowed) => {
        if (allowed.startsWith('*.')) {
          const suffix = allowed.slice(1); // ".example.com"
          return host === allowed.slice(2) || host.endsWith(suffix);
        }
        return host === allowed;
      });
  if (process.env.NODE_ENV === 'production' && !isVercelHost && !hostMatchesAllowlist) {
    return new NextResponse('Misdirected Request', {
      status: 421,
      headers: {
        'x-blocked-host': host,
      },
    });
  }

  if (isProtectedRoute && !sessionCookie) {
    return NextResponse.redirect(new URL('/api/auth/google', request.url));
  }

  let res = NextResponse.next();

  if (sessionCookie && request.method === 'GET') {
    try {
      const parsed = await verifyToken(sessionCookie.value);
      const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);

      res.cookies.set({
        name: 'session',
        value: await signToken({
          ...parsed,
          expires: expiresInOneDay.toISOString()
        }),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresInOneDay,
        path: '/',
      });
    } catch (error) {
      console.error('Error updating session:', error);
      res.cookies.delete('session');
      if (isProtectedRoute) {
        return NextResponse.redirect(new URL('/api/auth/google', request.url));
      }
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
  runtime: 'nodejs'
};
