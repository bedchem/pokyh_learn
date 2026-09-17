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

// The BFF proxy (app/api/learn/[...path]/route.ts) already tries a refresh
// once and clears the session cookies server-side before ever answering
// 401 — every 401 learnApi sees back is therefore a genuinely dead session,
// never a permission decision (those come back as 403). learnApi is only
// ever called from already-authenticated, AppShell-wrapped components, so
// there is no guest/public call site where a 401 here would be expected —
// send the browser straight to sign-in instead of leaving it on a page that
// can no longer do anything, with returnTo so a fresh login lands back here.
function redirectToSignIn() {
  if (typeof window === 'undefined' || window.location.pathname === '/sign-in') return;
  const returnTo = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
  // A deliberate hard navigation, not router.push: learnApi is a plain
  // utility with no component/router context, and a session invalidation
  // should drop all client state, not preserve it across a soft transition.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- no router available here by design; see comment above
  window.location.href = `/sign-in?returnTo=${returnTo}`;
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
    if (response.status === 401) redirectToSignIn();
    const error = payload && typeof payload === 'object' && 'error' in payload ? payload.error : undefined;
    throw new Error(error || 'Die Anfrage konnte nicht verarbeitet werden.');
  }
  return payload as T;
}
