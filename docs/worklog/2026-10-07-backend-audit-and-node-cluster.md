## 2026-10-07 21:27 CEST — backend audit: defects found and corrected

- Intent: Review `pokyh-backend` for defects and correct the confirmed ones without changing existing routes, authentication semantics or configuration.
- Outcome: Corrected in `pokyh-backend`:
  - Push poller: a failed poll or due-item pass left a promise rejection unhandled, which ends the process; each pass is now contained, and a rejected VAPID configuration no longer keeps the following background jobs from starting.
  - Backup: a dump that failed part-way could be recorded as successful; a corrupt archive or a closed pipe during restore raised an uncaught stream error. Success now requires exit code 0 and a fully written file; restore verifies the archive first and reports stream errors as a failed restore. A failed scheduled run is retried on the next check instead of counting as that day's run, and enabling backups in the admin panel works when `BACKUP_ENABLED=false`.
  - Error handler: a failure after response headers were sent (SSE, downloads) no longer raises a second error. Shutdown closes the HTTP server and cache in order; unhandled rejections are logged instead of ending the process; a missing admin build answers 404.
  - `requireAuth` accepted admin-panel tokens, which carry no stable user id; such a token is now rejected there.
  - Session revocations were memory-only and limited to one hour regardless of `JWT_EXPIRES_IN`; they are now persisted (`token_revocations`), reloaded at start and kept for the configured token lifetime.
  - Request log, activity log and admin login used the raw `X-Forwarded-For` header regardless of `TRUST_PROXY`; they now use the proxy-aware client address, bounded to the column width. The activity-log rate limit can no longer be bypassed by varying that header.
  - To-do `details` and reminder `body` accepted 10,000 characters against 5,000-character columns; limits are aligned.
  - `/auth/learn-login` reported every error as failed credentials; only a failed WebUntis validation does now. A refreshed token keeps the `isUntisUser` claim. Two simultaneous first logins of one account no longer end in a conflict.
  - Admin list endpoints answered 500 for a non-numeric `page`/`limit`; the menu import fetch had no timeout, size limit or status check.
  - Personal Learn import used the five-second default transaction limit and failed for imports well within the configured size limits (measured: 6 courses × 1,000 words → `Database error` after 5 s); the limit now follows the allowed import size.
  - Section reorder: concurrent reorders of one course ended in a database lock conflict for part of the requests (measured on a single server: 16 of 240); the transaction is now retried.
  - Production dependencies: `npm audit --omit=dev` reported four advisories published since the last CI run (`proxy-addr`, `sharp`, `source-map-js`, `moment`); updated to the patched versions within the existing ranges (lockfile only).
- Affected areas: `pokyh-backend/src/index.ts`, `src/middleware/auth.ts`, `src/middleware/requestLogger.ts`, `src/routes/{activityLog,admin,auth,learn,reminders,todos}.ts`, `src/services/{dbBackup,pushPoller,archiver,schoolYearArchiver}.ts`, `src/utils/{revokedTokens,duration,dbRetry}.ts`, `prisma/schema.prisma` (additive `token_revocations`), `package-lock.json`; this worklog.
- Verification: see the verification entry below.
- Risk / next step: With `TRUST_PROXY` unset, logged client addresses are now the directly connecting address (the proxy), as that setting documents. Reviewed but deliberately unchanged: one session per user, the unauthenticated first-run setup call, rating of unregistered dishes.
- Release state: committed `d0576a8`

## 2026-10-07 21:27 CEST — multi-node cluster with encrypted replication

- Intent: Allow several backend nodes, each with its own database, to be linked manually by address and a pairing key entered on both sides, replicate their data for redundancy over an authenticated encrypted channel, and detect unreachable nodes.
- Outcome: New, additive cluster layer in `pokyh-backend/src/cluster/`. It is inactive until a peer is added; a standalone server installs no trigger and is unchanged.
  - Pairing: pairing key stretched with scrypt and a random salt, authenticating an ephemeral X25519 exchange with key confirmation on both sides; yields a 256-bit link key stored only in wrapped form. The pairing key is discarded; an open pairing expires and locks after repeated wrong keys.
  - Channel: per connection a fresh ephemeral X25519 exchange authenticated with the link key; per message AES-256-GCM with direction-specific keys, counter nonces and a replay window. Mounted at `/cluster/v1`, ahead of the API-key check, with its own rate limits.
  - Change capture: generated per-table MySQL triggers record a row version and a per-peer queue entry in the writing transaction. Node-local tables (`request_logs`, `frontend_activity_logs`, `backup_config`, `cluster_*`) are not replicated.
  - Transfer: queued rows are sent in their current state; a complete transfer (first pairing, resync) walks the version registry and offers rows by key and version. Received rows are applied one per transaction, last writer wins; rows waiting for a parent or for a unique value are set aside and retried; real duplicates are resolved by a fixed rule.
  - Failure detection: authenticated heartbeat, states online / not answering / offline, logged transitions, automatic catch-up. Once-only background jobs run on one node (smallest reachable node id).
  - Operations: admin API `/api/admin/cluster` and an admin-panel page; restore of a backup on a node with peers rebuilds the replication metadata; hold on peers that return after longer than deletions are remembered; detection of changes made while capture was missing.
- Affected areas: `pokyh-backend/src/cluster/*`, `src/routes/adminCluster.ts`, `src/routes/index.ts`, `src/index.ts`, `src/config.ts`, `prisma/schema.prisma` (additive `cluster_*` tables), `admin/src/{App.tsx,api.ts,types.ts,components/Layout.tsx,pages/ClusterPage.tsx}`, `README.md`, `COMMANDS.md`, `.env.example`, `package.json` (`test:cluster`), `tests/`; this worklog. No change in `pokyh_learn-frontend` or `pokyh-frontend`.
- Verification: see the verification entry below.
- Risk / next step: Consistency between nodes is eventual (about one second in normal operation). Conflict resolution compares clocks, so nodes need synchronised time; the admin page warns on measured differences. The database account must be allowed to create triggers. Routing clients to a healthy node is not part of this change. The initial transfer runs at a few hundred rows per second (measured ~340/s on the test setup). Not yet exercised on the production hosts.
- Release state: committed `d0576a8`

## 2026-10-07 21:27 CEST — verification

- Intent: Verify the audit corrections and the cluster layer, including against real separate databases.
- Outcome: All checks below passed.
- Affected areas: `pokyh-backend/tests/*.test.mjs`, `tests/cluster/{harness,e2e}.mjs`.
- Verification:
  - `npx prisma validate`, `npm run build`, admin panel `npm run build`: passed. `npm audit --omit=dev`: 0 vulnerabilities.
  - `npm test`: 42 of 42 passed (pairing and session key agreement, rejection of wrong keys, tampered and replayed frames, key wrapping, row encoding, version ordering, trigger generation, failure-detection states, leader choice, address parsing, token lifetime and pagination helpers).
  - `npm run test:cluster`: 28 of 28 passed. It starts a temporary MySQL 8.0.40 container and backend processes with one database each, in isolated working directories and with an explicitly constructed environment (no local `.env`, database or running stack involved). Covered: standalone behaviour without triggers; the audit corrections on a running server; pairing with wrong keys (lock) and with the correct key; complete initial transfer including binary image data; replication in both directions including case-only changes, direct SQL writes, cascading deletes and a reordered list; live SSE event on another node; recorded network traffic contains no row content, and replayed, modified or re-counted frames are refused; a node paired with only one other still receives everything; single leader; node stopped → reported offline, others continue, catch-up after restart; session revocation on all nodes and after restart; nodes separated and changed in conflict converge (same row, delete vs. edit, same account, same list position, same course address); backup restore with peers; concurrent writers on three nodes with no failed request and no lock conflict reported; capture missing after a manual change → reported and published by rebuild; peer on hold after a simulated 60-day absence; replication paused between nodes with different schemas; peer removal.
  - Additional load run: 6,150 concurrent write requests across three nodes, 0 failed; the database reported lock conflicts only between simultaneous reorders of the same course, which the retry absorbs.
- Risk / next step: The multi-node test ran on one development machine; latency and throughput on the production hosts and over a real network are unmeasured.
- Release state: committed `d0576a8`

## 2026-10-07 22:31 CEST — commit

- Intent: Record the audit corrections and the cluster layer as one commit in `pokyh-backend` after the owner confirmed the scope (commit and push, both repositories) and the Git identity.
- Outcome: `pokyh-backend` commit `d0576a8` on `main`, authored and committed under the owner's confirmed identity, 55 files, no co-author trailer. The push to `origin/main` has not been performed yet; `origin/main` is still at `5146b89`.
- Affected areas: `pokyh-backend` (`main`, one commit ahead of `origin/main`); this worklog.
- Verification: Before the commit, on the final tree: `npx prisma validate`, `npm run build`, admin panel build, `npm test` (42 of 42), `npm run test:cluster` (28 of 28), `npm audit --omit=dev` (0 vulnerabilities), `npm ci --dry-run` (lockfile consistent). No commit hooks are installed; `origin/main` had not moved.
- Risk / next step: Push both repositories; the backend push starts the CI workflow. On the first start with the new version the schema is extended additively (`token_revocations`, `cluster_*`); no existing table changes.
- Release state: committed `d0576a8`
