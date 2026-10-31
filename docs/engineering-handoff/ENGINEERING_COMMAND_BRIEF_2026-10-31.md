# Engineering Command Brief — 2026-10-31

Program: Empathia Technologies platform (Living Campus + Founder Studio). Directives in force: MASTER CONTINUATION DIRECTIVE — PROJECT
ASCENSION (2026-10-30 18:39 CT) and CONNECTOR ORCHESTRATION & FULL-STACK EXECUTION DIRECTIVE (2026-10-30 19:00 CT). Every claim below
points at a file, a test id or a connector object id. Nothing here is a claim of production readiness, certification, external
validation or a live deployment.

## 1. Engineering command brief

- **State of the build:** monorepo `empathia-technologies`, commit `d98863d` plus the P4-C work committed in this step. Full regression
  runs alone after every committed step; the latest run is recorded in `tests/evidence/TEST_RESULTS.md` (30 suites PASS · 0 FAIL · 1
  NOT_RUN — the 47-minute film decode, which needs `--films`).
- **Delivered since the last brief:** Search Party (package, API, enterprise page, demonstration page); commissioning readiness and the
  Acceptance & assurance tab; OIDC production identity (verified against a local JWKS only); one-platform shell across the enterprise
  app and the demonstration; Adobe Fonts kit on every surface (opt-in); Postman contract; source-preservation package; the seven guided
  scenarios as a persistent runner with the complete create→…→recommission→compare journey exercised in the browser.
- **Not delivered / not claimable:** a live deployment (no container runtime, no Git remote, no domain in this workspace); Render
  services (paid — awaiting authorization); native demonstration pages for 10 of the 17 tour steps (they are status pages that name their
  ledger row); P5 governed project lifecycle (intake 9 types → review → brief → collaborative design → approval → execution → handoff →
  operational transition) is designed in the ledger, not built.
- **Risk posture:** unchanged — authorization in the demonstration is a front-end demonstration, not production security; all data is
  synthetic; no external security assessment has been performed (`docs/security/INDEPENDENT_REVIEW_STATUS.md`).

## 2. Connector capability matrix

`docs/operations/CONNECTOR_MATRIX.md` (verified by probing each connector; read-only unless stated). Summary:

| Connector | State | Used | Needs |
|---|---|---|---|
| Postman | authenticated (team admin) | spec `2d96e1fa-…`, collection `59358586-…`, environment `a9b51b34-…` | negative-case folders; re-sync on contract change |
| Render | authenticated, 0 services | nothing provisioned | **owner authorization** (paid): Postgres + web service + 3 static sites, and a Git remote Render can read |
| Figma | authenticated, View seat | nothing | an Edit seat before any file is generated |
| Adobe | authenticated | Fonts kit `kis0uqz` (Acumin Pro) wired as `FONT_KIT_ID` | production domains added to the kit before go-live |
| Canva / Framer / Webflow / B12 | authenticated or present | nothing (would duplicate `apps/website` or need a brand kit) | — |
| TinyFish | $10 wallet | nothing | optional post-deployment monitor (per-run cost) |
| SketchUp | present | nothing | `docs/product/SPATIAL_INTEROP.md` first |
| ElevenLabs / HeyGen / Splice / Shutterstock / vidIQ | present | nothing | final scenario scripts; licensing checks |
| GitHub | **not linked** | — | link in connectors, then `git push --all` |
| Descript | not present | — | — |

## 3. Repository assessment

- Local Git history is intact (`git log`), every step committed with its evidence; the tree is clean at each commit (the preservation
  script refuses a dirty tree).
- Source preservation: `scripts/release/preserve-source.mjs` produces a bundle (`git bundle --all`, verified by a restore), a source
  archive, `COMMITS.md`, `FILES.json` (sha256 per tracked file), `DEPENDENCIES.json`, copies of migrations/schema/API/ADRs/deploy files,
  `RESTORE_AND_MIGRATE.md` and a manifest; the package is secret-scanned before it is written. The last package delivered to the owner:
  `empathia-source-20261031-a9f184a.tar.gz` (sha256 `ccbcc8c3…6c25cf4a`). A refreshed package follows this commit.
- **Defect PD-01 (found this step):** the generic `build/` ignore rule kept `apps/demo/src/build/` (Build a Room source) out of every
  commit and out of the delivered package `…-a9f184a.tar.gz`. Fixed in this commit (rule anchored, files committed, packaging guard added:
  the script refuses when an ignored file sits under `src/`). The package delivered with this brief is the first complete one.
- Build is repeatable offline: `node scripts/build.mjs` (tsc -b + esbuild + dist hygiene), `node scripts/test.mjs --browser --studio`.
- Database: migrations `0001`–`0016`, RLS on tenant tables, SoD and delegations (`0012`), measurements (`0013`), graph identity
  (`0014`), administration (`0015`), OIDC subjects (`0016`).

## 4. Execution plan (what was planned for this step, in order)

1. Verify repository state and the one-platform shell after the Search Party CSS move (rebuild + E2E) — done.
2. P4-C: Search Party in the demonstration on the shipped package; the 17-step tour runner; deep links; lineage + baseline comparison —
   done.
3. Full regression alone; ledger, status, brief; commit; refresh the preservation package — done in this step.
4. Next: P5 governed project lifecycle (API first, then the enterprise pages), then the remaining scenario pages (service, APEX, Learn,
   Mission Control, Executive, Ledger) natively in the demonstration.

## 5. Work performed (this step)

- `apps/demo/src/search/{estate.ts,SearchParty.tsx}`: synthetic estate (2 buildings, 4 rooms, 2 switches, 1 PDU, 8 assets, 1 issue,
  1 work order, 3 people, 1 baseline; the Build a Room draft merged in) and the Search Party page on `@empathia/search-party`.
- `apps/demo/src/tour/Tour.tsx`: the 17 canonical steps verbatim; persistent panel; persona switching; jump; Reset & replay; Close.
- `apps/demo/src/build/{store.ts,BuildRoom.tsx}`: baseline lineage (`baselines[]`, superseding on re-acceptance), `BaselineDiff`,
  device changes allowed during (re)commissioning, `?tab=` deep links.
- `apps/demo/build.mjs` + `registry.ts`: the 19 V2.5 pages are in the generated registry, so every `#/v25/<page>` resolves to its own
  ledger row (105 addresses now covered by D-04).
- `tests/browser/demo.test.mjs`: 46 checks (S-01..S-05 Search Party, T-01..T-06 tour, B-15d..B-15g complete journey to baseline v2 and
  its comparison).
- Ledger generator (`scripts/legacy/parity-ledger.mjs`) and `docs/legacy-parity.{md,csv}` regenerated; `docs/BUILD_STATUS.md` updated.

## 6. Test and security evidence

- `tests/evidence/TEST_RESULTS.{json,md}` — the authoritative run of record (written by `scripts/test.mjs`; never edited by hand).
- Security suites: `authz` 45, `founder-boundary` 6, `site-scope` 3, `authority-matrix` 2, `governance` 9, `administration` 5,
  `search-party` 6 (site/tenant leakage negatives), `oidc` 4 (alg none, HMAC, key mismatch, wrong audience refused).
- Browser: enterprise web E2E 38, public website 32, demonstration 46, Founder Studio 19.
- Of the directive's 18 mandatory security scenarios, the ones with executable evidence today are: tenant isolation, site scoping,
  role escalation, SoD (recorder ≠ verifier ≠ acceptor), delegation expiry/scope, founder boundary, invitation acceptance, OIDC token
  refusals, search leakage. Not yet exercised: rate limiting, CSRF on state-changing routes, session fixation, upload content-type
  sniffing, audit tamper-evidence, backup restore under RLS, secret rotation, dependency audit (registry offline), browser CSP report.
  These are recorded as KV-17 (with KV-04, KV-14) in `docs/security/KNOWN_VULNERABILITIES_AND_REMEDIATION.md`.
- No independent review has occurred.

## 7. Deployment readiness

- Written and reviewed, **NOT_RUN**: `.github/workflows/ci.yml`, `docker-compose.prod.yml` (migrate job, API under `AUTH_MODE=oidc`,
  Caddy TLS proxy, `FONT_KIT_ID` to every web surface), `deploy/Caddyfile`, `.env.example`, `docs/operations/DEPLOYMENT_GUIDE.md`.
- Blockers: no Git remote (GitHub not linked); Render provisioning needs owner authorization (cost); production domains for the fonts
  kit; a named OIDC provider for the identity path.
- This workspace cannot verify a deployment; none is claimed.

## 8. Design and commercial outputs

- Typography: Acumin Pro via Adobe Fonts kit `kis0uqz`, weights 400/400i/500/600/700; token `--font-sans`; CSP allow-list only when
  `FONT_KIT_ID` is set (`docs/design-system/DESIGN_SYSTEM.md`).
- One platform: `AppShell` + product rail (Mission Control · Pro · Lite · Search Party · Commissioning & Assurance · Field Intelligence ·
  Learn · Administration) in both the enterprise app and the demonstration; shared tokens; shared identity block.
- Collateral (Express/Canva/ElevenLabs/HeyGen): intentionally not started — scenario scripts are now final enough to brief narration,
  which would spend credits and needs authorization.

## 9. Outstanding decisions (owner)

1. **Render provisioning** (paid): authorize `create_postgres`, `create_web_service` (api), 3 × `create_static_site` (www, demo, app).
2. **Git remote**: link GitHub (or name another host Render can read) so the bundle can be pushed.
3. **OIDC provider**: name the provider (issuer, audience, JWKS URL) to verify the identity path against a real tenant.
4. **Fonts kit domains**: the production hostnames to add to kit `kis0uqz`.
5. **Narration/collateral**: whether to spend ElevenLabs/Adobe Express credits on the seven scenarios now or after P5.
6. **P5 before or after** the remaining native scenario pages.

## 10. Continuation checkpoint

Resume at: P5 governed project lifecycle — intake (9 request types) → review → engineering brief → collaborative design → approval →
execution/handoff → operational transition, API first with positive/negative tests, then the enterprise pages, then the demonstration
step pages for scenarios 2, 5, 6 and 7. All standing rules remain in force (no fabricated passes; NOT_RUN stays NOT_RUN; synthetic data
only; no external distribution without the owner's authorization).
