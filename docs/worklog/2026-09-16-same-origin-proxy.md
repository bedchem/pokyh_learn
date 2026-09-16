## 2026-09-16 CEST — production proxy origin behind reverse proxy

- Intent: Diagnose the reported `POST /api/auth/login` `403` after the
  runtime environment fix.
- Finding: The frontend rejected the request before contacting the backend
  because the browser's public `Origin` was compared with the reverse proxy's
  internal upstream `Host`. The backend Learn route and API-key fingerprints
  were inspected without exposing values; the local frontend/backend key
  fingerprints matched.
- Change: `assertSameOrigin` now accepts the exact origin derived from the
  configured `NEXT_PUBLIC_SITE_URL` in addition to a direct request-host
  match. The server lookup uses runtime env access so Next.js cannot bake a
  local `NEXT_PUBLIC_*` value into the production bundle. Arbitrary origins
  and missing Origin/Host headers remain rejected. No backend authorization or
  legal-gate check was weakened.
- Verification: Lint, TypeScript, and diff checks passed. With a production
  site URL configured, a request using the public Learn Origin and an internal
  upstream Host reached the backend boundary and returned the expected
  upstream-unavailable `503`; a foreign Origin and a missing Origin remained
  `403`. The production build and built-server smoke test passed with the same
  result. No real credentials were used. The backend repository was inspected
  and did not require a code change.
- Release state: uncommitted; deploy the frontend change and recreate the
  Dokploy service before retesting the real WebUntis login.
