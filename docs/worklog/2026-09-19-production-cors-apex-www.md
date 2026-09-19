# 2026-09-19 — Production CORS apex/www compatibility

## Issue

The browser at `https://www.pokyh.com` could not call `https://api.pokyh.com`
because the API rejected its CORS preflight. Consequently `/auth/me` never
ran, so the frontend could not obtain the authenticated student's class/identity
data.

## Change

In `pokyh-backend`, each operator-configured HTTP(S) `CORS_ORIGIN` now also
allows its conventional apex or `www` counterpart. For example, configuring
`https://pokyh.com` also permits `https://www.pokyh.com`. Other subdomains
remain blocked unless explicitly configured. The environment example and CORS
documentation now describe that behaviour accurately.

## Verification

Before the change, an OPTIONS request to production `/auth/me` from
`https://www.pokyh.com` returned `403` with no CORS allow-origin header.
`npm run build` (Prisma generate + TypeScript) and a direct apex/www
origin-alias smoke check both passed locally after the change.

## Deployment note

The API service must be rebuilt and redeployed for the source fix to reach
production. No credentials, user data, or request payloads are recorded here.
