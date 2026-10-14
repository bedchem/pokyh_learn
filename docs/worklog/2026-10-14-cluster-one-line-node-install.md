## 2026-10-14 12:22 CEST — one-line node install with pinned mTLS: decisions and plan

- Intent: Let an administrator add a new backend node to the cluster with a
  single command run on a fresh server, generated through an admin API
  endpoint, and secure node-to-node traffic with mutually pinned certificates.
- Outcome: Scope agreed with the owner before implementation:
  - Target: fresh Debian/Ubuntu server; the installer sets up Docker Engine and
    the Compose stack itself under `/opt/pokyh`.
  - Code source: the inviting node serves its own running version as a
    bundle, so the new node runs the identical build.
  - Shared configuration: all cluster-wide values (token secrets, API and
    server keys, VAPID keys, admin login, CORS/WebUntis/Learn settings) are
    transferred encrypted; database credentials and `CLUSTER_SECRET` are
    generated per node.
  - Reachability: the new node gets its own domain with automatic HTTPS
    (Caddy, Let's Encrypt).
  - Certificates: every node holds its own certificate; peers pin each other;
    node-to-node traffic runs over mutual TLS directly between the
    applications on a dedicated cluster port, in addition to the existing
    encrypted channel. No cluster CA.
  - The inviting production node is deployed with Dokploy.
  - The command is created with the normal admin login only (no additional
    automation key).
  - The AI runtime (Ollama) on the new node is chosen per command, defaulting
    to the inviting node's setting.
- Affected areas: none yet (planning only).
- Verification: Feasibility checks in a scratch directory, outside the
  repository: `curl -k --pinnedpubkey` rejects a server whose public key does
  not match the pin (exit 90). Node.js mutual TLS (TLS 1.3) with self-signed
  certificates accepts the pinned client, rejects an unpinned client, and
  aborts before any request data when the server pin does not match. Open
  pull requests could not be listed: the GitHub API was unreachable from this
  machine. `pokyh-backend`, `pokyh_learn-frontend` and `pokyh-frontend` have
  clean working trees.
- Risk / next step: Await the owner's approval of the implementation plan.
- Release state: uncommitted

## 2026-10-14 14:26 CEST — implementation: one-line node install, pinned mutual TLS, setup hardening, popup editor

- Intent: Implement the agreed plan; on the owner's further request, check that
  no API call can make the server run code without the required rights, and
  improve the popup editor (clearly visible create button, a message that says
  what is missing, a popup with a title only).
- Outcome (all in `pokyh-backend`, additive; no existing route removed):
  - Node certificates (`src/cluster/x509.ts`): every node creates its own
    self-signed ECDSA P-256 certificate; peers pin the SHA-256 of each other's
    public key (the `curl --pinnedpubkey` format). No certificate authority.
  - Mutually authenticated channel (`src/cluster/mtls.ts`,
    `CLUSTER_MTLS_PORT`): TLS 1.3 with a client certificate on every
    connection; a connection without one, or with one nobody pinned, is closed
    right after the handshake unless a pairing or an install is open, and then
    reaches only the endpoints those need. Outgoing connections trust only the
    pinned certificate and check the pin again; TLS session resumption is off
    so every new connection is checked.
  - Handshake binding (`src/cluster/crypto.ts`, protocol version 3): pairing
    and session handshakes over the channel cover the pins of both
    certificates each side observed, so TLS terminated in between makes them
    fail. Links made before the channel move onto it by themselves and are
    then locked to it; a locked link is refused on every other path.
    Introductions by the mesh pass the pinned certificates along.
    Certificate renewal (admin) distributes the new certificate first.
  - One-line install (`src/cluster/provision.ts`, `installToken.ts`,
    `sharedEnv.ts`, `tarball.ts`, `joinFile.ts`, `deploy/node/*`): an admin
    endpoint returns a command that downloads the installer pinned to the
    inviting node's key and checked by SHA-256, and a token from which the new
    server derives a proof key, the key that opens the configuration
    (AES-256-GCM, bound to the request) and the one-time pairing secret. The
    configuration is handed out once; wrong proofs lock the install; it can be
    revoked; the secret is forgotten once the node joined. The installer
    (Debian 12+/Ubuntu 22.04+) checks the system, installs Docker with the
    repository key's fingerprint pinned, writes the node's configuration with
    its own database password and `CLUSTER_SECRET`, starts MySQL, Redis, the
    backend, Caddy (Let's Encrypt) and optionally Ollama, and waits until the
    node paired and received the data. Only listed cluster-wide settings are
    shared; node-local settings and process-control variables never.
  - Admin API: `POST/GET /api/admin/cluster/node-installs`,
    `DELETE /api/admin/cluster/node-installs/:id`,
    `POST /api/admin/cluster/certificate/rotate`; admin panel Cluster page.
  - Security finding fixed in the first-run setup (`src/routes/setup.ts`):
    reachable without credentials whenever `ADMIN_PASSWORD_HASH` was empty,
    even when administrators existed in the database, and it wrote the
    username unchecked into the env file (a line break could add arbitrary
    settings, which processes started by the server inherit). Now closed as
    soon as any administrator can sign in and on every cluster node; strict
    username pattern; single-line values only; `$` written literally; rate
    limited; one at a time.
  - Pre-existing defect fixed: the cluster data check failed for every table
    small enough to be compared row by row (empty prefix rejected by the
    request schema).
  - Popup editor (`admin/src/pages/PopupsPage.tsx`): primary-styled create
    button, list of what is still missing shown after a save attempt and the
    first field focused, text optional (the API already accepted it).
  - Deployment: the image ships `deploy/`; `docker-compose.yml` publishes the
    channel port only on a random loopback port unless
    `CLUSTER_MTLS_PUBLISH` is set; `.env.example`, `README.md`, `COMMANDS.md`.
- Affected areas: `pokyh-backend/src/cluster/{x509,mtls,installToken,sharedEnv,tarball,provision,joinFile,errors}.ts` (new),
  `src/cluster/{crypto,pairing,transport,protocol,runtime,store,mesh,router,invite,index}.ts`,
  `src/routes/{adminCluster,setup}.ts`, `src/config.ts`, `prisma/schema.prisma`
  (additive columns on `cluster_node`/`cluster_peers`, new `cluster_installs`),
  `deploy/node/*` (new), `Dockerfile`, `docker-compose.yml`,
  `scripts/compose-stack.sh`, `admin/src/{api,types}.ts`,
  `admin/src/pages/{ClusterPage,PopupsPage}.tsx`, tests, docs; this worklog.
- Verification: see the verification entry below.
- Risk / next step: see the verification entry.
- Release state: uncommitted

## 2026-10-14 14:47 CEST — verification

- Intent: Verify the one-line install, the pinned mutual TLS channel, the
  setup hardening and the unchanged behaviour of the existing cluster.
- Outcome: All checks below pass on the final tree.
- Affected areas: `pokyh-backend/tests/{clusterX509,clusterInstall,clusterCrypto}.test.mjs`,
  `tests/cluster/{harness,e2e,install.e2e}.mjs`.
- Verification:
  - `npx prisma validate`, `npm run build`: passed. `shellcheck -s sh` and
    `sh -n` on the installer, also with the bootstrap embedded: clean.
    `docker compose config` for `docker-compose.yml` (channel port only on a
    random loopback port by default, published with `CLUSTER_MTLS_PUBLISH`)
    and for `deploy/node/compose.yml` with and without the AI profile: valid.
  - `npm test`: 81 of 81 (new: certificate generation and validation, real
    mutual TLS handshakes with pinned/unpinned/impostor certificates,
    `curl --pinnedpubkey` accepting the right pin and refusing another with
    exit 90, no TLS session resumption, handshake binding to both
    certificates, install token, key derivation and sealing identical on the
    inviting node and in the bootstrap, proofs bound to purpose/install/time/
    nonce, shared-settings allowlist including refusal of multi-line values,
    node-local settings and process-control variables, env file without
    duplicates or injected settings, Caddyfile/compose settings, deterministic
    bundle unpacked by system tar, invite codes naming the channel).
  - `npm run test:cluster`: 44 of 44 — the existing 29 multi-node tests and
    15 new ones with real backend processes and databases: the channel cutting
    off connections without a pinned certificate; pairing-only access for an
    unknown certificate; admin-only command creation with input validation;
    the command executed word for word (pinned download, hash check; wrong pin
    refused, altered script refused); impostor certificate refused by the
    bootstrap; five wrong proofs lock an install; revocation; configuration
    handed out once, resumable on the same server; new node started from the
    handed-out build joining by itself over the channel, data and sessions
    usable across nodes, link locked to the channel on both sides, install
    secret forgotten; first-run setup closed on an installed node; a third
    node installed through the second and linked to the first by the mesh over
    the channel; certificate renewal with all links staying up; links made
    before the channel moving onto it and being locked; the first-run setup
    refusing injected usernames, closed while a database administrator
    exists, and admitting exactly one of two simultaneous attempts; no token,
    install secret or JWT secret in any node log.
  - Defects found by these runs and fixed: the channel listener was not yet
    listening when the installer's join started; outgoing connections reused
    TLS sessions, which skips the certificate check (resumption is now off);
    kept-alive connections no longer expose the peer certificate (the pin is
    now recorded at the handshake); the existing data check failed for small
    tables (empty prefix refused by the request schema).
  - Node logs of the final runs: only warnings the tests provoke on purpose.
  - The developer `.env` was not read for values or modified (unchanged).
- Risk / next step:
  - Not verifiable on this machine (no internet access): the installer on a
    real fresh Debian/Ubuntu server (Docker installation, image build with
    `npm ci`, Caddy obtaining a Let's Encrypt certificate) and a Dokploy
    deployment. The first real run should be watched.
  - The admin panel compiles (type check) but its production bundle was not
    rebuilt: the `gsap` dependency added in commit `a27b9e4` is not
    installed locally and could not be downloaded.
  - Open pull requests could not be checked (GitHub API unreachable).
  - On the Dokploy node: deploy, set `CLUSTER_MTLS_PORT=4100`,
    `CLUSTER_MTLS_PUBLISH=0.0.0.0:4100` (and `CLUSTER_MTLS_URL` if the
    domain is proxied), open TCP 4100; the new server's domain must resolve to
    it before the command is run.
- Release state: uncommitted

## 2026-10-14 14:52 CEST — local env file set from the owner's deployment values

- Intent: On the owner's explicit direction, use the owner's deployment
  settings as the local `pokyh-backend/.env`, prepared for the cluster channel.
- Outcome: The previous local `.env` was kept as
  `.env.backup-2026-10-14.local` (mode 0600, ignored by Git through
  `.env.*.local`; a name like `.env.backup-…` would not have been ignored).
  The new `.env` (mode 0600, ignored by Git) carries the owner's values with
  three changes: the admin password hash with single `$` instead of `$$`
  (the file is read literally by dotenv and by Compose `format: raw`, so the
  doubled form was not a valid hash); an inline comment after
  `OLLAMA_NUM_PARALLEL` moved to its own line (it would have become part of
  the value); a cluster block with `CLUSTER_MTLS_PORT=4100`,
  `CLUSTER_MTLS_PUBLISH=0.0.0.0:4100` and `CLUSTER_MTLS_URL` left empty. The
  previous file's `TUNNEL_HOSTNAME`/`TUNNEL_NAME` are not used by any code.
  Installer correction prompted by these values: `PUBLIC_BASE_URL` on a new
  node now follows the cluster exactly (empty stays empty) instead of
  defaulting to the new server's domain, so stored links never point at one
  node.
- Affected areas: `pokyh-backend/.env` (untracked, not committed),
  `deploy/node/bootstrap.mjs`, `tests/clusterInstall.test.mjs`, `README.md`;
  this worklog. No value from the env file is recorded here.
- Verification: The built configuration loads the new file: valid bcrypt
  admin hash, both admin names, channel port 4100, clean Ollama value.
  Compose resolves the app ports 4000 and 4100 with it. `npm test` 81 of 81;
  `tests/cluster/install.e2e.mjs` 15 of 15 after the installer correction.
- Risk / next step: `CLUSTER_MTLS_URL` needs an address that reaches the
  server directly (the API domain goes through the Cloudflare tunnel); until
  it is set, one-line install commands cannot be created. The owner pasted
  the secrets into the session transcript.
- Release state: uncommitted

## 2026-10-14 15:33 CEST — several ways per node, proxy passthrough, Pokyh relay

- Intent: The owner's production node is a homelab behind a VPS proxy
  (80/443 for web, WireGuard to the homelab). On the owner's direction: let
  nodes reach each other through that proxy (own port 4100 and/or 443 by
  server name, both selectable) and through a built-in relay for nodes
  without open ports; configurable in the panel or the env file; a single
  key pasted once makes it work; no leader.
- Outcome (`pokyh-backend`):
  - Endpoints (`src/cluster/endpoints.ts`, `reach.ts`): a node announces
    several ways in order (env `CLUSTER_MTLS_ENDPOINTS`, panel entries with
    toggles, relay ways); peers try them in turn, keep the one that works,
    re-check preferred ones every five minutes; lists travel only over
    authenticated paths (pairing transcript, heartbeat, introduction, invite
    code, install token, join instruction). Server names can differ from the
    host connected to; ports are read as written (443 included).
  - Proxy passthrough: panel entries "Proxy · eigener Port" and
    "Proxy · 443 (SNI)" with generated nginx/HAProxy/Traefik/Caddy
    configuration (`proxySnippets.ts`), never terminating TLS.
  - Pokyh relay (`deploy/relay/relay.mjs`, `install.sh`;
    `src/cluster/relayProtocol.ts`, `relayClient.ts`, `relaySetup.ts`):
    nodes park connections at the relay (relay certificate pinned by the
    key, registration secret proven per connection, bound to the node's own
    certificate); the relay routes by the ClientHello server name without
    terminating TLS and splices; limits, rate limiting, timeouts. The relay
    key is added once in the panel and stored encrypted (key derived from the
    shared JWT_SECRET) in the replicated `relays` table, so every node,
    including later ones, registers by itself; `CLUSTER_RELAY_KEYS` for one
    node only. Relay installer served only inside an admin-opened 30-minute
    window and checked by SHA-256.
  - Admin API `/api/admin/cluster/{reach,relays,relay-command}`; panel
    sections "Erreichbarkeit dieser Node" and "Relays".
  - Defects found and fixed while testing: URL drops port 443 (endpoints
    now read the written port); test harness matched peers by address only.
- Affected areas: `src/cluster/{endpoints,reach,proxySnippets,relayProtocol,relayClient,relaySetup}.ts` (new),
  `src/cluster/{mtls,pairing,mesh,protocol,runtime,store,transport,router,invite,installToken,joinFile,provision,index}.ts`,
  `src/routes/adminCluster.ts`, `src/index.ts`, `src/config.ts`,
  `prisma/schema.prisma` (additive: `cluster_node.reach_config`,
  `cluster_peers.channel_endpoints`, replicated `relays`),
  `deploy/relay/*` (new), `deploy/node/bootstrap.mjs`,
  `admin/src/components/cluster/ReachSection.tsx` (new), `admin/src/{api,types}.ts`,
  `admin/src/pages/ClusterPage.tsx`, tests, `README.md`, `COMMANDS.md`,
  `.env.example`, the local untracked `.env` (cluster block comments and
  empty `CLUSTER_MTLS_ENDPOINTS`/`CLUSTER_RELAY_KEYS` only); this worklog.
- Verification: see the next entry.
- Release state: uncommitted

## 2026-10-14 15:38 CEST — verification of ways, proxy and relay

- Intent: Verify the final tree, including the earlier one-line install.
- Outcome: All checks below pass.
- Affected areas: `pokyh-backend/tests/{clusterEndpoints,clusterRelay}.test.mjs` (new),
  `tests/clusterInstall.test.mjs`, `tests/helpers/loadTs.mjs` (loads pure
  modules with relative imports), `tests/cluster/{harness,relay.e2e}.mjs`.
- Verification:
  - `npx prisma validate`, `npm run build`, admin type check (except the
    missing `gsap` package), `shellcheck -s sh` on both installers and on
    the rendered relay installer: clean.
  - `npm test`: 94 of 94 (new: endpoint parsing including 443, ordering,
    public/private addresses, curl `--connect-to`; proxy configuration
    without TLS termination and without injection; relay key, park proof and
    ClientHello server name identical in node and relay; a real relay in
    process carrying end-to-end TLS while a recording hop sees no plaintext;
    refusal of wrong secret, foreign route, stale time, replay, missing
    certificate, taken route, unknown names; relay identity files 0600;
    token and bootstrap reading the same endpoint lists).
  - `npm run test:cluster`: 53 of 53 — the existing 29, the 15 one-line
    install tests, and 9 new ones with a real relay process: validated and
    admin-only reach settings; one relay key added once makes the homelab
    node reachable; a forged relay key is never used; curl through the relay
    with the server name and the pinned key; a server installed and joined
    through the relay, receiving the relay setting through replication and
    registering by itself; relay outage noticed and recovered by itself; a
    proxy routing by server name taking over when the relay is switched off
    (switch replicated to both nodes); relay setup command and its window;
    no relay key or install token in any log.
  - No e2e container left behind; the developer `.env` was only changed in
    its cluster block as described above.
- Risk / next step: Not verifiable here (no internet): the relay installer on
  a real VPS (Docker installation), the owner's own proxy implementation
  (it must pass TLS through by port or by SNI without terminating it), real
  DNS for `*.cluster` names, and the homelab's WireGuard path. The owner's
  values for `CLUSTER_MTLS_ENDPOINTS` or the panel entries are still to be
  set. Not committed: the owner asked not to commit.
- Release state: uncommitted

## 2026-10-14 15:41 CEST — commit and push

- Intent: Record the one-line node install, the pinned mutual TLS channel,
  several ways per node with proxy and relay, the setup hardening, the popup
  editor change and the fixes, after the owner confirmed the scope (commit and
  push of `pokyh-backend` and of this worklog) and the Git identity.
- Outcome: `pokyh-backend` commit `985c645` on `main`, authored and
  committed under the owner's confirmed identity, 56 files, no co-author or
  other trailer. `origin/main` had not moved since `f0e6561`; no open pull
  requests. The local env file and its backup are ignored by Git and not part
  of the commit.
- Affected areas: `pokyh-backend` (`main`); this worklog, committed together
  with the earlier unpushed worklog commit `4b2ce3a`.
- Verification: On the committed tree: `npx prisma validate`,
  `npm run build`, admin type check (except the missing `gsap` package),
  shellcheck on both installers, `npm test` 94 of 94,
  `npm run test:cluster` 53 of 53. No trailer in the commit message.
- Risk / next step: The first deployment adds the columns and tables
  additively (`cluster_node.tls_cert`, `tls_key_enc`, `reach_config`;
  `cluster_peers` channel columns; `cluster_installs`; replicated
  `relays`). Real-server checks listed in the verification entries remain.
- Release state: committed `985c645`; push in progress
