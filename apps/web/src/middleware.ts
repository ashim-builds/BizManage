import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Skip static assets, Next.js internals, and API calls
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Clean host (e.g. rb-hardware.localhost:3000 -> rb-hardware.localhost)
  const currentHost = hostname.replace(/:\d+$/, '').toLowerCase();

  let subdomain: string | null = null;

  // Reserved subdomains that shouldn't route to a storefront
  const reservedSubdomains = ['www', 'app', 'api', 'admin', 'dashboard'];

  // Check known domain patterns:
  // 1. localhost (e.g. rb-hardware.localhost)
  // 2. onrender.com (e.g. rb-hardware.bizmanage-web.onrender.com)
  // 3. bizmanage.app / bizmanage.com (e.g. rb-hardware.bizmanage.app)
  if (currentHost.endsWith('.localhost')) {
    const sub = currentHost.replace('.localhost', '');
    if (sub && !reservedSubdomains.includes(sub)) {
      subdomain = sub;
    }
  } else {
    // For production domain e.g. storename.bizmanage.app
    const parts = currentHost.split('.');
    if (parts.length >= 3) {
      const candidate = parts[0];
      if (candidate && !reservedSubdomains.includes(candidate)) {
        subdomain = candidate;
      }
    }
  }

  // If request is on a store subdomain and not already visiting /store/
  if (subdomain && !url.pathname.startsWith('/store/')) {
    const targetPath = `/store/${subdomain}${url.pathname === '/' ? '' : url.pathname}`;
    return NextResponse.rewrite(new URL(targetPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
