import { NextRequest, NextResponse } from 'next/server';

import { BackendProblem, backendFetch } from '@/lib/server/backend';
import { getServerConfig } from '@/lib/server/config';
import { ClientRequestProblem, readValidatedJsonBody } from '@/lib/server/request-body';
import { assertCsrf, assertSameOrigin, clearSession, getAccessToken, getRefreshToken, writeRefreshedTokens } from '@/lib/server/session';

const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const privateHeaders = { 'Cache-Control': 'private, no-store, max-age=0' };

function safePath(prefix: string, path: string[], search: string) {
  if (!path.length || path.length > 12) {
    throw new ClientRequestProblem('Ungültiger Learn-Endpunkt.', 400);
  }

  const segments = path.map((segment) => {
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      throw new ClientRequestProblem('Ungültiger Learn-Endpunkt.', 400);
    }
    if (
      !segment
      || segment.length > 160
      || decoded === '.'
      || decoded === '..'
      || decoded.includes('/')
      || decoded.includes('\\')
    ) {
      throw new ClientRequestProblem('Ungültiger Learn-Endpunkt.', 400);
    }
    return encodeURIComponent(segment);
  });

  return `${prefix}/${segments.join('/')}${search}`;
}

function idempotencyHeader(request: NextRequest) {
  const value = request.headers.get('idempotency-key');
  if (!value) return undefined;
  if (value.length > 200 || !/^[A-Za-z0-9._:-]+$/.test(value)) {
    throw new ClientRequestProblem('Ungültiger Wiederholungsschlüssel.', 400);
  }
  return value;
}

function publicProblem(error: unknown) {
  if (error instanceof ClientRequestProblem) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers: privateHeaders });
  }
  if (error instanceof BackendProblem) {
    if (error.status >= 500) {
      return NextResponse.json({ error: 'Der Lerndienst ist vorübergehend nicht verfügbar.' }, { status: 503, headers: privateHeaders });
    }
    return NextResponse.json({ error: error.message }, { status: error.status, headers: privateHeaders });
  }
  return NextResponse.json({ error: 'Die Anfrage konnte nicht verarbeitet werden.' }, { status: 500, headers: privateHeaders });
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const token = await getAccessToken();
    const method = request.method.toUpperCase();
    // Browser callers never receive the server API key. Reject protected BFF
    // requests before contacting the upstream service so an anonymous request
    // cannot be used to probe its availability or error shape. The only
    // anonymous Learn read is the already-public catalogue preview.
    const isPublicCatalogRead = method === 'GET' && path.length > 0 && path[0] === 'catalog';
    if (!token && !isPublicCatalogRead) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401, headers: privateHeaders });
    }

    const config = getServerConfig();

    if (mutatingMethods.has(method)) {
      assertSameOrigin(request);
      assertCsrf(request);
    }

    const search = request.nextUrl.search;
    const endpoint = safePath(config.apiPrefix, path, search);
    const bodyLimit = path.join('/') === 'library/import' ? config.bffImportBodyLimitBytes : config.bffBodyLimitBytes;
    const body = method === 'GET' || method === 'HEAD' ? undefined : (await readValidatedJsonBody(request, bodyLimit)).raw;
    const key = idempotencyHeader(request);
    const requestBackend = (accessToken: string | null) => backendFetch<unknown>(endpoint, {
      method,
      token: accessToken,
      cache: 'no-store',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(key ? { 'Idempotency-Key': key } : {}),
      },
      body,
    });

    try {
      const response = await requestBackend(token);
      return NextResponse.json(response, { headers: privateHeaders });
    } catch (error) {
      // A 401 cannot have mutated a protected API route. Renew once inside the
      // BFF, retry the original safe/idempotent request, and keep all tokens
      // out of browser JavaScript. Any failed renewal clears the stale session.
      if (!(error instanceof BackendProblem) || error.status !== 401) throw error;
      const refreshToken = await getRefreshToken();
      if (!refreshToken) throw error;
      try {
        // The backend rotates the refresh token on every /auth/refresh call
        // (the old one is deleted server-side) — the new one must be stored
        // here or the next 401-triggered refresh has nothing valid to present.
        const refreshed = await backendFetch<{ token: string; refreshToken: string }>('/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
          cache: 'no-store',
        });
        const response = await requestBackend(refreshed.token);
        const proxied = NextResponse.json(response, { headers: privateHeaders });
        writeRefreshedTokens(proxied, { accessToken: refreshed.token, refreshToken: refreshed.refreshToken });
        return proxied;
      } catch {
        const expired = NextResponse.json({ error: 'Sitzung abgelaufen. Bitte melde dich erneut an.' }, { status: 401, headers: privateHeaders });
        clearSession(expired);
        return expired;
      }
    }
  } catch (error) {
    return publicProblem(error);
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
