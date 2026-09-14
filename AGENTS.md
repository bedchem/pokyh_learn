<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Multi-agent coordination

More than one AI coding agent — including multiple concurrent **Claude Code**
sessions, and possibly ChatGPT/Codex or others — may be working in this
repository and its siblings (`pokyh-backend`, `pokyh-frontend`) at the same
time. You are expected to **collaborate, not collide**: read this file before
you start, avoid re-doing or undoing another agent's active work, and update
it when your own work state changes. Follow these rules regardless of which
agent or session you are:

1. **Never delete existing content, files, or another agent's uncommitted
   changes** without the human owner explicitly asking for that specific
   deletion. If `git status` shows unfamiliar modified/untracked files when
   you start, that is very likely another agent's in-progress work — leave it
   alone, build additively around it, and mention it to the user rather than
   removing or overwriting it.
2. Before running anything destructive (`git checkout`/`reset`/`clean`, `rm`,
   overwriting a file another agent might be mid-edit on), stop and check with
   the user first.
3. Read this file's "Currently in progress" section below before editing any
   of the listed files/areas — a concurrent edit there is likely to conflict
   with active work.
4. When you finish a work session that touched shared areas, update the
   "Currently in progress" section so the next agent (human or AI) knows the
   current state.

## Currently in progress

This delivery spans the three sibling repositories. Treat every uncommitted
change as shared work. Do not delete, revert, rename, overwrite wholesale, or
``git clean`` any file unless the human owner explicitly targets that change.

- **`pokyh_learn-frontend`**: flat Pokyh-aligned light/dark design, selectable
  German/English/Italian interface preferences, purposeful reduced-motion-safe
  motion, SEO/runtime configuration, public catalogue gating, and the Learn
  authoring/learner surfaces. Active shared files include `app/`,
  `components/`, `lib/i18n.ts`, `lib/server/`, `docs/`, deployment files, and
  this coordination file.
- **Public catalogue and personal-route boundary (completed, uncommitted)**:
  `/catalog` and its previews now use a no-sidebar discovery frame with search
  and published-public content only. Personal routes resolve a verified Learn
  identity server-side; guest authoring controls and personal navigation are
  hidden. Preserve the backend's independent authorization checks and the
  documented external API-outage boundary when changing these files.
- **Learn group/class UI boundary (completed, uncommitted)**: team-management
  pages use the backend-confirmed `GET /learn/me` administrator capability
  before fetching group data. Normal learners are routed to the catalogue and
  cannot select group visibility in the course form. Preserve this as an
  interface guard only; every backend route must continue to enforce the same
  authorization independently.
- **Documentation/coordination contract (completed, uncommitted)**: the
  repository contracts now require PR/conflict inspection, non-destructive
  hand-offs, factual worklogs, and a tested checkpoint plus explicit
  `Name <email>`/scope before any commit or push. The Learn architecture/API/
  decision documents describe the current private analytics and
  administrator-only group boundary; preserve those distinctions when editing
  related UI or backend work.
- **Docker/runbook alignment (completed, uncommitted)**: the Learn and backend
  READMEs now document port `3005`, the paired `--env-file`/runtime-env-file
  Compose invocation, optional private Redis analytics caching, backend Learn
  administration, Lenis accessibility behavior, and the absence of an
  off-host backup or reviewed production-migration claim. Treat those as
  operational boundaries rather than a deployment-completion claim.
- **BFF request-boundary hardening (completed, uncommitted)**: the same-origin
  Learn proxy is being tightened to reject path traversal, malformed or
  oversized JSON, invalid idempotency headers, and unhelpful internal error
  output before a request is forwarded. Keep the backend as the authorization
  authority and do not relax its independent validation.
- **`pokyh-backend`**: additive `/learn` API, WebUntis-only identity boundary,
  Learn administration, API-key lifecycle work, audit logging, validation,
  rate limits, Prisma models, and operational configuration examples. Do not
  alter existing Pokyh routes or any real `.env` file while working on Learn.
- **Local integration verification (completed, uncommitted)**: the three
  services were rebuilt and exercised together on 2026-09-14. The backend now
  uses externally managed ingress rather than an in-container tunnel and
  publishes its Compose port on `0.0.0.0`; see the factual, credential-free
  worklog entry for test results. Preserve the production Learn legal gate and
  do not alter a real environment file to bypass it.
- **`pokyh-frontend`**: the existing legal information pages are being
  extended for the separate Learn product. Preserve the established Pokyh
  legal content and company/address fields; add reviewed Learn-specific copy
  beside it rather than replacing the existing product notices.

Before touching one of these areas, inspect `git status`, read the relevant
contract/docs, and add an entry to `docs/worklog/` for material changes. Keep
logs free of credentials, tokens, personal data, request bodies, and private
reasoning. Before committing or pushing, obtain the human owner's explicit
confirmation of the release scope and Git author name/email; never add
automated co-author trailers.
