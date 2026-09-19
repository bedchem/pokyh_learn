# Pokyh Learn architecture

## Implementation status

This document describes both the deployed core and its intended hardening path.
The mounted endpoint and payload surface in [the API contract](./api-contract.md)
is authoritative. The deployed core includes WebUntis-only Learn admission,
section completion-derived progress, course/section authoring, strict personal
JSON portability, a separate Learn administration surface, an optional explicit
dictionary-suggestion adapter, private daily learning analytics, an optional
Redis-backed course-specific analytics cache, and — as of Phase 0 — a
self-hosted, CPU-only, pilot-gated AI assistant (text chat only; see
"AI assistant" below). References below to provider snapshots, audit models,
platform backup jobs, feature flags, richer quiz sessions, or Redis uses
beyond that narrow analytics cache are target architecture unless that
contract explicitly marks them mounted.

## Purpose and non-negotiable rules

Pokyh Learn is a learning application for courses, vocabulary, grammar, and
review quizzes. It supports a curated course catalog as well as personal,
person-to-person, and team courses. The first language experiences are Italian
articles and English tenses/vocabulary, but the content model must support any
subject and language without a schema change.

The following rules shape every implementation decision:

1. `api.pokyh.com` is the only data authority. The Next.js application owns no
   database, never grades an answer, and never decides access.
2. The existing Pokyh account is the only identity. Learn adds a profile on
   first use after a confirmed WebUntis login; it does not add a second
   username, password, or token system.
3. A browser talks only to `learn.pokyh.com`. Server-side route handlers in the
   Next.js application act as a small backend-for-frontend (BFF) and call
   `api.pokyh.com` with server-only credentials. No API key, service key, or
   refresh token may reach browser JavaScript.
4. All security-sensitive and deployment-specific values come from environment
   configuration. Runtime business settings are managed through the protected
   Pokyh administration area. Hosts, credentials, limits, provider URLs, and
   feature switches are never literals in application code.
5. MySQL is the durable source of truth. Redis is an acceleration layer and may
   be emptied without losing a course, a review result, access, or progress.
6. Existing Pokyh behavior must remain compatible. The Learn feature is an
   additive route group, schema extension, and administration section.

## System boundaries

```text
Learner browser
    | same-origin HTTPS, HttpOnly session cookies
    v
learn.pokyh.com (Next.js)
    | server-to-server HTTPS: user JWT + API key
    v
api.pokyh.com (existing Express application)
    |                         |                         |
    |                         |                         +-- optional explicit dictionary adapter
    |                         +-- optional private analytics cache (Redis)
    +-- MySQL / Prisma (authoritative identity, content, access, progress)
```

The BFF is deliberately thin: it bounds streamed JSON bodies with separate
ordinary/import runtime limits, rejects traversal-like proxy segments, applies
same-origin/session protections, forwards the request, and maps errors to safe
user-facing output. Authorization, validation of the
authoritative payload, quiz selection, answer matching, imports, and writes
remain in the API. This makes mobile or future clients possible without
duplicating rules.

### Requests and sessions

1. A registered Pokyh user signs in through the established Pokyh flow.
2. The BFF stores the access token and opaque refresh token only in secure,
   `HttpOnly`, `SameSite=Lax` cookies scoped to `learn.pokyh.com`. Prefer
   host-only `__Host-` cookie names in production.
3. On first authenticated Learn request, the API upserts `LearnProfile` using
   the existing `stableUid` as its identity key.
4. The BFF attaches the access token when a user session is required and the
   existing server-only API key when it calls `/learn/*`.
5. Expired access tokens are refreshed by the BFF, never by browser code.
   Failed refreshes clear the local session and require sign-in again.

The currently mounted router is protected by the existing API-key middleware;
individual user routes additionally require a valid user JWT. The BFF is the
only place the API key may be used. Direct browser traffic to `/learn` is
restricted by the configured `LEARN_ALLOWED_ORIGINS` list; `Origin` is defense
in depth, never authentication. A separate service credential is not mounted
and must not be described as a client requirement.

## Product model

### Catalog and courses

Published catalogue metadata and topic titles may be read through the trusted
BFF before a learner signs in. Authored lesson bodies, answer keys, vocabulary
answers, review state, and quiz material are never part of that response. A
learner signs in and adds an eligible public course before the authenticated
course route returns its material; protected actions and private data always
require a Pokyh account. The mounted route currently supports these visibility
modes:

| Visibility | Who can view and enroll | Who can change it |
| --- | --- | --- |
| `PRIVATE` | Owner, administrators, and explicitly granted people | Owner, course manager, administrator |
| `TEAM` | Active members of the linked team, plus explicit course grants | Owner, course manager, administrator |
| `PUBLIC` | Published catalogue visitor; enrollment requires an authenticated user | Owner, course manager, administrator |

Individual sharing is currently expressed through a direct course grant rather
than a fourth `PEOPLE` visibility enum. `DRAFT` courses are never
catalog-visible to ordinary learners. `ARCHIVED` courses remain available to
their owner and administrators for retention, but should not accept new
enrollments. A creator can begin with a private course, grant a specific person
access, attach it to a team through a canonical Pokyh administrator, or publish
it to the catalog according to policy.
Publishing an individual course does not automatically publish every revision;
a change can be drafted and then published intentionally.

Course sections are ordered, typed documents. Initial supported types are:

- `LESSON` for text, images, examples, and checkpoints.
- `VOCABULARY` for source/target entries, accepted variants, articles, tags,
  examples, and notes.
- `GRAMMAR` for rules, worked examples, tables, and practice prompts.
- `QUIZ` for a curated exercise block that uses the same server-side grading
  and review mechanisms.

Italian material can store article, gender, singular/plural, and example
sentences beside an entry. English material can use grammar sections for tense
rules, forms, signal words, common mistakes, and examples. The structured
`contentJson` field is versioned per section type; renderers must reject an
unknown version safely rather than interpreting arbitrary content.

### Teams

A team has `OWNER`, `MANAGER`, and `MEMBER` membership labels. They identify
membership context and can grant view/enrollment access to a linked `TEAM`
course, but they do not confer group-administration authority. Only a canonical
Pokyh administrator—resolved server-side from the existing `Admin` data or a
configured canonical administrator username—can create a group, change its
membership, or attach a course to it. Every assigned member must be an existing
verified WebUntis-backed Pokyh user; there is no public invitation/acceptance
flow.

| Team role | Group-management authority | Course capability inherited from membership |
| --- | --- | --- |
| `OWNER` | None from the label alone; canonical administration remains required | View/enroll in eligible team courses; explicit course permission still governs edits |
| `MANAGER` | None from the label alone; canonical administration remains required | View/enroll in eligible team courses; explicit course permission still governs edits |
| `MEMBER` | None | View/enroll in eligible team courses |

Deleting a group is an administrator action and must not cascade into course
deletion. The mounted admin endpoint requires an exact name confirmation and
refuses deletion while any team course remains linked. Removing a member
immediately revokes team-derived access without touching a direct course grant
they may separately have.

### Permission model

Authorization is evaluated in one server-side `can(user, action, resource)`
policy layer. It must not be implemented as scattered controller checks or
trusted client flags.

| Principal | Read catalog/course | Create/edit course content | Grant access / publish | Manage all Learn data |
| --- | --- | --- | --- | --- |
| Learner | Eligible courses | Own private courses | Own private courses only | No |
| Explicit `EDIT` grantee | Eligible courses | Granted course only | No | No |
| Course `MANAGE` grantee | Eligible courses | Granted course | Granted course | No |
| Course owner | Eligible courses | Owned course | Owned course | No |
| Team member (any membership label) | Eligible team courses | Only with explicit course grant | No group-management authority | No |
| Canonical Pokyh administrator | All courses | All courses | All courses, group membership, and policy-managed catalog actions | Yes |

An administrator grants `VIEW`, `EDIT`, or `MANAGE` per course. A grant never
turns a person into a global administrator. Direct grants take precedence over
team membership for the same course. Denials and deleted/inactive membership
are evaluated before a grant is used.

## Authoritative data and learning state

The existing backend schema and mounted `/learn` router contain the core Learn
models:
`LearnProfile`, `LearnCourse`, `LearnCourseSection`, `LearnCourseAccess`,
`LearnEnrollment`, `LearnVocabularyEntry`, `LearnVocabularyReview`,
`LearnQuizAttempt`, `LearnActivityDaily`, `LearnTeam`, and `LearnTeamMember`.
These are useful
building blocks. The detailed as-built endpoint inventory is in
[the API contract](./api-contract.md); do not infer an endpoint from a model
name alone.

The following additive models complete the reliable quiz/import design:

| Model | Why it is needed |
| --- | --- |
| `LearnQuizSession` and `LearnQuizSessionItem` | Persist the selected questions, direction, content revision, expiry, and server-only expected-answer snapshot for one quiz. |
| `LearnVocabularyAcceptedAnswer` | Stores approved variants independently of the display translation; avoids abusing a comma-separated text field. |
| `LearnVocabularyValidation` | Records provider/snapshot version, findings, reviewer, status, and timestamp without overwriting the contributor's text. |
| `LearnImportJob` | Makes validation, import, report download, retry, and auditing durable. |
| `LearnAuditEvent` | Records sensitive changes such as publishing, access grants, imports, role changes, and provider overrides. |
| `LearnSetting` | Holds non-secret administrator-controlled policy such as catalog defaults and maximum quiz size. Secrets remain environment-only. |

All new foreign keys use explicit indexes for their normal lookup path. User
data always joins through `stableUid`, not username, because usernames are
mutable presentation data.

`LearnActivityDaily` stores only a learner/course/local-calendar-day aggregate:
attempt count, answer count, correct-answer count, and last activity time. It
contains neither raw answer input nor answer keys. A new, idempotent quiz
attempt updates its aggregate in the same MySQL transaction, so analytics do
not depend on Redis availability.

### Current quiz and spaced-review lifecycle

The mounted submission path is server-owned and idempotent:

1. The learner submits a bounded batch of answers with a one-time idempotency
   key for an accessible, enrolled course.
2. The API validates course access and enrollment, loads only the referenced
   vocabulary entries, and grades against the server's saved editorial answer.
3. In one MySQL transaction, it creates `LearnQuizAttempt`, updates each
   `LearnVocabularyReview`, and updates the corresponding `LearnActivityDaily`
   aggregate.
4. Repeating the same idempotency key returns the original attempt instead of
   adding another review update or analytics count.

A wrong answer increments `incorrectCount`, sets `lastWasCorrect` to false, and
makes that entry eligible for the `MISTAKES` queue immediately or after the
configured recovery delay. Correct answers increase a bounded interval. The
current adaptive policy uses only that learner's durable correct/incorrect
counters, prior interval, and ease factor; it does not use raw answer text,
another learner's activity, or a global model. Its initial/max interval, ease
bounds, correct increment, incorrect penalty, and recovery delay are managed
by a protected Learn configuration endpoint and apply prospectively. The client
cannot set due dates, score, or correctness itself.

Answer comparison is deliberate: normalize Unicode, whitespace, punctuation
policy, and locale-aware casing; preserve diacritics unless an administrator
has chosen a language-specific alternative; and compare against approved
answer variants. Exact source entries, article requirements, and accepted
synonyms remain content decisions. A near match can be shown as feedback but
must not silently become a correct answer.

## Dictionary verification

Dictionary data is assistance for editors, never an unreviewed replacement for
course content. The recommended provider order is:

1. A versioned, locally indexed Kaikki/Wiktionary-derived snapshot for supported
   languages. It avoids sending every editor's term to a third party and keeps
   quiz-time grading independent of an external service.
2. A pluggable provider adapter for a licensed external dictionary when an
   operator explicitly configures it.
3. Manual entries and administrator/editor approval as the universal fallback.

Kaikki publishes regularly updated JSONL extracts, including German and
Italian source editions, so it is suitable for an offline ingestion job rather
than a per-keystroke production dependency. Treat the source as a suggestion:
it can indicate that a lemma, language, part of speech, article, or proposed
translation is plausible; it cannot decide the pedagogically intended sense.
The ingestion pipeline records snapshot date, source URL, checksum, and
license/attribution details. Reuse of definitions, examples, media, or other
source text requires a separate licence review and visible attribution. See
the [Kaikki raw data page](https://kaikki.org/dictionary/rawdata.html) and the
[Wiktionary licensing information](https://en.wiktionary.org/wiki/Wiktionary:Copyrights).

When an editor saves vocabulary, the API writes the submitted entry first with
`UNVERIFIED` status, schedules a verification lookup, and returns a clear
status. The worker may mark it `VERIFIED` or `FLAGGED`; it never alters source
or target text automatically. An authorized editor can accept a suggestion,
add an answer variant, keep a manual answer, or flag a conflict. Quiz grading
uses the approved course answer set even if provider verification is pending or
unavailable.

## AI assistant ("KIbo")

A self-hosted, CPU-only Ollama assistant, reachable as a bottom-right popup.
See [ADR-016](./decisions.md#adr-016--self-host-the-ai-assistant-gate-it-per-user-and-never-let-it-decide-correctness)
for the reasoning; this section is the current shape.

```text
Browser -> BFF catch-all (/api/learn/ai/*, unchanged proxy logic,
           a longer AI-specific timeout) -> api.pokyh.com/learn/ai/*
  -> requireAiPilotAccess (per-user grant, not a global switch)
  -> LearnAiConversation / LearnAiMessage (MySQL, source of truth)
  -> personalized context, stableUid-scoped, read-only, assembled per request
  -> Ollama (internal Docker network only, e.g. http://ollama:11434)
```

- **Access** is a per-user `LearnAiAccessGrant` pilot allowlist, or a
  `LearnAiTeamAccessGrant` covering every current and future member of a
  team at once — both administered like a course-editor grant, either is
  sufficient, and there is no platform-wide toggle for end users.
  `LearnAiConfig.enabled` is a separate, independent administrator
  kill-switch; it and at least one grant must both allow a request through.
  `GET /me`'s `canUseAiAssistant` combines the kill-switch with the calling
  user's own grant status as a capability hint only — every `/learn/ai/*`
  route re-checks access itself.
- **Model runtime**: the stock `ollama/ollama` image, CPU-only (no GPU device
  is ever requested in the compose file), on an internal-only Docker network,
  behind a Compose profile (`ai`) so an existing deployment that has not
  opted in is unaffected. The application does not hard-depend on Ollama
  being up: every non-AI route keeps working if it is stopped, disabled, or
  still pulling its model.
- **Auto-provisioning** ("check, else pull, then start") runs inside the
  Node application's own boot sequence (`ensureModelReady()` in
  `learnAiOllama.ts`), fire-and-forget — never awaited before the HTTP server
  starts listening, since a first-boot multi-GB model pull must not delay
  the rest of Pokyh/Learn. Chat requests check readiness themselves and
  return a friendly 503 until the pull completes.
- **Context window**: `LearnAiConfig.contextTokens` (`num_ctx` sent to
  Ollama) is deliberately kept small by default and admin-configurable, not
  left at the model's advertised maximum — RAM for a CPU-quantized model
  grows sharply with context length, so an unbounded default would silently
  break the resource-efficiency requirement on a shared host.
- **Personalized context** (due review count, active-course progress,
  streak) is assembled fresh per request by a dedicated, read-only,
  `stableUid`-scoped function. It is never cached across users and never
  written into any shared/knowledge-base table — the one place personal
  learning data enters a prompt is scoped exactly as tightly as the rest of
  this platform's privacy rules require.
- **Quota**: MySQL (`LearnAiUsageCounter`, an hour-floored per-user counter)
  is the authoritative rate limit, enforced in the same transaction that
  persists a message — it holds correctly even without Redis. A baseline
  `express-rate-limit` instance additionally bounds raw request rate.
- **Idempotency**: message submission accepts an `idempotencyKey`; a retry
  with the same key returns the already-stored exchange instead of calling
  the model (and counting against quota) a second time, mirroring
  `LearnQuizAttempt`'s pattern.
- **Audit**: `learnAudit()` records that a message was sent, its mode, and
  token counts — never the message content itself.
- **Uploads and page context**: file/image attachments (`LearnAiAttachment`,
  `LearnAiConfig.uploadsEnabled`, off by default) are validated by the file's
  actual bytes, never the client's claimed type — magic-byte signatures for
  images, a binary-content-sniff rejection for anything claiming to be text.
  Images use Ollama's native vision input; text is inlined as bounded,
  delimited reference context. Content lives directly in MySQL, bounded by
  `uploadMaxBytes` (default 4MB). Page context (`{ path, title }` only, never
  raw DOM/screen content) lets the assistant help explain the page the
  learner is currently on, also treated as untrusted reference material.
  `/learn/ai` has its own larger Express body-size limit (`BODY_LIMIT_AI`)
  ahead of the general default, since attachments travel as base64 JSON.
- **Not yet mounted**: PDF/DOCX attachment parsing (needs a new, separately
  reviewed parsing dependency), voice-memo transcription (planned as a
  local, self-hosted Whisper step rather than depending on Ollama's own
  audio-input maturity), an admin-curated site knowledge base, and a live
  multi-source web-search tool. Each ships as its own phase with its own
  `LearnAiConfig` flag and its own threat-model review before release.

## Caching, batching, and performance

### Durability tiers

| Tier | Allowed data | Examples | Rule |
| --- | --- | --- | --- |
| MySQL | All durable state | Courses, grants, enrollments, review rows, attempts, `LearnActivityDaily` aggregates | Source of truth; the quiz/review/aggregate write is transactional. |
| Redis (optional mounted use) | Reconstructable private analytics response only | A course-specific `GET /analytics` response after fresh course-access validation | A cache fault or eviction falls back to MySQL and cannot lose a result. |
| Device cache (planned) | Per-user read models and unsent drafts | Future catalog shell, lesson text, in-progress answer draft | It is not evidence of completion/correctness and is not the current analytics authority. |

Do not cache JWTs, refresh tokens, API/service credentials, server-only answer
snapshots, or raw import files in browser storage. A device cache displays
stale content while a background revalidation runs; it is never evidence that a
lesson was completed or an answer was correct.

The mounted Redis key uses an environment-controlled Learn prefix, the
`analytics` namespace, and a SHA-256 digest of the caller's stable identity,
range, and course identifier. It deliberately does not place the stable user ID
in the Redis key. The cache holds no raw answer, answer key, permission, token,
or mutable source-of-truth state.

Only a course-specific analytics request is cacheable, and only after the API
has performed a fresh `VIEW` permission check. Broad analytics are always read
from MySQL to avoid a stale permission boundary. A successfully created quiz
attempt invalidates the caller's affected analytics keys. The client response
remains `Cache-Control: private, no-store`; Redis is internal acceleration only.
Review queues, sessions, and quiz durability do not depend on Redis.

### Efficient API use

- `GET /dashboard` is a purpose-built, bounded read model, not a browser fan-out
  of catalog, enrollment, progress, and review endpoints.
- Quiz answers are submitted in one bounded batch. The API rejects excessive
  question counts and body sizes through environment policy.
- Catalog, vocabulary, and audit lists use keyset cursors, filter whitelists,
  stable ordering, and capped page sizes. Do not use offset pagination on large
  tables.
- Fetch only the columns needed for a card/list, use existing and new composite
  indexes for `(stableUid, dueAt)`, `(courseId, sectionId)`, and catalog status
  filters, and avoid per-row relation queries.
- Content has an ETag/revision. The BFF sends conditional requests and returns
  `304` when possible. Static assets use immutable content hashes.
- Browser offline support queues only safe draft mutations with an idempotency
  key. It never marks a quiz, course completion, or access change complete
  locally.

## Security and operational controls

### Configuration

Production configuration belongs in deployment secrets or the protected admin
settings area, with values such as:

```dotenv
API_BACKEND_URL=https://api.pokyh.com
API_BACKEND_KEY=server-only-value
LEARN_API_PREFIX=/learn
# Backend deployment value; direct browser calls to /learn are restricted here.
LEARN_ALLOWED_ORIGINS=https://learn.pokyh.com
```

The frontend retains only server-side `API_BACKEND_KEY`; it has no
`NEXT_PUBLIC_` secret. The backend's optional `LEARN_REDIS_URL` and
`LEARN_REDIS_KEY_PREFIX` remain deployment-only values for the private
analytics cache. Dictionary-provider, import, and additional service-credential
variables must not be claimed as active until their backend implementation is
mounted and tested.
Administrator-editable policy may include defaults, feature enablement, and
retention windows, but may never expose, replace, or return an environment
secret.

The backend supplies the sign-in form's public notice URL and current version
through its API-key-protected `GET /learn/sign-in-config` response. The Next.js
server validates the response and fails closed if it is unavailable; it does
not maintain a second frontend notice-version setting. The private WebUntis
authorization reference never appears in that response.

### WebUntis / privacy activation boundary

Learn is an independent WebUntis-facing integration, not an implied extension
of any existing Pokyh login. In production `LEARN_LEGAL_GATE_ENABLED` defaults
to true. The backend refuses `/auth/learn-login` before any credential check
unless it has a non-secret school/controller-approval reference, a versioned
HTTPS Article-13 notice URL, and the matching notice version. The Next.js BFF
shows that notice and forwards the acknowledged version; the backend persists
only the accepted version/timestamp on the Learn profile.

This is a technical fail-closed guard, not a legal basis. The controller must
complete the approval, controller/processor role assessment, retention,
recipient/transfer, cookie and real-deployment review listed in
[legal readiness](./legal-readiness.md) before enabling production access.
The admin overview may expose only gate readiness and notice version; it must
never display approval references, secrets or legal documents.

### Required controls

- Keep `/learn` behind the existing API-key middleware. Apply `requireAuth` to
  every protected user route and an administrator check to administrator
  routes. Add a distinct Learn-service middleware before allowing any other
  trusted caller to reach this route family.
- Permit only `https://learn.pokyh.com` for the Learn route group in production.
  Keep existing global CORS entries needed by the established Pokyh services;
  do not break them to narrow the Learn origin. The Next application itself is
  same-origin only.
- Use `Secure`, `HttpOnly`, `SameSite=Lax` cookies; enforce CSRF tokens or a
  strict same-origin check on every mutating BFF route. Reject cross-site form
  posts.
- Validate every body, query, sort key, JSON import, and rich-content document
  with a server schema. Sanitize rendered rich text with an allow-list; reject
  scripts, event handlers, unsafe URLs, and untrusted embedded frames.
- Apply distributed user-and-IP rate limits for read, write, import, dictionary,
  session, and administrator routes. Use a stricter limit for publish/grant and
  a small concurrency limit for imports.
- Use parameterized Prisma queries, opaque UUID identifiers, minimum required
  fields, audit logs, request IDs, structured error codes, and redacted logs.
- Encrypt database backups; make personal export and deletion workflows
  available to the rightful user; set retention periods for attempts and audit
  records in policy.
- Do not put bearer tokens or API keys in URLs. SSE, if later used, needs a
  short-lived signed connection ticket rather than a long-lived token query
  parameter.
- Before production WebUntis sign-in, record controller/school approval and
  complete the [legal readiness](./legal-readiness.md) review. A configured
  notice checkbox is transparency evidence only, never the legal basis.

## Existing-backend migration and rollout

The backend now mounts its additive Learn router at `/learn` after the existing
API-key middleware. The safest delivery sequence for the remaining capability
work is:

1. Keep the mounted router backward-compatible and add route-level service
   hardening, schemas, and tests without changing existing route behavior.
2. Add a reviewed, additive Prisma migration for missing quiz-session,
   accepted-answer, validation, import, audit, and policy models/indexes. Run
   it in staging first and use a controlled production migration; do not rely on
   a destructive schema reconciliation.
3. Keep the mounted optional Redis analytics cache private and failure-tolerant:
   validate its deployment, namespacing, TTL, and fallback without routing
   durable writes through Redis. Redis-backed queues, rate limits, or shared
   idempotency remain separate future work.
4. Ship read-only catalog and course access first; then authoring, vocabulary
   verification, teams, imports, and quizzes behind environment-controlled
   feature flags.
5. Enable the frontend only after route, authorization, CORS, and migration
   checks pass in the deployment environment.

### Rollout blockers and risks

| Risk | Why it matters | Required mitigation |
| --- | --- | --- |
| School-year rollover and Learn data | The archive process now retains users with a `LearnProfile`, avoiding the prior cascade risk for Learn data. | Keep this behavior intact and add/maintain a rollover regression test that proves a learner's course, team, review, and attempt survive. This is no longer an unresolved rollover blocker. |
| Individual sharing representation | Direct `LearnCourseAccess` grants provide person-to-person sharing; the mounted visibility enum does not include `PEOPLE`. | Do not send a `PEOPLE` enum value. If a separate audience value is needed later, add it through a reviewed migration and test every access combination. |
| Existing global CORS serves several applications | Replacing the global origin list with only Learn can break current web, mobile, or admin use. | Keep global compatibility; apply a narrow Learn route policy and keep the BFF service credential mandatory. |
| Existing API-key middleware accepts a shared key | Any other trusted caller with that key could reach the mounted Learn route if no additional boundary exists. | Add a distinct, server-only Learn service credential before additional trusted callers are allowed; do not send either credential to the browser. |
| Automatic schema push is additive only in the best case | A failed or partially applied startup schema leaves code and database out of sync. | Use reviewed migrations for Learn and a readiness check that verifies required tables/indexes before enabling feature flags. |
| Quiz submissions can be retried by networks or browsers | Duplicate attempts distort progress and mistake counts. | Enforce a per-user unique idempotency key, request digest comparison, transaction lock, and response replay. |
| Dictionary data is incomplete or has licensing conditions | Auto-replacing pedagogical answers can be wrong and unlicensed reuse is risky. | Use provider data only as an attributed suggestion, preserve manual approval, retain provenance, and obtain licence review for displayed/reused content. |

The success criterion for the mounted core is not merely a rendered catalog: a
user can enroll, create private content, receive only the access they were
granted, answer a quiz once, see incorrect vocabulary reliably return for
review, resume safely after a refresh, and retain their learning record across
normal backend maintenance. JSON portability joins that release scope only
after its endpoint, validation, and audit design are implemented.
