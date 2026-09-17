import 'server-only';

import { randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { getServerConfig } from '@/lib/server/config';
import { ClientRequestProblem } from '@/lib/server/request-body';

const cookieBase = () => {
  const config = getServerConfig();
  return {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    domain: config.cookieDomain,
  };
};

function cookieNames() {
  return {
    session: process.env.LEARN_SESSION_COOKIE_NAME?.trim() || 'pokyh_learn_session',
    refresh: process.env.LEARN_REFRESH_COOKIE_NAME?.trim() || 'pokyh_learn_refresh',
    csrf: process.env.LEARN_CSRF_COOKIE_NAME?.trim() || 'pokyh_learn_csrf',
  };
}

export async function getAccessToken() {
  return (await cookies()).get(cookieNames().session)?.value ?? null;
}

export async function getRefreshToken() {
  return (await cookies()).get(cookieNames().refresh)?.value ?? null;
}

// Deliberately no `maxAge`/`expires` on any of these: that makes every one of
// them a browser *session* cookie rather than a persistent one. The backend's
// own signed token expiry (and its account-wide refresh-token validity) is
// unchanged and still authoritative — this only controls how long the
// browser is willing to hold and resend the cookie client-side. A session
// cookie is cleared by the browser when it fully closes (not merely a tab),
// so staying signed in for weeks requires the browser to stay open, and
// nothing is left signed in on disk once it does not. Some browsers'
// "continue where you left off" / crash-recovery feature can still restore
// session cookies, which is a known, browser-controlled limit of this
// mechanism, not something a cookie attribute can fully close.
export function writeSession(
  response: NextResponse,
  value: { accessToken: string; refreshToken: string },
) {
  const config = getServerConfig();
  const base = cookieBase();
  response.cookies.set(config.sessionCookieName, value.accessToken, {
    ...base,
    httpOnly: true,
  });
  response.cookies.set(config.refreshCookieName, value.refreshToken, {
    ...base,
    httpOnly: true,
  });
  response.cookies.set(config.csrfCookieName, randomBytes(32).toString('base64url'), {
    ...base,
    httpOnly: false,
  });
}

export function writeRefreshedAccessToken(response: NextResponse, accessToken: string) {
  const config = getServerConfig();
  response.cookies.set(config.sessionCookieName, accessToken, {
    ...cookieBase(),
    httpOnly: true,
  });
}

// The backend rotates the refresh token on every /auth/refresh call (the old
// one is deleted server-side) — the new one must be stored here or the next
// refresh attempt has nothing valid left to present.
export function writeRefreshedTokens(response: NextResponse, value: { accessToken: string; refreshToken: string }) {
  const config = getServerConfig();
  const base = cookieBase();
  response.cookies.set(config.sessionCookieName, value.accessToken, {
    ...base,
    httpOnly: true,
  });
  response.cookies.set(config.refreshCookieName, value.refreshToken, {
    ...base,
    httpOnly: true,
  });
}

export function clearSession(response: NextResponse) {
  const config = getServerConfig();
  const base = cookieBase();
  for (const name of [config.sessionCookieName, config.refreshCookieName, config.csrfCookieName]) {
    response.cookies.set(name, '', { ...base, maxAge: 0, httpOnly: name !== config.csrfCookieName });
  }
}

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) {
    throw new ClientRequestProblem('Diese Anfrage wurde abgelehnt.', 403);
  }

  try {
    const url = new URL(origin);
    // A TLS reverse proxy can forward the request with its private upstream
    // host while the browser still sends the public Learn origin. Accept that
    // one explicitly configured public origin; direct requests still need to
    // match the request host exactly. Never trust an arbitrary forwarded host.
    // Use dynamic env access: Next.js statically inlines direct
    // `process.env.NEXT_PUBLIC_*` reads during the build, while this value is
    // deliberately supplied by Dokploy at container runtime.
    const configuredSiteUrl = Reflect.get(process.env, 'NEXT_PUBLIC_SITE_URL');
    let configuredOrigin = '';
    if (typeof configuredSiteUrl === 'string' && configuredSiteUrl.trim()) {
      try {
        configuredOrigin = new URL(configuredSiteUrl.trim()).origin;
      } catch {
        configuredOrigin = '';
      }
    }
    if (url.origin !== configuredOrigin && url.host !== host) {
      throw new ClientRequestProblem('Diese Anfrage wurde abgelehnt.', 403);
    }
  } catch (error) {
    if (error instanceof ClientRequestProblem) throw error;
    throw new ClientRequestProblem('Diese Anfrage wurde abgelehnt.', 403);
  }
}

export function assertCsrf(request: NextRequest) {
  const expected = request.cookies.get(cookieNames().csrf)?.value;
  const supplied = request.headers.get('x-csrf-token');
  if (!expected || !supplied) {
    throw new ClientRequestProblem('Diese Anfrage wurde abgelehnt.', 403);
  }

  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) {
    throw new ClientRequestProblem('Diese Anfrage wurde abgelehnt.', 403);
  }
}
