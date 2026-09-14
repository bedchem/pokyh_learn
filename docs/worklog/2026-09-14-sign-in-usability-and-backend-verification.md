## 2026-09-14 10:05 CEST — sign-in usability pass and backend verification

- Intent: Address the reported sign-in composition and untranslated service
  failure, then distinguish the public API outage from browser CORS behaviour.
- Outcome: The sign-in screen now has a deliberate header, a compact learning
  context column and a centred, readable authentication form. It keeps the
  established flat Pokyh Learn system: solid light/dark surfaces, existing
  self-hosted Manrope and DM Mono, semantic theme tokens and no gradients. The
  client no longer displays raw upstream error text; it uses the selected UI
  locale's generic availability message instead.
- Affected areas: Learn sign-in composition, sign-in error presentation, and
  the central delivery worklog. No operator-owned environment file, backend
  authorization rule, API key, credential or production route was changed.
- Verification:
  - Learn `npm run lint`, `npm run typecheck`, `npm run build` and whitespace
    checks passed.
  - Browser checks confirmed the full sign-in flow layout at desktop width and
    at a 390 px mobile viewport in both light and dark themes. Headings,
    labels, language selection, theme control, privacy notice and submit
    control remained exposed to the accessibility tree; the local browser
    recorded no page-console errors. The development-only Next.js marker is
    not part of the production build.
  - The local backend Compose app, MySQL and Redis services were healthy;
    readiness returned `200` and the equivalent browser preflight returned
    `204`.
  - Backend build and production-dependency audit passed. Public catalogue
    data remains intentionally readable, while a protected identity endpoint
    rejected requests without a user token even when a valid application key
    was supplied.
  - The public API still returned a gateway `502`, including for readiness and
    preflight probes. This happens upstream of Express, so neither CORS nor
    API-key middleware can affect that response.
- Risk / next step: Redeploy the already pushed backend startup fix on the
  hosting platform and verify that its application container reports healthy.
  Do not replace user-token and server authorization with a browser-visible
  shared key; that would expose user and administrator data. This entry omits
  credentials, tokens, account data and copied production log payloads.
- Release state: uncommitted.
