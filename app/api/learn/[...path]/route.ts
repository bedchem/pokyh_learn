import { NextRequest, NextResponse } from 'next/server';

import { BackendProblem, backendFetch } from '@/lib/server/backend';
import { getServerConfig } from '@/lib/server/config';
import { assertCsrf, assertSameOrigin, getAccessToken } from '@/lib/server/session';

const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const token = await getAccessToken();
    const config = getServerConfig();
    const method = request.method.toUpperCase();

    if (mutatingMethods.has(method)) {
      assertSameOrigin(request);
      assertCsrf(request);
    }

    const search = request.nextUrl.search;
    const body = method === 'GET' || method === 'HEAD' ? undefined : await request.text();
    const response = await backendFetch<unknown>(`${config.apiPrefix}/${path.map(encodeURIComponent).join('/')}${search}`, {
      method,
      token,
      cache: 'no-store',
      headers: {
        ...(body ? { 'Content-Type': request.headers.get('content-type') || 'application/json' } : {}),
        ...(request.headers.get('idempotency-key') ? { 'Idempotency-Key': request.headers.get('idempotency-key')! } : {}),
      },
      body,
    });
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof BackendProblem) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Die Anfrage konnte nicht verarbeitet werden.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
