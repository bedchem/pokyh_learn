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

**Status:** Implemented narrowly for a private course-specific analytics cache;
broader Redis roles remain planned.

**Context:** The product needs fast catalogs, dashboard updates, rate limiting,
and background verification, while a lost cache must never erase learning
progress or distort a quiz.

**Decision:** Use MySQL/Prisma transactions for all authoritative courses,
permissions, enrollments, review state, quiz attempts, daily activity
aggregates, audit events, and import jobs. The mounted Redis use is limited to a
short-lived analytics response for an already-authorized course view. Its key
uses an environment-controlled prefix and an opaque SHA-256 digest rather than
the stable user ID. Rate limits, queues, distributed idempotency, and broader
read caches are not Redis-backed Learn features at this point.

**Consequences:** Redis restart means a bounded performance degradation and a
MySQL read, not a logout or lost answer. No review queue, expected answer
snapshot, raw answer, permission, credential, or durable learning state is
stored there. A course-specific cache read follows a fresh `VIEW` check; broad
analytics are not served from Redis so a changed permission cannot be replayed
from that cache.

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

**Status:** Partially implemented; the current adapter stores an editorial text,
normalizes it for server grading, and records `UNVERIFIED`, `VERIFIED` or
`FLAGGED` against an explicit configured dictionary suggestion. Separate
accepted-answer revision history remains planned hardening.

**Context:** A vocabulary prompt can have valid articles, synonyms, punctuation
variants, or several pedagogically accepted translations. A single string is
not a stable answer contract. External dictionary data is useful but may be
incomplete, ambiguous, or mismatched to the lesson's intended sense.

**Decision:** Store the authored display translation on
`LearnVocabularyEntry`, accepted quiz variants in
`LearnVocabularyAcceptedAnswer`, and verification facts in
`LearnVocabularyValidation`. Normalize answers according to language policy on
the server. The current optional suggestion source is configured server-side
and invoked only by an editor; retain manual editorial approval as the final
authority.

**Consequences:** Quiz grading remains consistent even when provider data is
down or updated. An editor sees `UNVERIFIED`, `VERIFIED`, or `FLAGGED` status
without automatic rewriting. Snapshot provenance, data date, attribution, and
licensing review are recorded before source-derived content is shown or reused.

## ADR-008 — Offer personal, versioned JSON portability rather than a raw database feature

**Status:** Implemented for strict personal portability; platform migration and
backup remain outside the Learn API

**Context:** Users need to retain and move their own learning content. A raw
database export or import would expose other people, grants, audit data,
credentials, and internal identifiers.

**Decision:** Provide a synchronous, bounded personal export/import route with
a `pokyh-learn-personal-export` versioned JSON envelope. A user exports only
their own authored content and own learning state. Import validates before
writing, remaps identifiers, makes copied content private drafts, and strips
owners, roles, grants, team membership and secret data. Full database
backup/restore remains an operator-only process outside the application API.

**Consequences:** The feature supports portability without privilege escalation.
Imports are bounded and report created course/section/vocabulary counts. They
never overwrite data or grant privilege. A future asynchronous platform import
must add dry-run, durable audit and review-normalization policy before release.

## ADR-009 — Use teams for audience, not implicit authorship

**Status:** Implemented with canonical-administrator group management

**Context:** A team is a school/platform group boundary. Letting a learner-side
`OWNER` or `MANAGER` label create groups or alter membership would make it too
easy to change another person's learning access or unintentionally expose
course content.

**Decision:** Teams use `OWNER`, `MANAGER`, and `MEMBER` as membership labels.
A `TEAM` course gives eligible members view/enrollment access; course writing
requires direct `EDIT`/`MANAGE` or ownership. Only a canonical Pokyh
administrator, resolved server-side from the existing administrator sources,
can create a group, manage membership, or attach a course to a group. Every
member must be an existing verified WebUntis-backed Pokyh identity. There is no
public invitation/acceptance flow.

**Consequences:** A group label does not expand a learner's authority beyond
the course access it receives. Removing a member invalidates team-derived read
access immediately. Group deletion requires administrator confirmation and is
blocked while linked team courses exist, preventing cascading loss or silent
visibility changes.

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

**Status:** Implemented narrowly for private analytics; broader caching and
offline behavior remain planned

**Context:** Learning feels best when the dashboard, catalog, and next review
appear immediately. A device may be offline or have stale content, however.

**Decision:** The mounted `GET /analytics` route derives a bounded 7-, 28-, or
90-day view from durable per-user/per-course/day aggregates. Course-specific
analytics can use an optional Redis response cache only after a fresh access
check; broad analytics and the dashboard read MySQL directly. Quiz submission
is idempotent and invalidates the affected analytics cache after its durable
transaction succeeds. Per-user device caches, ETags, and broader caching remain
future work. The server still determines enrollment, progress, access,
correctness, and due dates.

**Consequences:** Analytics can be fast without making Redis a permission or
learning authority. Cache loss causes a MySQL read, while repeated submissions
return the original attempt rather than incrementing review or analytics state
twice. Offline drafts are not yet a mounted claim; quiz completion is confirmed
only after the server transaction succeeds.

## ADR-015 — Keep adaptive review personal and analytics aggregate

**Status:** Implemented

**Context:** The platform needs helpful review timing and progress feedback
without deriving a learner profile from raw answer content, sharing activity
between users, or making a cache part of the learning record.

**Decision:** Review timing is computed server-side from the learner's own
durable review counters, prior interval, and ease factor. Protected Learn
configuration bounds the initial/max interval, ease range, correct-answer
increment, incorrect-answer penalty, and recovery delay. Each newly created
idempotent quiz attempt transaction also upserts one `LearnActivityDaily` row
for that learner, course, and local calendar day with counts only. Analytics
read these aggregates plus the current review queue; they do not expose raw
submitted answers or another learner's data.

**Consequences:** A frequently missed word returns more cautiously while
repeated success grows a bounded interval. Policy changes affect subsequent
submissions without rewriting historical attempts. The daily aggregate supports
private activity, accuracy, streak, queue, recommendation, and per-course
summaries while keeping raw answer material out of the analytics store and
cache.

## ADR-014 — Fail closed until WebUntis integration readiness is configured

**Status:** Implemented as a technical activation gate; legal approval remains
an operator/controller responsibility.

**Context:** A Learn login verifies WebUntis credentials. A consent checkbox
alone does not establish authorisation from a school/controller, a GDPR lawful
basis, processor terms, transparent information, or a safe operational setup.
Accidentally deploying the route without those prerequisites would create a
high-risk ambiguity.

**Decision:** In production, the backend enables a fail-closed gate by default.
`/auth/learn-login` is unavailable unless the operator configures a non-secret
WebUntis approval reference, an HTTPS privacy-notice URL and a notice version.
The frontend shows that notice, sends the version after the user acknowledges
it, and the backend records the version/timestamp on the Learn profile. The
administrator sees readiness and version only, never the approval reference.

**Consequences:** The gate prevents accidental activation and makes a changed
notice explicit at next sign-in. It does not claim legal compliance. Before
production activation, the controller/school must complete the documented
review in [legal readiness](./legal-readiness.md), including actual data flows,
hosting/subprocessors, retention and rights handling.

## ADR-016 — Self-host a vocabulary-only trainer, gate it per user, and keep grading authoritative

**Status:** Implemented. This supersedes the earlier general-chat shape.

**Context:** Learners need optional example sentences while practising a
selected vocabulary word, not a general chat surface. A free-form prompt,
uploaded document, personal-context feed, or browser tool would widen the
privacy and prompt-injection boundary without improving vocabulary grading.

**Decision:** Run one self-hosted CPU-only Ollama model on the internal Docker
network. The model receives only a server-authorized vocabulary word plus its
two languages, and produces strict JSON with thinking disabled. The server
validates and stores the proposed sentence and expected translation in a
short-lived `LearnAiTrainingPrompt`; it keeps the answer hidden until an
incorrect check and atomically updates the adaptive-review row once. Access
requires the global kill-switch plus a personal or team pilot grant. The
server-side and Ollama concurrency caps are configured together for a
class-sized queue. Dictionary verification stays with allowlisted providers;
the trainer cannot browse or scrape arbitrary sites.

**Consequences:** There is no general chat, conversation history, attachment,
page-context, or web-search surface. The approved course answer set remains
authoritative for normal vocabulary grading, while the AI prompt is scoped to
one vocabulary-training activity. Slow or unavailable model work produces a
bounded retryable response without affecting non-AI Learn routes.
