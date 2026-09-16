## 2026-09-16 09:40 CEST — self-contained Dokploy Compose runtime

- Intent: Resolve the live `503 misconfigured` state even when the Dokploy
  runtime has the supplied environment values, by removing the compatibility
  file's dependency on Compose `extends` support and cross-file resolution.
- Outcome: Made `docker-compose.yml` self-contained with the same build,
  runtime `env_file`, port, security, and health-related container settings as
  `compose.yaml`. The application Legal Gate remains enabled and server-owned;
  no security check was removed.
- Affected areas: Dokploy Compose entrypoint and deployment documentation.
- Verification: The exact Dokploy-style command with the local operator
  environment passed Compose validation. The Docker image built successfully;
  an isolated container using the same `.env` returned health `200`, served the
  sign-in page with `200` and without the configuration warning, and served the
  catalogue BFF with `200` and valid JSON. The test container was removed.
- Risk / next step: Keep `compose.yaml` and `docker-compose.yml` aligned. The
  operator must still provide the real `.env` to Dokploy; it is ignored and
  never committed.
- Release state: committed `5246e36`; push in progress
