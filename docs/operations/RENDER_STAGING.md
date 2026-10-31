# Render staging — private, independently testable (plan, 2026-10-31)

Status: **PREPARED, NOT PROVISIONED.** Nothing has been created on Render. Every step that spends money or exposes a URL waits for the
owner's explicit approval (§10). Repository state: everything here is committed alongside the commit named in `tests/evidence/
RENDER_REHEARSAL.json`; the local rehearsal of the whole sequence passed 14/14 (§7).

## 1. Account audit (read-only, Render API, 2026-10-31)

| Item | Found |
|---|---|
| Workspaces | one: "Jeremiah's workspace" (`tea-dbiiqj0473hc73d84d1g`, type team) |
| Services (web, private, workers, cron, static, previews) | none |
| Postgres instances | none |
| Key Value instances | none |
| Workspace plan tier | **not visible through the API tools** — check Billing in the dashboard. Since 2026-08-01 every legacy workspace has been moved to the new plans (Hobby $0 / Pro $25 flat / Scale $499 flat) |

The workspace is empty: staging can be created without touching anything existing.

## 2. Hobby or Pro?

**Hobby with paid compute is sufficient for this staging.** Everything the architecture needs is a property of paid *instances*, not of
the workspace plan: pre-deploy commands (migrations), persistent disks, the private network between services and the database, Postgres
point-in-time recovery, image-backed deploys.

| Need | Hobby ($0) | Pro ($25/mo flat) |
|---|---|---|
| Paid web services, pre-deploy command, disk, internal DB URL | yes | yes |
| Postgres PITR window | 3 days | 7 days |
| Dashboard members | **1** (only you) | unlimited |
| Workspace audit logs (who changed env vars / deployed) | no | yes |
| HTTP request logs, latency metrics | no | yes |
| Network-isolated environments (staging apart from a future production) | no | yes |
| Included bandwidth / build minutes | 5 GB / 500 | 25 GB / 1,000 |
| **IP allow-list for web services** | **no** | **no** (Scale, $499, only) |

**Upgrade to Pro when** (any one): an independent reviewer needs dashboard or log access; you want the platform's own audit log of who
changed staging; production joins this workspace (isolated environments); you want 7-day PITR. Pro buys none of the security of the
application itself — and no plan below Scale can restrict who reaches a web service by IP.

## 3. What "private" can mean on Render below Scale

Every Render web service gets a public `*.onrender.com` URL and, below Scale, cannot be IP-restricted. So staging is private **by
authentication**, not by network:
- `NODE_ENV=production` + `AUTH_MODE=oidc`: the API refuses development sign-in and the synthetic seed (enforced in `config.ts`, tested
  D8). Only people with a membership — the bootstrapped administrator and the people they invite — get any data.
- No synthetic tenants, no shared passwords (rehearsal: 0 people with a password).
- Unauthenticated requests get 401 (D5); CORS admits only the web origin (D6); per-caller rate limits; the web server answers only its
  own host name (421 otherwise).
- The database: internal URL only; **disable external access** (Access Control: remove `0.0.0.0/0`) except for the few minutes the
  operator runs the role/tenant bootstrap from a fixed IP (§5).
What remains visible to anyone with the URL: the web app's static shell (no data), `/health` (status, version, release commit, auth mode),
and `/v1/openapi.json`. **Exposing those URLs at all needs your approval (A2).**

## 4. Architecture (smallest reliable)

```
                         internet (TLS at Render's edge)
                 ┌───────────────────────┴───────────────────────┐
   empathia-staging-web (web service, 0.5 CPU/512 MB)   empathia-staging-api (web service, 0.5 CPU/512 MB)
   node apps/enterprise-web/server/serve.mjs            node services/enterprise-api/dist/src/main.js (+ outbox worker in-process)
   static app + CSP → API origin only                    pre-deploy: migrate.js · health: /health · disk /data/objects (1 GB, evidence)
                                                                   │ private network, TLS (sslmode=require)
                                               empathia-staging-db (Render Postgres 16)
                                               owner = default user · empathia_app · empathia_worker (NOBYPASSRLS)
```
One image (`deploy/render/Dockerfile`) serves both web services with different start commands. Not deployed: the public website, the
investor demo, the Founder Studio (confidential, localhost-only by design), the Python intelligence service (the API does not call it),
Key Value. Region: one region for all three (e.g. Ohio or Oregon); the internal URL works only within a region.

Why a second web service and not a free static site: Render builds static sites only from a Git repository, and this plan uses no Git
provider (§6).

## 5. Deployment sequence

Preparation on your machine (Docker installed; nothing is sent anywhere until step 4):
1. `git clone` the preserved bundle (or this workspace) at the approved commit `C`; `node scripts/release/verify-fresh.mjs` must PASS.
2. Generate secrets locally: `openssl rand -base64 48` (JWT_SECRET), `openssl rand -base64 36` twice (EMPATHIA_APP_PASSWORD,
   EMPATHIA_WORKER_PASSWORD). Keep them in your password manager only.
3. Optional but recommended once: `pnpm install --lockfile-only` and commit `pnpm-lock.yaml` (the image then installs it frozen).
4. Build and push (the build context excludes `.local`, `.git`, media and evidence — `.dockerignore`):
   `docker build --platform=linux/amd64 -f deploy/render/Dockerfile --build-arg RELEASE_SHA=C -t <registry>/empathia:C .`
   `docker push <registry>/empathia:C` → note the **digest** (`sha256:…`).

On Render (each step after your approval, §10):

| # | Step | Gate |
|---|---|---|
| R1 | Create `empathia-staging-db`: Postgres **16**, plan `basic-1gb` (or `basic-256mb`, §9), region X. Access Control: your IP only | A1 |
| R2 | **V-1 gate**: `psql "<external URL>?sslmode=require" -v app_password=… -v worker_password=… -f deploy/render/bootstrap-roles.sql`. It prints whether the default user can create roles. **If it fails: stop** (§8 V-1) | — |
| R3 | Add the registry credential (Workspace Settings → Registry credentials; read-only token) | A4 |
| R4 | Create `empathia-staging-api`: Existing Image `<registry>/empathia@sha256:…`, 0.5 CPU / 512 MB, env from `deploy/render/api.env.template`, pre-deploy `node services/enterprise-api/dist/src/db/migrate.js`, health `/health`, disk `/data/objects` 1 GB. First deploy runs the 25 migrations | A1, A2 |
| R5 | Operator bootstrap, once: `DATABASE_URL="<external owner URL>?sslmode=require" node services/enterprise-api/dist/src/db/bootstrap.js --tenant=<slug> --tenant-name="…" --site=… --building=… --admin-email=<your IdP email> --admin-name="…"` (from the same commit's build; or Render Shell on the API service with the internal URL) | — |
| R6 | Create `empathia-staging-web`: same image digest, start `node apps/enterprise-web/server/serve.mjs`, env from `web.env.template`, health `/healthz` | A2 |
| R7 | Set `CORS_ORIGINS` on the API to the web URL; redeploy the API (same digest) | — |
| R8 | Remove your IP from the database's Access Control (internal access only) | — |
| R9 | Deployment tests (§7) and record `tests/evidence/STAGING_SMOKE.json` | — |
| R10 | Sign in as the administrator through the IdP; invite testers (`POST /v1/admin/invitations`); optionally bootstrap a second tenant (`--tenant=isolation-probe`) with its own administrator so a tester can verify tenant isolation independently | — |

Migration order is fixed by the file names (0001…0025), each in its own transaction, recorded with its SHA-256; a changed applied file is
refused. The roles must exist **before** the first migration (the migrations grant to them only if they exist) — hence R2 before R4.

## 6. Deploying without GitHub

| Method | Source leaves your machine? | Verdict |
|---|---|---|
| **Prebuilt image from a private registry** (GitLab Container Registry, Docker Hub, Google Artifact Registry or AWS ECR; GHCR needs GitHub) — Render pulls `image@digest` | **No** — only the compiled runtime tree (248 files, ~4.5 MB of JavaScript, migrations, the web build; no TypeScript, tests, docs, Studio or secrets: `RUNTIME_MANIFEST.json`) | **Recommended** |
| Git-backed from a private GitLab or Bitbucket repository (Render builds) | Yes — the full source to GitLab/Bitbucket | Works; needs your approval to host the source there |
| Public Git URL | Yes, publicly | Refused |

Compiled JavaScript is readable: the image protects the source *repository*, not the logic, from someone who obtains the image. Keep the
registry private and the token read-only. Redeploys: Render's deploy hook with `imgURL=<registry>/empathia@sha256:…` or Dashboard →
Manual Deploy. Render does not cache images: every digest you may roll back to must stay in the registry.

## 7. Deployment tests

- **Before Render (done):** `node deploy/render/rehearse.mjs --rt=<assembled tree>` — the whole sequence from the assembled runtime tree
  against a throwaway local database and a throwaway OIDC provider: **14 PASS · 0 FAIL** (`tests/evidence/RENDER_REHEARSAL.json`). Limits:
  NODE_ENV=development there (local provider is http), no container, no TLS, no Render proxy, no Render Postgres.
- **On Render (R9):** `node scripts/staging/smoke.mjs --api=https://… --web=https://… --expect-sha=C --expect-auth=oidc [--token=… --tenant=… --role=secadmin] --out=tests/evidence/STAGING_SMOKE.json`
  D1 health + all migrations · D2 the deployed commit · D3 auth mode · D4 security headers incl. HSTS · D5 401 without a token · D6 CORS
  · D7 contract (operation count) · D8 development sign-in refused · D9 web CSP and API pointer · D10 with an IdP token: `/v1/me`,
  Mission Control, ledger chain verified. Then the independent tester's own checks (§10 A5 affects how they sign in).

## 8. Blockers and risks found while preparing

| ID | Finding | Status |
|---|---|---|
| V-1 | Render's documentation does not say whether the default database user can `CREATE ROLE`. The tenant boundary needs a runtime role that is not the owner and has NOBYPASSRLS | **Unverified — checked at R2 before anything else is built on the database.** If it fails: do not run the API as the owner; ask Render support, or choose another managed Postgres |
| B-1 | The role catalogue was loaded only by the synthetic seed (refused in production), so a production-mode environment would have had no roles | **Fixed:** `db/policy.ts` (shared) + operator bootstrap `db/bootstrap.ts`; rehearsed |
| B-2 | **The web app has no OIDC sign-in** (it only knows the development provider). In OIDC staging, testers can use the API with IdP tokens but cannot sign in to the UI | **Open — decision A5** |
| B-3 | The web server answered only `localhost` (421 for any public host), so it could not run behind Render — nor behind the repo's own Caddy setup | **Fixed:** `WEB_ALLOWED_HOSTS`, `/healthz`; rehearsed |
| B-4 | The API process exited when the database was unreachable (unhandled rejection in the outbox worker): a crash loop on Render | **Fixed:** the worker logs and retries; `/health` reports degraded with the reason (HRD-4) |
| B-5 | Behind Render's proxy every anonymous caller shared one rate-limit budget (socket address = the proxy) | **Fixed:** `TRUSTED_PROXY=on` uses the rightmost `X-Forwarded-For` entry (HRD-5); HSTS sent |
| B-6 | No `.dockerignore`: an image build would have copied `.local/` (database credentials, the development JWT secret) into the build context | **Fixed** |
| B-7 | The repo Dockerfile copies the entire source into the runtime image | Staging uses `deploy/render/Dockerfile` (runtime tree only) |
| R-1 | Evidence is stored on one 1 GB disk (S3 adapter is CONTRACT_ONLY, KV-06); a disk prevents zero-downtime deploys (a few seconds of downtime per deploy) | Accepted for staging; daily disk snapshots, 7 days |
| R-2 | No lockfile: transitive dependency versions are not locked | Step 3 of §5 |
| R-3 | OIDC has been tested only against local providers; never against a named IdP | Staging is where that verification happens (A3) |
| R-4 | 512 MB for the API is untested under load | `NODE_OPTIONS=--max-old-space-size=384`; upgrade to 1 CPU / 2 GB ($25) if memory alarms |

## 9. Monthly cost (Render list prices, 2026-10-31; billed per second, prorated)

| Item | Minimum | Recommended |
|---|---|---|
| Workspace | Hobby $0 | Hobby $0 |
| API web service 0.5 CPU / 512 MB | $7.00 | $7.00 |
| Web app web service 0.5 CPU / 512 MB | $7.00 | $7.00 |
| Persistent disk 1 GB (evidence) | $0.25 | $0.25 |
| Postgres 16 | `basic-256mb` $6.00 (1 GB storage included) | `basic-1gb` $19.00 |
| Bandwidth (5 GB included, then $0.15/GB) | $0 | $0 |
| Build minutes (images are built on your machine) | $0 | $0 |
| Registry (GitLab.com Free or Docker Hub — check its private-repository allowance) | $0 | $0 |
| **Total** | **$20.25 / month** | **$33.25 / month** |
| With Pro instead of Hobby | $45.25 | $58.25 |

Not included: a paid IdP (most offer a free developer tier), Sentry (awaiting authorization), extra Postgres storage ($0.30/GB beyond
1 GB). Stopping: suspend the two web services to stop compute charges; the database bills until deleted.

## 10. Rollback

- **Application:** Dashboard → Deploys → Rollback to the previous deploy, or the deploy hook with the previous `imgURL` digest. Requires
  that digest to still be in the registry. Both services roll back independently; roll the API back first if the web app depends on a
  new endpoint.
- **Database:** migrations are forward-only and additive. Rolling the image back does not roll the schema back; older code runs on the
  newer schema unless a migration removed or renamed something (none of 0001–0025 does). Before any deploy that adds a migration,
  start a logical export (Recovery page; retained 7 days). If a migration damaged data: **PITR** (Hobby: last 3 days, not the last 10
  minutes) restores into a **new** instance — validate it, then point the three database URLs at it and redeploy.
- **Evidence disk:** daily snapshot, 7 days, whole-disk restore.
- **Tenant data written by mistake:** never edit or delete audit events (the chain would show it, §ADR-0010); correct through the API.

## 11. Approvals needed before anything is created (nothing has been done)

| ID | Decision |
|---|---|
| A1 | Spend: Hobby + $20.25–$33.25/month (or Pro + $45.25–$58.25) |
| A2 | Accept two public `*.onrender.com` URLs, protected by authentication, not by network (§3) |
| A3 | The identity provider for staging (issuer, audience, JWKS; a client registration and test users) |
| A4 | The private registry (GitLab Container Registry or Docker Hub) and a read-only pull token for Render |
| A5 | UI sign-in: (a) build OIDC sign-in in the web app (Authorization Code + PKCE) and verify it against the A3 provider — **recommended**; or (b) API-only staging until then |
