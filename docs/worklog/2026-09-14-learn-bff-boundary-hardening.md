## 2026-09-14 08:10 CEST — Learn BFF request-boundary hardening

- Intent: Continue the Learn frontend with a narrowly scoped security pass on
  its public Next.js BFF, without changing backend authorization or any
  operator-owned environment file.
- Outcome:
  - Added bounded streamed JSON reading for BFF mutations. It rejects malformed
    JSON, unsupported non-JSON request bodies and body sizes above the separate
    ordinary/import runtime limits before an upstream request is made.
  - Added path-segment validation before `/learn` proxy forwarding, including
    dot-segment, encoded traversal and separator rejection; this prevents an
    internally constructed backend URL from escaping the configured Learn
    prefix.
  - Added BFF validation for forwarded idempotency-key shape and length.
  - Converted internal/configuration/upstream server failures to generic public
    messages, kept private BFF/auth responses non-cacheable, and made the
    double-submit CSRF comparison constant-time.
  - Added the two runtime body-limit settings to the environment example and
    contract/runbook documentation. Backend validation, rate limiting and
    authorization remain mandatory and unchanged.
- Affected areas: Learn BFF/auth route handlers, server configuration/session
  helpers, request-body helper, environment example, architecture/API/agent
  contracts and this worklog.
- Verification:
  - `npm run lint`, `npm run typecheck`, `npm run build`, production dependency
    audit and whitespace check passed.
  - On an isolated local Next server: a double-encoded dot-segment proxy path
    was rejected with `400`; non-JSON login was rejected with `415`; a body
    over the configured ordinary limit was rejected with `413`; and an
    unauthenticated refresh mutation was rejected with `403` before calling
    the backend. The negative-path response carried `private, no-store`.
- Risk / next step: No distributed BFF rate limiter is added here because it
  requires a reviewed shared runtime; the backend's existing limits remain the
  effective authoritative protection. The new environment values use documented
  conservative defaults but must be reviewed against the backend import policy
  before production rollout. Review and commit only this coherent hardening
  scope after the human owner confirms release scope and identity.
- Release state: uncommitted

## 2026-09-14 08:22 CEST — local visual and accessibility smoke check

- Intent: Verify that the hardened local Learn build still presents the core
  public, unavailable and sign-in states clearly rather than treating security
  work as a backend-only concern.
- Outcome: The landing page, catalogue and sign-in form rendered in Italian
  with the selectable locale and theme controls visible. The flat visual system
  remained intact: no gradient treatment was introduced. The sign-in page
  clearly states the WebUntis-only boundary, provides labelled credentials and
  privacy acknowledgement controls, and exposes the privacy link. The public
  catalogue correctly displayed its designed unavailable state instead of demo
  content when the upstream API could not supply catalogue data.
- Affected areas: Visual verification only; no additional UI implementation
  change was made by this smoke check.
- Verification: inspected the rendered local landing, catalogue and sign-in
  screens through the browser accessibility tree and screenshots. Keyboard
  labels, semantic headings, locale selector, theme control and the catalogue
  unavailable message were present.
- Risk / next step: The local catalogue's unavailable state reflects the
  upstream API deployment condition and cannot be resolved in the frontend.
  Recheck the production catalogue after the backend deployment reports ready;
  a narrow-width viewport check remains part of the release checkpoint.
- Release state: uncommitted
