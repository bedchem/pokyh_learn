# Pokyh Learn documentation hub

This directory is the durable map for product, API, architecture, and design
decisions. It exists so a feature can be understood from one starting point
without searching through screens, components, or deployment configuration.

The product is a learning application at `learn.pokyh.com`. Its durable data
and authorization live in the existing Pokyh backend at `api.pokyh.com`; the
Next.js application is a presentation layer and same-origin BFF, never a
second source of truth.

## Start here

| Need | Read | What it answers |
| --- | --- | --- |
| Product or engineering guardrail | [Repository contract](../CLAUDE.md) | What must remain true for security, ownership, caching, deployment, and delivery. |
| Visual or interaction change | [Design system](./design-system.md) and [visual context](../UI/CLAUDE.md) | How the experience should look, behave, and adapt across device sizes. |
| Data, security, cache, or rollout question | [Architecture](./architecture.md) | System boundaries, authority, lifecycle, performance, and operations. |
| BFF or backend integration | [API contract](./api-contract.md) | The currently mounted `/learn` endpoints, payload expectations, and intentionally unavailable capabilities. |
| Why a trade-off was made | [Architecture decisions](./decisions.md) | Durable decisions and their consequences. |
| Local setup or release check | [Project README](../README.md) | Environment variables, commands, and verification steps. |
| WebUntis/Italy production readiness | [Legal readiness record](./legal-readiness.md) | The privacy, authorisation and operating checks that must be completed outside code before production sign-in. |
| What changed in a delivery | [Worklog](./worklog/README.md) | Chronological decisions, verification evidence, and release status without secrets. |

## Source-of-truth order

1. The repository contract defines non-negotiable product, privacy, security,
   and delivery rules.
2. The current backend route implementation defines what a BFF may call today.
   The API contract records that surface and labels intentionally unavailable
   capabilities instead of implying they exist.
3. Architecture decisions explain the preferred long-term design when the
   current surface is intentionally narrower.
4. The design system and visual context govern the frontend expression of those
   product decisions.

When these sources disagree, do not paper over the difference in the UI. Fix
the implementation, update the contract, or record an explicit decision before
shipping. No browser claim about access, correctness, progress, or publishing
is authoritative until the backend confirms it.

## Product map

```text
Discovery
  Catalogue -> course detail -> add a permitted course

Daily learning
  Dashboard -> next lesson or due review -> focused answer -> server result

Authoring
  Personal course -> sections/vocabulary -> explicit sharing or team access

Administration
  Existing Pokyh administrator -> separate Learn console -> scoped course-access grant
```

The central learning loop is deliberately simple: help a person choose a
useful next action, retrieve an answer, understand the feedback, and return
mistakes through the server-managed review path. Progress, streaks, charts, and
course cards support that loop; they never replace it.

## Current capability ledger

The table separates mounted, usable route groups from documented product work
that must not be represented as available in the interface yet. Exact endpoint
details belong in [the API contract](./api-contract.md).

| Area | State | Notes |
| --- | --- | --- |
| Published catalogue, profile, dashboard, courses, enrollments, and explicit section progress | Mounted | Served by the backend `/learn` router through the same-origin BFF. Progress is derived from completed sections, not browser percentages. |
| Vocabulary CRUD, editorial answer approval, optional dictionary verification, review queues, and idempotent quiz attempts | Mounted | Grading and review scheduling happen on the server; the dictionary is only an explicit, configured suggestion. |
| Course studio, section editing/reordering, personal JSON import/export, teams, direct membership assignment, and administrator course grants | Mounted | The studio and Learn administration show only server-confirmed capabilities. Imports always produce private drafts. |
| Separate Learn administrator console | Mounted | `/admin` in the Learn frontend uses `/learn/admin/*`; it does not mix with the existing Pokyh administration UI. |
| School-year retention for Learn profiles | Implemented | Learn-bearing accounts are retained during school-year rollover; regression coverage remains a release check. |
| Invitation acceptance/removal, ownership transfer, platform Learn backup/restore, settings and audit-feed UI | Not mounted | Keep these controls unavailable until their backend contracts and tests exist. |
| Redis-backed distributed cache/work queues | Deployment follow-up | MySQL remains authoritative; cache loss must not lose learning data. |

## How to change the documentation

Update the smallest set of documents that expresses the change accurately:

| Change type | Update |
| --- | --- |
| Route, request body, response body, auth requirement, or availability | `docs/api-contract.md` plus client types/tests. |
| Data ownership, authorization, caching, sessions, rollout, or operations | `docs/architecture.md`; add an ADR when a durable trade-off is made. |
| Product scope, role rule, privacy rule, or release condition | `CLAUDE.md`, then the affected detailed document. |
| Tokens, layout, component behavior, responsive state, or accessibility | `docs/design-system.md` and `UI/CLAUDE.md`. |
| Environment value or operator configuration | `.env.example`, `README.md`, and the affected architecture/API section. |
| Material implementation, validation, visual check, release, or incident step | a dated entry in `docs/worklog/` plus the affected contract document. |

Write concrete facts and links rather than vague promises. Use status language
such as **mounted**, **implemented**, **planned hardening**, or **not mounted**
when it prevents a reader from mistaking a design target for a live feature.

## Documentation quality gate

Before merging a behavior change, verify that:

- the route and access rule are described where a frontend developer will find
  them;
- the empty, loading, unauthorized, offline/pending, and error states have a
  clear user-facing design;
- secrets, tokens, private answers, and private content are absent from
  examples, screenshots, logs, and caches;
- implementation status is truthful—unmounted endpoints and undeployed
  providers are not presented as working product controls;
- the design remains keyboard-operable, readable at narrow widths, and useful
  without color or motion alone; and
- `npm run lint`, `npm run typecheck`, and `npm run build` are included in the
  release verification described in the project README.
- the dated worklog records the intent, outcome, verification, known limits,
  and release state without including private or secret material.

## Related files

- [Repository contract](../CLAUDE.md)
- [Visual context](../UI/CLAUDE.md)
- [Design system](./design-system.md)
- [Architecture](./architecture.md)
- [API contract](./api-contract.md)
- [Architecture decisions](./decisions.md)
- [Legal readiness record](./legal-readiness.md)
- [Worklog protocol](./worklog/README.md)
