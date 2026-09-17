# 2026-09-16 — Teams/courses admin, team-scoped vocab, UX/visual audit

## Intent

User request (verbatim, translated from German, received mid-session with
4 annotated screenshots of `learn.pokyh.com/teams` and `/dashboard`):

1. Courses aren't visible somewhere they should be; add course view/edit/
   delete to the `pokyh-backend` admin panel (`LearnCoursesPage.tsx` exists
   but courses "don't show up").
2. Add a way to make someone the owner of a team (ownership transfer),
   in the backend admin.
3. Predefined Italian + English vocabulary should exist as a course each
   (not just raw vocab entries).
4. Vocabulary must be strictly team-scoped: each team only sees/edits its
   own vocab, never another team's.
5. The vocab entry-checking pipeline (translation correctness + spelling)
   must actually work — this is the existing `LEARN_DICTIONARY_*` MyMemory
   adapter described in this repo's own `CLAUDE.md`
   ("Current provider strategy" section) — verify/complete it, don't build
   a second system.
6. Settings page (`/settings` on learn.pokyh.com) needs genuinely useful
   content, reorganized as a clean submenu under the workspace-switcher
   button shown in the screenshot (the "plat-feli / POKYHlearn" card with
   a chevron).
7. Full visual/contrast audit — screenshots show barely-legible text (e.g.
   the Teams page card: white/pink card, near-invisible "ADMIN" crown
   label, team name, and member count).
8. Team/group **creation** must only be possible from the `api.pokyh.com`
   backend admin panel when logged in as a Pokyh administrator — remove/
   hide the "+ Neue Gruppe" create action on `learn.pokyh.com/teams`
   entirely for normal users. This matches this repo's own `CLAUDE.md`:
   "group creation ... are canonical Pokyh administrator actions."
9. Team **owners** (not admins) should be able to add members to their
   *existing* team directly on `learn.pokyh.com`, via a dropdown + search
   field to find users. This is a deliberate product decision from the
   user, narrower than #8 (creation stays admin-only; membership addition
   on an existing team becomes owner-capable) — needs new, carefully
   server-enforced authorization (owner of *that* team only, never other
   teams) since it's new write surface.
10. The `⌘K` search-shortcut hint should be OS-aware (show `Ctrl+K` on
    Windows/Linux, `⌘K` only on macOS).
11. The dashboard's "Lernrhythmus" graph is empty/non-functional — make it
    show real data. Add a profile view with streak, total minutes learned,
    and a GitHub-contributions-style heatmap of quiz minutes per day.

User's own words on process: "TESTE alles dann push es in prod!",
"DURCHDENKE ES", "SCHREIB DEN PLAN IRGENDWO HIN DASS DU IHN NICHT
VERGISST" — hence this file. Standing rules from earlier in this session
still apply: no AI co-author trailer on commits, confirm scope + git
identity before each commit, protocol everything, never delete another
agent's unfamiliar work.

## Repos touched

- `pokyh-backend` — admin course view/edit/delete, team-ownership
  transfer, owner-add-member authorization endpoint, dictionary
  verification completion if needed.
- `pokyh_learn-frontend` — courses-not-visible bug, team-scoped vocab UI,
  predefined IT/EN vocab courses, settings redesign, contrast audit,
  remove team-create UI, add owner add-member UI (dropdown+search),
  OS-aware shortcut hint, dashboard graph + profile/streak/heatmap.

## Execution order (by risk/dependency, not necessarily user's listed order)

1. Investigate why courses don't show (likely a real bug — do this first,
   it blocks understanding several other items).
2. Visual/contrast audit + team-create-button removal (concrete, low-risk,
   already screenshotted).
3. Admin: course view/edit/delete + team ownership transfer.
4. Backend: owner-can-add-member endpoint (new authorization surface —
   needs careful server-side ownership check).
5. Frontend: add-member dropdown+search UI wired to #4.
6. Team-scoped vocab enforcement audit (check current scoping is real,
   not just UI-level).
7. Predefined IT/EN vocab-as-course seeding.
8. Dictionary verification (translation+spelling) completion/audit.
9. Settings page redesign.
10. OS-aware shortcut hint (small, isolated).
11. Dashboard graph real data + profile/streak/contribution-heatmap (largest
    net-new feature — last, since it's additive and lowest-risk to defer).

## Status

### Done (this batch)

- Investigated item 1: `pokyh-backend/admin/src/pages/LearnCoursesPage.tsx`
  already has full view/status-lifecycle/delete/direct-access-grant
  management — it existed but was **unwired** (no route, no sidebar entry)
  before this session's earlier backup-system commit (`149941e`), which
  wired it in. No further backend admin course work needed; the fix is
  already pushed, pending a production deploy.
- Item 7 (partial): root-caused and fixed the Teams page contrast bug —
  `.team-card--coral`/`--lavender` used hardcoded light-only hex colors
  instead of the theme-aware `--rose-wash`/`--violet-wash` variables
  `.course-card` already uses, so in dark mode the card background never
  switched while its near-white `--ink` text did, producing near-invisible
  text. Fixed both backgrounds plus `.team-role`'s hardcoded grey (now
  `var(--ink-muted)`).
- Item 8: removed the "+ Neue Gruppe" create card from
  `components/learn/teams-view.tsx` and the empty-state's create CTA;
  deleted `app/teams/new/page.tsx` and `components/learn/team-create-form.tsx`
  entirely (server-side authorization already correctly restricted creation
  to platform admins via `requireLearnAdmin` in both `POST /learn/teams`
  routes — this was a UI/product cleanup, not a security fix).
- Item 2: ownership transfer **did not exist at all** — closer reading
  found both `teamRoleSchema` (learn.ts) and `adminLearnTeamMemberSchema`
  (admin.ts) only ever accepted `MANAGER`/`MEMBER`, and the admin UI's role
  dropdown never offered `OWNER` as an option. Added a dedicated
  `POST /api/admin/learn/teams/:teamId/owner` endpoint (admin.ts) that
  transactionally promotes the target to OWNER and demotes any other
  current OWNER(s) to MANAGER, plus a "Eigentümer" button in
  `LearnTeamsPage.tsx` next to each non-owner member.
- Item 9: found `/teams` and `/teams/[slug]` were **entirely platform-admin-
  gated** (`requireLearnAdministrator`) even though the backend's
  `GET /learn/teams` already correctly scoped results per-user — meaning no
  real team owner could reach their own team page at all before this fix.
  Changed both pages to `requireLearnUser`. Added backend support: a
  `isTeamOwner()` helper, relaxed `POST /learn/teams/:teamId/members` to
  allow the team's own OWNER (never MANAGER, never another team — role
  stays restricted to MANAGER/MEMBER, OWNER stays admin-only via the
  dedicated transfer endpoint above), and two new read routes,
  `GET /learn/teams/:teamId/members` (full roster, any current member or
  admin) and `GET /learn/teams/:teamId/candidate-members?q=` (owner/admin-
  only WebUntis-verified user search, minimal fields, excludes existing
  members). Built `components/learn/team-member-manager.tsx` (roster list +
  search/select/add-with-role UI, gated by the new `Team.canManageMembers`
  field) and wired it into `/teams/[slug]`.
- Verified (pokyh-backend, per separate user follow-up about backup
  completeness): `mysqldump` has no table filter anywhere, so it already
  backs up every table including the school-year archive tables
  (ArchivedUser/ArchivedClass/ArchivedTodo/ArchivedReminder) — documented
  this in a code comment rather than changing behavior.

Verification: `npx tsc --noEmit`, `npm run lint`, `npm run build` all pass
clean in `pokyh_learn-frontend`; `npx tsc --noEmit` clean in `pokyh-backend`
and its `admin/` SPA. Could not do an interactive browser check of the new
`/teams` flow specifically — it requires a real authenticated session and
demo mode does not bypass the page-level session gate (only affects data
fetching), so this remains a known gap until a real login is available to
test against; flagging rather than claiming full verification.

### Done (second batch, same day)

- Item 4: audited team-scoped vocabulary isolation — already correctly
  enforced. Vocabulary belongs to a course, not a team directly, and
  `resolveCourseAccess` in learn.ts only grants VIEW on a `TEAM`-visibility
  course to actual members of `course.teamId`. No gap found.
- Item 3: added `seedStarterVocabCourses()` (admin.ts) — every new team
  gets an Italian and an English `TEAM`-visibility vocabulary course
  automatically (idempotent, keyed by team+language), plus a "Vokabelkurse
  anlegen" admin action to backfill teams created before this existed.
- Item 5: audited — already fully built end-to-end (`/vocabulary/lookup`,
  `/vocabulary/validate`, `/vocabulary/:id/verify` routes; `learnDictionary.ts`
  reads live from the DB-backed `LearnConfig`, not just env; admin UI toggle
  already exists on the "Learn" config page). Both `dictionaryEnabled` and
  `dictionaryValidationEnabled` default to `false` — this needs an admin to
  flip two toggles in production, not more code. Flagged rather than
  claimed fixed, since no production admin credentials were available here.
- Item 10: `⌘ K` was hardcoded regardless of OS. Now detects the platform
  client-side (`useSyncExternalStore`, matching this file's own system-theme
  pattern) and shows "Strg K" on non-Apple platforms.
- Item 6: the sidebar's username/avatar card had a decorative chevron with
  no click handler at all — did nothing. Turned into a real dropdown
  (Settings + a first-ever Log out action — the BFF route existed but had
  no UI trigger anywhere, on any screen size) and added the same to the
  mobile nav overlay, since the desktop sidebar is hidden below 780px.
- Item 11: added real, client-measured `durationMs` to quiz attempts
  (per-question timing, sanity-capped server-side at 3h — never estimated),
  aggregated into `LearnActivityDaily`, exposed as `totals.minutesLearned`
  and a new `yearActivity` field (trailing 366 days, independent of the
  requested range). Built `/profile`: streak, real minutes learned, active
  days, and a GitHub-style contribution heatmap, linked from the
  dashboard's streak pill. The existing "Lernrhythmus" dashboard chart was
  already wired to real data — it showed zeros only because the test
  account had no quiz history yet (same empty-state pattern as the earlier
  catalog investigation, not a bug).
- Found and fixed one regression from the earlier `/teams` access fix: the
  sidebar nav still hid the "Teams" link behind `adminOnly: true` even
  though the page itself was already opened to every authenticated user.

Verification: `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean
in `pokyh_learn-frontend`; `npx tsc --noEmit` and `npm run build` clean in
`pokyh-backend`. Same known gap as the first batch: no real authenticated
session available here to browser-test `/profile` or the workspace-menu
dropdown interactively — verified by strict typecheck/lint/build only.

### Done (third batch, same day — self-contained spelling check)

User follow-up: build a local algorithm that checks spelling itself, plus a
fallback for when the external dictionary API doesn't work.

- Root cause: German/Italian entries got **no check at all** — the external
  `dictionaryapi.dev` only documents English headwords, so non-English words
  were silently waved through as "editorial review" with zero verification.
- Built a dependency-free local heuristic in `learnDictionary.ts`:
  structural spelling plausibility (vowel presence, triple-letter-repeat,
  language-tuned max consonant-run — German needed a generous threshold
  after "Herbstpflicht" false-flagged at the initial value, real compounds
  legitimately run 7+ consonants at morpheme boundaries) plus a same-course
  near-duplicate check (Levenshtein distance 1) against this platform's own
  already-saved vocabulary — never a third-party word list.
- Deliberately did **not** bundle the standard npm Hunspell dictionaries for
  German/Italian (`dictionary-de`, `dictionary-it`) after checking their
  licenses — GPL-2/3, which needs the same license/provenance review this
  repo's CLAUDE.md already requires before adding any bundled lexical
  source, not a casual `npm install`.
- This local check now runs for all three languages, and serves as the
  fallback whenever the external English API is disabled, misconfigured, or
  unreachable — verified against a **real induced failure** (the sandboxed
  Docker test network genuinely couldn't reach the external API), not just
  a simulated one.
- Returns a machine-readable `reasonCode` (translated client-side into
  de/en/it) instead of raw English backend prose, fixing a related gap
  found while wiring it up: the frontend never displayed the validation
  `message` field at all before this.

Verification: standalone heuristic sanity tests (15/15 structural cases,
Levenshtein distance cases) before touching the real service; full Docker
end-to-end test against a live MySQL + running server — real near-duplicate
detection via an actual DB query, real structural rejections, real
API-unreachable fallback, real unauthorized/wrong-course rejection, real
audit log inspection (confirmed no raw word content is logged). `npx tsc
--noEmit`, `npm run lint`, `npm run build` clean in both repos.

### Fourth batch (2026-09-17) — team vocab access, deletion, multi-owner, user picker, profile-of-others

Full plan approved via `/plan` (see plan file
`snoopy-tickling-kurzweil.md` in the Claude Code plan store) after two
Explore agents + one Plan-agent design review. Root cause of the starter
vocab courses being invisible/unusable: three independent gaps —
`/catalog` correctly stays PUBLIC+PUBLISHED-only (not touched), "Meine
Kurse" requires an explicit `LearnEnrollment` row that team membership
never created, and `resolveCourseAccess` only ever grants team members
`VIEW` (never `EDIT`), which blocked both adding vocabulary and submitting
quiz attempts. Fix: a new `learnTeamVocab.ts` service grants both an
`ACTIVE` enrollment and an `EDIT` course-access row to every current/new
team member on the two starter courses specifically (not a blanket
TEAM-visibility policy change), wired at team creation, the existing
idempotent backfill button, and both member-add routes.

Also approved in the same plan: wire up the already-working
`DELETE /vocabulary/:entryId` backend route to a real delete button in
`vocabulary-workspace.tsx` (backend needed zero changes); change
"Eigentümer machen" from a transfer (which demoted the existing owner) to
genuinely adding an additional simultaneous owner, since the codebase's
own `ownerCount <= 1` removal guard already anticipated multi-owner as a
valid state before today; and replace the blind username text input for
adding team members (both the admin panel and learn.pokyh.com) with a
searchable, browsable picker — the admin panel reuses the already-existing
`adminApi.users()` endpoint, and learn.pokyh.com's candidate-search route
already supported an empty query server-side, so only the frontend's
early-return guard needed removing.

### Status: implemented and verified end-to-end (2026-09-17)

All of the plan above is now built, typechecked/linted/built clean in both
repos, and verified against a real Docker stack (live MySQL, running
server, no mocks) — not just simulated:

- Team creation seeds 2 starter courses and grants the initial owner
  EDIT + enrollment; `GET /learn/courses` lists both immediately.
- Both member-add paths (admin panel, and the owner-triggered
  learn.pokyh.com route built earlier — different transaction shapes,
  confirmed both correctly call the post-commit grant) give a new member
  the same access.
- A team member can add a German↔Italian word and a German↔English word
  (previously `ForbiddenError` on both) and submit a graded quiz attempt
  with real `durationMs` tracking (previously blocked entirely).
- Deletion: the entry's own creator gets 204; someone with no course
  access at all gets 403.
- The exact real-world "BFS FI 4" scenario was reproduced directly: a team
  simulated as pre-fix (courses exist, zero access grants) correctly fails
  `POST /vocabulary` beforehand, then the idempotent backfill button
  (`created: 0` — no duplicate courses) retroactively grants access and
  "Meine Kurse" starts showing both courses immediately after.
- Multi-owner: promoting a second owner does not demote the first: both
  show as OWNER afterward. Removing one of two owners succeeds; removing
  the last remaining owner is still correctly blocked by the pre-existing
  guard.
- Teammate stats: a teammate can view another member's streak/minutes/
  heatmap; the response never includes `courses` or `days` (only the
  aggregate fields) — verified via direct field-presence check on the raw
  response, not just eyeballing the shape; an outsider not on the team is
  rejected (403) from both the stats route and the roster route.
- The admin panel's reused `adminApi.users()` endpoint browses (empty
  query) and searches correctly.
- No unexpected errors in server logs across the whole run.

Added after plan approval, same message:

- Extend `/profile` so a team member can view **another** team member's
  stats (streak, minutes, contribution heatmap) — same component, scoped
  to a viewed user instead of only the caller. Needs a new backend route
  that returns another user's analytics, authorized to team members
  viewing a teammate only (never an arbitrary stranger — privacy: this is
  the same team-scoping principle already enforced everywhere else in
  this app, e.g. `resolveCourseAccess`'s TEAM-visibility check).
- Git identity for commits going forward: `Plattnericus
  <felix.plattner312009@outlook.de>` (previously `nexor
  <nexor@plattnericus.dev>` earlier today — user explicitly changed it).
- User asked to delete `pokyh-backend/.github/workflows/*` "if not
  needed." Checked: `.github/workflows/ci.yml` validates the Prisma
  schema, builds TypeScript, and runs `npm audit --omit=dev` on every
  push/PR — this is exactly the quality gate manually run before every
  commit throughout this whole session. Flagged to the user as clearly
  needed rather than deleted; awaiting their explicit confirmation before
  removing a repo's only CI safety net.

### Remaining (not done)

- Visual/contrast audit beyond the Teams card fixed earlier — no further
  specific reports came in; would need either more screenshots or a live
  authenticated walkthrough to find anything else.
- (action item, not code) An admin needs to enable `dictionaryEnabled` and
  `dictionaryValidationEnabled` on the Learn config admin page for the
  translation/spelling-check feature to actually respond to users.
- (action item, not code) `pokyh-backend/.github/workflows/ci.yml` — user
  asked to delete it "if not needed." Checked: it validates the Prisma
  schema, builds TypeScript, and runs `npm audit --omit=dev` on every
  push/PR — exactly the quality gate manually run before every commit
  this whole session. Not deleted; flagged back to the user instead of
  removing a repo's only CI safety net on a conditional instruction.
