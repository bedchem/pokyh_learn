## 2026-09-16 09:55 CEST — explicit Compose runtime injection

- Intent: Fix the live frontend's `503 misconfigured` state even though the
  operator has supplied the expected environment values, and make missing
  deployment variables fail at Compose startup with a clear variable name.
- Outcome: Both Compose entrypoints now inject the required frontend runtime
  variables explicitly from the command's `--env-file`; they no longer depend
  on long-form `env_file` handling. The legal gate remains enabled and backend
  authoritative.
- Affected areas: `compose.yaml`, `docker-compose.yml`, `Dockerfile`, Docker
  deployment runbook.
- Verification: `docker compose ... config --quiet` passed with the private
  operator environment and `.env.example`; a missing-variable check failed as
  intended. `npm run lint`, `npm run typecheck`, and `git diff --check` passed.
  A separate production-image container on host port 3006 returned health
  `200`. A fresh image build could not complete because this host could not
  resolve Docker Hub (`auth.docker.io`), first for the remote Dockerfile
  syntax and, after removing that dependency, for the `node:22-alpine` base
  image. No application build error was observed.
- Risk / next step: Dokploy must recreate the service from the new commit and
  provide the same plain environment values through its `.env`/Environment
  configuration. Secrets are not committed. The hosted endpoint must be
  checked after redeploy; the current live `503` is an old/misconfigured
  runtime state, not evidence to bypass the legal gate.
- Release state: checkpoint committed as `304fc26` and pushed to `origin/main`;
  hosted redeployment remains pending.
