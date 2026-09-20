# Parent and student class assignment correction

Date: 2026-09-20

## Scope

- Updated the existing Pokyh WebUntis login flow in `pokyh-frontend` so the
  built-in role detector recognizes the `Elternaccount` tag independently of
  the shape of `getStudents`.
- Parent sessions retain the child identifiers required for WebUntis requests,
  while the public Pokyh profile and backend sync receive an empty class id and
  class name.
- Added recovery of a student's own class id from `getStudents` when WebUntis
  authentication returns `klasseId = 0`, including string-encoded and nested
  class-id variants.
- Updated `pokyh-backend` so the parent role always normalizes class identity to
  `0`/empty, removes stale memberships, rejects manual parent joins, and reports
  no class through user/admin APIs.
- Student synchronization now removes wrong or duplicate memberships and keeps
  only the membership matching the current positive WebUntis class id.

## Verification

- `pokyh-backend`: `npm test` passed (3 regression tests).
- `pokyh-backend`: `npm run build` passed, including Prisma generation and the
  TypeScript compiler.
- `pokyh-frontend`: `npm test` passed (7 regression tests covering parent-tag
  variants, parent class clearing, own-student matching, numeric strings, and
  missing-class recovery from both `getStudents` and nested app-data).
- `pokyh-frontend`: targeted ESLint passed for the new classifier, login route,
  and regression test.
- `pokyh-frontend`: a clean isolated `npm ci && npm run build` passed, including
  Next.js compilation, TypeScript, page-data collection, and all 58 generated
  routes/pages.
- The repository-wide frontend lint remains red on unrelated pre-existing
  source issues and on an untracked, unusually named dependency directory. No
  files in that directory were changed or removed.
