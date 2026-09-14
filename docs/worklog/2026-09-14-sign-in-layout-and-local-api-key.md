## 2026-09-14 CEST — sign-in acknowledgement layout and local BFF diagnosis

- Intent: Resolve the reported oversized privacy acknowledgement control and
  determine whether the sign-in `403` originated in browser layout, the Learn
  BFF, or the backend.
- Findings: The checkbox inherited the generic large authentication-input
  `min-height` and padding, which made it render as a tall rectangle. A local
  BFF probe using deliberately invalid credentials reached the backend and
  received `403 Invalid API key`; this confirms a local BFF-to-backend
  application-key mismatch rather than a CORS, browser-origin, or WebUntis
  credential failure.
- Change: The privacy acknowledgement now explicitly resets checkbox geometry
  and maintains a compact, aligned text flow. A gitignored development-only
  runtime override aligns the BFF application key with the operator-managed
  backend key; no tracked file, production configuration, credential, token,
  or secret value was added or changed.
- Follow-up: The key correction exposed a distinct configuration-drift issue:
  the BFF was sending a notice version from its own runtime file while the
  backend's administrator-managed Learn configuration required a different
  version. The backend now exposes a narrowly scoped, API-key-protected
  sign-in configuration response containing only `privacyRequired`, the public
  notice URL, and its version. The BFF obtains and validates this at request
  time, fails closed when it is unavailable or malformed, and submits that
  exact authoritative version. The approval reference remains private.
- Verification:
  - Backend `npm run build` completed, then a fresh local container served the
    additive configuration endpoint and passed its readiness probe.
  - Learn lint, TypeScript check, and production build completed. Production
    dependency audits for both repositories reported no high-severity or
    critical production dependency finding.
  - The configuration endpoint returned `401` without an application key and
    `200` with the BFF's server-only key. The sign-in HTML did not contain that
    key.
  - A BFF login request carrying the backend-issued notice version reached the
    WebUntis-authentication boundary and returned the expected `401` for
    deliberately invalid test credentials; it no longer failed with the prior
    key mismatch or notice-version mismatch.
  - Desktop browser inspection confirmed a compact checkbox, accessible notice
    link, localized copy, theme/language controls, and a submit control gated
    by acknowledgement. No credentials were placed in the browser test.
  - A 390 x 844 mobile viewport check measured a 350 px form within the viewport,
    a 16 x 16 px acknowledgement checkbox, and no horizontal page overflow.
    An anonymous request to the generic Learn BFF remains `401`; only the
    server-rendered sign-in page reads the pre-authentication configuration
    using its server-only application key.
  - The frontend environment template and architecture/runtime documentation
    now state that notice values are backend-authoritative, removing the stale
    instruction to configure a duplicate frontend notice version.
- Release state: uncommitted. The backend endpoint and Learn BFF change must
  be released together; releasing the frontend first would correctly fail
  closed because an older backend has no authoritative endpoint.
