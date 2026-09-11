import { NextRequest, NextResponse } from 'next/server';

const protectedPrefixes = [
  '/dashboard',
  '/courses',
  '/practice',
  '/vocabulary',
  '/teams',
  '/library',
  '/create',
  '/admin',
];

function contentSecurityPolicy(nonce: string) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' ${isDevelopment ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDevelopment ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const policy = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', policy);

  const protectedPath = protectedPrefixes.some(
    (prefix) => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`),
  );
  const sessionName = process.env.LEARN_SESSION_COOKIE_NAME || 'pokyh_learn_session';
  let response: NextResponse;

  if (
    process.env.NEXT_PUBLIC_LEARN_DEMO_MODE !== 'true' &&
    protectedPath &&
    !request.cookies.has(sessionName)
  ) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('returnTo', request.nextUrl.pathname);
    response = NextResponse.redirect(signInUrl);
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  response.headers.set('Content-Security-Policy', policy);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
