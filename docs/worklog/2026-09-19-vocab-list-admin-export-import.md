# 2026-09-19 — Admin vocabulary-list view, export, and merge-import

## Intent

User request (verbatim, translated from German, via `/plan`): a backend
feature so the admin panel can nicely browse each team's vocabulary lists
(the English/Italian lists that should always be created after team
creation), export a list's words as JSON, and import a JSON file back in —
merging new words into the existing list rather than overwriting, with
careful handling so a word already known in one translation isn't
duplicated, but a genuinely different translation (a synonym) is added.
User's own words on process: "DURCHDENKE ES UND MACH ES PERFEKT BEIM
IMPORTIEREN" / "teste es auch gründlich" — full plan researched via two
Explore agents and a Plan agent, approved via `/plan`, plan file
`cozy-plotting-turtle.md` in the Claude Code plan store.

Repo touched: `pokyh-backend` only (this is a backend + its own admin SPA
feature; no `pokyh_learn-frontend` change was needed). Both repos' `git
status`/open-PR state were checked before starting (`pokyh-backend`: clean
tree, no open PRs on `bedchem/pokyh-backend`).

## Key finding before implementation

The "per-team English/Italian vocab list, auto-created on team creation"
already existed (`seedStarterVocabCourses()` in
`src/services/learnTeamVocab.ts`, a "list" being a `LearnCourse` row with
`teamId` set and `visibility: TEAM`) — but only wired into the
admin-panel's own `POST /api/admin/learn/teams`, not the learner-facing
`POST /learn/teams` in `routes/learn.ts`. Fixed as part of this batch.

## Changes

- `src/services/learnVocabularyText.ts` (new): `normalizeAnswer`,
  `expectedAnswers` (moved out of `routes/learn.ts`, now exported/shared —
  the merge logic must use the exact same normalization the platform
  already uses to grade real quiz answers) and a new `parseTags` helper.
- `src/services/learnDictionary.ts`: exported `levenshteinDistance` (was
  private) for reuse by the new merge module.
- `src/services/learnVocabularyMerge.ts` (new): the merge/dedup algorithm
  (`mergeVocabularyEntries`). Sequentially folds each accepted incoming word
  into a live in-memory pool (so two colliding words in the same import file
  dedupe against each other, not only against the DB snapshot). Outcomes:
  `duplicate_exact` (same source, target matches one of the existing entry's
  `;`/`|`/`/`-split answer alternatives exactly), `duplicate_near_translation`
  (same source, target is a Levenshtein-distance-1 near match — a likely
  typo of an already-known translation), `synonym_added` (same source,
  genuinely different target — the existing entry is never touched),
  `duplicate_near_source` (source is distance-1 from an existing source AND
  the target also matches/near-matches that entry — a likely misspelling of
  an existing row), or plain `added` (a source that is distance-1 from an
  existing one but whose target is unrelated is still added, with an
  advisory `possibleTypoOf` hint — spelling similarity alone must never
  cause a silent skip, since many real distance-1 word pairs are genuinely
  different words). An optional dictionary-provider lookup (capped at 50
  calls per import, only for the ambiguous "same source, different target"
  case) attaches a purely advisory `dictionaryAdvisory` to the response —
  never written to the DB, never blocking, never changing the decision.
- `src/routes/admin.ts`: three new routes alongside the existing Learn
  course admin routes — `GET /learn/courses/:courseId/vocabulary`
  (paginated, searchable, includes `targetText` since this is the admin's
  own authoritative view), `GET .../vocabulary/export` (versioned JSON,
  `kind: 'pokyh-learn-vocabulary-list-export'`, `Content-Disposition:
  attachment`), `POST .../vocabulary/import` (validates against the live
  `importMaxVocabularyPerCourse` `LearnConfig` limit, runs the merge inside
  one `$transaction`, rejects with 422 and zero writes if the merge would
  exceed the course's cap). Logged via `logger.info('Admin action: Learn
  vocabulary list exported/imported', ...)` — counts only, no word text,
  matching this repo's existing audit-content rule.
- `src/routes/learn.ts`: `POST /teams` now wraps team creation in a
  transaction and calls `seedStarterVocabCourses` +
  `ensureAllTeamMembersVocabAccess`, matching the admin-panel twin — the gap
  fix.
- `src/index.ts`: mounted the larger `bodyLimitImport` JSON limit on the new
  import route's exact path (a full course's worth of words can exceed the
  general admin body limit), before the general `/api/admin` mount —
  same pattern as the two existing import routes.
- `admin/src/pages/LearnCoursesPage.tsx`: new `VocabularyPanel` component
  (mirrors the existing `CourseAccessPanel`'s expand/collapse pattern) wired
  into each `CourseCard` — a searchable word table, Export button
  (blob-download, same pattern as `exportDatabase`), Import button (hidden
  file input, `file.text()` → `JSON.parse` → POST, same pattern as
  `SettingsPage.tsx`), and a persisted per-import result panel (counts plus
  an expandable list of every non-`added` outcome for admin review).
- `admin/src/api.ts` / `admin/src/types.ts`: corresponding new `adminApi`
  methods and response types.

## Verification

- `npx tsc --noEmit` clean in `pokyh-backend`; `npx prisma validate` clean
  (no schema change was needed — dedup is computed at merge time, nothing
  new is persisted about the decision itself); `npm audit --omit=dev`: 0
  vulnerabilities (no new dependency was added).
- Admin SPA: `tsc -b && vite build` clean.
- Real Docker + MySQL run (`./scripts/compose-stack.sh up -d --build`,
  existing local stack/volume, not a fresh one) against a dedicated test
  admin account created for this session only:
  - Admin-panel team creation still seeds both starter lists (unchanged
    behaviour, confirmed as a baseline).
  - Learner-facing `POST /learn/teams` (the fix) now also seeds both starter
    lists, with the creator holding `EDIT` access and an `ACTIVE`
    enrollment on both — previously absent.
  - Added 10 real words to a starter list; exported it; re-imported the
    exact same file → `added: 0`, all 10 correctly classified
    `duplicate_exact`, word count unchanged. (First attempt at this hit a
    real bug — the import schema's envelope-level `.strict()` rejected the
    export's own `exportedAt`/`course` metadata fields, so re-importing an
    unmodified export failed with a 400. Fixed by dropping `.strict()` at
    the envelope level — the `kind`/`version` literals already reject an
    unrelated file format on their own — rebuilt and re-verified.)
  - Changed an existing word's translation to a genuinely different one
    (`groß` → `huge`, existing entry was `groß` → `big`) → `synonym_added`,
    original entry confirmed untouched via a fresh list fetch. The optional
    live dictionary-advisory lookup fired for real (provider was enabled in
    this test config), correctly returned `matchesIncoming: false` against
    the suggestion "big" — advisory only, the word was still added.
  - A genuine Levenshtein-distance-1 typo of an existing translation
    (`house` → `hous`) → `duplicate_near_translation`, skipped.
  - A distance-1 typo of an existing *source* word but with an unrelated
    translation (`Hund`/dog → `Hand`/hand) → `added`, with
    `possibleTypoOf: "Hund"` — confirms spelling similarity alone never
    causes a silent skip, the correctness case the user was most concerned
    about.
  - A distance-1 typo of an existing source word with a *matching*
    translation (`Hund`/dog → `Hunt`/dog) → `duplicate_near_source`,
    skipped.
  - Two identical new words inside the same import file → first `added`,
    second `duplicate_exact` against the first (intra-batch dedup).
  - No `Authorization` header → 401; a valid non-admin learner token →
    403 (`requireAdmin` correctly rejects a differently-shaped JWT payload
    even though both token systems share one signing secret).
  - Temporarily lowered `importMaxVocabularyPerCourse` below the course's
    current count, attempted an import → 422, word count confirmed
    unchanged (no partial writes); limit restored afterward.
  - Grepped the container's stdout logs for every test word used across the
    whole run — no vocabulary text appears anywhere; only the documented
    counts/ID audit fields.
  - Disabled the dictionary provider and re-ran a synonym-add → still
    succeeds, `dictionaryAdvisory: null`, confirming the provider is never
    load-bearing for the import to function.
  - Confirmed via the built admin SPA bundle served by the running
    container that the new UI strings and API paths are present and
    deployed.
- Not done: an interactive click-through of the new "Vokabeln" panel in a
  real browser — the Chrome browser-automation extension was not connected
  in this environment. Compile-time verification (SPA build) and the
  presence of the new UI/API code in the served bundle stand in for it;
  flagging rather than claiming a full interactive check, matching this
  repo's own established practice for prior Learn UI batches.
- All test data (one dedicated `verify-test-admin` account, two test teams
  and their seeded lists, and the words added above) was left in the local
  Docker/MySQL volume rather than deleted — this is the existing shared
  local dev database used across previous verification sessions for this
  feature area, and prior batches followed the same convention.

## Risk / next step

Low-to-moderate: new route surface is admin-only (`requireAdmin`, the same
gate as every other `/api/admin/learn/*` route) and additive — no existing
route, schema, or response shape changed except the now-fixed `POST
/learn/teams`, which only adds side effects that route's admin-panel twin
already had. The one real bug found (the export/re-import round-trip
initially failing) was caught by testing the exact workflow the feature
exists for, not left to the user to discover. Remaining gap: no interactive
browser check of the new admin SPA panel (see Verification above).

## Release state

Uncommitted — awaiting the user's confirmation of commit/push scope and Git
identity per this repository's own protocol before any commit is created.
