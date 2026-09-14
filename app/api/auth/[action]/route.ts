import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { BackendProblem, backendFetch } from '@/lib/server/backend';
import { getServerConfig, isDemoMode } from '@/lib/server/config';
import { ClientRequestProblem, readValidatedJsonBody } from '@/lib/server/request-body';
import {
  assertCsrf,
  assertSameOrigin,
  clearSession,
  getAccessToken,
  getRefreshToken,
  writeRefreshedTokens,
  writeSession,
} from '@/lib/server/session';

const credentialsSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
  privacyNoticeVersion: z.string().trim().max(80).optional(),
});

type AuthResponse = {
  token: string;
  refreshToken: string;
  user: { isUntisUser?: boolean } & Record<string, unknown>;
};

const privateHeaders = { 'Cache-Control': 'private, no-store, max-age=0' };

function problem(error: unknown) {
  if (error instanceof ClientRequestProblem) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers: privateHeaders });
  }
  if (error instanceof BackendProblem) {
    if (error.status >= 500) {
      return NextResponse.json({ error: 'Der Anmeldedienst ist vorübergehend nicht verfügbar.' }, { status: 503, headers: privateHeaders });
    }
    return NextResponse.json({ error: error.message }, { status: error.status, headers: privateHeaders });
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message || 'Ungültige Eingabe.' }, { status: 422, headers: privateHeaders });
  }
  return NextResponse.json({ error: 'Die Anfrage konnte nicht verarbeitet werden.' }, { status: 500, headers: privateHeaders });
}

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;

  try {
    assertSameOrigin(request);
    if (action === 'login') {
      const payload = credentialsSchema.parse((await readValidatedJsonBody(request, getServerConfig().bffBodyLimitBytes)).value);
      const result = await backendFetch<AuthResponse>('/auth/learn-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (result.user.isUntisUser !== true) {
        return NextResponse.json({ error: 'Pokyh Learn ist nur mit einem bestätigten WebUntis-Konto verfügbar.' }, { status: 403, headers: privateHeaders });
      }
      const response = NextResponse.json({ user: result.user }, { headers: privateHeaders });
      writeSession(response, { accessToken: result.token, refreshToken: result.refreshToken });
      return response;
    }

    if (action === 'refresh') {
      assertCsrf(request);
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return NextResponse.json({ error: 'Sitzung abgelaufen.' }, { status: 401, headers: privateHeaders });
      const result = await backendFetch<{ token: string; refreshToken: string }>('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const response = NextResponse.json({ ok: true }, { headers: privateHeaders });
      writeRefreshedTokens(response, { accessToken: result.token, refreshToken: result.refreshToken });
      return response;
    }

    if (action === 'logout') {
      assertCsrf(request);
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
      const response = NextResponse.json({ ok: true }, { headers: privateHeaders });
      clearSession(response);
      return response;
    }

    return NextResponse.json({ error: 'Unbekannte Authentifizierungsaktion.' }, { status: 404, headers: privateHeaders });
  } catch (error) {
    return problem(error);
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (action !== 'me') return NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404, headers: privateHeaders });

  try {
    if (isDemoMode()) return NextResponse.json({ user: { username: 'Demo' } }, { headers: privateHeaders });
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401, headers: privateHeaders });
    const user = await backendFetch('/auth/me', { token, cache: 'no-store' });
    return NextResponse.json({ user }, { headers: privateHeaders });
  } catch (error) {
    return problem(error);
  }
}
