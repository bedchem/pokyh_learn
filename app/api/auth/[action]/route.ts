import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { BackendProblem, backendFetch } from '@/lib/server/backend';
import { getServerConfig, isDemoMode } from '@/lib/server/config';
import {
  assertSameOrigin,
  clearSession,
  getAccessToken,
  getRefreshToken,
  writeSession,
} from '@/lib/server/session';

const credentialsSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

const registerSchema = z.object({
  username: z.string().trim().toLowerCase().min(3).max(30).regex(/^[a-z0-9_-]+$/),
  password: z.string().min(8).max(200),
});

type AuthResponse = {
  token: string;
  refreshToken: string;
  user: Record<string, unknown>;
};

function problem(error: unknown) {
  if (error instanceof BackendProblem) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message || 'Ungültige Eingabe.' }, { status: 422 });
  }
  const message = error instanceof Error ? error.message : 'Die Anfrage konnte nicht verarbeitet werden.';
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;

  try {
    assertSameOrigin(request);
    const config = getServerConfig();

    if (action === 'login' || action === 'register') {
      const payload = action === 'login' ? credentialsSchema.parse(await request.json()) : registerSchema.parse(await request.json());
      const result = await backendFetch<AuthResponse>(`/auth/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const response = NextResponse.json({ user: result.user });
      writeSession(response, { accessToken: result.token, refreshToken: result.refreshToken });
      return response;
    }

    if (action === 'refresh') {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return NextResponse.json({ error: 'Sitzung abgelaufen.' }, { status: 401 });
      const result = await backendFetch<{ token: string }>('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const response = NextResponse.json({ ok: true });
      response.cookies.set(config.sessionCookieName, result.token, {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        httpOnly: true,
        domain: config.cookieDomain,
        maxAge: 60 * 60,
      });
      return response;
    }

    if (action === 'logout') {
      const accessToken = await getAccessToken();
      const refreshToken = await getRefreshToken();
      if (accessToken && refreshToken) {
        await backendFetch('/auth/logout', {
          method: 'POST',
          token: accessToken,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        }).catch(() => undefined);
      }
      const response = NextResponse.json({ ok: true });
      clearSession(response);
      return response;
    }

    return NextResponse.json({ error: 'Unbekannte Authentifizierungsaktion.' }, { status: 404 });
  } catch (error) {
    return problem(error);
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (action !== 'me') return NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404 });

  try {
    if (isDemoMode()) return NextResponse.json({ user: { username: 'Demo' } });
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    const user = await backendFetch('/auth/me', { token, cache: 'no-store' });
    return NextResponse.json({ user });
  } catch (error) {
    return problem(error);
  }
}
