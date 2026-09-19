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
    // A self-hosted, CPU-only AI response can legitimately take much longer
    // than a normal API round-trip — kept separate from timeoutMs above so
    // ordinary Learn routes are not affected by this more generous budget.
    // Must stay above the backend's own LEARN_AI_OLLAMA_TIMEOUT_MS (default
    // 180s): a cold start (model not yet resident in Ollama) measured ~150s
    // in testing, and the BFF must not cut the connection before the backend
    // itself would have timed out.
    aiTimeoutMs: boundedPositiveInteger('LEARN_AI_API_TIMEOUT_MS', 220_000, 600_000),
    sessionCookieName: optional('LEARN_SESSION_COOKIE_NAME', 'pokyh_learn_session'),
    refreshCookieName: optional('LEARN_REFRESH_COOKIE_NAME', 'pokyh_learn_refresh'),
    csrfCookieName: optional('LEARN_CSRF_COOKIE_NAME', 'pokyh_learn_csrf'),
    cookieDomain: process.env.LEARN_COOKIE_DOMAIN?.trim() || undefined,
  };
}

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_LEARN_DEMO_MODE === 'true';
}
