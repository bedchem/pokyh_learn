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

function boundedPositiveInteger(name: string, fallback: number, maximum: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  if (!/^[0-9]+$/.test(raw)) {
    throw new Error(`${name} must be a positive integer`);
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be between 1 and ${maximum}`);
  }
  return value;
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
    bffBodyLimitBytes: boundedPositiveInteger('LEARN_BFF_BODY_LIMIT_BYTES', 102_400, 100 * 1024 * 1024),
    bffImportBodyLimitBytes: boundedPositiveInteger('LEARN_BFF_IMPORT_BODY_LIMIT_BYTES', 10 * 1024 * 1024, 100 * 1024 * 1024),
    sessionCookieName: optional('LEARN_SESSION_COOKIE_NAME', 'pokyh_learn_session'),
    refreshCookieName: optional('LEARN_REFRESH_COOKIE_NAME', 'pokyh_learn_refresh'),
    csrfCookieName: optional('LEARN_CSRF_COOKIE_NAME', 'pokyh_learn_csrf'),
    cookieDomain: process.env.LEARN_COOKIE_DOMAIN?.trim() || undefined,
  };
}

/**
 * These values are intentionally public but read on the server at request
 * time. Using a `NEXT_PUBLIC_*` variable here would freeze the deployed notice
 * version into the Docker image at build time, which breaks runtime Compose
 * configuration and can show a stale legal notice.
 */
export function getPublicLearnLegalConfig() {
  const privacyNoticeUrl = process.env.LEARN_PRIVACY_NOTICE_URL?.trim() || '';
  const privacyNoticeVersion = process.env.LEARN_PRIVACY_NOTICE_VERSION?.trim() || '';
  let safeUrl = '';
  try {
    const url = new URL(privacyNoticeUrl);
    const allowedProtocol = process.env.NODE_ENV === 'production' ? url.protocol === 'https:' : ['http:', 'https:'].includes(url.protocol);
    if (allowedProtocol && url.hostname) safeUrl = url.toString();
  } catch {
    // Invalid configuration leaves sign-in unavailable rather than rendering an unsafe link.
  }
  return { privacyNoticeUrl: safeUrl, privacyNoticeVersion };
}

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_LEARN_DEMO_MODE === 'true';
}
