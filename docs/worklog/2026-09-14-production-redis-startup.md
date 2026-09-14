## 2026-09-14 07:55 CEST — backend production startup diagnosis and Compose hotfix

- Intent: Diagnose the reported production deployment failure without changing
  existing Pokyh application routes or any operator-owned environment file.
- Outcome: The deployment log showed that Compose correctly stopped the API
  because the internal Redis dependency was unhealthy. The pinned Redis image
  runs an ownership-preparation step before its server process; the previous
  combination of that step and `cap_drop: ALL` prevented the preparation from
  completing. The Redis service now starts as its image-provided unprivileged
  `redis` account, retains its read-only filesystem, temporary cache data
  volume, dropped capabilities and no-new-privileges policy, and becomes
  healthy. The backend Compose setup also mounts the selected runtime
  environment as a raw, read-only config for MySQL initialisation so secret
  values are not needlessly placed in the MySQL process environment. A small
  operator wrapper prevents local Docker Compose project-env interpolation of
  literal secret characters.
- Affected areas: `pokyh-backend/docker-compose.yml`,
  `pokyh-backend/scripts/compose-stack.sh`, `pokyh-backend/README.md`, and
  `pokyh-backend/prisma/schema.prisma`.
- Verification:
  - Recreated the local stack with the same `docker compose --env-file … up
    -d --no-build --force-recreate --remove-orphans` shape used by the
    deployment platform; MySQL, Redis and the API reported healthy.
  - Confirmed the API readiness endpoint returned its ready status after the
    schema synchronisation completed.
  - Confirmed the production-safe Prisma schema removes unsupported literal
    defaults from MySQL text/long-text columns; the backend can apply its
    schema instead of continuing with a failed synchronisation warning.
  - This worklog intentionally contains no environment values, credentials,
    request bodies, account data or production log payloads.
- Risk / next step: The active public API remains unavailable until this
  reviewed backend change is committed, pushed to the deployment branch and
  redeployed by the hosting platform. The direct platform command may still
  emit a Compose interpolation warning for an operator environment file with
  literal dollar signs; service runtime loading remains raw and the verified
  workaround is the supplied local wrapper. Confirm the exact Git author and
  release scope before a commit or push.
- Release state: uncommitted

## 2026-09-14 09:24 CEST — public API 502 and CORS follow-up

- Intent: Diagnose the browser-reported cross-origin failures and repeated
  same-origin Mensa proxy failures without changing operator-owned production
  configuration.
- Outcome: The public API returned `502 Bad Gateway` for its readiness route
  and for each tested browser preflight target. This response is generated
  before the Express application runs, so it cannot contain the application's
  CORS headers. The local Compose stack running the reviewed startup fix was
  healthy; its equivalent `OPTIONS` request returned `204` with the configured
  frontend origin, credential support, methods, and required request headers.
  The frontend Mensa route is a small server-side proxy to the API's dishes
  route, so its `502` is a downstream consequence of the same unavailable API,
  not an independent Mensa failure.
- Affected areas: Production verification only. No application route or
  operator environment file was changed in this follow-up.
- Verification:
  - Public readiness and API preflight probes returned `502`.
  - The local backend stack reported healthy and returned `200` from readiness.
  - The local preflight from the Pokyh frontend origin returned the expected
    CORS response headers.
  - The previously reviewed Redis-startup fix is available on the backend
    deployment branch as `fd6e013`.
- Risk / next step: The hosting platform must redeploy the current deployment
  branch and show a healthy application container before a public CORS retest
  is meaningful. After it is healthy, keep the configured frontend origins as
  literal comma-separated HTTPS origins (not Markdown links) and recheck the
  browser preflight. This worklog contains no environment values, credentials,
  request bodies, account data, or copied production logs.
- Release state: backend fix pushed `origin/main` at `fd6e013`; this follow-up
  worklog update is uncommitted.

## 2026-09-14 07:57 CEST — hotfix verification follow-up

- Intent: Re-run the release checks after documenting the production startup
  fix and confirm the application uses the configured runtime API key.
- Outcome: The hotfix remains reproducible locally. The first host-shell key
  probe was intentionally disregarded because it did not load the
  operator-owned runtime configuration; the equivalent request from inside
  the application container succeeded.
- Affected areas: Verification only; no additional application behaviour was
  changed by this check.
- Verification:
  - `scripts/compose-stack.sh config --quiet` passed.
  - Backend TypeScript/Prisma generation build, admin production build,
    production-dependency audit and whitespace check passed; the audit found
    no high-severity production dependency findings.
  - Recreated the Compose stack with no image rebuild. MySQL, Redis and the
    API all reported healthy; the readiness endpoint returned its ready
    status.
  - An authenticated Learn catalogue request made within the application
    container succeeded, confirming its configured runtime API-key path.
- Risk / next step: Keep the release state uncommitted until the human owner
  confirms the exact author identity, commit scope and push destination.
- Release state: uncommitted
