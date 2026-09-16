## 2026-09-16 08:43 CEST — Dokploy Compose entrypoint

- Intent: Fix the deployment failure shown in the Dokploy log, which stopped
  before the Dockerfile build because the platform requested
  `docker-compose.yml` while the repository provided only `compose.yaml`.
- Outcome: Added a compatibility `docker-compose.yml` that extends the single
  frontend service from `compose.yaml`, and documented the two supported entry
  points. Dockerfile, runtime secrets, and backend configuration remain
  unchanged.
- Affected areas: Compose deployment entrypoint and Docker runbook.
- Verification: Dokploy-style Compose resolution with
  `--env-file .env.example -f docker-compose.yml config` passed. The Docker
  image built successfully with the existing multi-stage Dockerfile. An
  isolated container from that image returned health `200`, stayed running,
  and ran as the non-root `nextjs` user; the test container was then removed.
- Risk / next step: Dokploy still needs the operator-managed `.env` values,
  especially a matching `API_BACKEND_KEY`, at deployment time. This change
  fixes the missing Compose filename and does not embed or alter runtime
  secrets.
- Release state: committed `66d370a`; push in progress
