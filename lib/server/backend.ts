import 'server-only';

import { getServerConfig } from '@/lib/server/config';

export class BackendProblem extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'BackendProblem';
  }
}

interface BackendRequest extends RequestInit {
  token?: string | null;
  cache?: RequestCache;
  next?: { revalidate?: number; tags?: string[] };
}

export async function backendFetch<T>(path: string, init: BackendRequest = {}): Promise<T> {
  const { token, headers: initHeaders, next, cache, ...requestInit } = init;
  const config = getServerConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.backendUrl}${path}`, {
      ...requestInit,
      cache,
      next,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'X-API-Key': config.apiKey,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...initHeaders,
      },
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new BackendProblem(body?.error || 'The learning service is unavailable.', response.status);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof BackendProblem) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new BackendProblem('The learning service did not answer in time.', 504);
    }
    throw new BackendProblem('The learning service could not be reached.', 503);
  } finally {
    clearTimeout(timeout);
  }
}
