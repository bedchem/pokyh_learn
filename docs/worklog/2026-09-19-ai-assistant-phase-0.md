# 2026-09-19 — AI assistant ("KIbo"), Phase 0: infra, pilot grants, text chat

## Intent

User request (verbatim intent, translated from German, via `/plan`): integrate
a self-hosted Ollama AI model into Pokyh Learn — auto-detect/download/start
the model automatically, persist chat history server-side and show it in the
frontend, support multiple concurrent users, brand it as a Pokyh-Learn-aware
assistant ("KIbo") reachable as a bottom-right popup when a user has access,
give the backend its own admin area for rate limiting and AI configuration,
let the assistant know about Pokyh's own websites via admin-added URLs that
get scraped, and make it CPU-only and resource-efficient in Docker. Mid-plan
and mid-implementation follow-ups (also verbatim intent): the assistant should
also fact-check itself against multiple live websites (not just the static
scrape); it should support file/image uploads and voice memos; it should offer
a fast-vs-thinking response mode; the specific Ollama model to use is
`gemma4:e4b`; emphatically CPU-only, no GPU, optimize everything; and
(mid-Phase-0) per-user *and* per-team backend configuration granularity should
eventually be possible, with a better-structured admin UI — noted below as an
explicit Phase 1 extension rather than reworked mid-batch (see "Deferred").

Both repos' `git status` and open-PR state were checked before starting:
`pokyh_learn-frontend` had only the expected auto-regenerated `next-env.d.ts`
diff; `pokyh-backend` was clean. No open PRs on either repo.

Full plan researched via three parallel Explore agents (frontend BFF/UI
patterns, backend routes/schema/rate-limiting, architecture docs + full Docker
topology across both repos) and one Plan agent, refined with live web research
(confirmed Gemma 4/E4B is real — released April 2026, Apache 2.0, native
vision+audio, edge-optimized "effective parameter" design; confirmed Ollama's
current stable release `v0.34.2` via the project's own GitHub releases page;
confirmed Ollama's native audio-input field is not yet a stable, standard part
of its chat API as of this research), approved via `/plan` (plan file
`replicated-exploring-moore.md` in the Claude Code plan store).

**Confirmed product decisions from the user during planning:** per-user pilot
grants (not a global toggle); personalized learning-data context included
from day one, not deferred; `gemma4:e4b` as the model.

**Scope discipline:** this batch implements Phase 0 only, per the approved
phased roadmap — infra auto-provisioning, per-user access grants, personalized
context, and text-only chat. File/image uploads, voice memos, the curated
site-scraping knowledge base, live multi-source web search, the fast/thinking
mode toggle, and the admin SPA config page are explicitly deferred to later
phases (see "Deferred" below) rather than attempted as one unreviewable batch.

## Changes — `pokyh-backend`

- `prisma/schema.prisma`: new models `LearnAiConversation`, `LearnAiMessage`
  (with a client-supplied `idempotencyKey`, unique per conversation — a retry
  returns the stored exchange instead of calling the model, and counting
  against quota, a second time), `LearnAiAccessGrant` (the pilot allowlist —
  the *only* thing that grants access), `LearnAiUsageCounter` (hour-floored,
  MySQL-authoritative quota ledger), `LearnAiConfig` (admin-editable policy
  singleton, sibling to `LearnConfig` rather than merged into its already
  ~30-field row). Added the corresponding `User` back-relations.
- `src/config.ts`: new `config.learnAi.*` block (enabled/model/context
  tokens/rate limit/Ollama URL+timeout/personalized-context flag) and
  `config.learnAiAllowedHosts` — environment-only egress allow-list (defaults
  to `ollama`, the internal Docker service name), mirroring
  `learnDictionaryAllowedHosts`'s "policy is admin-editable, the host
  allow-list stays environment-only" split.
- `src/services/learnAiConfig.ts` (new): `getLearnAiConfig()` /
  `updateLearnAiConfig()`, exact `learnConfig.ts` resolve-with-env-fallback +
  30s-cache pattern.
- `src/services/learnAiOllama.ts` (new): `safeOllamaUrl()` egress guard
  (HTTPS/HTTP + environment-only host allow-list, mirrors
  `safeProviderUrl()`), `ensureModelReady()` (check `/api/tags`, `POST
  /api/pull` with streamed NDJSON progress logging if missing — a separate,
  much longer timeout constant than any chat call), `isModelReady()`, `chat()`
  (calls `/api/chat` with a bounded `num_ctx`/`num_predict`).
- `src/services/learnAiAccess.ts` (new): `hasActiveAiGrant`,
  `requireAiPilotAccess`, `grantAiAccess`, `revokeAiAccess`,
  `listAiAccessGrants`.
- `src/services/learnAiContext.ts` (new): `buildPersonalizedContext()` — the
  privacy-critical, read-only, `stableUid`-scoped assembly of due-review
  count, active-course progress, and streak. Never cached, never merged into
  any shared table.
- `src/services/learnAiRateLimit.ts` (new): `assertWithinAiQuota` /
  `recordAiUsage` — MySQL is authoritative (holds correctly with Redis fully
  absent); a Redis fast-rejection accelerator is explicitly left as a future,
  non-load-bearing optimization rather than implemented now.
- `src/services/learnAiConversations.ts` (new): conversation/message CRUD,
  ownership checks that report "not found" rather than "forbidden" for
  another user's conversation id, idempotency-key dedup, system prompt +
  personalized context + last-20-messages history assembly, transactional
  persistence of the user/assistant message pair plus the quota increment.
- `src/middleware/rateLimiter.ts`: new `learnAiLimiter` (baseline abuse
  protection, `stableUid`-keyed like the other Learn limiters — the real
  per-hour product limit is the MySQL-backed one above).
- `src/routes/learnAi.ts` (new router, deliberately **not** added into the
  already-2700-line, actively-shared `learn.ts` — see `AGENTS.md`'s "Active
  shared areas"): `GET /access`, `GET/POST /conversations`, `GET/DELETE
  /conversations/:id`, `POST /conversations/:id/messages`.
- `src/routes/index.ts`: mounted `/learn/ai` ahead of the general `/learn`
  prefix (Express matches in registration order).
- `src/routes/learn.ts`: exported `learnAudit`/`ensureLearnProfile` for reuse
  by the new router (instead of duplicating them); `/learn/me` now returns
  `canUseAiAssistant` (grant present AND the admin kill-switch on) — a
  capability hint only, every `/learn/ai/*` route re-checks independently.
- `src/index.ts`: `void ensureModelReady()` wired in alongside
  `startArchiver()`/`startPushPoller()` — fire-and-forget, never gates
  `/readyz` or delays the HTTP server listening.
- `scripts/grant-ai-access.js` / `scripts/revoke-ai-access.js` (new, same
  style as `make-admin.js`) + matching `package.json` scripts — Phase 0 has no
  admin UI yet (that's Phase 1), so this is the interim way to add/remove a
  pilot user.
- `docker-compose.yml`: new `ollama` service — stock (non-CUDA) image pinned
  to `0.34.2` (verified against the project's GitHub releases page at the
  time of writing), **opt-in via a Compose profile (`ai`)** so an existing
  deployment that has not chosen to run the assistant is unaffected by a
  plain `docker compose up`, internal-only `ai-internal` network (separate
  from `database`, no host port), named `ollama_data` volume (model persists
  across restarts), `OLLAMA_NUM_PARALLEL`/`OLLAMA_MAX_LOADED_MODELS`/
  `OLLAMA_NUM_THREAD` all env-overridable (not hardcoded), placeholder
  `mem_limit`/`cpus` explicitly flagged as needing verification against the
  real host. `app` joins `ai-internal` but does **not** hard-`depends_on`
  `ollama` — the app must stay fully usable (everything except `/learn/ai/*`)
  whether or not the AI profile is running.
- `.env.example`, `README.md`: new `LEARN_AI_*` variables documented, plus a
  new "AI assistant service (optional)" deployment section.

## Changes — `pokyh_learn-frontend`

- `lib/server/backend.ts`: `backendFetch` accepts an optional `timeoutMs`
  override (falls back to the existing `config.timeoutMs`).
- `lib/server/config.ts`: new `aiTimeoutMs` (`LEARN_AI_API_TIMEOUT_MS`,
  default 220s, raised from an initial 90s guess after live testing — see
  "Follow-up: live end-to-end verification" below) — a self-hosted CPU-only
  reply can legitimately take longer than a normal Learn API call.
- `app/api/learn/[...path]/route.ts`: the existing catch-all proxy is
  otherwise **unchanged** — it now just selects the longer timeout when
  `path[0] === 'ai'`. No new BFF route file.
- `lib/server/data.ts`, `components/layout/app-shell.tsx`: `CurrentIdentity`
  and `getLearnIdentity()` gained `canUseAiAssistant`.
- `components/learn/ai-assistant.tsx` (new): the bottom-right popup, built on
  the exact focus-trap/overlay idiom already used by
  `vocabulary-quick-add.tsx`'s `QuickAddVocabularyButton` rather than a new
  dialog library. Loads the most recent conversation on open, sends messages
  with a stable per-compose idempotency key, shows an optimistic pending
  bubble, surfaces server errors (quota/not-ready/forbidden) inline.
- `app/globals.css`: `.ai-launcher`/`.ai-assistant-overlay`/
  `.ai-assistant-panel`/`.ai-message*` — z-index 15 for the launcher (above
  the mobile bottom-nav's 10, below the mobile-menu/quick-add overlays' 20/30
  so opening the nav covers it), mobile offset clearing the fixed bottom-nav,
  all colors via existing design tokens (no new hardcoded palette).
- `lib/i18n.ts`: new `ai.*` keys in all three locales (de/en/it).
- `docs/api-contract.md`: new "AI assistant" section documenting the mounted
  `/learn/ai/*` routes; updated "Intentionally not mounted" to list the
  still-unmounted later phases explicitly.
- `docs/architecture.md`: new "AI assistant" section; updated the
  "Implementation status" summary.
- `docs/decisions.md`: new **ADR-016** (self-host, CPU-only, per-user pilot
  gate, personalized context never leaves the requesting user's scope,
  correctness authority never moves to the model).
- `README.md`, `CLAUDE.md`: new env var rows/route list entries kept in sync
  with the above (CLAUDE.md is this repo's own canonical contract document,
  not just `docs/`, so it was updated too for consistency).

## Deferred (explicitly, per the approved phased plan)

Conversation history UI (list/switch between conversations) and the admin SPA
config page (Phase 1); file/image uploads (Phase 2); voice memos via local
Whisper transcription (Phase 3); the admin-curated site knowledge base —
blocked on the human supplying the actual first-party URL list (Phase 4); live
multi-source web search/fact-check via a self-hosted SearXNG instance (Phase
5); the fast/thinking response-mode toggle (Phase 6). The mid-batch request for
per-team (not just per-user) configuration granularity and a better-structured
admin UI is folded into Phase 1's admin-page design rather than reworked into
Phase 0's schema ad hoc.

## Verification

- `pokyh-backend`: `npx prisma generate` and `npx prisma validate` both clean
  against the new schema; `npx tsc --noEmit` clean; no ESLint config exists in
  this repo (confirmed, not skipped).
- `pokyh_learn-frontend`: `npm run typecheck`, `npm run lint`, and `npm run
  build` (production, Turbopack) all clean.
- Live end-to-end verification against the real local Docker/MySQL stack —
  see "Follow-up: live end-to-end verification" below.
- **Still not verified, flagged rather than glossed over:**
  - No interactive browser click-through of the new popup (Chrome
    browser-automation extension not connected in this environment) —
    compile-time verification, the CSS/JS being present in the production
    build, and the fully-verified backend API it calls stand in for it,
    matching this repo's own established practice for prior Learn UI batches
    when that tool isn't available.
  - Real production Dokploy host RAM/CPU for the Ollama container's
    `mem_limit`/`cpus` was never confirmed by the user (they specified the
    model instead of a hardware tier when asked) — the compose values are
    explicit placeholders. The live test below ran on a constrained sandbox
    host (12GB total RAM, 11 CPUs) and is not a substitute for sizing against
    the real target host.

## Follow-up (same day) — live end-to-end verification

Per the user's explicit go-ahead, actually started the `ai` Compose profile,
let it pull the real `gemma4:e4b` model, and exercised the new API against
the running local stack (existing `mysql`/`redis`/`app` containers, `app`
rebuilt with this batch's code).

### Bug found and fixed: `ai-internal` network blocked Ollama's own egress

`docker-compose.yml`'s `ai-internal` network was marked `internal: true`,
modeled on `database`. The first live pull attempt failed instantly:
`dial tcp: lookup registry.ollama.ai on 127.0.0.11:53: server misbehaving` —
an `internal: true` network blocks **all** traffic including outbound egress,
not just unsolicited inbound. Inbound protection was already fully achieved
by never publishing a host port for `ollama` (Docker only exposes what is
explicitly published, `internal: true` or not) — the flag was actively
harmful here since Ollama itself needs outbound access to pull a model, and a
later phase's SearXNG search will too. Fixed by dropping `internal: true`
from `ai-internal` (kept as its own network, still separate from `database`,
just no longer egress-blocked). Confirmed outbound access from a throwaway
container on the *default* bridge network first (reached
`registry.ollama.ai`, got a real HTTP response), which is what pointed at the
network flag rather than a host-level restriction as the actual cause.

### Verified working end-to-end (real requests, real model, real database)

- `applyAdditiveSchema()` applied the new tables automatically and safely on
  the rebuilt `app` container's boot: `"Database ready (schema applied,
  connected)"` — resolves the earlier "not verified" schema-push gap for
  real (the earlier sandboxed throwaway-container failure was an unrelated
  DNS quirk reaching Prisma's own engine-binary CDN from a one-off container,
  not a problem with the schema or with the real app's boot sequence).
- `ollama pull gemma4:e4b` succeeded once the network was fixed: real model,
  9.6GB, confirmed via `ollama list`. Its own `/api/tags` response reports
  `"capabilities":["completion","vision","audio","tools","thinking"]`,
  `"parameter_size":"8.0B"`, `"quantization_level":"Q4_K_M"`,
  `"context_length":131072` — independent confirmation this is a real,
  current model, and useful signal for later phases: Ollama already
  recognizes native `tools` (function-calling) and `thinking` (reasoning
  mode) capabilities for this model, which may simplify Phase 5 (live web
  search) and Phase 6 (fast/thinking toggle) beyond the manual/prompted
  fallbacks the approved plan assumed — to be evaluated when those phases
  start, not changed now.
- Created a throwaway pilot test user + `LearnAiAccessGrant` directly via
  Prisma (interactive `create-user.js` doesn't pipe cleanly through a
  non-interactive `docker exec`), minted a matching JWT inside the container
  using the real `JWT_SECRET` (never read/exposed outside the container).
- `GET /learn/ai/access` → `{"hasAccess":true,"modelReady":true,
  "rateLimitMessagesPerHour":30}`.
- `POST /learn/ai/conversations` → `201`, real conversation row created.
- `POST /learn/ai/conversations/:id/messages` with
  `"In one short sentence, what is Pokyh Learn?"` → **first call timed out at
  the then-default 60s** (cold start: Ollama had to load the 9.6GB model into
  memory before its first inference). Raised `LEARN_AI_OLLAMA_TIMEOUT_MS` to
  600000 for a fair measurement and retried: `201` in **152284ms**, a real,
  coherent, on-topic reply ("Pokyh Learn is your dedicated study companion
  designed to help you build your vocabulary and master grammar skills in a
  supportive and interactive environment."), `modelName: "gemma4:e4b"`,
  `mode: "fast"`, `promptTokens: 177`, `completionTokens: 431`. This measured
  cold-start cost is why `LEARN_AI_OLLAMA_TIMEOUT_MS`'s default was raised
  from 60s to 180s (backend) and `LEARN_AI_API_TIMEOUT_MS` from 90s to 220s
  (frontend BFF, which must stay above the backend's own timeout) in this
  same batch, and why `OLLAMA_KEEP_ALIVE`'s default was raised from 5m to
  30m — worth keeping the model resident through a normal gap between a
  pilot user's messages rather than reloading on every conversation.
- Retried the exact same request with the same `idempotencyKey` → `201` in
  **54ms**, identical message IDs returned, confirming the dedup path never
  calls the model or double-charges quota on a retry.
- A second test user with no `LearnAiAccessGrant` → `403
  {"error":"The assistant is not enabled for this account yet"}` on
  `POST /learn/ai/conversations` — the unauthorized-access-path release-gate
  check, confirmed for real rather than by code inspection alone.
- `GET /learn/me` for the granted user → `canUseAiAssistant: true`, confirming
  the capability-hint plumbing the frontend launcher gates on.
- `npx tsc --noEmit` re-confirmed clean in `pokyh-backend`, `npm run
  typecheck` re-confirmed clean in `pokyh_learn-frontend`, after the timeout
  default corrections above.
- Test data (one granted test user + conversation, one non-granted test
  user, the local `.env`'s `LEARN_AI_ENABLED=true` /
  `LEARN_AI_OLLAMA_TIMEOUT_MS` additions, and the pulled `gemma4:e4b` model
  in the `ollama_data` volume) was left in place in the existing shared local
  dev stack rather than torn down, matching this repo's established
  convention for prior verification sessions.

## Risk / next step

Low blast radius on the existing product: every backend change is additive
(new tables, new router mounted ahead of the existing one, one new field on
`/learn/me`, one new middleware limiter); the Ollama service is opt-in via a
Compose profile and not a hard dependency of `app`, so a deployment that does
not opt in is completely unaffected. The required-user-flow release-gate item
is now genuinely satisfied (real chat exchange, real unauthorized-path
rejection, both against the actual running stack) — the remaining open risk
is purely operational: the real production Dokploy host's available RAM/CPU
has still not been confirmed, and the live test above ran on a 12GB-RAM
sandbox (tight for a `mem_limit: 10g` container) rather than the real target
host, so `mem_limit`/`cpus` remain placeholders to validate before this ships
to production — a genuinely resource-constrained host would see cold-start
latency at or beyond the newly-raised timeout defaults, or memory pressure
Ollama isn't currently bounded against beyond the Docker `mem_limit` itself.

## Follow-up (same day) — team-level access grants

User follow-up (verbatim intent, translated): access should also be
configurable per team in the backend, not only per person. Added
`LearnAiTeamAccessGrant` (`pokyh-backend/prisma/schema.prisma`) — a whole-team
grant, additive to the personal `LearnAiAccessGrant`, either sufficient on its
own. `hasActiveAiGrant()` (`learnAiAccess.ts`) now checks both: a personal
grant, or membership (via `LearnTeamMember`) in a team holding an active team
grant. New `grantAiAccessToTeam`/`revokeAiAccessFromTeam`/
`listAiTeamAccessGrants`, and matching interim CLI scripts
`scripts/grant-ai-access-team.js`/`revoke-ai-access-team.js` (resolve by team
ID or exact name, same style as the personal-grant scripts) until Phase 1's
admin UI can manage both grant types from a proper list. Updated
`docs/api-contract.md`, `docs/architecture.md`, `docs/decisions.md` (ADR-016),
and the backend `README.md` to describe both grant types consistently.
`admin`-page/UI restructuring for Phase 1 (the other half of this same
follow-up request) remains a Phase 1 design item, not something reworked into
Phase 0's already-shipped popup.

### Verification

- `npx prisma generate` + `npx tsc --noEmit` clean in `pokyh-backend` after
  the schema/service additions.
- Rebuilt and restarted the same live local stack; `"Database ready (schema
  applied, connected)"` confirmed the new table applied automatically.
- Real end-to-end test: created a fresh user with **no personal grant**,
  added them to a new team → `POST /learn/ai/conversations` correctly `403`.
  Granted the team access via `LearnAiTeamAccessGrant` → the exact same user,
  same token, same route → `201`, purely from team membership. Confirms the
  two grant paths are genuinely independent and both enforced correctly.

## Release state

Committed, not pushed, per the user's explicit confirmation of scope
(commit both repos; don't push yet) and Git identity
(`Plattnericus <felix.plattner312009@outlook.de>`, matching recent commits in
both repos, confirmed rather than assumed):

- `pokyh-backend`: `f4e1b1901b915ce9f41e300e3dd96fc9bdae2572` — "Add Phase 0
  of the self-hosted AI assistant (\"KIbo\")"; `84bb5bcae0129708fa60caf08c35f2737e9268ea`
  — "Add team-level AI assistant access grants".
- `pokyh_learn-frontend`: `06afdb433c1ed6ffa29decc4e9af25e0cd4b0cc3` — "Add
  Phase 0 frontend for the self-hosted AI assistant (\"KIbo\")";
  `c0b7d9848edae98ac0bc5c24234fedd66119a3b1` — "Record Phase 0 AI assistant
  commit outcome in this worklog"; `216e1cbc29547b617d6f4d15f03164883923108e`
  — "Document team-level AI assistant access grants".
