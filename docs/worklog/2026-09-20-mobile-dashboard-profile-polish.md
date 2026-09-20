## 2026-09-20 16:50 CEST — dashboard/profile visual polish, profile navigation fix, mobile overflow fix

- Intent: Address user-reported design issues: the "Lernrhythmus" weekly
  activity chart looked unfinished, the top-right avatar in the desktop
  topbar opened Settings instead of Profile (so the profile/stats page had no
  discoverable entry point from the topbar, sidebar account menu, or mobile
  menu), the profile contribution heatmap wasn't centered or polished, and a
  general mobile-responsiveness pass was requested.
- Outcome:
  - `components/layout/app-shell.tsx`: the topbar avatar now links to
    `/profile` (was `/settings`); added a dedicated Settings icon button next
    to it so Settings stays one click away. Added a "Profil" entry to the
    sidebar account dropdown and to the mobile hamburger menu footer — neither
    had one before, despite `nav.profile` already existing in `lib/i18n.ts`.
  - `components/learn/dashboard-view.tsx` / `app/globals.css`: the weekly
    activity chart now shows a numeric answer count above each bar, marks
    today's bar with a distinct rose gradient/ring, uses a violet gradient
    fill, and renders a thin neutral nub instead of an invisible 0%-height bar
    for empty days. `.activity-chart__column` moved from `display: grid`
    (relying on an implicit-row percentage-height quirk) to an explicit
    `display: flex; flex-direction: column; justify-content: flex-end`, which
    is the standard, unambiguous way to size percentage-height bars.
  - `components/learn/profile-view.tsx` / `app/globals.css`: the contribution
    heatmap (also reused by `teammate-stats-view.tsx`) is now centered inside
    its panel via a `width: max-content; margin: 0 auto` inner wrapper inside
    a dedicated horizontal-scroll region, and auto-scrolls to the most recent
    week on mount so a learner isn't starting on a year-old empty week on
    narrow screens. Cells got slightly larger with a hover affordance.
  - Root-caused and fixed a real mobile horizontal-overflow bug found via
    live rendering (see Verification): every mobile breakpoint that collapsed
    a multi-column grid to one column used bare
    `grid-template-columns: 1fr`, which (unlike the desktop rules, which
    correctly use `minmax(0, ...)`) does not let a track shrink below its
    content's min-content width — so a card with any unshrinkable content
    could force the whole grid, and the page, wider than the viewport. Every
    occurrence of `grid-template-columns: 1fr;` in `app/globals.css` (17
    sites: dashboard, course grids, team/library/admin grids, forms, the
    landing hero, auth page, etc.) was changed to
    `grid-template-columns: minmax(0, 1fr);`. Also added `min-width: 0` to
    `.page-heading > div` and `flex-wrap: wrap` to the mobile `.page-heading`
    rule (the streak-pill was being pushed off-screen next to the greeting),
    a defensive `overflow-x: hidden` on `html`/`body` as a safety net, and a
    text-truncation guard on `.team-member-manager__name` for long usernames.
  - Minor consistency cleanup: `.metric-chip`, `.activity-chart__column
    small`, and `.chart-legend` now use `var(--ink-muted)` /
    `var(--surface-muted)` instead of hardcoded hex grays, so they render
    correctly in dark mode.
- Affected areas: `app/globals.css`, `components/layout/app-shell.tsx`,
  `components/learn/dashboard-view.tsx`, `components/learn/profile-view.tsx`;
  this worklog. No backend, schema, auth, or API-contract changes.
- Verification: `npm run typecheck`, `npm run lint`, and `npm run build` all
  passed. Live-rendered the app with `next dev` against demo-mode data (no
  real backend/credentials involved) and inspected it with a real, locally
  launched headless Chrome (screenshots plus a CDP `Runtime.evaluate` sweep of
  `document.documentElement.scrollWidth` vs `window.innerWidth` at a 390px
  viewport across `/`, `/sign-in`, `/dashboard`, `/profile`, `/catalog`,
  `/courses`, `/vocabulary`, `/practice`, `/teams`, `/library`, `/settings`,
  `/create/course`) — confirmed zero horizontal overflow on every route both
  before committing to the fix and after applying it (the dashboard
  specifically reproduced the bug beforehand, confirming the fix). The
  temporary dev-only login route and headless Chrome profiles used for this
  were deleted/cleaned up before committing; nothing from them is part of
  this change. The Claude in Chrome browser extension was not connected in
  this session, so this substitutes for that step; it is a full real-browser
  layout check, not just curl/typecheck.
- Risk / next step: Purely visual/layout CSS and two navigation-target
  changes; no data, auth, or API surface touched. The "AI checks vocabulary
  synonyms" item from the same request is already live from the prior
  2026-09-19 delivery (`ai/training/sentences` + `.../check`, wired into
  `components/learn/quiz-runner.tsx`) — not modified here. A separate,
  unrelated "parent-student-class-assignment" change was visible in
  `git status` mid-session (modified `AGENTS.md` + a same-dated worklog file)
  and was deliberately left untouched and excluded from this commit.
- Release state: pushed `origin/main` `45b523c`
