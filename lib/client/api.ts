'use client';

function csrfToken() {
  const name = `${process.env.NEXT_PUBLIC_LEARN_CSRF_COOKIE_NAME || 'pokyh_learn_csrf'}=`;
  const cookie = document.cookie.split('; ').find((entry) => entry.startsWith(name));
  return cookie?.slice(name.length) ?? '';
}

// The session-ending auth action lives at /api/auth/logout, not /api/learn/*,
// so it can't go through learnApi below — same CSRF header, different path.
export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken() },
  });
}

export async function learnApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || 'GET').toUpperCase();
  const response = await fetch(`/api/learn/${path.replace(/^\//, '')}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(method !== 'GET' && method !== 'HEAD' ? { 'X-CSRF-Token': csrfToken() } : {}),
      ...init.headers,
    },
  });

  const payload = (await response.json().catch(() => null)) as T | { error?: string } | null;
  if (!response.ok) {
    const error = payload && typeof payload === 'object' && 'error' in payload ? payload.error : undefined;
    throw new Error(error || 'Die Anfrage konnte nicht verarbeitet werden.');
  }
  return payload as T;
}
