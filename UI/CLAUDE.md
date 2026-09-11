# Pokyh Learn Visual Context

## Purpose

Pokyh Learn should feel like a calm, friendly learning cockpit: clear enough
for a first-time learner, focused enough for daily practice, and robust enough
for course authors and teams. The interface turns a large learning catalogue
into a small, helpful next action.

The visual reference is a mood and interaction direction only: soft spacious
surfaces, modular dashboard cards, restrained pastel learning states, strong
dark active controls, clear data hierarchy, and a welcoming human pace. Do not
copy a screen, logo, asset, wording, layout, or proprietary visual identity.

## Design Priorities

1. Security and privacy must stay invisible but uncompromised.
2. Performance and legibility come before visual decoration.
3. The current learning action is more important than dashboards or rewards.
4. Every screen must work with real server states: loading, empty, unavailable,
   unauthorized, offline/pending sync, and complete.
5. The same interaction must be clear on small phones, tablets, and desktop.

## Visual System

Use named, token-based design values. Do not scatter raw colour, shadow,
spacing, radius, or animation choices across features. The global stylesheet
owns the baseline tokens; reusable primitives consume them.

### Colour roles

| Role | Intent |
| --- | --- |
| Canvas | warm, nearly white background that reduces visual fatigue |
| Surface | clean white cards, forms, tables, and navigation |
| Ink | near-black text and primary action/navigation state |
| Muted ink | supporting copy and inactive navigation |
| Lavender | structured learning, scheduled review, grammar |
| Rose | recent mistake, attention, gentle urgency |
| Mint | completion, valid/saved, mastery |
| Sun | new material, streak, lightweight encouragement |
| Line | quiet borders that define structure without making a grid-heavy UI |

Colour cannot be the only meaning. Pair it with text, icon, pattern, position,
or state label. Course accent colour is presentation metadata returned by the
backend, not a hard-coded identity rule.

### Typography

- Use the locally bundled Manrope variable font for interface text and DM Mono
  for compact labels. Keep a system stack fallback so the interface remains
  legible if a local font asset cannot load.
- Headings are compact, confident, and tightly spaced; body copy is relaxed
  and readable.
- Use sentence case in the product UI. Avoid all-caps body copy.
- Small labels can use a modest uppercase treatment only for hierarchy, never
  as the sole accessible label.
- Foreign-language example text must retain correct characters and language
  metadata where semantic markup permits it.

### Shape, spacing, and elevation

- Cards use generous, consistent rounded corners and light borders.
- Shadows establish grouping gently; avoid floating every element.
- Keep a clear spacing rhythm. Dense tables are allowed only when users need
  to scan many vocabulary rows, and must become horizontally robust on mobile.
- Use one primary call-to-action per visual region. Secondary actions are
  quiet but discoverable.

### Motion

- Motion confirms a meaningful state change, such as a quiz result, saving,
  navigation, or opening a sheet.
- Keep motion short, subtle, and interruptible.
- Respect `prefers-reduced-motion`; no progress or feedback depends on an
  animation to be understandable.
- Do not add autoplay, parallax, bouncing mascots, or distracting page-wide
  animation to learning screens.

## Navigation

### Desktop

A slim permanent left rail carries the product identity, primary destinations,
settings, and the account switcher. A top bar provides search and a clear
create action. Main content stays centered with a readable maximum width.

Primary destinations:

```text
Overview -> Catalogue -> My courses -> Practice -> Vocabulary -> Teams -> Library
```

Administration is visibly separate and must not appear as an ordinary learner
destination without a server-confirmed capability.

### Mobile

Use a compact top bar and a small bottom navigation for the core daily paths.
Long navigation moves into an accessible modal/sheet. Do not shrink desktop
tables or course pathways until controls become unusable; reflow them.

Never hide a necessary save, submit, exit, or back action behind a gesture.

## Dashboard

The dashboard answers four questions in order:

1. What is the one most useful thing to do now?
2. What is due or needs repair?
3. How am I progressing this week?
4. Which course do I continue or choose next?

Recommended hierarchy:

```text
Greeting + current learning context
  -> Continue learning card (one decisive action)
  -> Weekly goal / calm streak indicator
  -> Learning rhythm and review queue
  -> Active courses
  -> Optional suggestion to create or share content
```

Show metrics only when they result in a useful action. A chart must be readable
without colour and have a nearby textual summary. Never present a leaderboard
by default; social comparison can discourage learning and is not essential to
the core product.

## Catalogue

The catalogue is readable by guests where course policy permits it. It must
make language, level, category, time/content scope, visibility, and next step
easy to understand.

- Use lightweight search and filters with a clear result count.
- Do not require a sign-in just to understand a published course.
- The add/enroll action is explicit and explains sign-in when required.
- A course card presents title, short promise, language/level, structure, and
  availability; it does not need excessive badges.
- Filters must be keyboard-operable and resettable.
- Empty searches are helpful and never dead ends.

## Course Detail and Path

Course detail is a commitment screen, not a wall of metadata. It should show:

- the outcome and intended learner;
- language, level, modules, activities, and time estimate;
- visibility and owner/team context;
- a meaningful primary action (add or continue);
- an ordered learning path with completed, next, locked, and optional states;
- concise explanation of what learners will take away.

For Italian, display article rules in a compact workshop with examples and
phonological context. Avoid teaching a grammar table without immediately
giving the learner a sentence to apply it in.

## Quiz and Review

Quiz UI has one job: help the learner retrieve and understand an answer.

- Display one task at a time with clear progress.
- State whether an item is new, due, or a targeted retry in words and an icon.
- Make the input label real, the submit action obvious, and keyboard Enter
  behaviour predictable.
- After submission, give immediate feedback with correct answer, explanation,
  grammar/article context, and a clear next action.
- Wrong is neutral and instructional; never shame or use harsh error language.
- Show pending/offline state before claiming an answer was saved.
- Never calculate the authoritative correctness or review schedule in the UI.

The client may show responsive feedback based on the server result. It must be
able to recover if the result is delayed, duplicated, or rejected.

## Vocabulary Workspace

The vocabulary workspace is part list, part editor, part practice launchpad.

Each row can expose:

- lemma and required article;
- translation(s) and accepted variants;
- part of speech, gender, example, note, and provenance;
- learning state: new, learning, due, mastered, or targeted retry;
- validation state: server-verified, pending review, or authorized manual entry.

Adding a word is a deliberate editor flow. Explain that external lookup is a
suggestion and that the server checks/persists final data. Show server
validation progress; do not mark a word as published solely because the client
accepted input.

On mobile, use a card or detail disclosure rather than an unreadable wide row.

## Teams and Sharing

Teams must make data boundaries obvious:

- Show the current team, role, member count, and number of shared courses.
- Explain whether a person can view, edit, invite, or manage a course.
- Make a private course's default state visually unmistakable.
- Confirmation is necessary before increasing visibility or inviting people.
- Do not show names, membership, or internal course information to a person
  who lacks server-confirmed access.

## Forms, Import, and Export

Forms use visible labels, short contextual helper text, and server-originated
error messages mapped to the relevant field where possible. Do not use a
placeholder as the only label.

Import/export has a cautious visual language:

- state what is included and excluded;
- show schema/version checking and preview before mutation;
- distinguish a local file selection from a completed server import;
- explain failures without exposing internal implementation details;
- warn specifically that role, credential, and membership changes cannot be
  imported through content JSON.

## Accessibility Standard

Every critical route must satisfy these practical requirements:

- semantic landmarks and heading order;
- keyboard-complete controls and quiz flow;
- visible, high-contrast focus state;
- form labels, helpful error text, and `aria-live` feedback for quiz results;
- 44px touch targets where space permits;
- contrast that remains clear on the actual background;
- non-colour-only state indicators;
- dialogs/sheets with focus management and an obvious close action;
- no necessary information hidden on hover alone;
- reduced-motion alternative;
- screen-reader name for icon-only controls.

Test with keyboard-only navigation and narrow device widths before considering a
screen finished.

## Implementation Rules

- Prefer CSS and small composable components for the visual system.
- Use the existing icon library for interface symbols; do not use emoji as a
  production icon system.
- Use server components for data-heavy, read-oriented screens and client
  components only for immediate interaction.
- Do not make a visual decision based on browser-only role claims.
- Keep the demo presentation mode clearly development-only and disabled in
  production configuration.
- Do not add visual assets, fonts, or images without a valid license and a
  performance reason.
- Validate each modified design at compact mobile, tablet, and wide desktop.
