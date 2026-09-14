# Pokyh Learn design system

## Purpose

Pokyh Learn is a calm learning workspace, not a scoreboard. The interface
should make the next useful action—continue, review, add a course, or create
content—easy to find and easy to complete.

The supplied visual direction informs this document as abstract principles:
mobile-first card hierarchy, warm soft pastels, high-contrast dark anchors,
small progress and streak modules, and uncluttered focus. It must never be
treated as a screen to reproduce. Do not copy external layouts, artwork,
logos, wording, or distinctive visual assets.

This document turns those principles into an implementation-facing companion to
the [visual context](../UI/CLAUDE.md). The active token definitions and
responsive rules live in [`app/globals.css`](../app/globals.css).

## Design north star

Every screen should pass this quick test:

1. Can a learner identify the primary task within a few seconds?
2. Is the next action more visually prominent than secondary metrics?
3. Can the same task be completed on a narrow phone without a hidden gesture
   or horizontal hunt?
4. Does the UI still communicate when color, animation, or a decorative motif
   is absent?

If not, reduce the screen before adding more elements.

## Visual language

### Card hierarchy and focus

Use a clear three-level hierarchy:

| Level | Role | Treatment |
| --- | --- | --- |
| Primary | The next learning action or most urgent review | Large, generous card; concise promise; one dark primary action. |
| Supporting | Goal, due queue, course continuation, or a useful insight | Standard surface card with a compact metric or clear secondary action. |
| Utility | Filters, metadata, controls, and supporting status | Quiet surface, light border, subdued text; never competes with the learning task. |

One visual region gets one decisive call to action. A dashboard should lead with
the next lesson or review, then show rhythm, active courses, and optional
creation/sharing. A quiz should show one prompt at a time. An authoring form
should privilege completion and validation status over decoration.

### Color roles

Colors are roles, not content labels. Use the named tokens in
`app/globals.css`; do not introduce scattered hex values in feature components.
The visual system uses flat, solid surfaces—no gradients, glassmorphism or
decorative AI-like texture. Light and dark themes are the same semantic system,
not two unrelated skins.

| Token family | Meaning | Appropriate use |
| --- | --- | --- |
| `--canvas`, `--surface`, `--line` | Quiet structure | Page background, cards, input groups, and separation. |
| `--ink`, `--ink-muted` | Hierarchy and dark anchor | Primary navigation, primary actions, headings, and readable supporting text. |
| `--violet`, `--violet-wash` | Structure and scheduled learning | Grammar, due review, neutral learning context. |
| `--rose`, `--rose-wash` | Gentle attention | Mistake review, correction, or a non-shaming warning. |
| `--mint`, `--mint-wash` | Successful completion | Saved, mastered, or correctly completed states. |
| `--sun`, `--sun-wash` | Encouragement and new material | Streaks, goals, and newly introduced content. |

Dark controls are anchors, not a decorative theme. Use them for the active
navigation destination and the one primary action in a region. Do not use a
pastel alone to communicate success, error, locked state, membership, or quiz
result; pair it with text, an icon, and position.

### Typography, space, and shape

- Use the locally bundled Manrope variable font defined by the global
  stylesheet, with a system-stack fallback. Use DM Mono only for compact
  technical labels, never for body copy.
- Keep headings compact and confident; keep body copy relaxed and readable.
- Prefer sentence case. Small uppercase labels are for hierarchy only.
- Use the shared radius scale: `--radius-xl`, `--radius-lg`,
  `--radius-md`, and `--radius-sm`.
- Use light borders and soft elevation to group, not to make every element
  float. Empty space is a feature: it directs attention and lowers cognitive
  load.
- Use real text for course names, score summaries, and statuses. Do not encode
  critical content in a graphic or a color swatch.

## Page patterns

### Dashboard

The dashboard answers these questions in order:

```text
What should I do now?
  -> What is due or needs repair?
  -> How is my current rhythm?
  -> Which course can I continue or add?
```

The primary continue card has a compact narrative and one action. A goal/streak
module is intentionally small and encouraging—never a source of pressure.
Progress charts must have a textual summary and should point to an action such
as opening a review queue. Do not make social comparison the default view.

### Catalogue and course detail

Course cards communicate title, learning promise, language/level, compact
structure, availability, and one next step. Search/filter controls stay close
to their result count and always offer a resettable empty state.

Course detail is a commitment screen: outcome first, then learning path,
visibility/ownership context, and a clear add-or-continue action. Typed course
content should feel like a guided path rather than a metadata wall. For Italian
articles, show a rule next to meaningful example sentences and an immediate
practice opportunity.

### Quiz and review

The quiz is an uncluttered retrieval flow:

1. State progress and queue type in words.
2. Show one prompt with a real input label and a predictable submit action.
3. After the server result, explain the outcome, correct answer where allowed,
   relevant grammar context, and the next action.
4. Treat an incorrect answer as a targeted retry, never as a failure identity.

The client may animate the state transition, but never decides the score,
answer key, or next review date. A pending request must look pending; do not
claim that an answer was saved until the backend confirms it.

### Vocabulary and authoring

Vocabulary is a workspace with three modes: scan, edit, and practice. A row or
mobile detail card can reveal lemma/article, translation, part of speech,
context, learning state, and validation state without making the list dense.

The “add word” flow is deliberate. A provider result is a server-side
suggestion, not an automatic truth. Show clear server validation/pending/error
status. Do not expose a dictionary, import, or sharing control until the
corresponding backend endpoint is mounted and the user has a server-confirmed
capability.

### Teams and administration

Team cards clearly name the current team, role, member count, and course count.
Visibility-increasing actions—sharing, invitations, grants, publication—need a
confirmation moment and must show the actual scope. Administration is visually
distinct from learner navigation and appears only after the backend has
confirmed the relevant capability.

## Responsive composition

Design the narrow layout first, then let space add context rather than merely
shrink the desktop version.

| Range | Composition | Navigation |
| --- | --- | --- |
| Narrow phone (up to 780px) | One column; large cards stack; controls wrap; quiz input and feedback actions become full width. | Compact header and five-item bottom navigation; remaining destinations open in a labelled modal menu. |
| Tablet / compact desktop | Two-column supporting groups when they improve scanning; preserve readable form widths. | Permanent navigation only when it leaves enough room for content. |
| Wide desktop | Primary learning panel paired with a supporting module; modular course grids; centered readable content width. | Slim left rail, top search/create controls, and visibly separate administration. |

Never solve a narrow layout by making touch targets tiny or by hiding save,
submit, back, or exit behind a swipe. If a data table cannot fit, use a
horizontal container with a clear disclosure or a card/detail pattern.

## Interaction and accessibility rules

- Interactive controls have a text label or accessible name, a visible focus
  ring, keyboard support, and a practical minimum target size of 44px.
- Inputs have real labels; placeholders are hints, not labels.
- Use semantic landmarks, heading order, live feedback for quiz results, and
  focus-managed modal/sheet patterns.
- Respect `prefers-reduced-motion`; motion is brief, interruptible, and only
  confirms a meaningful change.
- Show loading, empty, offline/pending-sync, unauthorized, success, and error
  states intentionally. A state label and recovery action are more useful than
  a generic spinner.
- Foreign-language examples retain their correct characters and language
  metadata where markup supports it.

## Component implementation rules

- Compose pages from the shared primitives (`.panel`, `.button`,
  `.icon-button`, `.progress-track`, and token families) before adding a
  one-off visual pattern.
- Put responsive layout in CSS. Keep client components focused on interaction,
  not visual policy or authorization decisions.
- Use the existing interface icon set consistently; do not use emoji as the
  production icon language.
- Keep decorative motifs text-free for assistive technology with
  `aria-hidden`; all meaningful content must remain in the semantic document.
- Test each changed pattern at narrow phone, tablet, and wide desktop widths,
  plus keyboard-only and reduced-motion modes.
- Keep product UI strings in German, English and Italian through the shared
  locale system. Do not automatically translate author-created course content.

## Design review checklist

- The primary task is visually first and has one clear action.
- Color reinforces, but never solely carries, meaning.
- Progress/streak modules motivate without becoming a leaderboard or pressure
  mechanism.
- The mobile flow is complete, not a compressed desktop fragment.
- All exposed actions map to an available, server-confirmed capability.
- Loading/error/pending states are legible and have a useful recovery path.
- New values reuse the token system and no copied visual asset or identity is
  introduced.

For product constraints and access boundaries, see the
[repository contract](../CLAUDE.md), [architecture](./architecture.md), and
[API contract](./api-contract.md).
