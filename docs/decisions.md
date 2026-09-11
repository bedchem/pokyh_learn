# Pokyh Learn architecture decisions

This record captures the decisions that keep the learning product coherent as
it grows. Each decision is intended to be implemented additively in the
existing Pokyh backend and consumed by the Next.js frontend.

An ADR records a durable direction, not a promise that every corresponding
endpoint is already mounted. Read [the API contract](./api-contract.md) for
the current route surface and [the documentation hub](./README.md) for the
capability ledger.

## ADR-001 — Reuse the existing Pokyh identity

**Status:** Accepted

**Context:** The backend already has users, signed JWT access tokens, hashed
refresh tokens, administrators, and a stable account identifier. A separate
Learn account would create duplicate credentials, confusing sign-in, uncertain
ownership, and migration work.

**Decision:** Use `User.stableUid` as the Learn principal. Create
`LearnProfile` lazily after a valid Pokyh session reaches Learn. Registration
and sign-in stay in the established backend authentication flow; Learn stores
preferences and learning state, not a second password or identity.

**Consequences:** A person registered with Pokyh can enter Learn with the same
account. Usernames are display data only, while ownership and access use the
stable UID. Any account lifecycle operation must preserve or explicitly migrate
the Learn graph.

## ADR-002 — Use `learn.pokyh.com` as a same-origin BFF, with the API as authority

**Status:** Accepted

**Context:** The product must use `api.pokyh.com`, but browser access to that
API would expose a shared API key and make cookies/CORS harder to constrain.
The frontend needs a dependable boundary for session refresh, request shaping,
and user-friendly errors.

**Decision:** The Next.js application is a backend-for-frontend. Browsers call
only same-origin routes on `learn.pokyh.com`; these server routes call the API
with the existing API key and user JWT. The API owns every read authorization,
write validation, quiz decision, and state mutation.

**Consequences:** No database or grading logic belongs in client components.
Session credentials use secure HttpOnly cookies at the Learn origin. Direct
browser traffic is limited by `LEARN_ALLOWED_ORIGINS`; a separate service-key
boundary remains a future hardening option, not a mounted requirement.

## ADR-003 — Make server-side RBAC resource-scoped and deny by default

**Status:** Accepted

**Context:** Learners can create personal courses; selected people may add
vocabulary; teams may share a course; and administrators may grant writing
rights. A single global writer flag cannot express these cases safely.

**Decision:** Put all authorization in one server-side policy service with
resource-aware actions. Use course ownership, explicit `LearnCourseAccess`
grants (`VIEW`, `EDIT`, `MANAGE`), active `LearnTeamMember` membership, and
the existing Pokyh administrator record. Team roles manage teams but do not
implicitly grant content-edit access.

**Consequences:** Every route performs its own server-side policy evaluation;
the frontend only uses returned capabilities to shape the interface. Direct
grants and team access can be revoked immediately and are auditable. A course
manager is powerful only within the granted course; a global administrator is
the only cross-course authority.

## ADR-004 — Treat course visibility and publication as separate concerns

**Status:** Accepted

**Context:** A creator needs private courses, direct sharing with people, team
courses, and catalog courses. An audience alone does not say whether an
unfinished course should be visible.

**Decision:** Store lifecycle (`DRAFT`, `PUBLISHED`, `ARCHIVED`) separately
from audience. The mounted audience values are `PRIVATE`, `TEAM`, and
`PUBLIC`; person-to-person sharing is currently represented by an explicit
course grant. A future `PEOPLE` enum is optional rather than implied—it must be
introduced only through a reviewed migration if direct grants cease to express
the product need. Newly imported and newly created courses begin as private
drafts.

**Consequences:** Catalog queries are simple, safe, and cacheable. Unpublished
work cannot leak due to a temporary team/access change. Clients must use direct
grants for individual sharing today and must not send an unsupported `PEOPLE`
visibility value.

## ADR-005 — Keep MySQL durable and Redis disposable

**Status:** Accepted

**Context:** The product needs fast catalogs, dashboard updates, rate limiting,
and background verification, while a lost cache must never erase learning
progress or distort a quiz.

**Decision:** Use MySQL/Prisma transactions for all authoritative courses,
permissions, enrollments, review state, quiz attempts, audit events, and import
jobs. Use Redis only for namespaced cache entries, distributed rate limits,
invalidation signals, and queue coordination. Durable job payload/status is
also persisted in MySQL.

**Consequences:** Redis restart means a bounded performance degradation and
cache refill, not a logout or lost answer. No review queue or expected answer
snapshot is shared in Redis. Production health checks distinguish durable
database readiness from optional cache availability, while rate-limit policy
defines whether temporary Redis loss should fail closed for sensitive routes.

## ADR-006 — Grade quizzes on a server-created snapshot

**Status:** Planned hardening; current implementation uses direct per-answer attempts

**Context:** A browser can be refreshed, retried, altered, or offline. If it
receives answer keys or controls the due date, it can accidentally or
deliberately corrupt review history. Content may also change between starting a
quiz and submitting it.

**Decision:** The current `POST /quiz-attempts` route grades one or more
submitted entries transactionally and persists `LearnQuizAttempt` plus review
state. A future `POST /quizzes` may create a durable, short-lived
`LearnQuizSession` plus item rows containing the entry revision, direction, and
server-only expected-answer snapshot. The question response exposes only opaque
question IDs and learner-visible prompts. Submission is a single batched,
idempotent transaction that writes one `LearnQuizAttempt` and updates
`LearnVocabularyReview` rows.

**Consequences:** Wrong answers reliably enter the `MISTAKES` queue and do not
vanish after refresh or Redis eviction. A retry receives its original result,
not a second score. Algorithm changes can be versioned and applied prospectively
without invalidating historical attempts. Quiz length and expiry come from
policy/configuration, not browser literals.

## ADR-007 — Model answer variants and verification separately from display text

**Status:** Planned hardening; current implementation stores author text and an unverified/verified flag

**Context:** A vocabulary prompt can have valid articles, synonyms, punctuation
variants, or several pedagogically accepted translations. A single string is
not a stable answer contract. External dictionary data is useful but may be
incomplete, ambiguous, or mismatched to the lesson's intended sense.

**Decision:** Store the authored display translation on
`LearnVocabularyEntry`, accepted quiz variants in
`LearnVocabularyAcceptedAnswer`, and verification facts in
`LearnVocabularyValidation`. Normalize answers according to language policy on
the server. Use a locally ingested Kaikki/Wiktionary-derived snapshot as the
preferred suggestion source; retain manual editorial approval as the final
authority.

**Consequences:** Quiz grading remains consistent even when provider data is
down or updated. An editor sees `UNVERIFIED`, `VERIFIED`, or `FLAGGED` status
without automatic rewriting. Snapshot provenance, data date, attribution, and
licensing review are recorded before source-derived content is shown or reused.

## ADR-008 — Offer personal, versioned JSON portability rather than a raw database feature

**Status:** Planned; no import/export route is mounted

**Context:** Users need to retain and move their own learning content. A raw
database export or import would expose other people, grants, audit data,
credentials, and internal identifiers.

**Decision:** Provide asynchronous personal export/import jobs with a
`pokyh-learn-export` versioned JSON envelope. A user exports only their allowed
data. Import validates before writing, remaps identifiers, makes copied content
private drafts, and strips owners, roles, grants, team membership, and secret
data. Full database backup/restore remains an operator-only process outside the
application API.

**Consequences:** The feature supports portability without privilege escalation.
Imports are bounded, idempotent, auditable, and can produce a detailed report.
Incompatible review intervals are normalized to a safe due state instead of
being accepted as proof of mastery.

## ADR-009 — Use teams for audience, not implicit authorship

**Status:** Partially implemented; current route supports list/create and direct member upsert

**Context:** A learner should be able to create a team and share selected
courses, but broad team roles can make it too easy to alter educational content
or unintentionally expose it.

**Decision:** Teams use `OWNER`, `MANAGER`, and `MEMBER` only for team
membership and metadata. A `TEAM` course gives eligible members view/enrollment
access; course writing requires direct `EDIT`/`MANAGE` or ownership. The current
route performs a direct upsert for a known Pokyh user; invitation acceptance and
ownership transfer remain future work.

**Consequences:** A team manager can organize a group without changing every
course linked to it. Removing a member invalidates team-derived read access
immediately. Deleting a team turns linked courses private and preserves their
content, preventing a cascading loss of learning materials.

## ADR-010 — Preserve Learn data across school-year maintenance

**Status:** Implemented guard; regression coverage remains required

**Context:** School-year maintenance deletes school-only users after archiving
school data. Learn relations cascade from `User`, so Learn-bearing accounts
must not enter that deletion set.

**Decision:** The archive process now reads `LearnProfile` stable UIDs and
retains those users alongside administrators. Team-member and course-access
provisioning also creates a lightweight Learn profile, so a person with durable
Learn data is protected even before opening the dashboard. Any future account
deletion flow must explicitly retain, anonymize, export, or delete the Learn
graph transactionally; it must never rely on a foreign-key cascade by accident.

**Consequences:** The prior rollover blocker is resolved. Keep an automated
rollover regression test: create a normal learner with a course, team, quiz
attempt, and due review; perform a controlled rollover; then assert that the
same records remain accessible on next sign-in. This remains a release check,
not an unresolved implementation blocker.

## ADR-011 — Prefer reviewed migrations and feature flags to startup surprises

**Status:** Accepted

**Context:** The backend currently can apply additive schema changes during
startup. It intentionally avoids destructive statements, but a live feature
needs a known database shape, indexes, and safe rollback plan.

**Decision:** Add Learn tables and indexes through reviewed Prisma migrations,
apply them in staging before production, and expose the route only behind
environment-controlled feature flags. The application readiness check verifies
the required schema and dependency health before a feature flag is enabled.

**Consequences:** Existing routes and data stay untouched. A failed migration
does not expose partially working authoring or quiz endpoints. Rollback means
disabling the feature flag while retaining additive data, rather than dropping
tables or resetting the backend.

## ADR-012 — Keep secrets in environment configuration and learning policy in administration

**Status:** Accepted

**Context:** Operators need to configure origins, Redis, limits, dictionary
sources, catalog behavior, and moderation. Hardcoding values makes deployments
fragile; putting secrets in a dashboard risks disclosure.

**Decision:** Store hosts, credentials, cryptographic material, provider
endpoints, and operational limits in environment configuration. Store only
non-secret business policy (such as default catalog behavior, quiz maximum,
moderation requirement, and retention window) in an administrator-managed
settings model with revisions and audit events.

**Consequences:** The dashboard reports configuration health, never secret
values. Configuration changes use optimistic concurrency and audit history.
Every environment can point to its own backend, allowed origin, cache, and
provider without code edits.

## ADR-013 — Build for low-latency reads without trusting device state

**Status:** Planned hardening; current reads use bounded database queries and BFF cache policy

**Context:** Learning feels best when the dashboard, catalog, and next review
appear immediately. A device may be offline or have stale content, however.

**Decision:** Use bounded dashboard endpoints, keyset pagination, ETags,
Redis-backed read caching, and a per-user device cache of safe read models and
drafts. Use idempotent batch submit for quiz answers. The server still
determines enrollment, progress, access, correctness, and due dates.

**Consequences:** A cached dashboard can paint quickly and refresh in the
background, while a lost device cache causes only a refetch. Offline drafts can
be saved with a unique idempotency key; quiz completion is confirmed only after
the server transaction succeeds. This avoids duplicate requests and preserves
the authority of persistent state.
