## 2026-09-14 13:45 CEST — public catalogue, access boundary and UI verification

- Intent: Replace the catalogue's learner-shell presentation with a read-only
  discovery surface, prevent personal navigation from appearing without a
  verified Learn identity, and resolve reported language-control and spacing
  pressure without introducing gradients or external tracking.
- Outcome: `/catalog` and its public course preview now use a dedicated header
  without a sidebar. The catalogue keeps search and filters, contains only
  published public courses, links to public preview routes, hides authoring
  actions for guests, and removes learner-progress display from catalogue
  cards. Personal course, practice, vocabulary, library, settings, authoring,
  team and administrator pages now resolve a server-side Learn identity before
  rendering. The BFF rejects anonymous protected requests before contacting the
  upstream API. The compact language selector reserves enough inline width for
  German, English and Italian; the public catalogue adapts its header, filters
  and cards at narrow viewports. The visible product mark and metadata now use
  `POKYHlearn`.
- Affected areas: Learn public catalogue and detail routes, personal-route
  server gates, BFF request boundary, catalogue mapping, navigation rendering,
  card presentation, responsive CSS, product metadata and translation copy.
  Existing backend authorization remains authoritative for every API route.
- Verification:
  - Learn `npm run lint`, `npm run typecheck`, `npm run build` and whitespace
    checks passed before the final BFF gate follow-up; the follow-up was then
    covered by a subsequent production build in the isolated visual setup.
  - Anonymous requests to every tested personal route (`/dashboard`,
    `/courses`, `/practice`, `/vocabulary`, `/library`, `/create/course`,
    `/settings`, `/teams`, `/admin`) received a redirect to sign-in with a
    constrained return path.
  - A protected BFF read returned `401` with no session; a cross-origin login
    mutation returned `403`; malformed login input returned `422` before any
    upstream authentication attempt.
  - A production-mode local visual run with non-production demonstration data
    returned a no-sidebar catalogue with search, responsive filters and three
    public cards; the team-only test course was absent. Accessibility checks
    confirmed all three locale choices, theme control, login action, search,
    filters and public course links. Searching for `English` reduced the result
    count from three to two.
  - The desktop sign-in visual check confirmed the POKYHlearn wordmark,
    language control and privacy acknowledgement; a missing text boundary
    after the privacy-link was corrected for all locales.
  - Direct local backend probes returned readiness `200` and a Pokyh-origin
    auth preflight `204` with the required CORS response headers.
  - The local backend accepted its configured API key and then correctly
    returned `401` for `/auth/me` without a user session; an invalid key was
    rejected with `403`. The backend TypeScript/Prisma build and production
    dependency audit also passed with no high-severity findings.
  - The related Pokyh frontend production build completed with a local
    non-production test secret after session encryption was changed
    to fail closed when a production `SESSION_SECRET` is missing or too short.
    Its existing full-repository lint command remains blocked by unrelated
    legacy violations, including vendored asset files; no broad lint bypass was
    added.
  - The public API host still returned `502` for readiness and the same
    preflight probe, which occurs before the Express application; the real
    WebUntis login cannot pass end-to-end until the deployed backend service is
    restored.
- Risk / next step: Redeploy or repair the public API gateway/application
  service, then repeat the real login test with an owner-provided test account
  and verify the public catalogue against actual published content. Do not
  weaken browser CORS, user-token or server authorization as a workaround.
- Release state: uncommitted.

## 2026-09-14 14:10 CEST — anonymous console-noise and browser metadata follow-up

- Intent: Ensure a normal signed-out visit does not emit a deliberately denied
  profile request as a browser error, and address the reported smooth-scroll
  and favicon console diagnostics without weakening session protection.
- Outcome: The root server layout now passes only the presence of its HTTP-only
  Learn session into the preference provider. Guests retain their local
  language/theme cookies and no longer request `/api/learn/me`; signed-in
  sessions may continue server-profile synchronization. The root HTML element
  declares the Next.js smooth-scroll data attribute, and a local generated
  product icon supplies browser-tab metadata.
- Security note: This is a presentation/request-noise change only. Every
  personal page and API mutation remains authenticated and server-authorized.
- Follow-up: A legacy `/favicon.ico` route responds with the same local product
  mark so browsers that do not use the generated icon endpoint also avoid a
  benign missing-resource diagnostic.

## 2026-09-14 14:25 CEST — sign-in clarity and localised preview follow-up

- Intent: Remove an avoidable, non-actionable sign-in attempt and make all
  visible landing-preview interface text follow the selected UI language.
- Outcome: The sign-in action remains disabled until the required privacy
  acknowledgement is set. The dashboard-preview accessible name and weekday
  labels are now provided by the existing German, English and Italian locale
  dictionaries; authored Italian course example content remains intentionally
  unchanged.
- Verification: Covered by TypeScript and production-build checks after the
  change; the sign-in form remains keyboard-operable and its native checkbox
  supplies the enabling condition.
