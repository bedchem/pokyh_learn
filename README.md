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
  -> MySQL / optional Redis cache layer
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
| `API_BACKEND_URL` | yes | server-only Pokyh API URL |
| `API_BACKEND_KEY` | yes | server-only API key for the backend gate |
| `LEARN_SESSION_COOKIE_NAME` | yes | HttpOnly access-session cookie name |
| `LEARN_REFRESH_COOKIE_NAME` | yes | HttpOnly refresh-session cookie name |
| `LEARN_CSRF_COOKIE_NAME` | yes | CSRF double-submit cookie name |
| `NEXT_PUBLIC_LEARN_CSRF_COOKIE_NAME` | yes | public cookie-name metadata used to echo the CSRF token |
| `LEARN_COOKIE_DOMAIN` | optional | cookie domain scope |
| `LEARN_API_PREFIX` | yes | backend Learn API path prefix |
| `LEARN_API_TIMEOUT_MS` | yes | BFF request deadline |
| `NEXT_PUBLIC_LEARN_DEMO_MODE` | local only | renders non-production presentation data |

Never commit `.env.local`, API keys, tokens, passwords, or provider keys.

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

MySQL is the durable store. Redis should be introduced as a configured,
failure-safe deployment dependency before multi-instance cache/idempotency or
distributed review scheduling is enabled.

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
