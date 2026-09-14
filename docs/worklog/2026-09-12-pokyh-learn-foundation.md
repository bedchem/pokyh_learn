# Pokyh Learn foundation and release hardening

## 2026-09-12 09:00 Europe/Rome — delivery protocol established

- Intent: make this implementation traceable across the frontend and additive
  backend work without storing sensitive operational material.
- Outcome: added the `docs/worklog/` protocol and made it a repository
  requirement in the canonical working contract.
- Affected areas: `CLAUDE.md`, documentation hub, this worklog.
- Verification: documentation links and naming convention are local and do not
  require runtime configuration.
- Risk / next step: every subsequent material change in this run must be
  appended below before release.
- Release state: uncommitted.

## 2026-09-12 09:10 Europe/Rome — original Learn delivery scope

- Intent: add a secure, WebUntis-gated learning product without replacing the
  existing Pokyh application or backend behavior.
- Outcome: implemented an additive Learn route family, same-origin Next.js
  BFF, course authoring, vocabulary/review flows, import/export boundaries,
  dedicated Learn administration, Docker runtime files, and API/design/docs
  contracts. The browser remains a presentation client; the backend remains
  the authority for identities, access, progress, grading, and content.
- Affected areas: `pokyh_learn-frontend`, additive Learn files in the sibling
  `pokyh-backend` repository, and their documentation/configuration examples.
- Verification: frontend type check, lint, production build, dependency audit,
  Docker configuration, container health endpoint, and an initial browser
  accessibility smoke check completed during this run. Backend TypeScript/Prisma
  build and dependency audit completed during this run. A full final rerun is
  required after the current visual, SEO, legal-notice, and motion work.
- Risk / next step: no actual deployment environment file was changed; current
  release remains uncommitted pending final verification and explicit Git
  author confirmation.
- Release state: uncommitted.

## 2026-09-12 09:20 Europe/Rome — privacy and WebUntis integration review

- Intent: establish a defensible product boundary for WebUntis-backed identity
  before revising legal notices and the sign-in experience.
- Outcome: adopted a data-minimising design target: credentials are used only
  for server-side authentication confirmation, are not sent to browser storage
  or analytics, and Learn data stays separate from the existing Pokyh school
  product. Legal copy will describe the actual controller/contact, purpose,
  data categories, retention, rights, and third-party roles only after the
  existing Pokyh legal page and deployment ownership are reviewed.
- Affected areas: sign-in flow, backend identity boundary, legal documentation.
- Verification: reviewed official Untis integration/privacy guidance and the
  GDPR transparency requirements; implementation and legal text remain subject
  to authorised school/controller review before production activation.
- Risk / next step: software controls alone cannot establish permission to use
  a school's WebUntis integration. Obtain written school/controller approval,
  appropriate processor/recipient documentation, and legal review before
  enabling production access.
- Release state: uncommitted.

## 2026-09-12 09:30 Europe/Rome — visual and preference-system plan

- Intent: align Learn with the established Pokyh light/dark palette while
  removing gradients, introducing user-selectable German/English/Italian UI,
  and adding only purposeful, reduced-motion-safe motion.
- Outcome: selected a flat-surface token system based on the existing Pokyh
  canvas, surface, text, border, and indigo accent roles. The implementation
  will keep theme/locale as user preferences, render a safe cookie-backed
  default before hydration, and persist authenticated preferences through the
  existing protected Learn profile route. The only planned animation dependency
  is GSAP for a one-time landing sequence; it will have no autoplay loop,
  scroll-jacking, or effect on learning state.
- Affected areas: frontend token CSS, root layout, app shell, settings, Learn
  profile schema/API, SEO metadata, and motion component.
- Verification: reviewed the existing Pokyh web palette/theme behavior and
  GSAP's official installation/React cleanup guidance before implementation.
- Risk / next step: all static page copy cannot be safely inferred as
  translated; the shared application shell, settings, and high-traffic flows
  will be localised first, with completeness measured by an explicit key audit.
- Release state: uncommitted.

## 2026-09-12 10:00 Europe/Rome — Pokyh legal identity and consent controls

- Intent: remove hard-coded personal controller claims from the shared Pokyh
  legal pages while keeping the requested company name and address defaults,
  and make withdrawal of optional-cookie consent accessible in the interface.
- Outcome: the imprint, privacy notice, Learn privacy notice, and cookie page
  now render the operator, contact, and optional registry fields from a
  server-only deployment configuration. No tax, register, representative, or
  other registration value was invented; the imprint visibly marks missing
  required company details for completion before a commercial public release.
  The cookie page opens the existing settings dialog through an accessible
  button instead of requiring browser developer tools.
- Affected areas: sibling `pokyh-frontend` legal route, legal identity helper,
  consent controls, analytics consent synchronisation, and environment example.
- Verification: targeted ESLint completed without findings; `npm run build`
  completed successfully for the Pokyh frontend.
- Risk / next step: the controller must supply verified company-register,
  representative, VAT, processor, retention, and school-authorisation facts
  and obtain an appropriate legal review before production release. This code
  does not itself establish legal compliance.
- Release state: uncommitted.

## 2026-09-12 23:00 Europe/Rome — backend production-log observability

- Intent: make backend incident evidence visible to the container runtime
  without expanding retained personal data or exposing credentials.
- Outcome: Winston now emits structured JSON to stdout/stderr in production
  as well as keeping the existing bounded daily file logs. A defense-in-depth
  formatter masks common credential keys, bearer/basic values and database or
  Redis URL credentials before either destination. Docker Compose bounds the
  API container's local log stream to five 10 MiB files.
- Affected areas: `pokyh-backend/src/utils/logger.ts`,
  `pokyh-backend/docker-compose.yml`, and backend operations documentation.
- Verification: backend `npm run build` passed; Compose configuration passed
  with `.env.example`; a production-mode logger probe confirmed redaction in
  the JSON stdout event.
- Risk / next step: logging call sites must continue to avoid request bodies,
  raw user content and secrets; redaction is a safety net, not permission to
  collect them. Configure an approved external log-retention destination if
  operations require retention beyond the bounded Docker stream.
- Release state: uncommitted.

## 2026-09-12 23:03 Europe/Rome — delivery-contract and Learn-doc alignment

- Intent: make the multi-repository hand-off rules explicit and align the
  public Learn documentation with the currently mounted private analytics,
  optional cache, and canonical administrator group boundary.
- Outcome: added actionable PR/conflict, non-destructive collaboration,
  factual-worklog, tested-checkpoint, exact `Name <email>`, and no-automated-
  attribution rules to the relevant repository contracts. Added a Learn-only
  Lenis accessibility policy. Updated the architecture, API contract, and
  decisions to describe daily count-only analytics, the fail-open
  course-specific Redis cache, adaptive review policy, and administrator-only
  group management without claiming broader cache, queue, invitation, or
  offline capabilities.
- Affected areas: `CLAUDE.md`, `UI/CLAUDE.md`, and `AGENTS.md` in Pokyh Learn,
  `CLAUDE.md` in Pokyh backend and Pokyh frontend,
  `docs/architecture.md`, `docs/api-contract.md`, and `docs/decisions.md`.
- Verification: cross-checked the wording against the current Learn route,
  configuration, cache, analytics, admin-route, and Prisma-model changes; ran
  Markdown/diff whitespace validation. No runtime code, dependency, environment
  file, test configuration, commit, or push was created by this documentation
  step.
- Risk / next step: rerun the full backend/frontend tests and visual checks
  after all implementation work settles, then obtain the human owner's exact
  release scope and Git identity before any commit.
- Release state: uncommitted.

## 2026-09-12 23:15 Europe/Rome — Learn group administration UI

- Intent: give canonical Pokyh administrators a separate, server-authoritative
  place to manage Learn groups and their access assignments.
- Outcome: added an admin-only `Teams & Zugriffe` route linked from the Learn
  configuration page. It can list groups and verified members, show the
  server-provided number of assigned courses, create and rename groups, update
  descriptions, add or update member roles, remove members, and delete only
  empty groups after an exact-name confirmation. Course contents, learning
  answers, API keys, and other credentials are not shown by this surface.
- Affected areas: `pokyh-backend/admin/src/App.tsx`, its typed admin API client,
  admin types, Learn configuration navigation, and the new
  `admin/src/pages/LearnTeamsPage.tsx`.
- Verification: `npm run build` passed in `pokyh-backend/admin`.
- Risk / next step: the existing admin endpoint intentionally exposes an
  aggregate course count rather than course names; changing that contract
  would require a separately reviewed backend endpoint and access policy.
- Release state: uncommitted.

## 2026-09-12 23:15 Europe/Rome — Docker and operations runbook alignment

- Intent: make the public runbooks match the current Compose topology without
  implying that deployment, backup, or database-change management is complete.
- Outcome: documented the paired Compose `--env-file` and service runtime-file
  invocation, the loopback frontend listener on port `3005`, the narrow private
  Redis analytics-cache role, and the division between backend Learn
  administration and the separate Learn frontend. Added the locally bundled
  Lenis reduced-motion/native-scroll behavior to the frontend runbook. The
  backend runbook now explicitly says that no off-host backup, restore runbook,
  scheduled backup, or reviewed production-migration workflow is configured.
- Affected areas: `pokyh-backend/README.md`, `README.md`, and `AGENTS.md`.
- Verification: cross-checked the commands and operational claims against the
  current `docker-compose.yml`, `compose.yaml`, environment examples, backend
  cache/configuration code, and frontend Lenis integration; ran diff whitespace
  validation. No runtime code, package, environment file, container, commit, or
  push was created by this documentation step.
- Risk / next step: a deployment owner still needs to provision and rehearse an
  approved backup/restore process and a reviewed migration plan before a live
  database change. Rerun the complete build, test, Compose, and visual checks
  before any release commit.
- Release state: uncommitted.
