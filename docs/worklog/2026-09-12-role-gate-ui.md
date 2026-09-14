# Learn role-gate UI

## 2026-09-12 12:15 Europe/Rome — route-gate implementation started

- Intent: make group/class management unavailable in the Learn interface to
  non-administrators while preserving the backend as the authorization source
  of truth.
- Outcome: pending implementation of server-rendered route gates and a
  capability-limited course-creation form.
- Affected areas: `app/teams/`, `app/create/course/`, Learn form components,
  and a small server-only access helper.
- Verification: pending targeted type, lint, and production-build checks.
- Risk / next step: browser UI restrictions are defence in depth only; the
  additive backend authorization checks remain required for every request.
- Release state: uncommitted.

## 2026-09-12 23:01 Europe/Rome — route gates and capability-limited form completed

- Intent: prevent non-administrators from managing Learn groups/classes or
  selecting group-scoped course visibility in the web UI.
- Outcome: added a server-only administrator gate backed by `GET /learn/me`;
  `/teams`, `/teams/new`, and `/teams/:slug` now deny before fetching team
  data. Course creation requires a confirmed session and renders/fetches group
  options only when the server reports the canonical administrator capability.
  The submit payload likewise omits group visibility and `teamId` unless that
  capability is present.
- Affected areas: `lib/server/learn-admin.ts`, three team routes, course
  creation, and group/course form copy.
- Verification: targeted ESLint and `git diff --check` passed. Repository-wide
  TypeScript validation is currently blocked by pre-existing/in-flight
  `DashboardData` versus `dashboard-view` contract errors; it reported no
  errors in the changed role-gate files.
- Risk / next step: final release validation must rerun once the dashboard
  contract work lands. Backend authorization remains the mandatory enforcement
  layer for direct requests and modified browser payloads.
- Release state: uncommitted.
