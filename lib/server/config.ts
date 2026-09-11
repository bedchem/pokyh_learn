import 'server-only';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required server configuration: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

export function getServerConfig() {
  const backendUrl = new URL(required('API_BACKEND_URL'));
  const apiPrefix = optional('LEARN_API_PREFIX', '/learn');
  const configuredTimeout = Number.parseInt(optional('LEARN_API_TIMEOUT_MS', '8000'), 10);

  if (!apiPrefix.startsWith('/')) {
    throw new Error('LEARN_API_PREFIX must start with a slash');
  }

  return {
    backendUrl: backendUrl.toString().replace(/\/$/, ''),
    apiKey: required('API_BACKEND_KEY'),
    apiPrefix: apiPrefix.replace(/\/$/, ''),
    timeoutMs: Number.isFinite(configuredTimeout) && configuredTimeout > 0 && configuredTimeout <= 60_000 ? configuredTimeout : 8000,
    sessionCookieName: optional('LEARN_SESSION_COOKIE_NAME', 'pokyh_learn_session'),
    refreshCookieName: optional('LEARN_REFRESH_COOKIE_NAME', 'pokyh_learn_refresh'),
    csrfCookieName: optional('LEARN_CSRF_COOKIE_NAME', 'pokyh_learn_csrf'),
    cookieDomain: process.env.LEARN_COOKIE_DOMAIN?.trim() || undefined,
  };
}

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_LEARN_DEMO_MODE === 'true';
}
