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

export function writeSession(
  response: NextResponse,
  value: { accessToken: string; refreshToken: string },
) {
  const config = getServerConfig();
  const base = cookieBase();
  response.cookies.set(config.sessionCookieName, value.accessToken, {
    ...base,
    httpOnly: true,
    maxAge: 60 * 60,
  });
  response.cookies.set(config.refreshCookieName, value.refreshToken, {
    ...base,
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
  });
  response.cookies.set(config.csrfCookieName, randomBytes(32).toString('base64url'), {
    ...base,
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function writeRefreshedAccessToken(response: NextResponse, accessToken: string) {
  const config = getServerConfig();
  response.cookies.set(config.sessionCookieName, accessToken, {
    ...cookieBase(),
    httpOnly: true,
    maxAge: 60 * 60,
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
    maxAge: 60 * 60,
  });
  response.cookies.set(config.refreshCookieName, value.refreshToken, {
    ...base,
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
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
    if (url.host !== host) {
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
