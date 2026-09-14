# Pokyh Learn API contract

## Boundary and identity

The additive Learn router is mounted at `/learn` in the existing Pokyh backend.
The production web application talks to it only through the same-origin Next.js
BFF:

```text
Browser -> learn.pokyh.com/api/learn/* -> api.pokyh.com/learn/*
```

The BFF attaches the server-only `X-API-Key` and the caller's bearer token from
an HttpOnly cookie. Browser code never receives either value. Mutating BFF
calls require same-origin and double-submit CSRF checks before the backend
applies authentication, Zod validation, resource authorization, body limits
and rate limits. Before forwarding, the BFF rejects traversal-like route
segments, malformed/oversized JSON, unsupported non-JSON mutation payloads,
and malformed idempotency headers. Ordinary and library-import JSON limits are
separate server runtime settings (`LEARN_BFF_BODY_LIMIT_BYTES` and
`LEARN_BFF_IMPORT_BODY_LIMIT_BYTES`); backend validation remains authoritative.

`POST /auth/learn-login` is the only login exchange used by Learn. It is
API-key gated, validates credentials against WebUntis, then creates or resumes
the canonical Pokyh session. Every protected Learn route additionally rejects
an account that is not marked as a confirmed WebUntis user. Existing general
Pokyh authentication remains backward-compatible and is not broadened by Learn.

In production the login is also fail-closed behind the Learn legal gate. Before
the backend sends WebUntis credentials upstream, it requires a configured
non-secret authorisation reference, an HTTPS privacy-notice URL/version, and a
matching `privacyNoticeVersion` acknowledgement from the BFF. It stores only
that version/timestamp on the Learn profile. This technical guard does not
itself establish a lawful basis or school/controller authorisation; see
[legal readiness](./legal-readiness.md).

The backend returns direct JSON. Validation failures use `422`; unauthenticated
requests use `401`; unauthorized resources may intentionally look like `404`.
Safe errors have the shape `{ "error": "…" }` and never disclose secrets,
internal topology or another person's private data.

## Shared values

| Value | Meaning |
| --- | --- |
| `PRIVATE`, `TEAM`, `PUBLIC` | Course audience. A public course is catalogue-visible only when also published. |
| `DRAFT`, `PUBLISHED`, `ARCHIVED` | Course lifecycle. Publishing requires a Pokyh administrator. |
| `VIEW`, `EDIT`, `MANAGE` | Direct course-grant capability. |
| `OWNER`, `MANAGER`, `MEMBER` | Team membership label. It can grant access to an eligible team course, but never group-management authority by itself. |
| `LESSON`, `VOCABULARY`, `GRAMMAR`, `QUIZ` | Authored section type. |
| `DUE`, `WRONG`, `NEW` | Review-queue scope. |
| `PRACTICE`, `REVIEW`, `WRONG_ANSWERS` | Quiz attempt mode. |

Course access is always resolved on the server from administrator status,
course ownership, direct grants, eligible team membership, enrollment and
published-public status. A URL or a hidden client button is never authority.

## Read routes

| Method | Path | Required access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/catalog` | API key | Published public catalogue cards only. |
| `GET` | `/catalog/:slug` | API key | One published public course and topic-only section metadata. It never returns authored lesson bodies, answers, or quiz material. |
| `GET` | `/me` | Confirmed WebUntis JWT | Learn profile and `isAdmin`. |
| `GET` | `/dashboard` | Confirmed WebUntis JWT | Profile, durable review count, recent attempts, enrolled courses, and a fresh seven-day private analytics summary. |
| `GET` | `/analytics?range=7d|28d|90d&courseId?` | Confirmed WebUntis JWT; optional course requires `VIEW` | The caller's private daily aggregate totals, activity axis, queue counts, recommendation, and accessible-course summaries. No raw answer input or another learner's activity is returned. |
| `GET` | `/courses` | Confirmed WebUntis JWT | Courses visible through ownership, grant, enrollment, team membership or admin access. |
| `GET` | `/courses/:courseId` | Confirmed WebUntis JWT + course access | Full authored material. A published catalogue course also requires an enrollment, owner/team/direct grant, or platform-administrator access. |
| `GET` | `/vocabulary` | JWT + `VIEW` | Safe vocabulary list. Target answers and normalized grading keys are intentionally omitted. |
| `GET` | `/reviews` | Confirmed WebUntis JWT | Prompt-only queue for due, wrong or new entries. |
| `GET` | `/teams` | Confirmed WebUntis JWT | Caller memberships only. |
| `GET` | `/library/export` | Confirmed WebUntis JWT | Caller-owned courses, own vocabulary/review state and explicit section completions only. |
| `GET` | `/admin/overview` | Confirmed Pokyh administrator | Learn-only status, course list, direct grants and safe runtime policy. |
| `GET` | `/admin/courses/:courseId/access` | Confirmed Pokyh administrator | A course's direct grants and safe team membership details. |

Analytics are calculated from durable daily aggregates. The server may use an
internal Redis response cache only for a course-specific request after it has
rechecked that course's `VIEW` permission. Broad analytics are never served from
that cache, and every analytics response is `Cache-Control: private, no-store`.

`GET /courses/:courseId` returns authored `content` as JSON. The frontend must
render safe text fields and must never inject arbitrary HTML. Vocabulary rows
return a deterministic local source-language context sentence. A word without
a saved editorial target answer has `readyForQuiz: false` and is excluded from
all review queues.

## Course, section and progress writes

| Method | Path | Required access | Behavior |
| --- | --- | --- | --- |
| `PATCH` | `/me` | Confirmed WebUntis JWT | Updates bounded personal profile fields: daily goal, timezone, UI locale (`de`/`en`/`it`) and theme (`light`/`dark`/`system`). |
| `POST` | `/courses` | Confirmed WebUntis JWT | Creates a caller-owned course. A `TEAM` course needs a canonical Pokyh administrator to attach the group. Only an admin can create published content. |
| `PATCH` | `/courses/:courseId` | `MANAGE` | Updates metadata/lifecycle. Any team association/change and a draft-to-published transition are administrator-only. |
| `POST` | `/courses/:courseId/sections` | `EDIT` | Adds one authored section (max. 100 per course). |
| `PATCH` | `/courses/:courseId/sections/:sectionId` | `EDIT` | Updates an existing authored section. |
| `POST` | `/courses/:courseId/sections/reorder` | `EDIT` | Accepts every section ID exactly once and atomically persists the new order. |
| `DELETE` | `/courses/:courseId/sections/:sectionId` | `MANAGE` | Removes one section; vocabulary remains retained with a null section reference. |
| `POST` | `/courses/:courseId/enroll` | `VIEW` | Adds or resumes the caller's enrollment. |
| `POST` | `/courses/:courseId/sections/:sectionId/complete` | `VIEW` + own enrollment | Idempotently marks a real section completed; the server derives progress. |
| `PATCH` | `/courses/:courseId/progress` | `VIEW` + own enrollment | Changes only learner-controlled `ACTIVE`/`PAUSED` status; client percentages are never accepted. |

Course creation and section editing accept structured JSON content. The current
web studio writes `{ "paragraphs": ["…"] }`; other safe object fields remain
available for future activity renderers. The server does not accept browser
HTML as an executable content format.

## Vocabulary, verification and quiz writes

| Method | Path | Required access | Behavior |
| --- | --- | --- | --- |
| `POST` | `/vocabulary` | `EDIT` | Captures an entry. A source word may be saved before an editorial answer exists. |
| `POST` | `/vocabulary/validate` | `EDIT` | Explicit, server-side lexical check. The configured Free Dictionary result can verify documented English headwords; German/Italian and outages return an honest manual/unavailable outcome and never block saving. |
| `PATCH` | `/vocabulary/:entryId` | `EDIT` + creator/manager/admin | Updates a word. Answer-affecting edits reset verification. |
| `DELETE` | `/vocabulary/:entryId` | `EDIT` + creator/manager/admin | Permanently deletes one entry. |
| `POST` | `/vocabulary/lookup` | `EDIT` | Explicitly requests an optional, configured server-side dictionary suggestion. |
| `POST` | `/vocabulary/:entryId/verify` | `EDIT` + creator/manager/admin | Compares a saved editorial answer with the configured suggestion and stores a verification status. |
| `POST` | `/quiz-attempts` | `VIEW`; enrollment unless editor | Server-grades answers, writes an idempotent attempt and updates review state transactionally. |

The dictionary adapter is disabled unless `LEARN_DICTIONARY_ENABLED=true` and a
permitted language pair is configured. Its result is advisory, labelled and
never used as a live grading key. The author's saved target text and accepted
variants remain the only quiz authority. The web client shows source-language
text and a local source-language context sentence; it does not leak target
answers in a vocabulary list.

## Personal JSON portability

`GET /library/export` emits version `1` with
`kind: "pokyh-learn-personal-export"`. It includes only the caller's own
authored courses, authored vocabulary, that caller's review state, profile,
enrollment status and explicit completion references. It excludes teams,
grants, roles, credentials, other learners, unpublished work owned by someone
else and backend configuration.

`POST /library/import` accepts only that strict versioned envelope. It enforces
configured course/section/vocabulary limits, validates references and creates
new IDs. Each imported course is always a private draft owned by the caller;
import can never overwrite a record, publish content, transfer ownership or
increase a person's permissions.

The exported `profile` may include `locale` and `theme` alongside daily goal
and timezone. Importing these values remains bounded to the caller's own
profile; no role, access or legal-notice state can be imported.

## Teams and Learn administration

`GET /teams` remains a membership-only learner read: a learner can see only
groups they belong to and can use eligible team courses. Creating a group,
adding/removing members, changing a group, or attaching a course to a group is
not delegated by an `OWNER` or `MANAGER` membership label. Those are canonical
Pokyh administrator operations, resolved server-side from the existing Pokyh
administrator sources.

| Method | Path | Required access | Behavior |
| --- | --- | --- | --- |
| `POST` | `/teams` | Canonical Pokyh administrator | Creates a group with the administrator as `OWNER`. |
| `POST` | `/teams/:teamId/members` | Canonical Pokyh administrator | Adds or updates a verified WebUntis user by username or stable ID. |
| `POST` | `/admin/course-access` | Canonical Pokyh administrator | Grants `VIEW`, `EDIT` or `MANAGE` to a confirmed WebUntis account, resolved from username or stable ID. |
| `DELETE` | `/admin/course-access/:courseId/:stableUid` | Canonical Pokyh administrator | Removes only the direct grant. Team/catalog access is separately evaluated. |
| `DELETE` | `/admin/courses/:courseId` | Canonical Pokyh administrator | Permanently deletes a course only after exact slug confirmation. |

The existing Pokyh backend administration area also exposes dedicated Learn
group management under the `/api/admin/learn/teams` prefix:

| Method | Path | Required access | Behavior |
| --- | --- | --- | --- |
| `GET` | `/api/admin/learn/teams` | Canonical Pokyh administrator | Lists Learn groups, safe member identity/role data, and group/course counts. |
| `POST` | `/api/admin/learn/teams` | Canonical Pokyh administrator | Creates a group and initial `OWNER` membership for the acting administrator. |
| `PATCH` | `/api/admin/learn/teams/:teamId` | Canonical Pokyh administrator | Changes the bounded group name/description. |
| `POST` | `/api/admin/learn/teams/:teamId/members` | Canonical Pokyh administrator | Adds or updates a verified WebUntis user's `MANAGER` or `MEMBER` label. |
| `DELETE` | `/api/admin/learn/teams/:teamId/members/:stableUid` | Canonical Pokyh administrator | Removes a member, but refuses to remove the last `OWNER`. |
| `DELETE` | `/api/admin/learn/teams/:teamId` | Canonical Pokyh administrator | Requires exact `confirmName` and refuses deletion while a team course remains linked. |

The backend administration UI must return only safe runtime configuration and
Learn management data. Approval references and secrets are never returned.

## Intentionally not mounted

- invitation-token acceptance, member removal and ownership transfer;
- platform-wide Learn backup/restore and audit-feed UI;
- Redis uses beyond the optional private course-specific analytics response
  cache, including queues and distributed idempotency storage;
- automatic content generation, live AI grading, or a writing-feedback provider.

MySQL is the durable authority. Any future cache or provider must be a
recoverable optimization that cannot lose or silently alter progress,
permissions, attempts or authored content.
