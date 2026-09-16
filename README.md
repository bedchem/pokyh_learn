# Pokyh Learn

Pokyh Learn is the web learning platform for courses, vocabulary, targeted
review, grammar practice, personal content, and teams. It is served at
`learn.pokyh.com` and uses the existing Pokyh backend at `api.pokyh.com`.

## What is included

- public course catalogue with language and level discovery;
- responsive learner dashboard with a next lesson, review queue, goal, and
  active course progress;
- structured course paths and Italian article/grammar learning context;
- focused vocabulary and quiz interfaces with clear feedback;
- personal/team/library/admin surfaces with explicit access boundaries;
- same-origin Next.js BFF that keeps backend credentials and user tokens out
  of browser storage;
- additive backend integration for durable courses, vocabulary, reviews,
  attempts, teams, and access grants;
- CI for linting, type checks, and production builds.

## Architecture

```text
Browser
  -> learn.pokyh.com (Next.js)
  -> same-origin BFF route handlers
  -> api.pokyh.com (existing Pokyh backend)
  -> MySQL (durable) + optional private analytics cache (Redis)
```

The browser never receives the backend API key. Protected user tokens are
stored in HttpOnly cookies and the backend repeats authorization for every
resource and write.

Read the canonical product and engineering contract in
[`CLAUDE.md`](./CLAUDE.md), the visual system in
[`UI/CLAUDE.md`](./UI/CLAUDE.md), and the detailed documents under `docs/`.

## Local setup

Requirements:

- Node.js 20.9 or newer
- A configured Pokyh backend for live data

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

`NEXT_PUBLIC_LEARN_DEMO_MODE=true` is an explicitly local-only visual demo
mode. It is disabled by default and must never be enabled in production.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | yes | public canonical Learn URL |
| `PORT` | optional | HTTP listener port; Compose defaults to `3005` |
| `LEARN_BIND_ADDRESS` | optional | Docker host bind address; defaults to loopback (`127.0.0.1`) |
| `API_BACKEND_URL` | yes | server-only Pokyh API URL |
| `API_BACKEND_KEY` | yes | server-only API key for the backend gate |
| `LEARN_SESSION_COOKIE_NAME` | yes | HttpOnly access-session cookie name |
| `LEARN_REFRESH_COOKIE_NAME` | yes | HttpOnly refresh-session cookie name |
| `LEARN_CSRF_COOKIE_NAME` | yes | CSRF double-submit cookie name |
| `NEXT_PUBLIC_LEARN_CSRF_COOKIE_NAME` | yes | public cookie-name metadata used to echo the CSRF token |
| `LEARN_COOKIE_DOMAIN` | optional | cookie domain scope |
| `LEARN_API_PREFIX` | yes | backend Learn API path prefix |
| `LEARN_API_TIMEOUT_MS` | yes | BFF request deadline |
| `LEARN_BFF_BODY_LIMIT_BYTES` | yes | maximum ordinary JSON body accepted by the public BFF |
| `LEARN_BFF_IMPORT_BODY_LIMIT_BYTES` | yes | maximum JSON library-import body accepted by the public BFF |
| `NEXT_PUBLIC_LEARN_DEMO_MODE` | local only | renders non-production presentation data |

The WebUntis sign-in form reads its required acknowledgement state, public
notice URL, and current notice version at request time from the backend's
API-key-protected Learn configuration. Do not duplicate those values in the
frontend environment: the backend is the legal-gate authority. A production
login remains intentionally unavailable until the backend also has its
documented, non-secret WebUntis authorisation reference. Read
[the legal readiness record](./docs/legal-readiness.md) before enabling the
feature; configuration alone does not create a legal basis.

Never commit `.env.local`, API keys, tokens, passwords, or provider keys.

## Docker deployment

The Compose configuration runs **only this Next.js frontend**. It does not
start, replace, or network-link a Pokyh backend; production traffic continues
from the same-origin BFF to the separately deployed `api.pokyh.com` configured
in `API_BACKEND_URL`.

```bash
cp .env.example .env
# Set API_BACKEND_KEY and the production values in .env.
docker compose --env-file .env up --build -d
```

The repository also includes a self-contained `docker-compose.yml` as a
compatibility entry point for deployment platforms that invoke that filename
explicitly. Keep it aligned with `compose.yaml` when changing deployment
settings.

By default the service listens at `http://127.0.0.1:3005`. Keep that loopback
binding and terminate TLS in a reverse proxy for `learn.pokyh.com`. If a
different listener is intentional, set both values in the selected env file:

```dotenv
PORT=3005
LEARN_BIND_ADDRESS=127.0.0.1
```

Compose reads `.env` by default. To use a separately managed runtime file
without changing the project file, select it with `--env-file`. Compose passes
the explicitly required runtime values into the container and fails early with
the missing variable name if one is absent:

```bash
docker compose --env-file /secure/path/learn.env up --build -d
```

The image contains no `.env` files and accepts secrets only at container
startup. The health endpoint at `/api/health` checks local configuration only;
it intentionally does not make an upstream API request.

### Scrolling and motion

The frontend bundles Lenis from the local dependency lockfile; it does not load
scroll code from a CDN. Lenis enhances pointer-wheel scrolling only when the
learner has not requested reduced motion. Native browser scrolling remains the
baseline: touch scrolling is not synchronized, anchor links, keyboard movement,
and focus behavior must remain usable if the enhancement is unavailable.

Dialogs, form controls, popovers, and nested interactive scroll regions use
`data-lenis-prevent` so they retain native scrolling. Do not make a learning
action, saving, feedback, or navigation depend on a scroll animation. Test
reduced-motion, keyboard, touch, focus, anchors, and nested scrolling whenever
this behavior changes.

## Commands

```bash
npm run dev        # development server
npm run lint       # ESLint
npm run typecheck  # strict TypeScript check
npm run build      # production build
npm run start      # run production server
```

## Backend deployment requirements

The backend must allow `https://learn.pokyh.com` through its explicit CORS
configuration and provide the Learn routes defined in `docs/api-contract.md`.
The server remains the authority for roles, content visibility, course access,
team membership, grading, review scheduling, imports, and exports.

MySQL is the durable store. The current backend Compose stack starts an
internal Redis service only for an optional private, course-specific analytics
response cache after access has been checked. It stores no raw answers,
credentials, permissions, or durable state and falls back to MySQL when absent.
The Learn frontend has no Redis credentials and never connects to Redis. Queue,
distributed-idempotency, and broader-cache claims remain out of scope until
separately implemented and reviewed.

## Verification and release

Before shipping:

```bash
npm ci
npm run lint
npm run typecheck
npm run build
```

Also verify the important browser flows against a configured backend, including
an unauthorized request and a small/mobile layout. The GitHub workflow repeats
the deterministic frontend checks for pushes and pull requests.

## Documentation

- [`docs/architecture.md`](./docs/architecture.md) — data, security, cache,
  deployment, and lifecycle design
- [`docs/api-contract.md`](./docs/api-contract.md) — BFF/backend API contract
- [`docs/decisions.md`](./docs/decisions.md) — key product and technical
  decisions
- [`docs/legal-readiness.md`](./docs/legal-readiness.md) — operational
  WebUntis/Italy production gate and review checklist
