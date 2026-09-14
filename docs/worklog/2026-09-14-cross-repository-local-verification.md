# Cross-repository local verification

## Scope

Local verification of the POKYH frontend, POKYH backend, and POKYHlearn
services, including their authentication boundary and Docker production build.

## Findings and changes

- The POKYH frontend WebUntis route authenticates with WebUntis first, then
  calls the backend with a server-only service credential to establish the
  POKYH API session. That service credential must be present at runtime; it is
  documented in the frontend environment example and is never exposed to the
  browser.
- The backend rotates refresh tokens. The frontend BFF now persists the
  replacement httpOnly refresh cookie together with the replacement access
  token, so a second refresh remains valid.
- The frontend validates its production session-encryption secret when a
  session is used instead of while Next.js collects route configuration at
  image-build time. A running production container still fails closed if that
  secret is absent or too short; the secret is not copied into the image.

## Confidentiality

This worklog intentionally contains no credentials, tokens, request bodies,
or personal data.

## Verification

- `pokyh-backend`: API TypeScript/Prisma build and administrator-panel build
  passed. The rebuilt Compose image starts successfully, publishes the API on
  `0.0.0.0:4000`, passes `/readyz`, serves `/admin/`, retains the configured
  CORS allow-list, rejects an untrusted browser origin, and contains no
  cloudflared binary.
- `pokyh-frontend`: production Next.js build and Docker image build passed.
  A runtime container returned its homepage successfully. An authorized
  WebUntis sign-in established a backend identity, completed two consecutive
  refresh-token rotations, and logged out successfully.
- `pokyh_learn-frontend`: lint, typecheck, production build, Compose image
  build, and container health check passed. An authorized WebUntis sign-in,
  backend identity lookup, two CSRF-protected refresh rotations, and logout
  passed with the backend's legal gate temporarily disabled only for the local
  integration test. The normal production gate was restored afterwards.

The production Learn gate remains deliberately closed until the backend
operator supplies its required non-secret WebUntis authorisation reference,
HTTPS privacy-notice URL, and notice version. Those values must not be guessed
or substituted during development.
