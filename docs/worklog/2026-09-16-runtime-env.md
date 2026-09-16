## 2026-09-16 08:55 CEST — local runtime environment

- Intent: Create a working local `.env` for the Dokploy/Compose frontend
  runtime using the operator-provided endpoint and deployment settings.
- Outcome: Added the ignored `.env` with plain URL values, port/bind settings,
  server-only backend credentials, cookie names, BFF limits, and demo mode
  disabled. Legal notice version/URL were not duplicated because the backend
  remains the authority for that configuration.
- Affected areas: Local runtime configuration only; no secret was added to
  tracked files.
- Verification: `docker compose --env-file .env -f docker-compose.yml config
  --quiet` passed. The configured backend catalogue request returned HTTP 200
  with valid JSON; the current backend response contains zero published public
  courses. All required environment keys were present. A production image
  started with this `.env` returned health `200` and rendered the sign-in page
  without the privacy-configuration warning; the test container was removed.
- Risk / next step: The API key was pasted into chat and should be rotated after
  deployment. Set `NEXT_PUBLIC_SITE_URL` to the real HTTPS Learn hostname for
  a public deployment; the current value targets local port 3005. The live
  `learn.pokyh.com/api/health` still returns `503`, proving the deployed
  container has not received the same runtime environment or has not been
  recreated after the environment update.
- Release state: local-only `.env`; committed `d53c7fc`, push in progress
