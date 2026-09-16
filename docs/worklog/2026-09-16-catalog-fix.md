## 2026-09-16 08:35 CEST — public catalogue response mapping

- Intent: Restore catalogue cards after the successful Learn login flow and
  make the release test requirement explicit in the repository contract.
- Outcome: The frontend now trusts the backend's `/learn/catalog` route for its
  already-authorized public/published result set and maps the known public
  presentation state without filtering on fields omitted from that response.
  `CLAUDE.md` now requires the complete relevant test checkpoint before any
  production release.
- Affected areas: `lib/server/data.ts`, `CLAUDE.md`, public catalogue runtime.
- Verification: `npm run lint`, `npm run typecheck`, `npm run build` and
  `git diff --check` passed. An isolated production-server HTTP smoke test with
  a contract-shaped backend response (one course without `visibility` or
  `status`) returned `200`; the page rendered that course with the public
  catalogue label and the BFF returned one course. The local backend returned
  `200` for its catalogue endpoint (currently zero published courses). The
  deployed frontend container still receives `403` because its configured API
  key does not match the backend runtime key. Browser automation was
  unavailable because the local browser control module is missing. The live
  health endpoint returned `200`, and a protected BFF route without a session
  correctly returned `401`.
- Risk / next step: Align the operator-managed frontend/backend API keys and
  rebuild/redeploy the frontend, then repeat the real catalogue and browser
  smoke tests. Do not enable demo mode as a production workaround.
- Release state: committed `c852726`; push in progress
