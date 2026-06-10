import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decodeJwtPayload, getDefaultAppPath } from './lib/auth-token';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  const { pathname } = req.nextUrl;
  const payload = decodeJwtPayload(token);
  const isAdminPath = pathname.startsWith('/admin');
  const isProtectedPath =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/employees') ||
    pathname.startsWith('/records') ||
    pathname.startsWith('/users') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/admin');

  if (pathname === '/login') {
    if (token) {
      return NextResponse.redirect(new URL(getDefaultAppPath(payload), req.url));
    }

    return NextResponse.next();
  }

  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (pathname.startsWith('/dashboard') && payload?.isSuperAdmin) {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url));
  }

  if (isAdminPath) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    if (!payload?.isSuperAdmin) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/dashboard/:path*',
    '/employees/:path*',
    '/records/:path*',
    '/users/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/admin/:path*',
  ],
};
