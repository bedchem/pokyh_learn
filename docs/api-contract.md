# Pokyh Learn API contract

## Status, address, and trust boundary

The Learn router is mounted at `/learn` in the existing Pokyh backend. Its
deployment address is assembled from server-only configuration:

```text
${API_BACKEND_URL}${LEARN_API_PREFIX}
# production: https://api.pokyh.com/learn
```

The browser calls only the same-origin Next.js BFF under `/api/learn/*`. The
BFF attaches the existing server-only `X-API-Key` and, for protected calls, the
user's bearer token from an HttpOnly cookie. It never exposes the API key,
access token, or refresh token to browser storage.

Every Learn route passes the shared backend API-key middleware. The browser
origin guard is configured with `LEARN_ALLOWED_ORIGINS`; a direct browser
request with an `Origin` header is accepted only when that origin is listed.
Server-to-server BFF requests have no `Origin` header and still require the API
key and normal per-resource authorization. Learn rejects `apiKey` and `token`
query parameters: credentials must use headers and therefore do not enter URLs.

There is no separate Learn service credential, response envelope, ETag,
cursor, or generic mutation idempotency layer in the current implementation.
Successful responses are direct JSON objects. Safe failures are normally:

```json
{ "error": "Human-readable safe message" }
```

Zod validation errors return `422`; authorization and missing-resource errors
use the backend's `401`, `403`, or intentionally non-disclosing `404` response.

## Current vocabulary and access values

| Value | Purpose |
| --- | --- |
| `PRIVATE`, `TEAM`, `PUBLIC` | Course audience. A public course enters the catalogue only when it is also `PUBLISHED`. |
| `DRAFT`, `PUBLISHED`, `ARCHIVED` | Course lifecycle. |
| `VIEW`, `EDIT`, `MANAGE` | Direct course-access grant. |
| `OWNER`, `MANAGER`, `MEMBER` | Team role. Team membership provides team-course view access, not automatic content editing. |
| `PRACTICE`, `REVIEW`, `WRONG_ANSWERS` | Submitted quiz-attempt mode. |
| `DUE`, `WRONG`, `NEW` | Review-queue scope. |
| `SOURCE_TO_TARGET`, `TARGET_TO_SOURCE` | Answer direction. |

Course access is resolved server-side from the existing Pokyh administrator
record, course ownership, direct grant, eligible team membership, enrolled
status, and published-public status. A button or URL is never authority.

## Read endpoints

### Catalogue

| Method | Path | Authentication | Response |
| --- | --- | --- | --- |
| `GET` | `/catalog` | API key | `{ courses }`, with published public cards only. |
| `GET` | `/catalog/:slug` | API key | `{ course }`, with published public metadata and sections only. Private and team courses remain undiscoverable. |

Catalogue card records include identifiers, slug, title, summary, subject,
language, level, cover URL, `updatedAt`, and section/vocabulary/enrollment
counts. The current endpoint has no server-side filters, pagination, or sort
parameters; the web client applies only presentational filtering to the fetched
public list.

### Profile and dashboard

| Method | Path | Authentication | Response |
| --- | --- | --- | --- |
| `GET` | `/me` | JWT | `{ user, profile, isAdmin }`; creates the caller's `LearnProfile`. |
| `PATCH` | `/me` | JWT | Updates `dailyGoalMinutes` (1–1440) and/or `timezone` (max. 80 chars). |
| `GET` | `/dashboard` | JWT | `{ profile, stats, recentAttempts, courses }`. |

`stats.dueReviewCount` is the durable count of overdue vocabulary reviews.
Dashboard courses are the caller's enrolled courses and include the caller's
progress only. The frontend must not infer other learners' progress.

### Accessible courses

| Method | Path | Authentication | Response |
| --- | --- | --- | --- |
| `GET` | `/courses` | JWT | `{ courses }` visible through ownership, access grant, enrollment, team membership, or administrator access. |
| `GET` | `/courses/:courseId` | API key; JWT optional | `{ course, enrollment, permissions }`. Anonymous calls can read only published public courses. |

Course detail includes ordered sections. A section is authored as structured
JSON and returned as `content`; the frontend renders only safe text fields and
does not execute or inject authored HTML.

### Vocabulary and review queues

| Method | Path | Authentication | Response |
| --- | --- | --- | --- |
| `GET` | `/vocabulary?courseId=<uuid>&sectionId=<uuid?>&limit=<1..250>` | JWT + `VIEW` | `{ entries }` for the requested accessible course. |
| `GET` | `/reviews?courseId=<uuid?>&scope=DUE|WRONG|NEW&limit=<1..100>` | JWT | `{ questions }` with prompts only. |

Vocabulary list responses deliberately omit `targetText` and normalized answer
keys. They return a locally generated `contextSentence` in the source language
and `readyForQuiz`. A word with no approved target answer is stored but excluded
from review queues until an authorized editor supplies an answer.

## Write endpoints

All mutations pass the backend write rate limiter. Browser requests also pass
the BFF's same-origin and double-submit CSRF checks before reaching the API.

### Courses and progress

| Method | Path | Required access | Body / behavior |
| --- | --- | --- | --- |
| `POST` | `/courses` | JWT | Creates a caller-owned course. `TEAM` requires a managed `teamId`; only a Pokyh administrator can request `PUBLISHED`. Returns `201` and the raw course with serialized sections. |
| `POST` | `/courses/:courseId/enroll` | JWT + `VIEW` | Creates or resumes the caller's enrollment. |
| `PATCH` | `/courses/:courseId/progress` | JWT + `VIEW` + own enrollment | Updates `status`, `progressPercent`, and/or `completedSections`. `COMPLETED` forces server-side 100%. |

Course creation accepts:

```json
{
  "title": "Italiano in viaggio",
  "summary": "Eigene Lernziele für unterwegs.",
  "subject": "Sprachen",
  "language": "it",
  "level": "A1",
  "visibility": "PRIVATE",
  "status": "DRAFT",
  "sections": [
    {
      "title": "Am Bahnhof",
      "summary": "Eigene Beispielsätze und Aufgaben.",
      "type": "LESSON",
      "content": { "paragraphs": ["Eigener Text aus dem Kurs."] }
    }
  ]
}
```

The current server does not yet expose section CRUD, course update/delete,
publication, archive, or per-course access-list endpoints. Create a course with
the intended initial sections; do not claim later editing controls are mounted
until those routes exist.

### Vocabulary capture and editorial answer approval

| Method | Path | Required access | Behavior |
| --- | --- | --- | --- |
| `POST` | `/vocabulary` | JWT + `EDIT` | Adds a word to a course; creator owns later changes. |
| `PATCH` | `/vocabulary/:entryId` | JWT + `EDIT`, creator or administrator | Updates allowed entry fields. |
| `DELETE` | `/vocabulary/:entryId` | JWT + `EDIT`, creator or administrator | Hard-deletes the entry. |

A capture request can contain only the word:

```json
{
  "courseId": "9d3caed2-c3cf-4a2d-875b-3a5ebbb06921",
  "sourceLanguage": "it",
  "targetLanguage": "de",
  "sourceText": "stazione"
}
```

The server persists the word, generates a deterministic local context sentence
in the source language, marks it unverified, and does not add it to quizzes
until an approved `targetText` is supplied by an authorized editor. No external
dictionary or paid provider is required for this capture flow. A future
provider must remain server-configured, optional, licensed, attributed where
needed, and never become the authority for grading.

### Quiz attempts and review scheduling

| Method | Path | Required access | Behavior |
| --- | --- | --- | --- |
| `POST` | `/quiz-attempts` | JWT + `VIEW`; caller enrolled unless they can edit | Server-grades submitted vocabulary answers, writes the attempt and review updates transactionally. |

Request:

```json
{
  "courseId": "9d3caed2-c3cf-4a2d-875b-3a5ebbb06921",
  "mode": "WRONG_ANSWERS",
  "idempotencyKey": "6fd65a44-d55c-47f7-b026-a10d3772e294",
  "answers": [
    {
      "entryId": "b294fcb4-0c1c-44bb-8d1d-a45e44989e23",
      "answer": "Bahnhof",
      "direction": "SOURCE_TO_TARGET"
    }
  ]
}
```

The key may instead be sent as `Idempotency-Key`. It is unique per user and
stored with the attempt. A retry with the same key returns the original compact
attempt and its already-determined `results`; a fresh submission returns `201`
with the same result shape, including only the just-answered item's correctness
and post-answer display answer. Answer keys never appear in review-queue
responses.

An incorrect answer gets `dueAt = now`; a correct answer receives a bounded,
server-calculated next interval. MySQL is the durable authority for both the
attempt and the review record.

### Teams and administrator grants

| Method | Path | Required access | Behavior |
| --- | --- | --- | --- |
| `GET` | `/teams` | JWT | Lists only caller memberships, role, member count, and course count. |
| `POST` | `/teams` | JWT | Creates a team; caller becomes `OWNER`. |
| `POST` | `/teams/:teamId/members` | Team owner/manager or administrator | Upserts a known Pokyh user by stable UID or username with `MANAGER` or `MEMBER`. |
| `POST` | `/admin/course-access` | Existing Pokyh administrator | Upserts a `VIEW`, `EDIT`, or `MANAGE` grant for one user and course. |

There is no invitation-token lifecycle, membership removal, team update/delete,
grant revocation/list, or audit-feed endpoint in the current route surface.

## Not mounted yet

The interface must keep these controls unavailable or explicitly label them as
planned until their server contracts and tests exist:

- versioned personal JSON import/export;
- course and section editing after creation;
- catalogue publication/moderation workflow;
- accepted-answer records with editorial history;
- dictionary lookups or automatic translation verification;
- team invitations, role changes, removal, and ownership transfer;
- administrator settings, moderation, audit, and cache-health APIs;
- Redis-backed distributed cache, queue, or idempotency coordination.

MySQL remains the durable source of truth. Redis and device caches may be
introduced later only as recoverable optimizations that cannot lose progress,
permissions, attempts, or authored content.
