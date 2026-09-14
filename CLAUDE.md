# Pokyh Learn

## Repository Contract

Pokyh Learn is a calm, secure learning platform at `learn.pokyh.com`. It is
for selecting courses, learning languages and grammar, building vocabulary,
performing targeted review, creating private or shared learning content, and
working in teams.

The frontend repository is this Next.js app. Durable business data,
authentication, authorization, content validation, imports, exports, quiz
grading, review scheduling, platform configuration, and audit information
belong to the existing Pokyh backend at `api.pokyh.com`.

The backend extension lives in the sibling `pokyh-backend` repository. It is
strictly additive: do not replace existing Pokyh routes, accounts, data, or
security controls. Backward compatibility is a release requirement.

This file is the canonical working context. Read it before making product,
frontend, backend, data-model, deployment, or documentation decisions. The
more detailed contracts in `docs/` must agree with it. When a documented
decision conflicts with an implementation, fix the implementation or record
an explicit decision before shipping.

## Non-Negotiable Product Principles

1. **The server is the source of truth.** Browser state is presentation or a
   recoverable draft, never the authority for progress, permissions, content,
   answers, roles, team membership, or publication status.
2. **The catalogue is discoverable; personal actions are protected.** Guests
   can read only published public catalogue metadata and content specifically
   configured as public. Adding a course, progress, authoring, vocabulary
   changes, exports, imports, teams, and any private/shared content require a
   valid Pokyh account and server-side authorization.
3. **Every permission is explicit and server-enforced.** A client-side button,
   route guard, hidden menu entry, or user-supplied ID is never permission.
4. **Privacy comes before convenience.** Private courses, personal progress,
   pending answers, team membership, and unpublished content must not leak
   through search, caches, logs, exports, analytics, error messages, or shared
   responses.
5. **Learning comes before gamification.** The primary screen makes the next
   useful action obvious: continue a course, review due items, repair common
   mistakes, or choose a course. Decorative scores must never distract from
   that flow.
6. **No production configuration is hardcoded.** Domains, URLs, credentials,
   cookie settings, provider selection, limits, cache TTLs, feature switches,
   rate limits, and operational policy come from server-managed configuration
   or environment variables. UI copy and static accessibility labels are not
   deployment configuration.
7. **A cache loss must not lose learning.** Redis or device storage can improve
   latency and offline resilience; MySQL remains the durable system of record
   for progress, attempts, permissions, and content.
8. **All writes are auditable and safe to retry.** Course edits, access grants,
   imports, invitations, publications, vocabulary changes, and quiz submission
   require validated input, authorization, audit context, and idempotency where
   retries are possible.

## Product Scope

### Course catalogue

The catalogue is organized as:

```text
catalogue category / class
  -> language or subject
    -> course
      -> module / section
        -> lesson
          -> activity
```

A course provides a title, description, source and target languages where
applicable, difficulty level, structured sections, learning activities,
visibility, owner, revision, and publication state. Categories and
presentation metadata are administered by the backend; the frontend must not
invent a different hierarchy.

Supported visibility states are:

| Visibility | Who can read | Who can change |
| --- | --- | --- |
| `private` | owner and explicitly granted people | owner and editors |
| `team` | current members of the selected team | owner, editors, and allowed team roles |
| `public` | catalogue visitors after publication | owner/editors; publication policy controls visibility |

Public visibility does not automatically mean that a person may copy, edit,
export, enroll, or access activity data. Those rights are separately checked.

### Learning activities

An activity may be vocabulary, translation, grammar, tense practice, article
practice, reading, writing, listening, or a structured assessment. Every
activity has a stable identifier and revision. When content changes in a way
that affects grading, the revision changes so historical attempts remain
interpretable.

The minimum language-learning experience includes:

- visible learning path with next lesson and progress;
- vocabulary with source/target text, article, part of speech, context,
  examples, and answer variants;
- a focused quiz with one task at a time, keyboard support, clear feedback,
  explanation, and a useful next step;
- a dedicated review session for items that were incorrect, overdue, or newly
  introduced;
- course-level, language-level, and personal progress views;
- explicitly visible ownership, sharing, and edit rights.

### Italian grammar and articles

Italian article practice is a first-class activity, not a generic free-text
quiz. A lexical record may carry `lemma`, `partOfSpeech`, `gender`, `number`,
`articleClass`, phonological conditions, irregular forms, examples, accepted
answers, and source provenance.

Article exercises must show context. They can teach and test cases such as
`il`, `lo`, `l'`, `la`, `i`, `gli`, and `le` against nouns and sentences. A
remote translation result must never dynamically determine a grammatical
answer in a live quiz.

### Personal courses and teams

Any authenticated learner may create private content within configured limits.
They may share it with explicitly selected people when the backend confirms the
right to do so. A team has an owner, members, role assignments, and scoped
course access, but group creation, membership changes, and linking a course to
a team are canonical Pokyh administrator actions. A normal learner may use a
team course assigned to them; a UI role label is never authority to administer
that group. Membership changes must immediately invalidate access and affected
caches.

The platform administrator can grant authoring capabilities, edit access,
catalogue publication rights, moderation capability, and feature access. Do
not turn the broad existing Pokyh account role into a catch-all content role;
use Learn-scoped grants and ownership checks.

## Roles and Authorization

The backend decides each capability from the authenticated `stableUid`, the
resource, its owner, current grants, team membership, and administrator state.
The frontend may display a helpful affordance based on capabilities returned by
the API, but it must treat them as hints rather than enforcement.

| Actor | Typical capabilities |
| --- | --- |
| Guest | Read published catalogue data only |
| Learner | Enroll in accessible courses; own progress; private content within policy |
| Course owner | Create, edit, share, archive, and export their own course |
| Course editor | Edit only the granted course/content scope |
| Team member | Read team-scoped content allowed to their membership; no group-administration authority from the membership label alone |
| Platform administrator | Moderate, grant access, configure policy, review audit data |

Authorization requirements:

- Fetch a resource by ID only after resolving accessibility on the server.
- Query lists with an access-aware `where` clause; never fetch broadly and
  filter in the browser.
- Validate ownership before every mutation and revalidate it inside the
  transaction where the mutation matters.
- Do not accept `ownerId`, `stableUid`, `isAdmin`, `teamRole`, `visibility`,
  or `canEdit` from a client as authority.
- Treat role and membership changes as security events and write audit records.
- Resolve platform administration server-side from the canonical Pokyh
  administrator sources (the durable `Admin` record or an
  `ADMIN_USERNAMES` match on the canonical user); the normal user JWT
  deliberately does not carry a mutable admin flag.

## Identity and Session Design

Pokyh accounts are the only identity system. Learn admits only a canonical
Pokyh account whose login was confirmed against WebUntis; a local fallback
Pokyh account cannot create, read, receive a grant for, or manage Learn data.

```text
Browser
  -> learn.pokyh.com Next.js route handler / server action
  -> api.pokyh.com (X-API-Key is server-only + Bearer user session)
  -> Pokyh authentication and Learn authorization
```

The browser must only call the same-origin Next.js BFF (`/api/*`). It never
receives the backend API key and never stores an access or refresh token in
localStorage, sessionStorage, IndexedDB, URLs, analytics metadata, or a
JS-readable cookie.

The BFF keeps the access and refresh tokens in `HttpOnly`, `Secure` (in
production), `SameSite=Lax` cookies. Mutating BFF requests require a same-origin
check and double-submit CSRF token. The BFF forwards the authenticated request
to the backend, which repeats authentication and resource authorization.

An edge route guard can redirect an obviously unauthenticated navigation to
`/sign-in`, but a cookie's presence is never sufficient to authorize data.
Server components, route handlers, and backend routes must validate the session
before returning protected content.

### Existing-session compatibility

Do not introduce a separate password/token universe that invalidates a
person's existing Pokyh session. The current backend refresh-token behaviour is
account-wide, so a production SSO exchange or a session-scoped refresh-token
change must be designed and tested before cross-app sign-in is enabled. Do not
solve this by exposing a server key to the browser.

## Backend Contract

The backend has an additive `/learn` route family, mounted after the existing
API-key middleware. Route names and exact response schemas live in
`docs/api-contract.md`; treat that document as the source for frontend client
types and contract tests.

Representative route groups:

```text
GET   /learn/catalog
GET   /learn/catalog/:slug
GET   /learn/me
GET   /learn/dashboard
GET   /learn/courses
POST  /learn/courses
PATCH /learn/courses/:id
GET   /learn/courses/:id
POST  /learn/courses/:id/enroll
POST  /learn/courses/:id/sections/:sectionId/complete
POST  /learn/courses/:id/sections
PATCH /learn/courses/:id/sections/:sectionId
POST  /learn/courses/:id/sections/reorder
GET   /learn/vocabulary
POST  /learn/vocabulary
POST  /learn/vocabulary/lookup
POST  /learn/vocabulary/:entryId/verify
GET   /learn/reviews
POST  /learn/quiz-attempts
GET   /learn/library/export
POST  /learn/library/import
GET   /learn/teams
POST  /learn/teams
GET   /learn/admin/overview
POST  /learn/admin/course-access
```

Every endpoint other than published catalogue reads requires the normal API-key
gate plus the authenticated user bearer token. Public catalogue reads remain
API-key protected when accessed from trusted server-side BFF code; do not make
the global API key browser-visible just to make catalogue cards render.

Use structured responses. A request failure returns a safe error string and an
appropriate HTTP status; it never reveals a stack trace, database query,
secret, internal topology, another user's resource details, or a permission
decision beyond what is needed for the user.

## Durable Learn Data

The backend Prisma schema includes additive Learn models. Names can evolve, but
their responsibility boundaries must remain clear:

| Model group | Responsibility |
| --- | --- |
| `LearnProfile` | Durable learning identity tied to an existing Pokyh user |
| `LearnCourse`, `LearnSection` | Versioned course and structured content |
| `LearnCourseAccess`, enrollment | Visibility, grant, ownership, membership access |
| `LearnVocabulary` | Curated vocabulary, lexical metadata, examples, provenance |
| `LearnReviewState` | Per-user schedule, strength, lapse/error state |
| `LearnQuizAttempt` | Append-only, idempotent answer history and grading result |
| `LearnTeam`, `LearnTeamMember` | Team ownership and scoped membership |

Use foreign keys, indexes, and unique constraints deliberately. Resource
lookups should be indexed by ownership/access paths; review fetches by
`stableUid`, due timestamp, and state; course lookups by slug/publication;
team membership by team and user. Do not add a foreign key or cascade rule
without auditing lifecycle effects.

### School-year rollover protection

The wider Pokyh backend has a school-year archive process that previously
deleted non-administrator users. That would erase or orphan independent Learn
data. Learn profile owners are explicitly retained by the archive process.

Never remove that protection casually. Any future account archival/deletion
flow must define whether it anonymizes, exports, retains, or deletes Learn
content and review history, and must do so transactionally and visibly to the
affected person.

## Quiz, Errors, and Spaced Review

An answer is a server event. The client submits the activity/card revision,
answer payload, timing metadata permitted by policy, queue context, and an
idempotency key. The backend validates scope, grades against the server's
accepted answer variants, appends an attempt, updates progress, and updates a
review state inside a transaction.

Wrong answers enter the user's server-managed error/review path. A review
queue can include:

- scheduled items due by the current interval;
- recent mistakes;
- weak or lapsed items;
- a controlled amount of new material.

The client never decides whether an answer is ultimately correct based only on
a translation service. Normalization rules, accepted answer variants,
case/diacritic policy, and semantic exceptions belong to the content model and
server grading rules.

Retries must use the same idempotency key and return the original result
without creating a second attempt or changing scheduling twice. The backend
accepts `Idempotency-Key`; the BFF forwards it only for supported mutation
routes. Store an idempotency record long enough to cover browser/network retry
windows and scope it to user plus operation.

## Vocabulary, Dictionary, and Writing Assistance

Vocabulary creation follows this safe path:

```text
author input
  -> backend validation and normalization
  -> optional provider lookup / suggestion
  -> author or authorized editor review
  -> versioned vocabulary entry with accepted answers and provenance
```

An external service can help discover spelling, form, example, or translation
suggestions. It is advisory only. The app's curated content is the authority
for a quiz.

### Current provider strategy

The mounted adapter is disabled by default and configured entirely through
`LEARN_DICTIONARY_*`. When enabled, an authorized editor can explicitly ask the
server for a MyMemory suggestion for an allowed language pair. The response is
shown as a suggestion, then a human saves the editorial answer; it is never a
live quiz judge. Provider calls are server-side, bounded by timeout/cache
policy and never initiated by a learner's list view.

A reviewed Kaikki/Wiktionary snapshot can be added later as a local lexical
source only after its license, provenance, update process and storage policy
are documented. Do not silently replace the mounted adapter or imply that a
future source has been deployed.

Optional provider choices are server configuration:

| Need | Safe default |
| --- | --- |
| Lexical lookup/import | Explicit server-side, configured suggestion plus editorial review |
| Translation proposal | Configured server-side provider, labelled as a suggestion |
| Writing feedback | Self-hosted LanguageTool or similarly reviewed service |
| Quiz correctness | Own curated accepted answers only |

Never use the public LanguageTool endpoint as a production automation service.
Never send personally identifiable or sensitive learner text to a third party
without an explicit data-protection decision. Never cache licensed provider
content beyond the provider's contract.

Required server-only configuration includes provider selection, URLs, API keys,
timeouts, request limits, permitted language pairs, attribution text, and
fallback policy. Provider outage must leave manual authoring and local quiz
grading functional.

## JSON Import and Export

Do not expose raw database dumps. The mounted personal import/export uses a
versioned, documented JSON manifest:

```json
{
  "kind": "pokyh-learn-personal-export",
  "version": 1,
  "exportedAt": "ISO-8601 timestamp",
  "profile": {},
  "courses": []
}
```

The schema is validated server-side before any write. The current personal
import enforces configured nested limits, version, string lengths, duplicates
and internal references, remaps every ID, and creates only private drafts. A
future administrative or material import must add an explicit dry-run/preflight
and durable audit record before it can be exposed.

Rules:

- A person can export their own private content and eligible personal data.
- A course owner can export their course only if policy allows it.
- Team/private material needs the specific owner/team permission.
- Platform-level catalogue export or migration is administrator-only.
- Import data can never grant a role, alter membership, add a credential,
  overwrite another owner's resource, or bypass moderation.
- Export excludes passwords, access tokens, refresh tokens, API keys, audit
  secrets, and unrelated users' progress.
- Payload contents must never be copied into ordinary logs. A future
  platform-wide import/export requires a dedicated audit trail before release.

## Cache, Offline, and Performance

### Cache layers

| Layer | Suitable data | Rule |
| --- | --- | --- |
| Backend Redis | rate limits, short-lived public catalogue reads, course revision cache, review queue fragments, idempotency records | keyed by scope/revision; invalidated on content/access change |
| MySQL | all persistent learning data | authoritative; cache miss must recover here |
| Next.js server cache | public catalogue metadata | tag + short revalidation only; no user data |
| Browser memory | current screen/filter state | discardable |
| IndexedDB | revisioned lesson snapshots and pending idempotent answer drafts | no tokens, credentials, or shared private data |

Redis is a deployment requirement for horizontally scaled production, but the
current core remains durable when Redis is unavailable because MySQL owns the
learning state. Add Redis through explicit environment configuration and a
failure-safe adapter; do not silently assume an in-memory cache works across
processes.

### Invalidation events

Invalidate affected cache tags/keys after:

- course, section, activity, or vocabulary revision;
- course access or visibility change;
- team membership or invitation change;
- author/editor/admin grant change;
- quiz submission and review scheduling update;
- catalogue publication or moderation state change;
- provider policy/configuration change when cached lookup output is involved.

Never place a bearer token, raw user ID, password, translation input, or
private sentence in a shared cache key or cacheable URL. Responses containing
private profile/progress data are `no-store` or securely user-scoped.

### Frontend performance

- Server-render public catalogue and initial protected pages where possible.
- Use small client islands for filters, editors, quiz interaction, and charts.
- Keep the visual system CSS-first; do not add a heavy visual dependency for a
  card, progress line, or simple chart.
- Lazy-load infrequently used editor/import/admin UI.
- Use stable keys and optimistic UI only when rollback is clear.
- Make loading, empty, offline, retry, and server-error states intentional.
- Test small phones, tablets, and wide desktop layouts before release.

## Frontend Architecture

```text
app/                    routes, layouts, BFF route handlers
components/layout/      navigation, responsive shell, top bar
components/learn/       dashboard, catalogue, course, quiz, vocabulary, teams
components/ui/          low-level visual primitives
lib/client/             browser-safe BFF client only
lib/server/             server-only configuration, data, session, backend client
UI/                     visual system context and design rules
docs/                   architecture, API contract, decisions, delivery evidence
docs/worklog/           chronological, non-sensitive implementation protocol
.github/workflows/      deterministic CI
```

Keep domain rules out of React components. A component can format, guide, and
submit; it does not decide access, grade responses, persist final content, or
calculate an authoritative review schedule.

Use TypeScript strict mode. Validate untrusted API data at the boundary with
runtime schemas before it enters feature state. Prefer exact domain types to
unbounded `any`, broad anonymous objects, or unsupported assumptions about a
backend response.

## UI Contract

Read `UI/CLAUDE.md` before changing the visual language. Its rules are part of
the product contract.

The intended experience is a quiet learning cockpit:

- soft off-white surfaces, restrained lavender/rose/mint/sun learning states,
  and a high-contrast dark active navigation state;
- generous whitespace, readable type, simple rounded cards, and one strong
  next action per screen;
- desktop uses a slim navigation rail and modular learning/progress panels;
- mobile preserves task focus with a compact top bar and bottom navigation;
- course colours are semantic/configurable and never the only status signal;
- quiz feedback is immediate, explanatory, accessible, and emotionally calm;
- no unlicensed copied artwork or copied product layouts.

Every interactive control needs a text label or accessible name, keyboard
operation, a visible focus state, at least 44px target size where practical,
and status information not conveyed by colour alone. Respect reduced-motion
preferences. Use language tags for foreign-language content where the markup
supports it.

## Configuration

The checked-in `.env.example` documents frontend deployment variables. Never
commit a real `.env` file, secret, key, password, token, provider credential,
or production cookie.

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | public metadata | canonical Learn origin |
| `PORT` | runtime | frontend listener port; production compose default is `3005` |
| `LEARN_BIND_ADDRESS` | deployment | host address Compose binds; default is loopback only |
| `API_BACKEND_URL` | server only | `api.pokyh.com` base URL |
| `API_BACKEND_KEY` | server only | backend API-key gate |
| `LEARN_SESSION_COOKIE_NAME` | server only | HttpOnly access cookie name |
| `LEARN_REFRESH_COOKIE_NAME` | server only | HttpOnly refresh cookie name |
| `LEARN_CSRF_COOKIE_NAME` | server/public-safe name | double-submit CSRF cookie name |
| `NEXT_PUBLIC_LEARN_CSRF_COOKIE_NAME` | public metadata | CSRF cookie name used by the same-origin client |
| `LEARN_COOKIE_DOMAIN` | server only | optional cookie scope |
| `LEARN_API_PREFIX` | server only | backend Learn route prefix |
| `LEARN_API_TIMEOUT_MS` | server only | BFF backend deadline |
| `LEARN_BFF_BODY_LIMIT_BYTES` | server only | bounded ordinary JSON body size accepted by the BFF |
| `LEARN_BFF_IMPORT_BODY_LIMIT_BYTES` | server only | separately bounded library-import JSON body size accepted by the BFF |
| `LEARN_PRIVACY_NOTICE_URL` | server runtime / safe public output | HTTPS legal notice URL passed to the sign-in form at request time |
| `LEARN_PRIVACY_NOTICE_VERSION` | server runtime / safe public output | notice version matched by the backend before WebUntis verification |
| `NEXT_PUBLIC_LEARN_DEMO_MODE` | local development only | enables static visual demo data |

The production backend additionally configures at least:

- `CORS_ORIGIN` including exactly `https://learn.pokyh.com` and approved local
  development origins;
- `LEARN_ALLOWED_ORIGINS`, `BODY_LIMIT_IMPORT`, request limits and cache TTLs;
- `LEARN_DICTIONARY_ENABLED`, provider URL/contact, allowed language pairs,
  timeout and bounded cache policy;
- `LEARN_IMPORT_MAX_*` item limits;
- Redis only after a dedicated deployment review;
- admin-configured catalogue policy, public publishing policy, authoring
  limits, moderation rules, and retention policy.

Only deployment defaults and secrets belong in environment variables. Dynamic
product policy belongs in the protected backend administration configuration,
not in `NEXT_PUBLIC_*` browser values.

## Security Checklist

Before any release, check all of the following:

1. Authentication uses server-only API credentials and HttpOnly session
   cookies; no token exists in a browser-readable persistent store.
2. Every protected backend route validates API key, bearer token, resource
   access, input, body size, and rate limit.
3. Mutating BFF requests have same-origin and CSRF protection.
4. Public catalogue routes cannot disclose drafts, private course metadata,
   team membership, author-only notes, or personal progress.
5. Course, team, and grant lookups are scoped before data is fetched.
6. The mounted personal import is schema-validated, size-limited,
   permission-checked, remapped into private drafts, and unable to grant
   privilege. Broader imports require dry-run and audit work before exposure.
7. Quiz submissions are idempotent and server-graded.
8. Cache keys/responses cannot cross user/team/visibility boundaries.
9. Logs and error responses contain no credentials, raw secrets, sensitive
   learning content, or internal query details.
10. Dependencies are audited and critical/high issues are resolved or have an
    explicit, reviewed mitigation before shipping.
11. Cookie, CORS, CSP, HTTPS, and origin policies match the deployed domain.
12. User deletion/archive, export, retention, and consent behaviour are
    documented and tested for learning data.

## Quality, Documentation, and Delivery Rules

- Prefer simple, maintainable, documented solutions over premature framework
  complexity.
- Use clear, short English code comments only when a non-obvious decision needs
  context.
- Keep `README.md`, `.env.example`, `docs/architecture.md`,
  `docs/api-contract.md`, and `docs/decisions.md` current whenever the contract
  changes.
- Maintain `docs/worklog/` for every implementation run. Before an agent makes
  a material product, security, deployment, design, or documentation change,
  it records the intent; after the change it records the outcome, affected
  files/services, verification, remaining risk, and release state. Add a
  concise timestamped entry for each meaningful decision, edit batch, test,
  visual check, dependency change, PR check, commit, and push. A worklog is a
  durable summary—not a transcript of private reasoning—and must never contain
  credentials, tokens, passwords, raw personal data, production URLs with
  embedded secrets, or copied third-party private content.
- Start each delivery with a dedicated dated worklog file from
  `docs/worklog/README.md`; update it as work proceeds so another maintainer
  can recover the exact technical context without relying on chat history.
- Do not add a dependency without a concrete need, bundle-size review, and
  security review.
- Do not use destructive database commands, drop tables, overwrite unrelated
  work, or reset a repository to make a task easier.
- Do not change existing Pokyh behaviour to make Learn work; add a compatible
  extension and test both paths.
- Test visible states, keyboard navigation, focus movement, error states,
  loading states, empty states, mobile layout, and unauthorized access paths.
- Before starting work, inspect open pull requests for both repositories. If a
  relevant PR exists, inspect its merge state and resolve only actual merge
  conflicts before continuing; do not overwrite a contributor's work. Repeat
  this check for every affected repository, including the shared Pokyh frontend.
- Before each material edit batch, inspect `git status` and preserve every
  unfamiliar modified or untracked file. Never delete, reset, clean, rename, or
  overwrite another contributor's work to simplify a conflict; document the
  hand-off or ask the human owner when the scope is unclear.
- After a coherent checkpoint has passed its relevant tests, ask the user once
  for that checkpoint's exact commit/push scope and Git identity in the exact
  form `Name <email>`. Do not create even a checkpoint commit before those tests
  pass or before that explicit answer is received. Use only the confirmed
  identity in local repository configuration; never change global identity,
  write it into project files, or store it outside `.git/config`.
- Never add an AI/assistant `Co-authored-by` trailer, signature, branding or
  attribution to commits, source files, documentation, PR text or release
  notes unless the user explicitly asks for it. Do not force-push or rewrite
  shared history without a specific request.
- Before delivery, run the relevant type check, lint, production build, API
  tests/contract checks, and browser smoke tests. Inspect the diff for secrets,
  unrelated files, accidental generated output, configuration leakage, and
  placeholder content enabled in production.
- After the user confirms the release scope and identity, commit only after all
  checks pass, use a clear message, push the current branch, and report the
  verified revision and remote result.

### Smooth scrolling (Lenis)

- Lenis is a Learn-frontend-only enhancement. Import it only from the locally
  installed package and lockfile; do not load it from a CDN or use it in the
  API, authentication, grading, or administration service.
- Native browser scrolling remains the semantic baseline. Respect
  `prefers-reduced-motion`, keep keyboard/focus/anchor behavior intact, and
  make every route completely usable when Lenis is disabled or unavailable.
- Mark modals, forms, popovers, and every nested interactive scroll region with
  `data-lenis-prevent`. Do not scroll-jack touch input, trap keyboard scrolling,
  or make learning progress, correctness, saving, or navigation depend on a
  scroll animation.
- When Lenis changes, test reduced motion, keyboard navigation, focus movement,
  touch scrolling, anchor links, and nested scrolling at mobile and desktop
  widths before the checkpoint can be committed.

## CI

`.github/workflows/ci.yml` is mandatory on every push and pull request. It uses
the lockfile, runs linting, TypeScript validation, and a production build.

Keep CI deterministic:

- use `npm ci`, never an implicit dependency update;
- pin the supported Node major in the workflow;
- retain least-privilege token permissions;
- cancel stale runs for the same branch/PR;
- add route/API browser smoke coverage as the authenticated test fixture and
  test database become available;
- do not consider local success a substitute for the hosted workflow result.

## Release Gate

Do not ship if any item is incomplete:

1. Required user flow works against a configured backend, including an
   unauthorized case and an expired session case.
2. `npm ci`, `npm run lint`, `npm run typecheck`, and `npm run build` pass in
   the frontend; relevant backend build/schema checks pass in the backend.
3. The browser UI is reviewed at mobile, tablet, and desktop widths.
4. Public, private, team, editor, owner, and administrator access decisions
   are tested where the change touches them.
5. Import/export, dictionary/provider, and review changes have a negative-path
   test when modified.
6. Dependency audit results are reviewed; no unresolved critical/high issue is
   silently accepted.
7. The production environment has correct secret/configuration values and
   CORS includes only approved origins.
8. Git diff is clean, documentation is current, and no unwanted branding,
   generated build directory, credentials, or unrelated modification
   is included.

## Known Follow-ups

The delivered Learn core persists all learning data in MySQL. The source and
Compose configuration can optionally run Redis for a private course-specific
analytics response cache; it must fall back to MySQL and is not evidence that a
remote production Redis service is deployed. Verify the deployed topology
separately before enabling any use beyond that narrow cache.

Before enabling the optional MyMemory dictionary adapter in production, review
its terms, privacy impact, rate limits, required attribution, cache rights,
language-pair support and outage behaviour. Keep curated answer variants as the
quiz authority regardless of the provider; manual authoring must work if the
provider is unavailable.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
